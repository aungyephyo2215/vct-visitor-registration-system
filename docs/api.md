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
  "vehicle_number": "ABC-123",
  "vehicle_id": "uuid"
}
```

### GET /api/v1/visits/:id

Get visit details with visitor, unit, host, and QR codes.

### PATCH /api/v1/visits/:id

Update visit.

---

## Visit Verification

### POST /api/v1/visits/:id/verification

Create or update verification for a visit. Requires `SUPER_ADMIN`, `PROPERTY_ADMIN`, or `SECURITY_GUARD`.

**Body:**

```json
{
  "photo_url": "https://example.com/photo.jpg",
  "vehicle_number": "ABC-123",
  "nda_signed": true,
  "safety_form_signed": true,
  "visitor_id": "uuid"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "visit_id": "uuid",
    "visitor_id": "uuid",
    "photo_url": "https://example.com/photo.jpg",
    "vehicle_number": "ABC-123",
    "nda_signed": true,
    "safety_form_signed": true,
    "verified_by": "uuid",
    "verified_at": "2026-06-25T10:00:00.000Z"
  }
}
```

---

## QR & Check-In/Out

### POST /api/v1/qr/generate

Generate QR code for visit. Requires `SUPER_ADMIN`, `PROPERTY_ADMIN`, or `SECURITY_GUARD`.

**Body:** `{ "visit_id": "uuid" }`

**Response:** Returns raw token, expiry time, and QR code ID.

### GET /api/v1/qr/lookup

Look up a QR code by token. Used by the security scanner to resolve a scanned QR token.

**Query params:** `token`

**Roles:** `SUPER_ADMIN`, `PROPERTY_ADMIN`, `SECURITY_GUARD`

**Response:**

```json
{
  "success": true,
  "data": {
    "qrCode": {
      "id": "uuid",
      "status": "ACTIVE",
      "expires_at": "2026-06-26T10:00:00.000Z"
    },
    "visit": {
      "id": "uuid",
      "status": "EXPECTED",
      "purpose": "FAMILY_VISIT",
      "visitor": { "id": "uuid", "name": "John Doe", "phone": "+95912345678" },
      "unit": { "id": "uuid", "unit_no": "A-101" },
      "host": { "id": "uuid", "name": "Jane Smith" }
    }
  }
}
```

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

### POST /api/v1/checkout/qr

Check out using QR token. Requires `SUPER_ADMIN`, `PROPERTY_ADMIN`, or `SECURITY_GUARD`.

**Body:** `{ "token": "qr-token-string" }`

Validates: token exists, linked visit is CHECKED_IN, not already checked out.

---

## Invitations

### GET /api/v1/invitations

List invitations with filters.

**Query params:** `page`, `limit`, `status`

### POST /api/v1/invitations

Create an invitation.

**Body:**

```json
{
  "visitor_name": "John Doe",
  "visitor_phone": "+95912345678",
  "visitor_email": "john@example.com",
  "visitor_type": "GUEST",
  "unit_id": "uuid",
  "expected_date": "2026-06-30",
  "expected_time": "14:00",
  "notes": "Business meeting"
}
```

### GET /api/v1/invitations/:id

Get invitation details.

For approved invitations with a linked visit, the response includes safe QR email metadata:

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

### POST /api/v1/invitations/:id/approve

Approve an invitation. Requires `SUPER_ADMIN` or `PROPERTY_ADMIN`.

**Body:** `{ "note": "Optional approval note" }`

### POST /api/v1/invitations/:id/reject

Reject an invitation. Requires `SUPER_ADMIN` or `PROPERTY_ADMIN`.

**Body:** `{ "reason": "Rejection reason (required)" }`

### GET /api/v1/invitations/:id/approvals

List approval history for an invitation.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "status": "APPROVED",
      "approved_by": { "id": "uuid", "name": "Admin User" },
      "note": "Approved for visit",
      "created_at": "2026-06-22T09:00:00.000Z"
    }
  ]
}
```

### POST /api/v1/invitations/:id/generate-qr

Generate an invitation QR code for an approved invitation. Requires authenticated access plus property-scoped authorization. Roles: `SUPER_ADMIN`, `PROPERTY_ADMIN`, `OFFICE_STAFF`, `SECURITY_GUARD`.

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

