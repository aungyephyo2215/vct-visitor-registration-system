# Visitor Registration System (VRS)

QR-based digital visitor registration for condos, apartments, offices, and warehouses.

Replace paper visitor logs with QR code check-in/check-out. Manage visitors, visits, and security from a single dashboard.

## Features

- **Visitor Management** — Register, search, edit, soft-delete visitors
- **Visit Management** — Create visits with visitor, unit, host, purpose
- **QR Code Generation** — Generate time-limited QR codes per visit
- **QR Check-In** — Validate QR token, check blocklist, record check-in time
- **QR Check-Out** — Staff-initiated check-out with audit trail
- **Security Dashboard** — Real-time stats, recent visits, quick actions
- **Role-Based Access Control** — SUPER_ADMIN, PROPERTY_ADMIN, SECURITY_GUARD, RESIDENT, OFFICE_STAFF
- **Audit Logging** — 13 event types across all operations
- **Blocklist** — Block visitors by phone or ID number
- **Multi-Property** — Single system supports multiple properties

## Tech Stack

| Layer       | Technology                                                    |
| ----------- | ------------------------------------------------------------- |
| Frontend    | Next.js 16.2, React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| Backend     | Next.js Route Handlers                                        |
| Database    | PostgreSQL 16, Prisma 7 ORM                                   |
| Auth        | JWT (jose), bcryptjs                                          |
| Container   | Docker, Docker Compose                                        |

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd visitor-registration-system
npm install

# 2. Copy environment
cp .env.example .env
# Edit .env — set JWT_SECRET and JWT_REFRESH_SECRET

# 3. Start database
docker compose up -d postgres

# 4. Run migrations + seed
npx prisma migrate deploy
npx prisma db seed

# 5. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Default Accounts

| Email | Password | Role |
| ------- | ---------- | ------ |
| <admin@vrs.com> | Admin123! | SUPER_ADMIN |
| <property@vrs.com> | Admin123! | PROPERTY_ADMIN |
| <guard@vrs.com> | Guard123! | SECURITY_GUARD |
| <resident@vrs.com> | Resident123! | RESIDENT |
| <office@vrs.com> | Office123! | OFFICE_STAFF |

## Docker Deployment

```bash
docker compose up --build -d
```

This starts PostgreSQL and the Next.js app. The app is available at [http://localhost:3000](http://localhost:3000).

## Documentation

- [Setup Guide](docs/setup.md) — detailed installation steps
- [API Reference](docs/api.md) — all API endpoints
- [Architecture](CLAUDE.md) — project architecture and methodology

## Project Structure

```text
src/
  app/
    (protected)/    # Authenticated pages (dashboard, visitors, visits, reports, settings)
    api/v1/         # REST API routes
    login/          # Login page
  components/       # UI components (shadcn/ui + custom)
  lib/              # Business logic, auth, utilities
  hooks/            # React hooks
prisma/
  schema.prisma     # Database schema
  seed.ts           # Seed data
  migrations/       # Database migrations
```

## Future Roadmap

- Reports & Analytics dashboard
- Settings & property management UI
- Mobile app with QR scanner
- AI visitor statistics and suspicious activity alerts
- Email/SMS notifications
- Exportable visit reports
