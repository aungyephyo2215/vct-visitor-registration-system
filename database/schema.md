# Database Schema

## Enum Definitions

### PropertyType

- CONDO
- APARTMENT
- OFFICE
- WAREHOUSE

### PropertyStatus

- ACTIVE
- INACTIVE

### UnitStatus

- OCCUPIED
- VACANT
- MAINTENANCE

### UserRole

- SUPER_ADMIN
- PROPERTY_ADMIN
- SECURITY_GUARD
- RESIDENT
- OFFICE_STAFF

### UserStatus

- ACTIVE
- INACTIVE
- LOCKED

### IdType

- NRC
- PASSPORT
- DRIVING_LICENSE
- COMPANY_ID
- OTHER

### VisitPurpose

- FAMILY_VISIT
- BUSINESS_MEETING
- DELIVERY
- MAINTENANCE
- INTERVIEW
- CONTRACTOR
- OTHER

### VisitStatus

- EXPECTED
- CHECKED_IN
- CHECKED_OUT
- NO_SHOW
- CANCELLED

### QRStatus

- ACTIVE
- USED
- EXPIRED
- REVOKED

### AuditAction

- LOGIN
- LOGOUT
- CREATE_VISITOR
- UPDATE_VISITOR
- DELETE_VISITOR
- CREATE_VISIT
- UPDATE_VISIT
- GENERATE_QR
- MANUAL_RESEND_QR_EMAIL
- CHECK_IN
- CHECK_OUT
- FAILED_QR_SCAN
- MANUAL_CHECKOUT
- BLOCKLIST_MATCH
- CREATE_INVITATION
- UPDATE_INVITATION
- DELETE_INVITATION
- APPROVE_INVITATION
- REJECT_INVITATION
- VERIFY_VISITOR
- ATTACH_VISITOR
- CREATE_VEHICLE
- UPDATE_VEHICLE
- DELETE_VEHICLE
- BLOCK_VEHICLE

### InvitationStatus

- PENDING
- APPROVED
- REJECTED
- EXPIRED
- CANCELLED

### VisitorType

- GUEST
- FAMILY
- VIP
- VENDOR
- CONTRACTOR
- DELIVERY
- AUDITOR
- GOVERNMENT

### ApprovalStatus

- PENDING
- APPROVED
- REJECTED
- CANCELLED

### BlocklistStatus

- ACTIVE
- REMOVED

### NotificationType

- INVITATION_CREATED
- INVITATION_APPROVED
- INVITATION_REJECTED
- QR_GENERATED
- VISITOR_VERIFIED
- CHECKED_IN
- CHECKED_OUT

### NotificationResourceType

- invitation
- visit
- verification

### QrEmailDeliveryStatus

- PENDING
- SENT
- FAILED
- SKIPPED

### QrEmailDeliveryTriggerType

- AUTO
- MANUAL_RESEND

### VehicleType

- CAR
- MOTORCYCLE
- TRUCK
- VAN
- BUS
- BICYCLE
- ELECTRIC_SCOOTER
- OTHER

### VehicleOwnerType

- RESIDENT
- VISITOR

### VehicleStatus

- ACTIVE
- BLOCKED

---

## Models

### Property

- id: uuid
- name: varchar
- type: PropertyType
- address: text
- timezone: varchar
- status: PropertyStatus
- created_at: timestamp
- updated_at: timestamp
- deleted_at: timestamp

---

### Unit

- id: uuid
- property_id: uuid
- unit_no: varchar
- floor: integer
- status: UnitStatus
- created_at: timestamp
- updated_at: timestamp
- deleted_at: timestamp

---

### User

- id: uuid
- property_id: uuid (nullable for SUPER_ADMIN)
- unit_id: uuid (nullable)
- name: varchar
- email: varchar (unique)
- password_hash: varchar
- role: UserRole
- status: UserStatus
- created_at: timestamp
- updated_at: timestamp
- deleted_at: timestamp

Notes:

- RESIDENT users should have unit_id.
- OFFICE_STAFF users may have unit_id if the office or department is modeled as a unit.
- SUPER_ADMIN may have property_id as null.

---

### Visitor

- id: uuid
- property_id: uuid
- name: varchar
- phone: varchar
- id_type: IdType
- id_number: varchar
- photo_url: text (nullable)
- created_at: timestamp
- updated_at: timestamp
- deleted_at: timestamp

---

### Visit

- id: uuid
- property_id: uuid
- visitor_id: uuid (nullable - can be attached later via security workflow)
- unit_id: uuid
- host_user_id: uuid (nullable)
- vehicle_id: uuid (nullable)
- purpose: VisitPurpose
- notes: text (nullable)
- vehicle_number: varchar (nullable)
- expected_checkin_time: timestamp (nullable)
- checkin_time: timestamp (nullable)
- checkout_time: timestamp (nullable)
- status: VisitStatus
- created_at: timestamp
- updated_at: timestamp
- deleted_at: timestamp

---

### QRCode