---

## Badges

### GET /api/v1/badges

List badges.

**Query params:** `page`, `limit`

**Roles:** `SUPER_ADMIN`, `PROPERTY_ADMIN`, `SECURITY_GUARD`

### POST /api/v1/badges

Create a badge.

**Body:**

```json
{
  "invitation_id": "uuid",
  "visit_id": "uuid",
  "visitor_id": "uuid",
  "badge_type": "VISITOR",
  "badge_data": { "custom_field": "value" }
}
```

### GET /api/v1/badges/:id

Get badge details.

### GET /api/v1/badges/:id/print

Get printable badge data/PDF.

---

## Notifications

### GET /api/v1/notifications

List notifications for current user.

**Query params:** `page`, `limit`, `unreadOnly`

### GET /api/v1/notifications/unread-count

Get unread notification count.

**Response:**

```json
{ "success": true, "data": { "count": 5 } }
```

### PATCH /api/v1/notifications/:id/read

Mark a notification as read.

### POST /api/v1/notifications/mark-all-read

Mark all notifications as read for current user.

---

## Vehicles

All vehicle endpoints require role: `SUPER_ADMIN`, `PROPERTY_ADMIN`, or `SECURITY_GUARD`.

### GET /api/v1/vehicles

List vehicles with search and pagination.

**Query params:** `page`, `limit`, `search` (plate number), `owner_type`, `status`

**Response:**

```json
{
  "success": true,
  "data": {
    "vehicles": [
      {
        "id": "uuid",
        "plate_number": "ABC-1234",
        "vehicle_type": "CAR",
        "brand": "Toyota",
        "color": "White",
        "owner_type": "RESIDENT",
        "owner_user": { "id": "uuid", "name": "John Doe" },
        "status": "ACTIVE",
        "created_at": "2026-06-25T10:00:00.000Z"
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 20
  }
}
```

### POST /api/v1/vehicles

Register a vehicle.

**Body:**

```json
{
  "plate_number": "ABC-1234",
  "vehicle_type": "CAR",
  "brand": "Toyota",
  "color": "White",
  "owner_type": "RESIDENT",
  "owner_user_id": "uuid"
}
```

**For visitor vehicles:**

```json
{
  "plate_number": "XYZ-5678",
  "vehicle_type": "MOTORCYCLE",
  "brand": "Honda",
  "color": "Black",
  "owner_type": "VISITOR",
  "owner_visitor_id": "uuid"
}
```

### GET /api/v1/vehicles/:id

Get vehicle details with owner and recent visits.

### PATCH /api/v1/vehicles/:id

Update vehicle.

**Body:** Any subset of vehicle fields.

### DELETE /api/v1/vehicles/:id

Soft-delete vehicle.

---

## Vehicle Blacklist

### GET /api/v1/vehicles/blacklist

List blacklisted vehicle plates.

**Query params:** `page`, `limit`, `search`

**Roles:** `SUPER_ADMIN`, `PROPERTY_ADMIN`

### POST /api/v1/vehicles/blacklist

Add a plate to the blacklist.

**Body:**

```json
{
  "plate_number": "ABC-1234",
  "reason": "Unauthorized vehicle"
}
```

### PATCH /api/v1/vehicles/blacklist/:id

Update blacklist entry (e.g., change status to REMOVED).

### DELETE /api/v1/vehicles/blacklist/:id

Remove from blacklist.

---

## Reference Data

### GET /api/v1/units

List units scoped to user's property.

**Query params:** `page`, `limit`

### GET /api/v1/users

List users scoped to user's property.

**Query params:** `page`, `limit`, `search`, `role` (comma-separated, e.g. `?role=RESIDENT,PROPERTY_ADMIN`)

---

## Public Endpoints (No Auth)

### GET /qr-access/:emailAccessToken

Visitor-facing hosted QR access page used from email links.

**Validation:**

- access token exists
- access token is not expired
- linked invitation, visit, and QR are still valid
- linked delivery status is `SENT`

The page shows visit and property context plus the hosted QR image. It never exposes the raw QR token in the URL.

### POST /api/v1/checkin

Check in with QR token (kiosk/public use).

### GET /api/v1/qr/email-image/:emailAccessToken

Public QR image for email delivery.
