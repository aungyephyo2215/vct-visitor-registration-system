# Automatic QR Email Delivery Specification

## 1. Overview

**Phase:** 6.5  
**Feature Name:** Automatic QR Email Delivery  
**Product:** Visitor Registration System

### Goal

Automatically deliver a generated invitation QR code to the invited visitor by email when the invitation has been approved and a valid visitor email address is available.

### Primary Outcome

After staff or an authorized user generates a QR code from an approved invitation, the system should:

1. create the visit and QR token as it does today,
2. send the QR access details to the visitor email when possible,
3. record delivery success or failure,
4. allow authorized users to inspect status and resend if needed.

---

## 2. Current State

### Existing Flow

- Invitation is created with optional `visitor_email`.
- Invitation is approved via `POST /api/v1/invitations/[id]/approve`.
- QR is generated via `POST /api/v1/invitations/[id]/generate-qr`.
- QR generation creates a `Visit`, creates a `QRCode`, links the invitation to the visit, writes an audit log, and sends an in-app `QR_GENERATED` notification to the inviter.

### Existing Strengths

- Invitation and QR workflows already exist.
- Audit logging exists.
- Notification infrastructure exists.
- `visitor_email` is already part of the invitation domain model.

### Implemented Outcomes

- Email provider abstraction exists with `noop`, `mock`, and `smtp` adapters.
- QR email delivery persists `QrEmailDelivery` records with `PENDING`, `SENT`, `FAILED`, and `SKIPPED` states.
- Automatic QR generation now triggers best-effort QR email delivery.
- Hosted public access uses opaque `email_access_token` links and hosted PNG QR image delivery.
- Manual resend exists with RBAC protection and cooldown handling.
- Invitation detail API/UI now expose safe QR email status without exposing raw token or access token.

---

## 3. Scope

### In Scope

- Automatic email delivery for invitation-generated QR codes.
- Email provider abstraction.
- HTML/text QR email template.
- Delivery status persistence.
- Resend support.
- Audit logs for send/resend attempts.
- API and UI hooks to expose status.
- Unit, integration, and E2E tests.

### Out of Scope

- SMS or WhatsApp delivery.
- Bulk campaign messaging.
- General-purpose outbound email framework for all product notifications.
- Background job infrastructure beyond what is necessary for this phase.
- QR email for non-invitation walk-in visits in the first release.

---

## 4. Functional Requirements

### FR-1 — Automatic Send Trigger

When a QR code is successfully generated from an approved invitation, the system shall attempt email delivery automatically if `visitor_email` is present.

### FR-2 — Graceful Skip

If `visitor_email` is null or empty, QR generation shall still succeed and the system shall record that email delivery was skipped for missing recipient data.

### FR-3 — Secure Payload

The outgoing email shall use hosted access/image URLs derived from an opaque `email_access_token`. The raw QR token must not be persisted to the database and must not appear in public URLs, logs, UI, or email metadata.

### FR-4 — Delivery Tracking

The system shall persist one delivery record per send attempt with status, provider, timestamps, and failure details.

### FR-5 — Resend Support

Authorized staff shall be able to resend a QR email for an invitation/visit when a valid recipient email exists and the QR is still active.

### FR-6 — Authorization

Only authorized roles (`SUPER_ADMIN`, `PROPERTY_ADMIN`, `OFFICE_STAFF`, and optionally `SECURITY_GUARD` depending on current QR generation policy) may trigger send/resend operations.

### FR-7 — Auditability

Automatic send, resend, skip, success, and failure events shall be auditable.

### FR-8 — UI Visibility

The invitation or visit detail view shall show the latest QR email delivery status and last attempt timestamp.

### FR-9 — Safe Failure Behavior

Email sending failure shall not undo a successful QR generation.

### FR-10 — Provider Portability

Mail sending must be implemented behind an internal provider interface.

---

## 5. Non-Functional Requirements

### Reliability

- Send failures must be visible and traceable.
- Provider timeouts must not leave the request hanging indefinitely.
- Retrying should be explicit and operator-controlled in v1.

### Security

- Do not log raw QR tokens.
- Do not store raw QR tokens in DB metadata.
- Sanitize provider error details before exposing them to clients.
- Ensure property-scoped authorization for viewing or resending status.

### Maintainability

- Provider logic, templates, and orchestration must live in separate modules.
- Tests must be able to swap in a fake provider.

### Observability

- Delivery records should capture provider name, external message ID when available, request timestamp, response timestamp, and normalized error code/message.

---

## 6. Proposed Architecture

## 6.1 High-Level Flow

1. User calls `POST /api/v1/invitations/[id]/generate-qr`.
2. Existing route creates `Visit` + `QRCode` + invitation linkage.
3. Route invokes a new QR email orchestration service.
4. Orchestration service:
   - validates whether email delivery is applicable,
   - builds email payload,
   - calls configured provider adapter,
   - writes a delivery attempt record,
   - returns a normalized result.