- id: uuid
- property_id: uuid
- visit_id: uuid
- token_hash: varchar (unique)
- status: QRStatus
- expires_at: timestamp
- used_at: timestamp (nullable)
- revoked_at: timestamp (nullable)
- created_at: timestamp
- updated_at: timestamp

---

### AuditLog

- id: uuid
- property_id: uuid
- user_id: uuid (nullable)
- action: AuditAction
- resource_type: varchar
- resource_id: uuid (nullable)
- ip_address: varchar
- user_agent: text
- metadata: json (nullable)
- created_at: timestamp

Notes:

- Audit logs are append-only.
- Audit logs should not use soft delete.

---

### Blocklist

- id: uuid
- property_id: uuid
- visitor_name: varchar
- phone: varchar (nullable)
- id_number: varchar (nullable)
- reason: text
- status: BlocklistStatus
- created_by: uuid
- created_at: timestamp
- updated_at: timestamp
- deleted_at: timestamp

---

### Notification

- id: uuid
- user_id: uuid
- property_id: uuid
- type: NotificationType
- title: varchar
- message: text
- resource_type: NotificationResourceType
- resource_id: uuid (nullable)
- action_url: varchar (nullable)
- metadata: json (nullable)
- is_read: boolean (default: false)
- read_at: timestamp (nullable)
- created_at: timestamp
- updated_at: timestamp

---

### Invitation

- id: uuid
- property_id: uuid
- invited_by: uuid
- visitor_name: varchar
- visitor_phone: varchar
- visitor_email: varchar (nullable)
- visitor_id_type: IdType (nullable)
- visitor_id_number: varchar (nullable)
- visitor_type: VisitorType
- unit_id: uuid
- expected_date: timestamp
- expected_time: varchar (nullable)
- notes: text (nullable)
- status: InvitationStatus
- reason: text (nullable - rejection reason)
- approved_by: uuid (nullable)
- approved_at: timestamp (nullable)
- visit_id: uuid (nullable - linked after QR generation)
- created_at: timestamp
- updated_at: timestamp
- deleted_at: timestamp

---

### Approval

- id: uuid
- invitation_id: uuid
- status: ApprovalStatus
- approved_by: uuid
- note: text (nullable)
- created_at: timestamp
- updated_at: timestamp

---

### Badge

- id: uuid
- property_id: uuid
- invitation_id: uuid (nullable)
- visit_id: uuid (nullable)
- visitor_id: uuid (nullable)
- badge_type: varchar
- badge_data: json (nullable)
- generated_at: timestamp
- printed_at: timestamp (nullable)
- expires_at: timestamp (nullable)

---

### Verification

- id: uuid
- property_id: uuid
- visit_id: uuid (unique - one verification per visit)
- visitor_id: uuid (nullable)
- photo_url: varchar (nullable)
- vehicle_number: varchar (nullable)
- nda_signed: boolean (default: false)
- safety_form_signed: boolean (default: false)
- verified_by: uuid
- verified_at: timestamp
- created_at: timestamp
- updated_at: timestamp

---

### QrEmailDelivery

- id: uuid
- property_id: uuid
- invitation_id: uuid
- visit_id: uuid
- qr_code_id: uuid
- recipient_email: varchar
- trigger_type: QrEmailDeliveryTriggerType
- status: QrEmailDeliveryStatus
- provider: varchar
- provider_message_id: varchar (nullable)
- subject: varchar
- idempotency_key: varchar (nullable, unique)
- email_access_token: varchar (nullable, unique)
- email_access_token_hash: varchar (nullable, unique)
- failure_code: varchar (nullable)
- failure_message: text (nullable)
- sent_at: timestamp (nullable)
- expires_at: timestamp (nullable)
- created_by: uuid (nullable)
- created_at: timestamp
- updated_at: timestamp

---

### Vehicle

- id: uuid
- property_id: uuid
- plate_number: varchar
- vehicle_type: VehicleType
- brand: varchar (nullable)
- color: varchar (nullable)
- owner_type: VehicleOwnerType
- owner_user_id: uuid (nullable)
- owner_visitor_id: uuid (nullable)
- status: VehicleStatus (default: ACTIVE)
- created_at: timestamp
- updated_at: timestamp
- deleted_at: timestamp

Notes:

- Unique constraint on (property_id, plate_number).
- Owner can be either a resident (owner_user_id) or visitor (owner_visitor_id).

---

### VehicleBlacklist

- id: uuid
- property_id: uuid
- plate_number: varchar
- reason: text (nullable)
- status: BlocklistStatus (default: ACTIVE)
- created_by: uuid (nullable)
- created_at: timestamp
- updated_at: timestamp

Notes:

- Unique constraint on (property_id, plate_number).
- Blocked plates trigger automatic check-in rejection.

---

## Foreign Key Relationships

### Property Relationships

