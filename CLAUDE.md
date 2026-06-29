# Visitor Registration System

Project Overview

Build a Visitor Registration System for:

- Condo
- Apartment
- Office
- Warehouse

The system replaces paper visitor registration with QR-based digital registration.

Primary goals:

- Improve security
- Reduce manual registration
- Speed up visitor approval
- Provide audit trail and reporting
- Support future AI analytics

⸻

Main Features

Visitor Management

- Pre-registration
- Walk-in Registration
- Visitor Information
- Visitor Type Management
- Visitor History

Approval Workflow

- Invitation Creation
- Approval / Rejection
- Host Notification
- QR Code Generation
- Badge Generation

Security Workflow

- QR Check-In
- QR Check-Out
- Visitor Verification
- Audit Logs
- Security Dashboard

Notifications

- In-app Notification
- Email Notification
- QR Email Delivery
- Future SMS Notification
- Future Push Notification

Vehicle Management

- Vehicle Registration (CRUD)
- Vehicle Owner Linking (Resident / Visitor)
- Vehicle Blacklist
- Vehicle-Linked Visits

Security Gate Workflow

- Camera-Based QR Scanner
- Unified Token Resolver
- Inline Visitor Verification
- Gate Check-In / Check-Out

⸻

Current Phase

Completed

- Phase 1 — Core Visitor Management ✅
- Phase 2 — QR Workflow ✅
- Phase 3 — Dashboard & Reports ✅
- Phase 4 — Universal Workflow Planning ✅
- Phase 5 — MVP Finalization ✅
- Phase 6 — Invitation & Approval Workflow ✅
- Phase 6.1 — Security Hardening ✅
- Phase 6.5 — QR Email Delivery ✅
- Phase 7 — Vehicle Management & QR Camera Scanner ✅

Future

Phase 8

- Self-Kiosk
- Mobile QR Scanner
- Mobile Application

Phase 9

- AI Analytics
- Frequent Visitor Analytics
- Suspicious Visitor Alerts
- Security Alerts
- Visitor Prediction

⸻

Tech Stack

Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui

Backend

- Next.js Route Handlers

Database

- PostgreSQL
- Prisma ORM

DevOps

- Docker
- Docker Compose
- GitHub Actions

⸻

Development Methodology

Requirement

↓

Architecture

↓

Database

↓

API

↓

UI/UX

↓

Code

↓

Testing

↓

Docker

↓

Deployment

↓

AI Features

⸻

Rules

DO NOT CODE FIRST.

Before major implementation ALWAYS provide:

- Requirement Summary
- Implementation Plan
- Affected Files

Small bug fixes may proceed directly.

Always:

- Review architecture
- Review database schema
- Review API contracts
- Review UI workflow
- Create migrations
- Add unit tests
- Add E2E tests
- Follow security best practices

Never:

- Expose secrets
- Hardcode credentials
- Skip tests
- Break existing APIs without explanation

⸻

Autonomous Feature Development

Claude acts as a Senior Software Engineering Team.

Whenever a feature request is received:

1. Understand requirement
1. Research:

- Real-world workflow
- Industry best practices
- Security considerations

1. Review:

- Architecture
- Database
- API
- UI

1. Select required agents automatically
1. Implement:

- Database changes
- APIs
- UI
- Background jobs
- Notifications

1. Add:

- Prisma migration
- Unit tests
- E2E tests

1. Update:

- Documentation
- Skills
- Commands
- CLAUDE.md

1. Verify:

- TypeScript
- ESLint
- Unit tests
- E2E tests
- Build

⸻

Automatic Subagent Usage

Automatically select required agents:

- product-manager
- software-architect
- database
- backend
- frontend
- ui-ux
- security
- qa
- devops

Never ask the user which agent to use.

⸻

Automatic Documentation Updates

Documentation is part of implementation.

Whenever architecture, database, API, workflow, UI, or business rules change:

Automatically update:

- CLAUDE.md
- README.md
- docs/\*_/_.md
- architecture/\*_/_.md
- api/\*_/_.md
- ui-ux/\*_/_.md
- prompts/\*_/_.md
- prisma/schema.prisma
- prisma/seed.ts

Never wait for explicit user instructions.

⸻

Project Memory Maintenance

Reusable workflows become project memory.

Examples:

- QR Email Sending
- SMS Notification
- Push Notification
- Visitor Badge Printing
- Self Kiosk Workflow
- Visitor Face Verification
- AI Analytics
- Frequent Visitor Analytics
- Suspicious Visitor Detection
- Multi Property Support

Claude MUST:

1. Update CLAUDE.md
2. Create or update related skills
3. Create or update related commands
4. Update architecture docs
5. Update workflow docs
6. Update API docs

Future sessions must understand the new workflow automatically.

⸻

Business Workflow Preference

Prefer real-world business workflows.

Condo

Resident

↓

Invitation

↓

Property Admin Approval

↓

QR Generation

↓

Email / SMS

↓

Security Check-In

↓

Security Check-Out

↓

Audit Log

⸻

Office

Employee

↓

Visitor Registration

↓

Manager Approval

↓

QR Generation

↓

Email Invitation

↓

Security Verification

↓

Check-In

↓

Check-Out

↓

Audit Log

⸻

Warehouse

Supplier

↓

Appointment Booking

↓

Security Approval

↓

QR Pass

↓

Vehicle Registration

↓

Check-In

↓

Check-Out

↓

Audit Log

Research similar production systems before implementation.

⸻

Project Structure

src/

├── app/

├── components/

├── lib/

docs/

architecture/

api/

ui-ux/

prompts/

prisma/

├── schema.prisma

└── seed.ts

.claude/

├── agents/

├── skills/

└── commands/

CLAUDE.md

README.md

⸻

<!-- SPECKIT START -->

For additional context about technologies, project structure, shell commands, and implementation plans, read the current plan.

<!-- SPECKIT END -->
