# Database Schema

Enum Definitions

PropertyType

* CONDO
* APARTMENT
* OFFICE
* WAREHOUSE

PropertyStatus

* ACTIVE
* INACTIVE

UnitStatus

* OCCUPIED
* VACANT
* MAINTENANCE

UserRole

* SUPER_ADMIN
* PROPERTY_ADMIN
* SECURITY_GUARD
* RESIDENT
* OFFICE_STAFF

UserStatus

* ACTIVE
* INACTIVE
* LOCKED

IdType

* NRC
* PASSPORT
* DRIVING_LICENSE
* COMPANY_ID
* OTHER

VisitPurpose

* FAMILY_VISIT
* BUSINESS_MEETING
* DELIVERY
* MAINTENANCE
* INTERVIEW
* CONTRACTOR
* OTHER

VisitStatus

* EXPECTED
* CHECKED_IN
* CHECKED_OUT
* NO_SHOW
* CANCELLED

QRStatus

* ACTIVE
* USED
* EXPIRED
* REVOKED

AuditAction

* LOGIN
* LOGOUT
* CREATE_VISITOR
* UPDATE_VISITOR
* DELETE_VISITOR
* GENERATE_QR
* CHECK_IN
* CHECK_OUT
* FAILED_QR_SCAN
* MANUAL_CHECKOUT
* BLOCKLIST_MATCH

BlocklistStatus

* ACTIVE
* REMOVED

⸻

Property

* id: uuid
* name: varchar
* type: PropertyType
* address: text
* timezone: varchar
* status: PropertyStatus
* created_at: timestamp
* updated_at: timestamp
* deleted_at: timestamp

⸻

Unit

* id: uuid
* property_id: uuid
* unit_no: varchar
* floor: integer
* status: UnitStatus
* created_at: timestamp
* updated_at: timestamp
* deleted_at: timestamp

⸻

User

* id: uuid
* property_id: uuid nullable for SUPER_ADMIN
* unit_id: uuid nullable
* name: varchar
* email: varchar
* password_hash: varchar
* role: UserRole
* status: UserStatus
* created_at: timestamp
* updated_at: timestamp
* deleted_at: timestamp

Notes:

* RESIDENT users should have unit_id.
* OFFICE_STAFF users may have unit_id if the office or department is modeled as a unit.
* SUPER_ADMIN may have property_id as null.

⸻

Visitor

* id: uuid
* property_id: uuid
* name: varchar
* phone: varchar
* id_type: IdType
* id_number: varchar
* photo_url: text
* created_at: timestamp
* updated_at: timestamp
* deleted_at: timestamp

⸻

Visit

* id: uuid
* property_id: uuid
* visitor_id: uuid
* unit_id: uuid
* host_user_id: uuid
* purpose: VisitPurpose
* notes: text
* vehicle_number: varchar
* expected_checkin_time: timestamp
* checkin_time: timestamp
* checkout_time: timestamp
* status: VisitStatus
* created_at: timestamp
* updated_at: timestamp
* deleted_at: timestamp

⸻

QRCode

* id: uuid
* property_id: uuid
* visit_id: uuid
* token_hash: varchar
* status: QRStatus
* expires_at: timestamp
* used_at: timestamp
* revoked_at: timestamp
* created_at: timestamp
* updated_at: timestamp

⸻

AuditLog

* id: uuid
* property_id: uuid
* user_id: uuid nullable
* action: AuditAction
* resource_type: varchar
* resource_id: uuid nullable
* ip_address: varchar
* user_agent: text
* metadata: json
* created_at: timestamp

Notes:

* Audit logs are append-only.
* Audit logs should not use soft delete.

⸻

Blocklist

* id: uuid
* property_id: uuid
* visitor_name: varchar
* phone: varchar
* id_number: varchar
* reason: text
* status: BlocklistStatus
* created_by: uuid
* created_at: timestamp
* updated_at: timestamp
* deleted_at: timestamp

