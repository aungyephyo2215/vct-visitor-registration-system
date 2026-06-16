Visitor Registration System Constitution

Core Principles

I. Design First

Requirements must be completed before implementation.

Development order:

Requirements

↓

Architecture

↓

Database

↓

API

↓

UI/UX

↓

Implementation

↓

Testing

↓

Docker

↓

Deployment

↓

AI Features

Never code before design approval.

⸻

II. Security First

Security is mandatory.

Requirements:

* JWT Authentication
* Refresh Token Rotation
* Role Based Access Control (RBAC)
* Property Level Data Isolation
* QR Replay Protection
* Rate Limiting
* Audit Logging
* Password Hashing using bcrypt
* HTTPS only in production

Security review is required before deployment.

⸻

III. Multi-Tenant Architecture

The system supports:

* Condo
* Apartment
* Office
* Warehouse

Rules:

* Every tenant-owned table must include property_id.
* Users can only access their own property data.
* Super Admin can access all properties.
* Cross-property access is forbidden.

⸻

IV. Database First

Database requirements:

* PostgreSQL
* Prisma ORM
* UUID primary keys
* Database migration required for schema changes
* Soft delete supported
* Foreign key constraints required
* Indexes required for frequently queried fields

Never change production database manually.

⸻

V. API First

Backend requirements:

* REST API
* JSON request and response
* API documentation required
* Request validation required
* Standard error response required
* Pagination for list endpoints
* Versioned API (/api/v1)

No frontend implementation before API design approval.

⸻

VI. Testing Required

Every feature requires tests.

Minimum:

* Unit Tests
* API Tests
* Integration Tests
* Playwright E2E Tests

Critical flows:

* Login
* Visitor Registration
* QR Generation
* Check-In
* Check-Out

Tests must pass before merge.

⸻

VII. Docker First

Development and production must use Docker.

Requirements:

* Docker Compose
* Environment Variables
* Health Checks
* Persistent Volumes
* Separate Database Container

Production deployment must be reproducible.

⸻

VIII. AI Features Are Last Priority

AI features are implemented after MVP.

Possible AI Features:

* Visitor Analytics
* Peak Hour Prediction
* Frequent Visitor Detection
* Suspicious Visitor Alerts
* Natural Language Reports
* Security Suggestions

MVP must work completely before AI development.

⸻

Technology Stack

Frontend

* Next.js App Router
* TypeScript
* Tailwind CSS
* shadcn/ui

Backend

* Next.js Route Handlers
* Prisma ORM

Database

* PostgreSQL

Authentication

* JWT
* Refresh Tokens

Testing

* Jest
* Playwright

Deployment

* Docker
* Docker Compose
* GitHub Actions

⸻

Development Workflow

Workflow:

Requirements

↓

Architecture Review

↓

Database Design

↓

API Design

↓

UI/UX Design

↓

Implementation

↓

Testing

↓

Docker

↓

Deployment

↓

AI Features

Every stage must be reviewed before continuing.

⸻

Governance

This constitution overrides all development decisions.

Rules:

* Never code first.
* Never bypass security review.
* Never change database without migration.
* Never deploy without Docker.
* Never merge failing tests.
* Keep architecture simple.
* Prefer maintainability over complexity.

All team members and AI agents must follow this constitution.

Version: 1.0.0

Ratified: 2026-06-16

Last Amended: 2026-06-16