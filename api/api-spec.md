# API Specification

Base URL
`/api/v1`
⸻
Authentication
Login
POST /auth/login

Request

```json
{
  "email": "admin@example.com",
  "password": "password"
}
```

Response

```json
{
  "access_token": "xxxxx",
  "refresh_token": "xxxxx"
}
```

⸻
Current User
GET /auth/me
⸻
Logout
POST /auth/logout
⸻
Visitors
Get Visitors
GET /visitors
Query
?page=1
&limit=20
&search=john
⸻
Create Visitor
POST /visitors
Request
{
  "name": "John Doe",
  "phone": "+95912345678",
  "visitor_type": "GUEST",
  "id_type": "NRC",
  "id_number": "12/ABC(N)123456",
  "photo_url": "",
  "vehicle_number": ""
}
⸻
Get Visitor
GET /visitors/:id
⸻
Update Visitor
PATCH /visitors/:id
⸻
Delete Visitor
DELETE /visitors/:id
⸻
Visits
Get Visits
GET /visits
Query
?page=1
&limit=20
&status=EXPECTED
&search=john
⸻
Create Visit
POST /visits
Request
{
  "visitor_id": "uuid",
  "property_id": "uuid",
  "unit_id": "uuid",
  "host_user_id": "uuid",
  "purpose": "FAMILY_VISIT",
  "expected_checkin_time": "2026-06-20T09:00:00Z",
  "notes": "",
  "vehicle_number": ""
}
⸻
Get Visit
GET /visits/:id
⸻
Update Visit
PATCH /visits/:id
⸻
Delete Visit
DELETE /visits/:id
⸻
Invitation
Supports:

* Pre-register
* Guest Invitation
* Vendor Invitation
* Contractor Invitation

⸻
Get Invitations
GET /invitations
⸻
Create Invitation
POST /invitations
⸻
Get Invitation
GET /invitations/:id
⸻
Update Invitation
PATCH /invitations/:id
⸻
Delete Invitation
DELETE /invitations/:id
⸻
Approval
Supports:

* Auto Approval
* Resident Approval
* Manager Approval
* Security Approval

⸻
Get Approvals
GET /approvals
⸻
Get Approval
GET /approvals/:id
⸻
Approve
POST /approvals/:id/approve
⸻
Reject
POST /approvals/:id/reject
⸻
QR Service
Generate QR
POST /qr/generate
Request
{
  "visit_id": "uuid"
}
⸻
Get QR
GET /qr/:token
⸻
Validate QR
POST /qr/validate
⸻
Badge Service
Generate Badge
POST /badges/generate
⸻
Get Badge
GET /badges/:id
⸻
Get Badge PDF
GET /badges/:id/pdf
⸻
Print Badge
POST /badges/:id/print
⸻
Verification
Optional Verification

* Photo
* ID Card
* Vehicle
* NDA
* Safety Form
⸻
Photo
POST /photos
GET /photos/:id
⸻
ID Verification
POST /id-verifications
GET /id-verifications/:id
⸻
Vehicle
POST /vehicles
GET /vehicles/:id
⸻
NDA
POST /nda
GET /nda/:id
⸻
Safety Form
POST /safety-forms
GET /safety-forms/:id
⸻
Check In
POST /checkin
Request
{
  "token": "qr_token"
}
⸻
Check Out
POST /checkout
Request
{
  "visit_id": "uuid"
}
⸻
Notification
Channels
* Email
* SMS
* Telegram
* LINE
* In-app Notification
⸻
Get Notifications
GET /notifications
⸻
Get Notification
GET /notifications/:id
⸻
Send Notification
POST /notifications/send
⸻
Mark as Read
PATCH /notifications/:id/read
⸻
Delivery
Supports:
* Shopee
* Lazada
* Grab
* Foodpanda
* DHL
* UPS
* FedEx
⸻
Get Deliveries
GET /deliveries
⸻
Create Delivery
POST /deliveries
⸻
Get Delivery
GET /deliveries/:id
⸻
Update Delivery
PATCH /deliveries/:id
⸻
Notify Receiver
POST /deliveries/:id/notify
⸻
Pickup Package
POST /deliveries/:id/pickup
⸻
Reports
Daily Report
GET /reports/daily
⸻
Monthly Report
GET /reports/monthly
⸻
Frequent Visitors
GET /reports/frequent-visitors
⸻
Peak Hours
GET /reports/peak-hours
⸻
Contractor Report
GET /reports/contractors
⸻
Delivery Report
GET /reports/deliveries
⸻
Security Report
GET /reports/security
⸻
Vehicle Report
GET /reports/vehicles
⸻
Future AI
Not MVP.
Reserved for future phases.
⸻
GET /ai/visitor-summary/:visitorId
GET /ai/frequent-visitors
GET /ai/peak-hours
GET /ai/security-alerts
GET /ai/risk-score/:visitorId
⸻
Visitor Types
GUEST
FAMILY
VIP
VENDOR
CONTRACTOR
DELIVERY
AUDITOR
GOVERNMENT
⸻
Visit Status
EXPECTED
CHECKED_IN
CHECKED_OUT
CANCELLED
NO_SHOW
⸻
User Roles
SUPER_ADMIN
PROPERTY_ADMIN
SECURITY_GUARD
RESIDENT
OFFICE_STAFF
