# Entity Relationship Diagram

## Core Entities

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                   PROPERTY                                          │
│  id, name, type(CONDO|APARTMENT|OFFICE|WAREHOUSE), address, timezone, status        │
└────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┘
         │          │          │          │          │          │          │
         ▼          ▼          ▼          ▼          ▼          ▼          ▼
      ┌──────┐  ┌──────┐  ┌────────┐  ┌──────┐  ┌───────┐  ┌────────┐  ┌─────────┐
      │ UNIT │  │ USER │  │VISITOR │  │ VISIT│  │QRCode │  │AuditLog│  │Blocklist│
      └──┬───┘  └──┬───┘  └──┬─────┘  └──┬───┘  └───┬───┘  └────────┘  └─────────┘
         │         │         │            │          │
         │         │         │            │          │
         ▼         ▼         ▼            ▼          ▼
      ┌──────────────────────────────────────────────────────┐
      │                    INVITATION                         │
      │  visitor_name, visitor_phone, visitor_email,          │
      │  visitor_type, expected_date, status                  │
      └──┬────────────┬────────────┬─────────────────────────┘
         │            │            │
         ▼            ▼            ▼
    ┌─────────┐  ┌─────────┐  ┌──────────────────┐
    │APPROVAL │  │ BADGE   │  │QrEmailDelivery   │
    └─────────┘  └─────────┘  └──────────────────┘
```

## Full Relationship Map

```
Property (1) ──────┬──── (N) Unit
                   ├──── (N) User
                   ├──── (N) Visitor
                   ├──── (N) Visit
                   ├──── (N) QRCode
                   ├──── (N) AuditLog
                   ├──── (N) Blocklist
                   ├──── (N) Invitation
                   ├──── (N) Badge
                   ├──── (N) Verification
                   ├──── (N) Notification
                   ├──── (N) QrEmailDelivery
                   ├──── (N) Vehicle
                   └──── (N) VehicleBlacklist

Unit (1) ──────────┬──── (N) User
                   ├──── (N) Visit
                   └──── (N) Invitation

User (1) ──────────┬──── (N) Visit              (as host)
                   ├──── (N) AuditLog
                   ├──── (N) Blocklist           (as creator)
                   ├──── (N) Invitation          (as inviter)
                   ├──── (N) Invitation          (as approver)
                   ├──── (N) Approval
                   ├──── (N) Verification
                   ├──── (N) Notification
                   ├──── (N) QrEmailDelivery     (as creator)
                   ├──── (N) Vehicle             (as owner)
                   └──── (N) VehicleBlacklist    (as creator)

Visitor (1) ───────┬──── (N) Visit
                   ├──── (N) Verification
                   └──── (N) Vehicle             (as owner)

Visit (1) ─────────┬──── (N) QRCode
                   ├──── (N) Invitation
                   ├──── (1) Verification
                   └──── (N) QrEmailDelivery

Invitation (1) ────┬──── (N) Approval
                   ├──── (N) Badge
                   └──── (N) QrEmailDelivery

QRCode (1) ────────└──── (N) QrEmailDelivery

