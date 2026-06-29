# System Architecture

Browser / Mobile / Tablet

↓

Next.js Application

⸻

Core Modules

- Authentication Module
- Visitor Module
- Visit Module
- Invitation Module
- Approval Module
- Verification Module
- QR Service
- Badge Service
- Notification Service
- Email Delivery Service
- Vehicle Module
- Security Gate Workflow
- Reports Module

⸻

Authentication Module

- JWT Authentication
- Role Based Access Control (RBAC)

Roles

- SUPER_ADMIN
- PROPERTY_ADMIN
- SECURITY_GUARD
- RESIDENT
- OFFICE_STAFF

⸻

Visitor Module

Manage:

- Visitor Information
- Visitor Type
- Photo
- ID Information
- Vehicle Information

Visitor Types

- Guest
- Family
- VIP
- Vendor
- Contractor
- Delivery
- Auditor
- Government

⸻

Visit Module

Supports:

- Pre-register
- Walk-in
- Self-Kiosk (Future)

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

- Auto Approval
- Resident Approval
- Manager Approval
- Security Approval

⸻

Verification Module

Optional Verification

- Photo Capture
- ID Card Verification
- Vehicle Registration
- NDA Form
- Safety Form

⸻

QR Service

Functions

- Generate QR Token
- QR Expiration
- QR Validation
- QR Scan Check-in
- QR Scan Check-out

⸻

Badge Service

Badge Types

- Sticker Badge
- Plastic Badge
- Printable PDF Badge

Contents

- QR
- Photo
- Name
- Company
- Visitor Type
- Valid Date

⸻

Notification Service

Channels

- Email
- SMS
- Telegram
- LINE
- In-app Notification

Events

- Invitation Created
- Approval Request
- Visitor Checked In
- Visitor Checked Out
- Delivery Arrived

⸻

Email Delivery Service

Functions

- QR Email Delivery (auto on QR generation)
- Manual QR Email Resend (with cooldown)
- Provider Abstraction (noop / mock / smtp)
- Email Access Token Management (SHA-256 hashed)
- Public QR Image Hosting
- QR Access Page (visitor-facing)

Providers

- noop — No email sent (development)
- mock — Logs email to console (testing)
- smtp — Real SMTP delivery (production)

⸻

Vehicle Module

Functions

- Vehicle Registration (CRUD)
- Vehicle Owner Linking (Resident / Visitor)
- Vehicle Search (plate number, owner type, status)
- Vehicle-Linked Visits

Vehicle Blacklist

- Add plates to blacklist with reason
- Auto-reject check-in for blacklisted plates
- Blacklist management (add / remove / update)

⸻

Security Gate Workflow

Functions

- Camera-Based QR Scanning (browser getUserMedia)
- Manual Token Entry (fallback)
- Unified Token Resolver (QR token or email access token)
- Inline Visitor Verification (photo, vehicle, NDA, safety form)
- Gate Check-In / Check-Out

Flow

Scan QR → Resolve Token → Display Visit Info → Verify → Check-In/Out

⸻

Reports Module

Reports

- Visitor Reports
- Daily Visits
- Frequent Visitors
- Contractor Reports
- Delivery Reports
- Security Reports

⸻

Data Layer

Prisma ORM

↓

PostgreSQL

⸻

Audit Logs

- Login
- Logout
- Visitor CRUD
- Visit CRUD
- QR Generate
- Check-in
- Check-out
- Approval Actions
- Invitation CRUD
- Verification
- Vehicle CRUD
- Vehicle Blacklist
- QR Email Resend

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