5. Route returns QR generation success regardless of delivery success, but includes delivery status metadata in response.
6. UI displays delivery result and offers resend when appropriate.

## 6.2 New Internal Modules

Proposed modules (names may be refined during implementation):

- `src/lib/email/provider.ts` — provider interface + config resolution
- `src/lib/email/providers/<vendor>.ts` — vendor adapter(s)
- `src/lib/email/templates/qr-delivery.ts` — email subject/html/text builder
- `src/lib/email/qr-delivery.ts` — orchestration service for automatic send/resend
- `src/lib/email/types.ts` — normalized result and payload contracts

## 6.3 Design Principles

- Keep route handlers thin.
- Keep provider logic isolated from business flow logic.
- Normalize provider responses before persistence.
- Treat email delivery as best-effort side effect with durable status.

---

## 7. Database Changes

## 7.1 Existing Data Used

- `Invitation.visitor_email`
- `Invitation.visit_id`
- `Visit.id`
- `QRCode.visit_id`, `QRCode.status`, `QRCode.expires_at`
- `AuditLog`

## 7.2 Proposed New Model

Add a new table, for example `qr_email_deliveries`:

### Suggested Fields

- `id`
- `property_id`
- `invitation_id`
- `visit_id`
- `qr_code_id`
- `recipient_email`
- `trigger_type` (`AUTO`, `MANUAL_RESEND`)
- `status` (`PENDING`, `SENT`, `FAILED`, `SKIPPED`)
- `provider`
- `provider_message_id` nullable
- `subject`
- `email_access_token` unique nullable
- `expires_at` nullable
- `idempotency_key` unique nullable
- `failure_code` nullable
- `failure_message` nullable
- `sent_at` nullable
- `created_by` nullable (null for automatic system-triggered send if desired)
- `created_at`
- `updated_at`

### Recommended Indexes

- `[property_id]`
- `[invitation_id]`
- `[visit_id]`
- `[status]`
- `[recipient_email]`
- `[created_at]`

## 7.3 Why a Separate Table

A dedicated table keeps delivery history append-only and supports:

- retries/resends,
- audit review,
- analytics,
- operational debugging,
- future webhook reconciliation if a provider adds bounce/delivery callbacks.

---

## 8. API Changes

## 8.1 Update Existing Endpoint

### `POST /api/v1/invitations/:id/generate-qr`

Extend success response to include delivery metadata.

### Proposed Response Additions

```json
{
  "success": true,
  "data": {
    "token": "raw-qr-token",
    "expires_at": "2026-06-22T10:00:00.000Z",
    "visit_id": "uuid",
    "qr_code_id": "uuid",
    "emailDelivery": {
      "status": "SENT",
      "provider": "smtp",
      "deliveryId": "uuid",
      "skippedReason": null,
      "failureCode": null
    }
  }
}
```

Notes:

- raw QR token remains available only to the operator flow that just generated the QR
- `emailDelivery` is a safe summary and does not expose `email_access_token` or `provider_message_id`

## 8.2 New Resend Endpoint

### `POST /api/v1/invitations/:id/resend-qr-email`

Purpose: resend the existing active QR email for an approved invitation with a linked visit/QR.

#### Expected Behavior

- validate auth and property access,
- ensure invitation exists,
- ensure active linked QR exists,
- ensure recipient email exists,
- enforce resend cooldown (default `300s`, configurable),
- create new delivery attempt via `triggerType: MANUAL_RESEND`,
- send email,
- return normalized safe result.

## 8.3 Invitation Detail Enrichment (Implemented)

The invitation detail endpoint now includes the latest safe QR email delivery record and active-QR metadata, which removed the need for a separate status endpoint in this phase.

Safe additions:

- `qrCode.hasActive`
- `qrCode.expiresAt`
- `qrEmailDelivery.deliveryId`
- `qrEmailDelivery.status`
- `qrEmailDelivery.provider`
- `qrEmailDelivery.triggerType`
- `qrEmailDelivery.failureCode`
- `qrEmailDelivery.sentAt`
- `qrEmailDelivery.createdAt`

Never included:

- raw QR token
- `email_access_token`
- `provider_message_id`

## 8.4 Documentation Updates

Update project API docs to include:

- new response shape for generate-qr,
- resend endpoint contract,
- auth rules,
- status semantics,
- failure behavior.

---

## 9. Provider Strategy

## 9.1 Strategy

Use a provider abstraction with environment-driven selection.

### Proposed Adapters

- `noop` / `log` provider for local development
- `mock` provider for tests
- one production provider adapter for first release (vendor to be chosen during implementation)

## 9.2 Selection Rules

- `EMAIL_PROVIDER=noop|mock|<vendor>`
- local dev defaults to `noop`
- test environment uses `mock`
- production requires an explicitly configured real provider

## 9.3 Provider Contract

Provider interface should accept:

- recipient email,
- subject,
- html body,
- text body,
- optional metadata

