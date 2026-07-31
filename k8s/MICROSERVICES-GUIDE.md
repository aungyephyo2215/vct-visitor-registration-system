# Microservices Architecture — Migration Guide

**Branch:** `arch/k8s-microservices`

## Architecture Overview

```
Internet
   │
   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     nginx Ingress Controller                          │
│  vrs.k8s.cmtmm.online  │  api.vrs.k8s.cmtmm.online (path routing)   │
└────┬──────────────────────────────────────────────────────────┬──────┘
     │                                                          │
┌────▼──────────┐    /api/v1/auth, /users    ┌─────────────────▼──────┐
│  vrs-frontend │ ─────────────────────────▶ │  vrs-auth-svc  :4001   │
│  :3000        │                            │  JWT · bcrypt · users   │
│  HPA 2-6      │    /api/v1/visitors        └────────────────────────┘
└───────────────┘    /visits /checkin                    │ validate token
                     /checkout /badges  ┌────────────────▼───────────┐
                ─────────────────────▶  │  vrs-visitor-svc  :4002    │
                                        │  visits · checkin · badges  │
                                        │  HPA 2-10                   │
                /api/v1/qr              └──────────┬──────────────────┘
                /verify /invitations               │ trigger
                ─────────────────────▶ ┌──────────▼──────────────────┐
                                       │  vrs-qr-svc  :4003          │
                                       │  QR generation · verify     │
                                       │  HPA 2-8                    │
                                       └──────────┬──────────────────┘
                                                  │ send email
                /api/v1/units,vehicles ┌──────────▼──────────────────┐
                ─────────────────────▶ │  vrs-notification-svc :4004 │
                                       │  nodemailer · SMTP          │
                ┌──────────────────────└─────────────────────────────┘
                │
                ▼
  ┌─────────────────────────────┐     ┌───────────────────────────┐
  │  vrs-property-svc  :4005    │     │  vrs-postgres  :5432      │
  │  units · vehicles           │────▶│  StatefulSet              │
  │  HPA 1-4                    │     │  All services connect here │
  └─────────────────────────────┘     └───────────────────────────┘
```

## Service Map

| Service                | Namespace              | Port | Owns Routes                                                                               |
| ---------------------- | ---------------------- | ---- | ----------------------------------------------------------------------------------------- |
| `vrs-frontend`         | `vrs-frontend`         | 3000 | UI pages only (Next.js)                                                                   |
| `vrs-auth-svc`         | `vrs-auth-svc`         | 4001 | `/api/v1/auth` `/api/v1/users`                                                            |
| `vrs-visitor-svc`      | `vrs-visitor-svc`      | 4002 | `/api/v1/visitors` `/api/v1/visits` `/api/v1/checkin` `/api/v1/checkout` `/api/v1/badges` |
| `vrs-qr-svc`           | `vrs-qr-svc`           | 4003 | `/api/v1/qr` `/api/v1/verify` `/api/v1/invitations`                                       |
| `vrs-notification-svc` | `vrs-notification-svc` | 4004 | `/api/v1/notifications` (internal only)                                                   |
| `vrs-property-svc`     | `vrs-property-svc`     | 4005 | `/api/v1/units` `/api/v1/vehicles`                                                        |
| `vrs-postgres`         | `vrs-postgres`         | 5432 | Shared PostgreSQL (single DB, separate schemas per service)                               |

---

## Database Strategy: Shared DB with Schema Separation

Since all services share a single PostgreSQL instance, use Prisma schema per service:

```
vrs_db
 ├─ schema: auth       → User, UserSession, AuditLog
 ├─ schema: visitor    → Visitor, Visit, CheckIn, Badge, Blocklist
 ├─ schema: qr         → QRCode, Invitation
 ├─ schema: notification → Notification
 └─ schema: property   → Property, Unit, Vehicle
```

Each service gets its own `DATABASE_URL` with a `search_path` pointing to its schema.

> **Future evolution:** Once schemas are stable, each can be moved to its own database instance with zero code changes — just update `DATABASE_URL`.

---

## Code Migration Steps

### Step 1 — Create service packages (~3–5 days)

Use a monorepo structure:

```
services/
  auth-svc/          ← new Node.js package
    src/
      routes/auth.ts
      routes/users.ts
      server.ts      ← Hono entry point, port 4001
    package.json
    tsconfig.json
  visitor-svc/       ← new Node.js package
    src/
      routes/visitors.ts
      routes/visits.ts
      routes/checkin.ts
      routes/checkout.ts
      routes/badges.ts
      server.ts      ← port 4002
  qr-svc/
    src/
      routes/qr.ts
      routes/verify.ts
      routes/invitations.ts
      server.ts      ← port 4003
  notification-svc/
    src/
      routes/notifications.ts
      server.ts      ← port 4004
  property-svc/
    src/
      routes/units.ts
      routes/vehicles.ts
      server.ts      ← port 4005
```

### Step 2 — Inter-service communication pattern (~1–2 days)

Services call each other via HTTP using internal cluster DNS:

```typescript
// visitor-svc calling auth-svc to validate a JWT
const authUrl = process.env.AUTH_SERVICE_URL; // http://vrs-auth-svc.vrs-auth-svc.svc.cluster.local:4001
const res = await fetch(`${authUrl}/internal/validate-token`, {
  headers: { Authorization: req.headers.get("authorization") ?? "" },
});
```

### Step 3 — Prisma migrations (one-time) (~1 day)

Run migrations only from a dedicated init job, not from every pod:

```yaml
# k8s/services/shared/migration-job.yaml  (run once at deploy time)
apiVersion: batch/v1
kind: Job
metadata:
  name: vrs-schema-migrate
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: ghcr.io/aungyephyo2215/visitor-registration-system/auth-svc:staging
          command: ["npx", "prisma", "migrate", "deploy"]
```

### Step 4 — GitHub Actions: matrix build (~1 day)

```yaml
strategy:
  matrix:
    service: [frontend, auth-svc, visitor-svc, qr-svc, notification-svc, property-svc]
steps:
  - name: Build ${{ matrix.service }}
    run: |
      docker build \
        -f docker/services/Dockerfile.${{ matrix.service }} \
        -t ghcr.io/.../{{ matrix.service }}:${{ github.sha }} \
        services/${{ matrix.service }}
```

### Step 5 — Apply ArgoCD ApplicationSet (~30 min)

```bash
kubectl apply -f k8s/apps/argocd-applicationset-microservices.yaml
```

ArgoCD will create 6 separate Applications, one per service — each deployable independently.

---

## Estimated Implementation Time

See `ARCHITECTURE-TIME-ESTIMATE.md` for the full breakdown.
