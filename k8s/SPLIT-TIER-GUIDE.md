# Split-Tier Architecture — Migration Guide

**Branch:** `arch/k8s-split-tier-deployment`

## Architecture Overview

```
Internet
   │
   ▼
┌──────────────────────────────────────────────────────────────┐
│                    nginx Ingress Controller                   │
│  vrs-staging.k8s.cmtmm.online  │  api-staging.vrs.k8s...    │
└────────────────┬───────────────────────────┬─────────────────┘
                 │                           │
    ┌────────────▼──────────┐   ┌────────────▼──────────┐
    │  vrs-frontend         │   │  vrs-api               │
    │  Namespace            │   │  Namespace             │
    │  Next.js (UI only)    │──▶│  Hono/Express          │
    │  Port: 3000           │   │  All /api/v1/* routes  │
    │  HPA: 2–6 pods        │   │  Port: 4000            │
    └───────────────────────┘   │  HPA: 2–8 pods         │
                                └────────────┬───────────┘
                                             │
                                ┌────────────▼───────────┐
                                │  vrs-postgres           │
                                │  Namespace              │
                                │  StatefulSet            │
                                │  Port: 5432             │
                                └────────────────────────┘
```

## Namespaces

| Namespace      | Component            | Port |
| -------------- | -------------------- | ---- |
| `vrs-frontend` | Next.js (pages only) | 3000 |
| `vrs-api`      | Hono/Express API     | 4000 |
| `vrs-postgres` | PostgreSQL           | 5432 |

## New Docker Images

| Image                                                         | Built from                   |
| ------------------------------------------------------------- | ---------------------------- |
| `ghcr.io/aungyephyo2215/visitor-registration-system/frontend` | `docker/Dockerfile.frontend` |
| `ghcr.io/aungyephyo2215/visitor-registration-system/api`      | `docker/Dockerfile.api`      |

---

## Code Migration Steps (Required Before Deploying)

### Step 1 — Extract the API server (~8–12 hrs)

Create `src/api-server.ts` as a standalone Hono server:

```typescript
// src/api-server.ts
import { Hono } from "hono";
import { serve } from "@hono/node-server";

const app = new Hono().basePath("/api/v1");

// Mount all existing route handlers
app.route("/auth", authRoutes);
app.route("/visitors", visitorRoutes);
app.route("/visits", visitRoutes);
app.route("/qr", qrRoutes);
app.route("/checkin", checkinRoutes);
app.route("/checkout", checkoutRoutes);
app.route("/invitations", invitationRoutes);
app.route("/notifications", notificationRoutes);
app.route("/users", userRoutes);
app.route("/units", unitRoutes);
app.route("/vehicles", vehicleRoutes);
app.route("/badges", badgeRoutes);
app.route("/verify", verifyRoutes);

// Health endpoint
app.get("/api/health", (c) => c.json({ status: "ok" }));

serve({ fetch: app.fetch, port: 4000 });
```

### Step 2 — Strip API routes from Next.js (~2–3 hrs)

- Delete `src/app/api/` directory from the frontend codebase
- Remove Prisma, bcrypt, jose, nodemailer from the frontend image
- Update all `fetch('/api/v1/...')` calls to use `INTERNAL_API_URL` env var

### Step 3 — GitHub Actions CI/CD (~2–3 hrs)

Add two separate build jobs in `.github/workflows/`:

```yaml
# Build frontend image
- name: Build frontend
  run: |
    docker build -f docker/Dockerfile.frontend \
      --build-arg NEXT_PUBLIC_API_URL=${{ vars.API_URL }} \
      -t ghcr.io/.../frontend:${{ github.sha }} .

# Build API image
- name: Build API
  run: |
    docker build -f docker/Dockerfile.api \
      -t ghcr.io/.../api:${{ github.sha }} .
```

### Step 4 — Update ArgoCD (~1 hr)

Apply the new ApplicationSet:

```bash
kubectl apply -f k8s/apps/argocd-applicationset-split.yaml
```

### Step 5 — Secrets (per namespace)

Create secrets in both `vrs-frontend` and `vrs-api` namespaces:

**vrs-api-secret** (in `vrs-api` namespace):

```bash
kubectl create secret generic vrs-api-secret \
  --namespace vrs-api \
  --from-literal=DATABASE_URL='...' \
  --from-literal=DIRECT_DATABASE_URL='...' \
  --from-literal=JWT_SECRET='...' \
  --from-literal=JWT_REFRESH_SECRET='...' \
  --from-literal=SMTP_PASS='...'
```

---

## Key Benefits

- **Frontend scales independently** from the API (read-heavy vs write-heavy)
- **API can be deployed** without rebuilding the entire Next.js app
- **Smaller attack surface** — frontend pods cannot reach PostgreSQL directly
- **Network Policy** enforces: frontend → api → postgres only

## Estimated Implementation Time

See `ARCHITECTURE-TIME-ESTIMATE.md` for the full breakdown.