- Unit.property_id -> Property.id
- User.property_id -> Property.id
- Visitor.property_id -> Property.id
- Visit.property_id -> Property.id
- QRCode.property_id -> Property.id
- AuditLog.property_id -> Property.id
- Blocklist.property_id -> Property.id
- Notification.property_id -> Property.id
- Invitation.property_id -> Property.id
- Badge.property_id -> Property.id
- Verification.property_id -> Property.id
- QrEmailDelivery.property_id -> Property.id
- Vehicle.property_id -> Property.id
- VehicleBlacklist.property_id -> Property.id

### Unit Relationships

- User.unit_id -> Unit.id
- Visit.unit_id -> Unit.id
- Invitation.unit_id -> Unit.id

### Visitor Relationships

- Visit.visitor_id -> Visitor.id
- Verification.visitor_id -> Visitor.id
- Vehicle.owner_visitor_id -> Visitor.id

### User Relationships

- Visit.host_user_id -> User.id
- AuditLog.user_id -> User.id
- Blocklist.created_by -> User.id
- Invitation.invited_by -> User.id
- Invitation.approved_by -> User.id
- Approval.approved_by -> User.id
- Verification.verified_by -> User.id
- Notification.user_id -> User.id
- QrEmailDelivery.created_by -> User.id
- Vehicle.owner_user_id -> User.id
- VehicleBlacklist.created_by -> User.id

### Visit Relationships

- QRCode.visit_id -> Visit.id
- Invitation.visit_id -> Visit.id
- Verification.visit_id -> Visit.id
- QrEmailDelivery.visit_id -> Visit.id
- Vehicle.visits -> Visit (via Visit.vehicle_id)

### Invitation Relationships

- Approval.invitation_id -> Invitation.id
- Badge.invitation_id -> Invitation.id
- QrEmailDelivery.invitation_id -> Invitation.id

### QRCode Relationships

- QrEmailDelivery.qr_code_id -> QRCode.id

---

## Required Indexes

### Property

- index(status)

### Unit

- index(property_id)
- unique(property_id, unit_no)
- index(property_id, status)

### User

- unique(email)
- index(property_id)
- index(unit_id)
- index(role)
- index(status)
- index(property_id, role)
- index(property_id, status)

### Visitor

- index(property_id)
- index(phone)
- index(id_number)
- index(property_id, phone)
- index(property_id, id_number)

### Visit

- index(property_id)
- index(visitor_id)
- index(unit_id)
- index(host_user_id)
- index(vehicle_id)
- index(status)
- index(expected_checkin_time)
- index(checkin_time)
- index(property_id, status, expected_checkin_time)
- index(property_id, checkin_time)
- index(property_id, visitor_id)
- index(property_id, unit_id)

### QRCode

- unique(token_hash)
- index(property_id)
- index(visit_id)
- index(status)
- index(expires_at)
- index(property_id, status, expires_at)

### AuditLog

- index(property_id)
- index(user_id)
- index(action)
- index(created_at)
- index(property_id, created_at)
- index(property_id, action)
- index(property_id, user_id)

### Blocklist

- index(property_id)
- index(phone)
- index(id_number)
- index(status)
- index(property_id, phone)
- index(property_id, id_number)
- index(property_id, status)

### Notification

- index(user_id, is_read, created_at)
- index(property_id)
- index(user_id, created_at)

### Invitation

- index(property_id)
- index(status)
- index(invited_by)
- index(property_id, status)
- index(property_id, expected_date)
- index(property_id, invited_by)
- index(visit_id)

### Approval

- index(invitation_id)
- index(invitation_id, status)

### Badge

- index(property_id)
- index(invitation_id)
- index(visit_id)

### Verification

- unique(visit_id)
- index(property_id)
- index(verified_by)

### QrEmailDelivery

- unique(idempotency_key)
- unique(email_access_token)
- unique(email_access_token_hash)
- index(property_id)
- index(invitation_id)
- index(visit_id)
- index(qr_code_id)
- index(status)
- index(created_at)
- index(qr_code_id, trigger_type, created_at)

### Vehicle

- unique(property_id, plate_number)
- index(property_id)
- index(plate_number)
- index(owner_user_id)
- index(owner_visitor_id)
- index(property_id, status)

### VehicleBlacklist

- unique(property_id, plate_number)
- index(property_id)
- index(plate_number)

---

## Multi-Tenancy Rule

Every tenant-owned table must include property_id.

Tenant-owned tables:

- Unit
- User
- Visitor
- Visit
- QRCode
- AuditLog
- Blocklist
- Notification
- Invitation
- Badge
- Verification
- QrEmailDelivery
- Vehicle
- VehicleBlacklist

All application queries must filter by property_id unless the user is Super Admin.

---

## Soft Delete Rule

Use deleted_at for soft delete.

Tables with soft delete:

- Property
- Unit
- User
- Visitor
- Visit
- Blocklist
- Invitation
- Vehicle

Tables without soft delete:

- QRCode (uses lifecycle status)
- AuditLog (append-only)
- Notification (uses read/unread state)
- Approval (lifecycle tied to Invitation)
- Badge (lifecycle tied to Invitation/Visit)
- Verification (lifecycle tied to Visit)
- QrEmailDelivery (uses delivery status)
- VehicleBlacklist (uses BlocklistStatus)
