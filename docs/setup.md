# Setup Guide

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm or yarn

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Required values:

| Variable             | Description                                                                     |
| -------------------- | ------------------------------------------------------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string                                                    |
| `JWT_SECRET`         | Secret for signing JWT access tokens (generate with `openssl rand -base64 48`)  |
| `JWT_REFRESH_SECRET` | Secret for signing JWT refresh tokens (generate with `openssl rand -base64 48`) |

### Email provider configuration

The QR email provider layer supports three provider modes:

| Provider | Use case                                         |
| -------- | ------------------------------------------------ |
| `noop`   | local development without sending email          |
| `mock`   | automated tests and forced success/failure flows |
| `smtp`   | real SMTP delivery                               |

Email variables:

| Variable                           | Required | Description                                                               |
| ---------------------------------- | -------- | ------------------------------------------------------------------------- |
| `EMAIL_PROVIDER`                   | yes      | `noop`, `mock`, or `smtp`                                                 |
| `EMAIL_FROM`                       | for smtp | default sender used by the SMTP provider                                  |
| `EMAIL_REPLY_TO`                   | no       | optional reply-to address                                                 |
| `EMAIL_MOCK_FAIL`                  | no       | set to `true` to force the mock provider to fail                          |
| `QR_EMAIL_ENABLED`                 | no       | set to `false` to disable QR email delivery entirely; defaults to enabled |
| `QR_EMAIL_TIMEOUT_MS`              | no       | SMTP timeout in milliseconds; defaults to `10000`                         |
| `QR_EMAIL_RESEND_COOLDOWN_SECONDS` | no       | manual resend cooldown in seconds; defaults to `300`                      |
| `SMTP_HOST`                        | for smtp | SMTP server hostname                                                      |
| `SMTP_PORT`                        | for smtp | SMTP server port                                                          |
| `SMTP_SECURE`                      | for smtp | `true` for implicit TLS, `false` otherwise                                |
| `SMTP_USER`                        | for smtp | SMTP username                                                             |
| `SMTP_PASS`                        | for smtp | SMTP password                                                             |
| `SMTP_REQUIRE_TLS`                 | no       | set to `true` when STARTTLS must be enforced                              |

## Development Setup

### 1. Start Database

```bash
docker compose up -d postgres
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Generate Prisma Client

```bash
npx prisma generate
```

### 4. Run Migrations

```bash
npx prisma migrate deploy
```

### 5. Seed Database

```bash
npx prisma db seed
```

### 6. Start Dev Server

```bash
npm run dev
```

The app is available at http://localhost:3000.

## Email modes

### Local development (no real email)

Use the default noop provider:

```bash
EMAIL_PROVIDER=noop
```

### Test mode

Use the mock provider:

```bash
EMAIL_PROVIDER=mock
EMAIL_MOCK_FAIL=false
```

To simulate a provider failure in tests:

```bash
EMAIL_PROVIDER=mock
EMAIL_MOCK_FAIL=true
```

### SMTP mode

Use SMTP only after filling in the SMTP variables in `.env`:

```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=mailer
SMTP_PASS=change-me
SMTP_REQUIRE_TLS=true
EMAIL_FROM="Visitor Registration System <no-reply@example.com>"
EMAIL_REPLY_TO="support@example.com"
QR_EMAIL_RESEND_COOLDOWN_SECONDS=300
```

## QR email delivery notes

- QR email delivery is triggered automatically after `POST /api/v1/invitations/[id]/generate-qr` succeeds for an approved invitation with an eligible visitor email.
- Manual resend is available through `POST /api/v1/invitations/[id]/resend-qr-email` for `SUPER_ADMIN`, `PROPERTY_ADMIN`, `OFFICE_STAFF`, and `SECURITY_GUARD` users with property access.
- The resend endpoint enforces a cooldown using `QR_EMAIL_RESEND_COOLDOWN_SECONDS` and returns `429` with `retryAfterSeconds` when the user must wait.
- Public visitor-facing links use opaque `email_access_token` values through:
  - `/qr-access/[emailAccessToken]`
  - `/api/v1/qr/email-image/[emailAccessToken]`
- Raw QR tokens are never documented for email-delivery operations because they are not exposed through the resend flow or invitation detail UI.

## Docker Production Build

Build and run the full stack:

```bash
docker compose up --build -d
```

The app is available at http://localhost:3000.

## Useful Commands

| Command                  | Description                 |
| ------------------------ | --------------------------- |
| `npm run dev`            | Start development server    |
| `npm run build`          | Production build            |
| `npm start`              | Start production server     |
| `npx prisma studio`      | Open Prisma Studio (DB GUI) |
| `npx prisma db seed`     | Reset seed data             |
| `npx prisma migrate dev` | Create new migration        |

## Troubleshooting

### Port already in use

Change the host port in `docker-compose.yml` or `.env` (`DB_PORT`).

### Database connection refused

Ensure Docker is running and PostgreSQL container is healthy:

```bash
docker compose logs postgres
```

### Migration errors

Reset database and re-run migrations:

```bash
npx prisma migrate reset
npx prisma db seed
```
