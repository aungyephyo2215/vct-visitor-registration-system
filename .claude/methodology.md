Development Methodology

Philosophy

Spec Driven Development

Requirements

↓

Architecture

↓

Database Design

↓

API Design

↓

UI/UX Design

↓

MVP Development

↓

Testing

↓

Dockerization

↓

Deployment

↓

Monitoring

↓

AI Features

⸻

Core Principles

1. Never Code First

Always start with:

- Requirements
- Architecture
- Database Design
- API Specification

⸻

2. Design Before Implementation

Every feature must have:

- Business Requirement
- Database Design
- API Design
- UI Design

before coding.

⸻

3. Review Before Coding

Required reviews:

- Architecture Review
- Database Review
- Security Review

Critical issues must be resolved before implementation.

⸻

4. Database First

Database rules:

- PostgreSQL only
- Prisma ORM
- UUID primary key
- Multi-tenancy with property_id
- Foreign key constraints
- Soft delete support
- Composite indexes

Every schema change requires migration.

Never modify production database manually.

⸻

5. API First

Every API must define:

- Endpoint
- Request body
- Response body
- Status codes
- Validation rules
- Authentication requirements

API specification must exist before implementation.

⸻

6. Security First

Required:

- JWT Authentication
- Refresh Token Rotation
- Role Based Access Control (RBAC)
- Property-level isolation
- Rate Limiting
- Audit Logs
- QR Replay Protection

Security review required before deployment.

⸻

7. Testing Strategy

Required tests:

- Unit Tests
- Integration Tests
- End-to-End Tests

Critical workflows:

- Login
- Visitor Registration
- QR Generation
- Check-In
- Check-Out
- Multi-tenant Isolation

Every feature requires test cases.

⸻

8. Docker First

Development:

Next.js

↓

PostgreSQL

↓

Prisma

↓

Docker Compose

Production:

Nginx

↓

Next.js

↓

Prisma

↓

PostgreSQL

All services must support Docker deployment.

⸻

9. CI/CD

Workflow:

Git Push

↓

Lint

↓

Test

↓

Build

↓

Docker Build

↓

Deploy

GitHub Actions preferred.

⸻

10. AI Features Last

Priority:

1. Requirements
2. MVP
3. Production Stability
4. Monitoring
5. AI Features

AI is an enhancement, not the foundation.

⸻

Success Criteria

A feature is considered complete only if:

✓ Requirements documented

✓ Database designed

✓ API documented

✓ UI completed

✓ Tests passed

✓ Security reviewed

✓ Docker ready

✓ Documentation updated
