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
  "data": { }
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

### POST /api/v1/checkin
Check in with QR token. No auth required (kiosk/public use).

**Body:** `{ "token": "qr-token-string" }`

Validates: token exists, active, not expired, visit not already checked in, visitor not blocked.

### POST /api/v1/checkout
Check out a visit. Requires `SUPER_ADMIN`, `PROPERTY_ADMIN`, or `SECURITY_GUARD`.

**Body:** `{ "visit_id": "uuid" }`

---

## Reference Data

### GET /api/v1/units
List units scoped to user's property.

**Query params:** `page`, `limit`

### GET /api/v1/users
List users scoped to user's property.

**Query params:** `page`, `limit`, `search`, `role` (comma-separated, e.g. `?role=RESIDENT,PROPERTY_ADMIN`)
