# System Architecture

Browser / Mobile / Tablet

↓

Next.js Application

⸻

Core Modules

* Authentication Module
* Visitor Module
* Visit Module
* Invitation Module
* Approval Module
* Verification Module
* QR Service
* Badge Service
* Notification Service
* Reports Module

⸻

Authentication Module

* JWT Authentication
* Role Based Access Control (RBAC)

Roles

* SUPER_ADMIN
* PROPERTY_ADMIN
* SECURITY_GUARD
* RESIDENT
* OFFICE_STAFF

⸻

Visitor Module

Manage:

* Visitor Information
* Visitor Type
* Photo
* ID Information
* Vehicle Information

Visitor Types

* Guest
* Family
* VIP
* Vendor
* Contractor
* Delivery
* Auditor
* Government

⸻

Visit Module

Supports:

* Pre-register
* Walk-in
* Self-Kiosk (Future)

Workflow

Create Visit

↓

Approval

↓

Generate QR

↓

Send QR

↓

Visitor Arrives

↓

Check-in

↓

Notify Host

↓

Visitor Inside

↓

Check-out

⸻

Approval Module

Approval Types

* Auto Approval
* Resident Approval
* Manager Approval
* Security Approval

⸻

Verification Module

Optional Verification

* Photo Capture
* ID Card Verification
* Vehicle Registration
* NDA Form
* Safety Form

⸻

QR Service

Functions

* Generate QR Token
* QR Expiration
* QR Validation
* QR Scan Check-in
* QR Scan Check-out

⸻

Badge Service

Badge Types

* Sticker Badge
* Plastic Badge
* Printable PDF Badge

Contents

* QR
* Photo
* Name
* Company
* Visitor Type
* Valid Date

⸻

Notification Service

Channels

* Email
* SMS
* Telegram
* LINE
* In-app Notification

Events

* Invitation Created
* Approval Request
* Visitor Checked In
* Visitor Checked Out
* Delivery Arrived

⸻

Reports Module

Reports

* Visitor Reports
* Daily Visits
* Frequent Visitors
* Contractor Reports
* Delivery Reports
* Security Reports

⸻

Data Layer

Prisma ORM

↓

PostgreSQL

⸻

Audit Logs

* Login
* Logout
* Visitor CRUD
* Visit CRUD
* QR Generate
* Check-in
* Check-out
* Approval Actions

↓

PostgreSQL

⸻

Future AI

Claude API

↓

AI Analytics

↓

Visitor Statistics

↓

Frequent Visitor Analytics

↓

Peak Hour Analytics

↓

Suspicious Visitor Detection

↓

Security Alerts

↓

Predict Visitor Traffic

↓

AI Visitor Summary
