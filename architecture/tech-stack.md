# Tech Stack

## Frontend

| Technology      | Version | Purpose                                 |
| --------------- | ------- | --------------------------------------- |
| Next.js         | 16.2    | React framework with App Router         |
| React           | 19.2    | UI library                              |
| TypeScript      | 5       | Type-safe JavaScript                    |
| Tailwind CSS    | 4       | Utility-first CSS framework             |
| shadcn/ui       | latest  | Component library (Radix UI + Tailwind) |
| Lucide React    | latest  | Icon library                            |
| React Hook Form | latest  | Form state management                   |
| Zod             | latest  | Schema validation                       |

---

## Backend

| Technology             | Version | Purpose            |
| ---------------------- | ------- | ------------------ |
| Next.js Route Handlers | 16.2    | API endpoints      |
| jose                   | latest  | JWT token handling |
| bcryptjs               | latest  | Password hashing   |

---

## Database

| Technology | Version | Purpose                        |
| ---------- | ------- | ------------------------------ |
| PostgreSQL | 16      | Primary database               |
| Prisma ORM | 7.8     | Database client and migrations |

---

## Authentication

| Technology       | Purpose                  |
| ---------------- | ------------------------ |
| JWT (jose)       | Access + refresh tokens  |
| httpOnly cookies | Token storage (XSS-safe) |
| bcryptjs         | Password hashing         |

---

## Testing

| Technology             | Version | Purpose                 |
| ---------------------- | ------- | ----------------------- |
| Vitest                 | 4.1     | Unit testing framework  |
| Playwright             | 1.61    | End-to-end testing      |
| @testing-library/react | latest  | React component testing |

---

## DevOps

| Technology     | Purpose                       |
| -------------- | ----------------------------- |
| Docker         | Container runtime             |
| Docker Compose | Multi-container orchestration |
| GitHub Actions | CI/CD pipeline                |

---

## CI/CD Pipeline

```
npm ci → lint → type check → unit tests → build
```

Workflows:

- `ci.yml` — Runs on PR (lint, typecheck, test, build)
- `deploy.yml` — Deploys on merge to main
- `rollback.yml` — Manual rollback trigger

---

## Future

| Technology | Purpose                                    |
| ---------- | ------------------------------------------ |
| Claude API | AI analytics, suspicious visitor detection |