Provider interface should return normalized:

- `success`
- `provider`
- `messageId` nullable
- `errorCode` nullable
- `errorMessage` nullable

## 9.4 Initial Vendor Selection Criteria

Choose first production vendor based on:

- reliable transactional email API,
- good DX for Node/TypeScript,
- clear sandbox/dev mode,
- stable message IDs and error responses,
- reasonable setup complexity.

---

## 10. Security Requirements

## 10.1 Token Handling

- Raw QR token may be used transiently during QR generation and provider dispatch only.
- Raw QR token must never be written to DB records.
- Raw QR token must never be written to logs, audit metadata, provider metadata, public URLs, or invitation-detail UI responses.
- Hosted visitor links must use opaque `email_access_token` values.

## 10.2 Recipient Validation

- Re-validate `visitor_email` using existing schema rules before send.
- Reject resend attempts if the stored email is invalid or missing.

## 10.3 Authorization & Scope

- Property scope must be enforced on all status/resend operations.
- Resident access should remain read-only unless explicitly approved in product scope.

## 10.4 Abuse Controls

- Add resend rate limiting or simple cooldown in v1 if abuse risk is material.
- Minimum acceptable fallback: audit every resend and restrict resend to authorized staff roles.

## 10.5 Error Exposure

- API responses should use normalized, user-safe messages.
- Detailed provider failures stay in server logs and delivery records, not raw client output.

---

## 11. Testing Strategy

## 11.1 Unit Tests

Add tests for:

- provider selection logic,
- email template generation,
- orchestration outcomes (`SENT`, `FAILED`, `SKIPPED`),
- resend eligibility rules,
- response normalization,
- security guarantees around token persistence.

## 11.2 Integration / API Tests

Add tests for:

- generate-qr with valid email → QR success + email attempted,
- generate-qr with missing email → QR success + skipped status,
- provider failure → QR success + failed delivery record,
- resend endpoint success,
- resend endpoint unauthorized,
- resend endpoint with expired/inactive QR,
- property isolation for resend/status endpoints.

## 11.3 E2E Tests

Add at least one full flow:

1. create invitation,
2. approve invitation,
3. generate QR,
4. verify UI shows sent/skipped/failed state,
5. trigger resend from UI,
6. verify updated status.

## 11.4 Manual QA

- local noop provider shows observable output,
- real provider sandbox verifies formatting,
- QR link/token received can be used by the existing verification/check-in flow,
- failure path is visible but non-blocking.

---

## 12. UI / UX Changes

## Invitation Detail

- show visitor email,
- show latest delivery status badge,
- show last sent/attempted timestamp,
- show resend action when eligible.

## Visit Detail

- optionally show QR email delivery summary if visit came from invitation.

### Messaging

Use clear statuses:

- `Sent`
- `Failed`
- `Skipped`
- `Pending` for claim-first in-progress delivery state
- cooldown feedback for manual resend (`retryAfterSeconds`)

---

## 13. Audit & Observability

Add audit events for at least:

- `GENERATE_QR` (includes safe email-delivery summary metadata)
- `MANUAL_RESEND_QR_EMAIL`

Future refinements may split explicit send/skip/failure audit actions if operational reporting needs finer granularity.

Minimum structured fields:

- invitation id,
- visit id,
- qr code id,
- recipient email (masked if needed in logs),
- provider,
- trigger type,
- normalized status.

---

## 14. Implementation Checklist

### Planning / Design

- [ ] Confirm working repo path and branch strategy.
- [ ] Confirm first production email provider.
- [ ] Confirm exact authorized roles for resend.
- [ ] Confirm whether resend needs cooldown/rate limiting in v1.

### Data Layer

- [x] Add delivery-tracking model to Prisma schema.
- [x] Add migration.
- [x] Add Prisma query helpers if needed.

### Service Layer

- [x] Add email provider abstraction.
- [x] Add noop/mock provider implementations.
- [x] Add production provider adapter.
- [x] Add QR email template builder.
- [x] Add QR delivery orchestration service.

### API Layer

- [x] Extend invitation QR generation response with delivery status.
- [x] Add resend endpoint.
- [x] Enrich invitation detail endpoint with safe QR email status.
- [x] Add authorization and validation rules.

### UI Layer

- [x] Show delivery status on invitation detail.
- [x] Add resend button.
- [x] Add failure/success/cooldown feedback.

### Observability / Security

- [x] Add audit events.
- [x] Verify token is never persisted in plaintext.
- [x] Verify safe error sanitization.

### Quality

- [x] Add unit tests.
- [x] Add API/integration tests.
- [ ] Add E2E coverage.
- [x] Update docs.

---

## 15. Exit Criteria

The phase is complete when:

- an approved invitation with a valid email can generate a QR and automatically send it,
- failures do not block QR creation,
- delivery attempts are visible and auditable,
- authorized users can resend,
- tests cover success, skip, and failure paths,
- docs are updated for DB, API, operations, and QA.