Vehicle (1) ───────└──── (N) Visit
```

## Detailed Entity Relationships

### Property

- Central multi-tenancy entity. Every tenant-owned record belongs to one Property.
- **Has many:** Units, Users, Visitors, Visits, QRCodes, AuditLogs, Blocklists, Invitations, Badges, Verifications, Notifications, QrEmailDeliveries, Vehicles, VehicleBlacklists

### Unit

- Represents a physical unit within a property (room, office, apartment).
- **Belongs to:** Property
- **Has many:** Users (residents/staff), Visits, Invitations

### User

- System user with role-based access (SUPER_ADMIN, PROPERTY_ADMIN, SECURITY_GUARD, RESIDENT, OFFICE_STAFF).
- **Belongs to:** Property (optional for SUPER_ADMIN), Unit (optional)
- **Has many:** Visits (hosted), AuditLogs, Blocklists (created), Invitations (invited/approved), Approvals, Verifications, Notifications, QrEmailDeliveries (created), Vehicles (owned), VehicleBlacklists (created)

### Visitor

- External person visiting the property.
- **Belongs to:** Property
- **Has many:** Visits, Verifications, Vehicles (owned)

### Visit

- Represents a single visit event linking visitor, unit, host, and optional vehicle.
- **Belongs to:** Property, Visitor (optional), Unit, Host User (optional), Vehicle (optional)
- **Has many:** QRCodes, Invitations, QrEmailDeliveries
- **Has one:** Verification

### QRCode

- Cryptographically secure, time-limited token for visit check-in/check-out.
- **Belongs to:** Property, Visit
- **Has many:** QrEmailDeliveries

### AuditLog

- Append-only log of all system actions. No soft delete.
- **Belongs to:** Property, User (optional)

### Blocklist

- Blocks visitors by name, phone, or ID number from checking in.
- **Belongs to:** Property, Creator User

### Notification

- In-app notification for users (7 event types: invitation lifecycle, QR generation, visitor verification, check-in/out).
- **Belongs to:** User, Property

### Invitation

- Pre-registration of a visitor by a host (RESIDENT or OFFICE_STAFF). Triggers approval workflow.
- **Belongs to:** Property, Inviter User, Approver User (optional), Unit, Visit (optional, linked after QR generation)
- **Has many:** Approvals, Badges, QrEmailDeliveries

### Approval

- Individual approval/rejection record for an invitation.
- **Belongs to:** Invitation, Approver User

### Badge

- Visitor badge generated for an invitation or visit.
- **Belongs to:** Property, Invitation (optional)

### Verification

- Security verification record at check-in (photo, vehicle number, NDA, safety form).
- **Belongs to:** Property, Visit, Visitor (optional), Verifier User
- **Unique constraint:** One verification per visit

### QrEmailDelivery

- Tracks QR email delivery status (auto or manual resend) with provider details and access tokens.
- **Belongs to:** Property, Invitation, Visit, QRCode, Creator User (optional)

### Vehicle

- Registered vehicle linked to a resident or visitor.
- **Belongs to:** Property, Owner User (optional), Owner Visitor (optional)
- **Has many:** Visits
- **Unique constraint:** One plate number per property

### VehicleBlacklist

- Blocked vehicle plates that trigger automatic check-in rejection.
- **Belongs to:** Property, Creator User (optional)
- **Unique constraint:** One plate number per property

---

## Enums (16)

| Enum                           | Values                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PropertyType**               | CONDO, APARTMENT, OFFICE, WAREHOUSE                                                                                                                                                                                                                                                                                                                                                                  |
| **PropertyStatus**             | ACTIVE, INACTIVE                                                                                                                                                                                                                                                                                                                                                                                     |
| **UnitStatus**                 | OCCUPIED, VACANT, MAINTENANCE                                                                                                                                                                                                                                                                                                                                                                        |
| **UserRole**                   | SUPER_ADMIN, PROPERTY_ADMIN, SECURITY_GUARD, RESIDENT, OFFICE_STAFF                                                                                                                                                                                                                                                                                                                                  |
| **UserStatus**                 | ACTIVE, INACTIVE, LOCKED                                                                                                                                                                                                                                                                                                                                                                             |
| **IdType**                     | NRC, PASSPORT, DRIVING_LICENSE, COMPANY_ID, OTHER                                                                                                                                                                                                                                                                                                                                                    |
| **VisitPurpose**               | FAMILY_VISIT, BUSINESS_MEETING, DELIVERY, MAINTENANCE, INTERVIEW, CONTRACTOR, OTHER                                                                                                                                                                                                                                                                                                                  |
| **VisitStatus**                | EXPECTED, CHECKED_IN, CHECKED_OUT, NO_SHOW, CANCELLED                                                                                                                                                                                                                                                                                                                                                |
| **QRStatus**                   | ACTIVE, USED, EXPIRED, REVOKED                                                                                                                                                                                                                                                                                                                                                                       |
| **AuditAction**                | LOGIN, LOGOUT, CREATE_VISITOR, UPDATE_VISITOR, DELETE_VISITOR, CREATE_VISIT, UPDATE_VISIT, GENERATE_QR, MANUAL_RESEND_QR_EMAIL, CHECK_IN, CHECK_OUT, FAILED_QR_SCAN, MANUAL_CHECKOUT, BLOCKLIST_MATCH, CREATE_INVITATION, UPDATE_INVITATION, DELETE_INVITATION, APPROVE_INVITATION, REJECT_INVITATION, VERIFY_VISITOR, ATTACH_VISITOR, CREATE_VEHICLE, UPDATE_VEHICLE, DELETE_VEHICLE, BLOCK_VEHICLE |
| **InvitationStatus**           | PENDING, APPROVED, REJECTED, EXPIRED, CANCELLED                                                                                                                                                                                                                                                                                                                                                      |
| **VisitorType**                | GUEST, FAMILY, VIP, VENDOR, CONTRACTOR, DELIVERY, AUDITOR, GOVERNMENT                                                                                                                                                                                                                                                                                                                                |
| **ApprovalStatus**             | PENDING, APPROVED, REJECTED, CANCELLED                                                                                                                                                                                                                                                                                                                                                               |
| **BlocklistStatus**            | ACTIVE, REMOVED                                                                                                                                                                                                                                                                                                                                                                                      |
| **NotificationType**           | INVITATION_CREATED, INVITATION_APPROVED, INVITATION_REJECTED, QR_GENERATED, VISITOR_VERIFIED, CHECKED_IN, CHECKED_OUT                                                                                                                                                                                                                                                                                |
| **NotificationResourceType**   | invitation, visit, verification                                                                                                                                                                                                                                                                                                                                                                      |
| **QrEmailDeliveryStatus**      | PENDING, SENT, FAILED, SKIPPED                                                                                                                                                                                                                                                                                                                                                                       |
| **QrEmailDeliveryTriggerType** | AUTO, MANUAL_RESEND                                                                                                                                                                                                                                                                                                                                                                                  |
| **VehicleType**                | CAR, MOTORCYCLE, TRUCK, VAN, BUS, BICYCLE, ELECTRIC_SCOOTER, OTHER                                                                                                                                                                                                                                                                                                                                   |
| **VehicleOwnerType**           | RESIDENT, VISITOR                                                                                                                                                                                                                                                                                                                                                                                    |
| **VehicleStatus**              | ACTIVE, BLOCKED                                                                                                                                                                                                                                                                                                                                                                                      |
