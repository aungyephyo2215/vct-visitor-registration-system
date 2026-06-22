# API Reference

Base URL: `/api/v1`

All authenticated endpoints require `httpOnly` cookie `access_token` (set automatically on login).

Error response format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "details": []
  }
}
```

Success response format:

```json
{
  "success": true,
  "data": {}
}
```

---

## Auth

### POST /api/v1/auth/login

Authenticate and set cookies.

**Body:**

```json
{ "email": "admin@vrs.com", "password": "Admin123!" }
```

**Rate limit:** 10 attempts per IP per 60 seconds.

### POST /api/v1/auth/logout

Clear auth cookies.

### GET /api/v1/auth/me

Get current authenticated user. Returns 401 if not authenticated.

---

## Visitors

All visitor endpoints require role: `SUPER_ADMIN`, `PROPERTY_ADMIN`, `SECURITY_GUARD`, or `OFFICE_STAFF`.

### GET /api/v1/visitors

List visitors with search and pagination.

**Query params:** `page`, `limit`, `search`

### POST /api/v1/visitors

Create a visitor.

**Body:**

```json
{
  "name": "John Doe",
  "phone": "+95912345678",
  "id_type": "PASSPORT",
  "id_number": "PA123456",
  "photo_url": "https://example.com/photo.jpg"
}
```

### GET /api/v1/visitors/:id

Get visitor details.

### PATCH /api/v1/visitors/:id

Update visitor.

### DELETE /api/v1/visitors/:id

Soft-delete visitor.

---

## Visits

All visit endpoints require role: `SUPER_ADMIN`, `PROPERTY_ADMIN`, `SECURITY_GUARD`, or `OFFICE_STAFF`.

### GET /api/v1/visits

List visits with status filter and pagination.

**Query params:** `page`, `limit`, `status`, `visitor_id`, `unit_id`

### POST /api/v1/visits

Create a visit.

**Body:**

```json
{
  "visitor_id": "uuid",
  "unit_id": "uuid",
  "host_user_id": "uuid",
  "purpose": "FAMILY_VISIT",
  "notes": "Optional notes",
  "vehicle_number": "ABC-123"
}
```

### GET /api/v1/visits/:id

Get visit details with visitor, unit, host, and QR codes.

### PATCH /api/v1/visits/:id

Update visit.

---

## QR & Check-In/Out

### POST /api/v1/qr/generate

Generate QR code for visit. Requires `SUPER_ADMIN`, `PROPERTY_ADMIN`, or `SECURITY_GUARD`.

**Body:** `{ "visit_id": "uuid" }`

**Response:** Returns raw token, expiry time, and QR code ID.

### GET /api/v1/qr/email-image/:emailAccessToken

Public QR image endpoint used by hosted invitation emails.

**Auth:** none

**Validation:**

- access token exists
- access token is not expired
- linked invitation, visit, and QR are still valid
- linked delivery status is `SENT`

**Response:** `image/png`

### POST /api/v1/checkin

Check in with QR token. No auth required (kiosk/public use).

**Body:** `{ "token": "qr-token-string" }`

Validates: token exists, active, not expired, visit not already checked in, visitor not blocked.

### POST /api/v1/checkout

Check out a visit. Requires `SUPER_ADMIN`, `PROPERTY_ADMIN`, or `SECURITY_GUARD`.

**Body:** `{ "visit_id": "uuid" }`

---

## Invitations

### GET /api/v1/invitations/:id

Get invitation details.

For approved invitations with a linked visit, the response now includes safe QR email metadata:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "APPROVED",
    "visit_id": "uuid",
    "qrCode": {
      "hasActive": true,
      "expiresAt": "2026-06-22T10:00:00.000Z"
    },
    "qrEmailDelivery": {
      "deliveryId": "uuid",
      "status": "SENT",
      "provider": "smtp",
      "triggerType": "AUTO",
      "failureCode": null,
      "sentAt": "2026-06-22T09:05:00.000Z",
      "createdAt": "2026-06-22T09:05:00.000Z"
    }
  }
}
```

**Security notes:**

- does **not** include raw QR token
- does **not** include `email_access_token`
- does **not** include `provider_message_id`

### POST /api/v1/invitations/:id/generate-qr

Generate an invitation QR code for an approved invitation. Requires authenticated access plus property-scoped authorization. Roles aligned with QR generation UI: `SUPER_ADMIN`, `PROPERTY_ADMIN`, `OFFICE_STAFF`, `SECURITY_GUARD`.

On success, QR generation still succeeds even if email delivery fails.

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

`emailDelivery.status` values:

- `SENT`
- `FAILED`
- `SKIPPED`

**Security notes:**

- raw QR token is still returned for the generate-QR operator flow
- the email-delivery summary never includes `email_access_token`
- the email-delivery summary never includes `provider_message_id`

### POST /api/v1/invitations/:id/resend-qr-email

Manually resend the hosted QR email for an invitation with an active QR.

**Roles:** `SUPER_ADMIN`, `PROPERTY_ADMIN`, `OFFICE_STAFF`, `SECURITY_GUARD`

**Behavior:**

- requires authentication and property access
- invitation must be `APPROVED`
- invitation must have an active generated QR
- reuses the QR email delivery service with `triggerType: MANUAL_RESEND`
- enforces manual resend cooldown

**Success response:**

```json
{
  "success": true,
  "data": {
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

**Cooldown response (`429`):**

```json
{
  "success": false,
  "error": {
    "message": "QR email resend is on cooldown",
    "details": {
      "retryAfterSeconds": 120,
      "cooldownSeconds": 300
    }
  }
}
```

**Headers:**

- `Retry-After: <seconds>`

### GET /qr-access/:emailAccessToken

Visitor-facing hosted QR access page used from email links.

**Auth:** none

**Validation:**

- access token exists
- access token is not expired
- linked invitation, visit, and QR are still valid
- linked delivery status is `SENT`

The page shows visit and property context plus the hosted QR image. It never exposes the raw QR token in the URL.

---

## Reference Data

### GET /api/v1/units

List units scoped to user's property.

**Query params:** `page`, `limit`

### GET /api/v1/users

List users scoped to user's property.

**Query params:** `page`, `limit`, `search`, `role` (comma-separated, e.g. `?role=RESIDENT,PROPERTY_ADMIN`)
