Database Design Skill

Purpose

Design scalable, secure and multi-tenant PostgreSQL databases.

Rules

- Use UUID as primary key.
- Use PostgreSQL.
- Use Prisma ORM.
- Every tenant-owned table must include property_id.
- Use soft delete:
  - deleted_at timestamp nullable
- Use created_at and updated_at.
- Use foreign key constraints.
- Use indexes for search and dashboard queries.
- Use composite indexes for reporting.

Database Standards

Primary Key

- id UUID
- default uuid()

Audit Fields

- created_at
- updated_at
- deleted_at

Naming

- Table names: singular PascalCase
- Columns: snake_case
- Foreign key:
  - property_id
  - visitor_id
  - unit_id
  - user_id

Multi Tenancy

Every query must filter:

WHERE property_id = ?

except:

Super Admin

Never allow cross-property access.

Security

- Password hash only
- Never store plaintext password
- Use FK constraints
- Use enum for statuses

Preferred Enums

PropertyType

- condo
- apartment
- office
- warehouse

UserRole

- super_admin
- property_admin
- security_guard
- resident
- office_staff

VisitStatus

- expected
- checked_in
- checked_out
- cancelled
- no_show

QRStatus

- active
- used
- expired
- revoked
