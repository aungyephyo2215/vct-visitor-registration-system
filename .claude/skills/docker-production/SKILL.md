Docker Production Skill

Purpose

Build production-ready Docker environments.

Development Stack

- Next.js
- TypeScript
- Prisma
- PostgreSQL
- Tailwind
- shadcn/ui

Containers

Frontend

- Next.js

Database

- PostgreSQL

Optional

- PgAdmin
- Redis

Docker Rules

- Use docker compose
- Use named volumes
- Use .env file
- Never hardcode secrets

Production

Internet

↓

Nginx Reverse Proxy

↓

Next.js Container

↓

Prisma

↓

PostgreSQL

Security

- HTTPS only
- Environment variables
- Backup database daily
- Health checks enabled

Volumes

Persist:

- postgres_data
- uploads
- backups

CI/CD

GitHub Actions

↓

Build

↓

Test

↓

Docker Build

↓

Deploy