⸻

Foreign Key Relationships

Property Relationships

* Unit.property_id -> Property.id
* User.property_id -> Property.id
* Visitor.property_id -> Property.id
* Visit.property_id -> Property.id
* QRCode.property_id -> Property.id
* AuditLog.property_id -> Property.id
* Blocklist.property_id -> Property.id

Unit Relationships

* User.unit_id -> Unit.id
* Visit.unit_id -> Unit.id

Visitor Relationships

* Visit.visitor_id -> Visitor.id

User Relationships

* Visit.host_user_id -> User.id
* AuditLog.user_id -> User.id
* Blocklist.created_by -> User.id

Visit Relationships

* QRCode.visit_id -> Visit.id

⸻

Required Indexes

Property

* index(status)

Unit

* index(property_id)
* unique(property_id, unit_no)
* index(property_id, status)

User

* unique(email)
* index(property_id)
* index(unit_id)
* index(role)
* index(status)
* index(property_id, role)
* index(property_id, status)

Visitor

* index(property_id)
* index(phone)
* index(id_number)
* index(property_id, phone)
* index(property_id, id_number)

Visit

* index(property_id)
* index(visitor_id)
* index(unit_id)
* index(host_user_id)
* index(status)
* index(expected_checkin_time)
* index(checkin_time)
* index(property_id, status, expected_checkin_time)
* index(property_id, checkin_time)
* index(property_id, visitor_id)
* index(property_id, unit_id)

QRCode

* unique(token_hash)
* index(property_id)
* index(visit_id)
* index(status)
* index(expires_at)
* index(property_id, status, expires_at)

AuditLog

* index(property_id)
* index(user_id)
* index(action)
* index(created_at)
* index(property_id, created_at)
* index(property_id, action)
* index(property_id, user_id)

Blocklist

* index(property_id)
* index(phone)
* index(id_number)
* index(status)
* index(property_id, phone)
* index(property_id, id_number)
* index(property_id, status)

⸻

Multi-Tenancy Rule

Every tenant-owned table must include property_id.

Tenant-owned tables:

* Unit
* User
* Visitor
* Visit
* QRCode
* AuditLog
* Blocklist

All application queries must filter by property_id unless the user is Super Admin.

⸻

Soft Delete Rule

Use deleted_at for soft delete.

Tables with soft delete:

* Property
* Unit
* User
* Visitor
* Visit
* Blocklist

Tables without soft delete:

* QRCode
* AuditLog

Reason:

* QRCode uses lifecycle status.
* AuditLog must be append-only.

Future Tables

Invitation

* id: uuid
* property_id: uuid
* visitor_name: varchar
* visitor_phone: varchar
* visitor_email: varchar
* visitor_type: varchar
* host_user_id: uuid
* approval_status: varchar
* qr_code_id: uuid nullable
* expires_at: timestamp
* created_at: timestamp

Badge

* id: uuid
* property_id: uuid
* visit_id: uuid
* badge_number: varchar
* printed_at: timestamp
* returned_at: timestamp

Notification

* id: uuid
* property_id: uuid
* visit_id: uuid
* channel: varchar
* recipient: varchar
* status: varchar
* sent_at: timestamp

Vehicle

* id: uuid
* property_id: uuid
* visit_id: uuid
* vehicle_number: varchar
* vehicle_type: varchar

NDA

* id: uuid
* property_id: uuid
* visit_id: uuid
* signed: boolean
* signed_at: timestamp

SafetyForm

* id: uuid
* property_id: uuid
* visit_id: uuid
* completed: boolean
* completed_at: timestamp

And future:

* Invitation
* Badge
* Notification
* Vehicle
* NDA
* SafetyForm

VisitorType

GUEST

FAMILY

VIP

VENDOR

CONTRACTOR

DELIVERY

AUDITOR

GOVERNMENT
