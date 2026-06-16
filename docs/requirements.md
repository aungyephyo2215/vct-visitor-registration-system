Visitor Registration System Requirements

Business Goal

Build a digital Visitor Registration System to:

* Replace paper visitor registration.
* Improve property security.
* Track visitor history.
* Support QR-based check-in and check-out.
* Provide dashboards and reports.
* Support Condo, Apartment, Office, and Warehouse.

⸻

Multi-Tenancy Model

The system supports multiple properties.

Property types:

* Condo
* Apartment
* Office
* Warehouse

Each property contains:

* Users
* Units
* Visitors
* Visits
* Audit Logs

Users from Property A cannot access Property B data.

⸻

User Roles

Super Admin

Responsibilities:

* Manage all properties
* Manage property admins
* View all reports
* Configure system settings

⸻

Property Admin

Responsibilities:

* Manage users
* Manage units
* View reports
* Manage security guards
* View audit logs

⸻

Security Guard

Responsibilities:

* Register walk-in visitors
* Scan QR codes
* Check-in visitors
* Check-out visitors
* Search visitor history
* View today’s visitor list

⸻

Resident

Responsibilities:

* Register expected visitors
* View visitor history
* Cancel pending visitors

⸻

Office Staff

Responsibilities:

* Register expected visitors
* View visitor history
* Receive visitor notifications

⸻

Main Features

Visitor Registration

Support:

* Walk-in visitors
* Pre-registered visitors

Visitor fields:

* Name
* Phone Number
* ID Type
* ID Number
* Purpose
* Host User
* Unit
* Vehicle Number (optional)
* Photo (optional)
* Notes

⸻

QR Code Generation

QR must:

* Use secure random token
* Be single-use
* Expire automatically
* Not expose database IDs

QR status:

* Active
* Used
* Expired
* Revoked

⸻

QR Check-In

System validates:

* QR exists
* QR not expired
* QR not used
* Visitor not blacklisted
* Visitor belongs to the property

After success:

* Record check-in time
* Mark QR as used
* Create audit log

⸻

QR Check-Out

System validates:

* Visit exists
* Visitor checked in
* Visitor not already checked out

After success:

* Record check-out time
* Create audit log

⸻

Visitor History

Support:

* Search by name
* Search by phone
* Search by date
* Search by host
* Search by status

⸻

Dashboard

Display:

* Today’s visitors
* Checked-in visitors
* Checked-out visitors
* Pending visitors
* Recent activities
* Frequent visitors

⸻

Reports

Reports:

* Daily visitors
* Weekly visitors
* Monthly visitors
* Frequent visitors

Export:

* CSV
* Excel

⸻

Audit Logs

Record:

* Login
* Logout
* Create Visitor
* Update Visitor
* Delete Visitor
* Generate QR
* Check-In
* Check-Out
* Failed QR Scan

Audit fields:

* Property ID
* User ID
* Action
* Resource Type
* Resource ID
* IP Address
* User Agent
* Created At

⸻

Visitor Blocklist

Support blocked visitors.

Fields:

* Visitor Name
* Phone Number
* ID Number
* Reason
* Created By
* Created At

Blocked visitors cannot check in.

⸻

Visitor Photo Upload

Allowed:

* image/jpeg
* image/png
* image/webp

Max Size:

* 5 MB

Rules:

* Reject unsupported file types
* Reject oversized files
* Store files securely
* Future: S3 storage

⸻

Purpose of Visit

Allowed values:

* Family Visit
* Business Meeting
* Delivery
* Maintenance
* Interview
* Contractor
* Other

If “Other”:

* Notes required

⸻

Non Functional Requirements

Performance:

* Response time < 2 seconds
* Support 100 concurrent users

Security:

* JWT Authentication
* Role Based Access Control (RBAC)
* Property-level data isolation
* QR replay protection
* Rate limiting
* Audit logging

Mobile:

* Mobile responsive
* QR scanner works on mobile
* Tablet friendly

Reliability:

* Docker deployment
* Database migration
* Daily backup

⸻

Future Features

AI Visitor Statistics

* Daily Visitors
* Weekly Visitors
* Monthly Visitors
* Peak Hours
* Frequent Visitors

⸻

Suspicious Visitor Alerts

Example:

John Doe visited

7 times

within 2 days

after office hours.

Alert security dashboard.

⸻

AI Assistant

Provide:

* Visitor analytics
* Natural language reports
* Security suggestions

⸻

Other Future Features

* Face Recognition
* Mobile Application
* Push Notifications
* Email Notifications

## Data Isolation Requirement

Every tenant-owned table must include `property_id`.

Required tables with `property_id`:

- users
- units
- visitors
- visits
- audit_logs
- qr_codes
- blocklists

Security rule:

All queries must filter by `property_id` unless the user is Super Admin.

Users from one property must never access visitors, visits, QR codes, audit logs, or reports from another property.