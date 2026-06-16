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
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWT access tokens (generate with `openssl rand -base64 48`) |
| `JWT_REFRESH_SECRET` | Secret for signing JWT refresh tokens (generate with `openssl rand -base64 48`) |

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

## Docker Production Build

Build and run the full stack:

```bash
docker compose up --build -d
```

The app is available at http://localhost:3000.

## Useful Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npx prisma studio` | Open Prisma Studio (DB GUI) |
| `npx prisma db seed` | Reset seed data |
| `npx prisma migrate dev` | Create new migration |

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
