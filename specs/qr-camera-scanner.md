# QR Camera Scanner — Feature Specification

## Overview

The QR Camera Scanner enables security guards to scan visitor QR codes using the device camera (webcam or phone camera) directly in the browser. It provides a complete gate workflow: scan → verify → check-in/check-out, with inline visitor verification and status tracking.

**Phase:** 7
**Status:** Implemented
**Added:** 2026-06-25

---

## Scope

### In Scope

- Browser-based camera QR code scanning
- Manual QR token entry (fallback)
- Unified token resolver (QR token or email access token)
- Security gate workflow (scan → verify → check-in/out)
- Inline visitor verification dialog
- Camera fallback status management
- Check-in and check-out from a single scanner page

### Out of Scope

- Native mobile app scanner
- Offline scanning
- Multi-QR batch scanning
- ANPR (Automatic Number Plate Recognition)

---

## Functional Requirements

### FR-1: Camera QR Scanning

- Uses browser `getUserMedia` API to access device camera
- Supports rear camera (environment) preference on mobile
- Real-time QR code detection from camera feed
- Graceful fallback to manual token entry when camera is unavailable
- Camera permission handling with clear status messages

### FR-2: Unified Token Resolver

The `qr-token-resolver.ts` module handles two token types:

1. **QR tokens** — Direct QR code tokens from generated QR codes
2. **Email access tokens** — Tokens from QR email delivery links

The resolver:

- Looks up the token in QRCode table (by token_hash)
- If not found, looks up in QrEmailDelivery table (by email_access_token_hash)
- Returns the linked visit, visitor, unit, and host information

### FR-3: Security Gate Workflow

The gate workflow follows this flow:

```
Scan QR Token
    │
    ▼
Resolve Token (QR or Email Access)
    │
    ▼
Display Visit Info (visitor, host, unit, purpose, status)
    │
    ├─── Status: EXPECTED → Show Check-In button
    │         │
    │         ▼
    │    Run Verification (photo, vehicle, NDA, safety form)
    │         │
    │         ▼
    │    Check In
    │
    ├─── Status: CHECKED_IN → Show Check-Out button
    │         │
    │         ▼
    │    Check Out
    │
    └─── Status: CHECKED_OUT → Show "Already checked out"
```

### FR-4: Inline Verification

Before check-in, security guards can verify the visitor:

- **Photo capture** (optional)
- **Vehicle number** (optional)
- **NDA signed** (boolean)
- **Safety form signed** (boolean)
- **Visitor attachment** (link to existing visitor record)

Verification data is stored in the Verification model (one per visit).

### FR-5: Camera Fallback Management

- On camera permission denied → show manual entry form
- On camera not available → show manual entry form
- On camera recovery → clear fallback status, re-show camera
- Status is persisted in component state to prevent flickering

### FR-6: Gate Visitor Summary

After scanning, a summary card shows:

- Visitor name, phone, ID
- Host name and unit
- Visit purpose and expected time
- Current status (EXPECTED / CHECKED_IN / CHECKED_OUT)
- Vehicle information (if linked)
- Verification status (if completed)

---

## Architecture

### Key Components

| Component                  | Location                                                 | Purpose                       |
| -------------------------- | -------------------------------------------------------- | ----------------------------- |
| `QRScanner`                | `src/components/qr-scanner.tsx`                          | Camera-based QR code scanner  |
| `GateVisitorSummary`       | `src/components/security/gate-visitor-summary.tsx`       | Visit info display after scan |
| `InlineVerificationDialog` | `src/components/security/inline-verification-dialog.tsx` | Verification form dialog      |
| `VerificationForm`         | `src/components/security/verification-form.tsx`          | Verification form fields      |
| `VisitInfoCard`            | `src/components/security/visit-info-card.tsx`            | Visit details card            |

### Key Hooks

| Hook                  | Location                             | Purpose                     |
| --------------------- | ------------------------------------ | --------------------------- |
| `useSecurityWorkflow` | `src/hooks/use-security-workflow.ts` | Gate workflow state machine |

### Key Libraries

| Module              | Location                       | Purpose                       |
| ------------------- | ------------------------------ | ----------------------------- |
| `qr-token-resolver` | `src/lib/qr-token-resolver.ts` | Unified QR/email token lookup |
| `visit-transitions` | `src/lib/visit-transitions.ts` | Visit status state machine    |

### Pages

| Page            | Route              | Purpose                |
| --------------- | ------------------ | ---------------------- |
| Security Scan   | `/security/scan`   | QR scanner with camera |
| Security Verify | `/security/verify` | Verification page      |

---

## Security Considerations

1. **Token hashing:** QR tokens are stored as SHA-256 hashes
2. **Email access tokens:** Stored as both plaintext (for lookup) and hash (for validation)
3. **Camera permissions:** Requested only when needed, with clear user messaging
4. **Status validation:** Visit status transitions are validated server-side
5. **Blocklist check:** Check-in validates visitor against blocklist
6. **Audit logging:** All check-in/out and verification actions are logged

---

## Testing

- Unit tests: token resolver, visit transitions, status validation
- E2E tests: camera scan flow, manual entry flow, verification dialog, check-in/out lifecycle
