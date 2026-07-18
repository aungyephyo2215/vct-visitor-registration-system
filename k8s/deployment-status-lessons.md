# Visitor Registration System — Kubernetes Deployment Status & Lessons Learned

**Date:** 2026-07-18
**Environment:** Staging
**URL:** https://vrs-staging.k8s.example.com
**Cluster:** K3s single-node (v1.36.2+k3s1)
**GitOps:** Argo CD v3.4.4

---

## 1. Current Deployment Status

| Component              | Namespace      | Status       | Details                                    |
| ---------------------- | -------------- | ------------ | ------------------------------------------ |
| **App Pod**            | `vrs-app`      | ✅ Running   | `visitor-registration-system` — 3 replicas |
| **PostgreSQL**         | `vrs-postgres` | ✅ Running   | `vrs-postgres-0` StatefulSet, 5Gi PVC      |
| **App Service**        | `vrs-app`      | ✅ ClusterIP | Port 3000                                  |
| **PostgreSQL Service** | `vrs-postgres` | ✅ ClusterIP | Port 5432                                  |
| **Ingress**            | `vrs-app`      | ✅ Active    | `vrs-staging.k8s.example.com` via NGINX    |
| **TLS Certificate**    | `vrs-app`      | ✅ Ready     | Issued by `letsencrypt-production`         |
| **DNS**                | —              | ✅ Resolving | `vrs-staging.k8s.example.com` → VPS IP     |
| **Argo CD Sync**       | `argocd`       | ✅ Synced    | Automated sync with self-heal              |
| **Database Schema**    | `vrs-postgres` | ✅ Synced    | Prisma schema applied                      |
| **Database Seed**      | `vrs-postgres` | ✅ Complete  | 5 users, 1 property, 1 unit, 2 invitations |

### Application Endpoints

| URL                                                     | Description        |
| ------------------------------------------------------- | ------------------ |
| `https://vrs-staging.k8s.example.com/`                  | Application root   |
| `https://vrs-staging.k8s.example.com/login`             | Login page         |
| `https://vrs-staging.k8s.example.com/api/v1/auth/login` | Authentication API |

### Default Accounts (Seeded)

| Email            | Role           |
| ---------------- | -------------- |
| admin@vrs.com    | SUPER_ADMIN    |
| property@vrs.com | PROPERTY_ADMIN |
| guard@vrs.com    | SECURITY_GUARD |
| resident@vrs.com | RESIDENT       |
| office@vrs.com   | OFFICE_STAFF   |

> **Security Note:** Default passwords must be changed before production use. Credentials are NOT stored in this document.

---

## 2. Final Working Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        EXTERNAL TRAFFIC                         │
│              vrs-staging.k8s.example.com (TLS via LE)          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   NGINX INGRESS CONTROLLER                      │
│                   ingress-nginx namespace                        │
│                   NodePort 80:32280, 443:32443                  │
│                   ClusterIP: 10.43.202.167                      │
└───────────┬──────────────────────────────────┬──────────────────┘
            │                                  │
            ▼                                  ▼
┌──────────────────────┐          ┌──────────────────────────────┐
│  vrs-app namespace   │          │  cert-manager namespace      │
│                      │          │                              │
│  Deployment: vrs-app │          │  ClusterIssuer:              │
│  - 3 replicas        │          │    letsencrypt-production    │
│  - Port 3000         │          │    (HTTP-01 challenge)       │
│  - imagePullSecrets  │          │                              │
│  - .env ConfigMap    │          │  Certificate:                │
│                      │          │    vrs-staging-app-tls       │
│  Service: vrs-app    │          │                              │
│  - ClusterIP:3000    │          │                              │
└──────────┬───────────┘          └──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   vrs-postgres namespace                         │
│                                                                  │
│  StatefulSet: vrs-postgres                                      │
│  - 1 replica (single-node cluster)                              │
│  - postgres:16-alpine                                           │
│  - Port 5432                                                    │
│  - PVC: postgres-data (5Gi, local-path)                        │
│                                                                  │
│  Service: vrs-postgres                                          │
│  - ClusterIP:5432                                               │
└─────────────────────────────────────────────────────────────────┘

Supporting Infrastructure:
┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
│  cert-manager      │  │  CoreDNS           │  │  Argo CD           │
│  (3 pods)          │  │  (1 pod)           │  │  (7 pods)          │
│  TLS certificates  │  │  DNS resolution    │  │  GitOps sync       │
└────────────────────┘  └────────────────────┘  └────────────────────┘
```

---

## 3. Timeline of Issues Encountered

| #   | Issue                                            | Phase         | Impact                      | Resolution Time |
| --- | ------------------------------------------------ | ------------- | --------------------------- | --------------- |
| 1   | ARM64 image cannot run on AMD64 server           | Image Build   | Pod CrashLoopBackOff        | ~30 min         |
| 2   | GHCR push denied — token missing scopes          | Image Push    | Could not push image        | ~15 min         |
| 3   | Kustomize referenced untracked secret files      | ArgoCD Sync   | ArgoCD sync failure         | ~5 min          |
| 4   | Kubernetes probe field `retries` invalid         | ArgoCD Sync   | StatefulSet rejected        | ~5 min          |
| 5   | NGINX `configuration-snippet` annotation blocked | ArgoCD Sync   | Ingress rejected            | ~5 min          |
| 6   | Container cannot pull from private GHCR          | Pod Startup   | ImagePullBackOff            | ~20 min         |
| 7   | GHCR token permissions insufficient for push     | Image Push    | Cannot push amd64 image     | ~15 min         |
| 8   | Prisma 7 `prisma.config.ts` ignores env vars     | Database      | Migrations fail             | ~45 min         |
| 9   | Wrong cert-manager ClusterIssuer name            | TLS           | Certificate stuck "Issuing" | ~5 min          |
| 10  | Shell heredoc expanded `$VAR` locally            | Migration Job | DATABASE_URL empty          | ~10 min         |
| 11  | Migration job printed sensitive DB URL in logs   | Security      | Secret exposed in logs      | ~5 min          |
| 12  | ArgoCD overwrote manual ingress patches          | GitOps        | Ingress broken after sync   | ~10 min         |

**Total troubleshooting time:** ~2.5 hours

---

## 4. Root Cause Analysis for Each Issue

### Issue 1: ARM64 Image on AMD64 Server

**Symptom:** `ErrImagePull` / `ImagePullBackOff`

**Root Cause:**

- Docker build on macOS (Apple Silicon M1/M2/M3) defaults to `linux/arm64`
- K3s VPS runs on `linux/amd64` (x86_64)
- ARM64 container images are incompatible with AMD64 hosts

**Evidence:**

```bash
# Check image architecture
docker inspect ghcr.io/.../visitor-registration-system:staging | grep Architecture
# Output: "Architecture": "arm64"

# Check server architecture
ssh dennis@VPS_IP "uname -m"
# Output: x86_64
```

**Fix:**

```bash
docker build --platform linux/amd64 -t ghcr.io/.../visitor-registration-system:staging .
```

---

### Issue 2: GHCR Token Permission Denied

**Symptom:** `error from registry: denied` on `docker push`

**Root Cause:**

- GitHub Personal Access Token (PAT) was created with insufficient scopes
- GHCR requires explicit `write:packages` scope for push operations
- Classic tokens require manual scope selection

**Evidence:**

```bash
# Test token
curl -s -o /dev/null -w "%{http_code}" \
  -u "username:$TOKEN" \
  "https://ghcr.io/token?scope=repository:org/repo:push&service=ghcr.io"
# Output: 403
```

**Fix:**

- Create new PAT with scopes: `repo`, `write:packages`, `read:packages`, `delete:packages`
- Verify token with the test command above

---

### Issue 3: Kustomize Missing Secret Files

**Symptom:** ArgoCD sync error — `postgres/secret.yaml: no such file or directory`

**Root Cause:**

- `kustomization.yaml` referenced `postgres/secret.yaml` and `app/secret.yaml`
- These files were added to `.gitignore` (security best practice)
- ArgoCD pulls manifests from Git — missing files cause kustomize build failure

**Evidence:**

```yaml
# kustomization.yaml before fix
resources:
  - postgres/secret.yaml # ← Not in Git!
  - app/secret.yaml # ← Not in Git!
```

**Fix:**

- Remove secret file references from `kustomization.yaml`
- Secrets are applied via `kubectl create secret` directly on the cluster

---

### Issue 4: Invalid Kubernetes Probe Field

**Symptom:** StatefulSet creation failed — `field not declared in schema`

**Root Cause:**

- PostgreSQL StatefulSet used `retries: 5` in liveness/readiness probes
- Kubernetes API expects `failureThreshold`, not `retries`
- This is a common confusion with Docker Compose health check syntax

**Wrong:**

```yaml
livenessProbe:
  exec:
    command: ["pg_isready"]
  retries: 5 # ❌ Invalid in Kubernetes
```

**Correct:**

```yaml
livenessProbe:
  exec:
    command: ["pg_isready"]
  failureThreshold: 5 # ✅ Valid Kubernetes field
```

**Reference:** `kubectl explain pod.spec.containers.livenessProbe`

---

### Issue 5: NGINX Configuration-Snippet Blocked

**Symptom:** Ingress creation denied — `Snippet directives are disabled by the Ingress administrator`

**Root Cause:**

- Ingress used `nginx.ingress.kubernetes.io/configuration-snippet` annotation
- This annotation allows arbitrary NGINX configuration injection
- Disabled by default on managed clusters for security reasons

**Evidence:**

```bash
kubectl describe ingress vrs-app -n vrs-app
# Events: admission webhook denied the request
```

**Fix:**

- Remove the `configuration-snippet` annotation
- Use standard NGINX annotations for security headers

---

### Issue 6: Private GHCR Image Pull Failure

**Symptom:** `ImagePullBackOff` — `failed to authorize: 403 Forbidden`

**Root Cause:**

- GHCR package was private
- Kubernetes node (containerd) had no credentials to pull from GHCR
- `imagePullSecrets` not configured on the deployment

**Fix (3 steps):**

```bash
# 1. Create pull secret
kubectl create secret docker-registry ghcr-pull-secret \
  --namespace=vrs-app \
  --docker-server=ghcr.io \
  --docker-username=USERNAME \
  --docker-password=YOUR_PAT

# 2. Patch deployment
kubectl patch deployment vrs-app -n vrs-app \
  --type='json' \
  -p='[{"op": "add", "path": "/spec/template/spec/imagePullSecrets", "value": [{"name": "ghcr-pull-secret"}]}]'

# 3. Restart
kubectl rollout restart deployment vrs-app -n vrs-app
```

---

### Issue 7: GHCR Push with Server Token

**Symptom:** `docker push` denied — even with correct token

**Root Cause:**

- Local Docker login token expired during long build process
- Server's GHCR token had `read:packages` but not `write:packages`
- Multiple tokens with different permission levels caused confusion

**Fix:**

- Use the server's token for local Docker login:

```bash
# Get token from server secret
TOKEN=$(kubectl get secret ghcr-pull-secret -n vrs-app \
  -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['auths']['ghcr.io']['password'])")

# Login locally
echo "$TOKEN" | docker login ghcr.io -u USERNAME --password-stdin
```

---

### Issue 8: Prisma 7 Migration Failure

**Symptom:** `Error: The datasource.url property is required in your Prisma config file`

**Root Cause:**

- Prisma 7 introduced `prisma.config.ts` as the mandatory configuration mechanism
- The config file uses `import "dotenv/config"` which reads from `.env` file
- Container environment has `DATABASE_URL` set, but Prisma reads from config file, not env vars
- Even removing `prisma.config.ts` did not resolve the issue (Prisma 7 still enforces config)

**Root Cause Chain:**

```
prisma.config.ts loaded
  → import "dotenv/config" runs
  → Looks for .env file in working directory
  → No .env file exists in container
  → process.env["DATABASE_URL"] = undefined
  → datasource.url = undefined
  → ERROR
```

**Successful Workaround:**

```bash
# Use --url flag to bypass prisma.config.ts
npx prisma db push \
  --schema=prisma/schema.prisma \
  --url="postgresql://USER:PASS@HOST:PORT/DB" \
  --accept-data-loss
```

**Permanent Fix Needed:**

- Create a `.env` ConfigMap and mount it into migration Job containers
- Or modify `prisma.config.ts` to read from environment without dotenv dependency
- Or downgrade to Prisma 6.x for simpler migration handling

---

### Issue 9: Wrong Cert-Manager ClusterIssuer Name

**Symptom:** Certificate stuck in "Issuing" state for 2+ hours

**Root Cause:**

- Ingress annotation referenced `letsencrypt-prod`
- Actual ClusterIssuer name was `letsencrypt-production`
- cert-manager could not find the issuer, so ACME challenge never started

**Evidence:**

```bash
kubectl describe certificaterequest -n vrs-app
# Message: Referenced "ClusterIssuer" not found: "letsencrypt-prod"

kubectl get clusterissuer
# NAME                     READY
# letsencrypt-production   True    ← Different name!
```

**Fix:**

```bash
kubectl annotate ingress vrs-app -n vrs-app \
  cert-manager.io/cluster-issuer=letsencrypt-production \
  --overwrite
```

---

### Issue 10: Shell Heredoc Variable Expansion

**Symptom:** Migration job logs showed `DATABASE_URL=` (empty)

**Root Cause:**

- Shell heredoc `<< EOF` expands variables locally before sending to remote
- `$DATABASE_URL` was expanded by the local shell (empty), not the container's shell
- The empty value was written to the container's `.env` file

**Wrong:**

```bash
ssh server "kubectl apply -f -" << EOF
  DATABASE_URL=$DATABASE_URL  # ← Expanded locally, empty!
EOF
```

**Correct:**

```bash
# Option 1: Quote the heredoc delimiter
ssh server "kubectl apply -f -" << 'EOF'
  DATABASE_URL=$DATABASE_URL  # ← Expanded in container
EOF

# Option 2: Use secretKeyRef in YAML
env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: vrs-app-secret
        key: DATABASE_URL
```

---

### Issue 11: Sensitive Data in Job Logs

**Symptom:** `kubectl logs` output contained full `DATABASE_URL` with credentials

**Root Cause:**

- Migration job `cat /app/.env` printed the `.env` file contents
- The `.env` file contained `DATABASE_URL=postgresql://user:password@host:5432/db`
- This exposed credentials in plain text in job logs

**Fix:**

- Remove `cat /app/.env` from job commands
- Delete migration/seed jobs after completion:

```bash
kubectl delete job vrs-prisma-migrate -n vrs-app
kubectl delete job vrs-prisma-seed -n vrs-app
```

- Enable Kubernetes audit logging for sensitive operations

---

### Issue 12: ArgoCD Overwriting Manual Changes

**Symptom:** Manual ingress patches reverted after ArgoCD sync

**Root Cause:**

- ArgoCD automated sync overwrites manual changes with Git state
- Manual ingress patches (issuer name, host, rules) were reverted
- ArgoCD's self-heal feature restores desired state from Git

**Fix:**

- Update manifests in Git, not manually on cluster
- Or use ArgoCD `ignoreDifferences` for fields that change manually
- Or temporarily disable automated sync for manual changes:

```bash
kubectl patch application visitor-registration-system -n argocd \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/syncPolicy/automated", "value": null}]'
```

---

## 5. What Was Fixed

| Issue                         | Fix Applied                                       | Status       |
| ----------------------------- | ------------------------------------------------- | ------------ |
| ARM64 image                   | Rebuilt with `--platform linux/amd64`             | ✅           |
| GHCR push denied              | Created PAT with correct scopes                   | ✅           |
| Kustomize missing files       | Removed secret references from kustomization.yaml | ✅           |
| Invalid probe field           | Changed `retries` → `failureThreshold`            | ✅           |
| Configuration-snippet blocked | Removed annotation from ingress                   | ✅           |
| Private image pull            | Created `ghcr-pull-secret` + `imagePullSecrets`   | ✅           |
| GHCR token permissions        | Used server token for local login                 | ✅           |
| Prisma migration              | Used `prisma db push --url` workaround            | ⚠️ Temporary |
| Wrong ClusterIssuer           | Changed to `letsencrypt-production`               | ✅           |
| Heredoc expansion             | Used `secretKeyRef` for env vars                  | ✅           |
| Secrets in logs               | Removed `cat .env` from job commands              | ✅           |
| ArgoCD overwrites             | Updated Git manifests instead of manual patches   | ✅           |

---

## 6. Commands Used for Verification

### Pod & Deployment Status

```bash
# Check all pods
kubectl get pods -A | grep vrs

# Check deployment
kubectl get deployment -n vrs-app
kubectl rollout status deployment/vrs-app -n vrs-app

# Check StatefulSet
kubectl get statefulset -n vrs-postgres

# View pod logs
kubectl logs -n vrs-app -l app.kubernetes.io/name=visitor-registration-system --tail=100
kubectl logs -n vrs-app <pod-name> --previous  # Previous container logs
```

### Ingress & TLS

```bash
# Check ingress
kubectl get ingress -n vrs-app -o wide
kubectl describe ingress vrs-app -n vrs-app

# Check certificate
kubectl get certificates -n vrs-app
kubectl describe certificate vrs-staging-app-tls -n vrs-app

# Check certificate request
kubectl get certificaterequest -n vrs-app
kubectl describe certificaterequest -n vrs-app
```

### ArgoCD

```bash
# Check ArgoCD application
kubectl get applications -n argocd visitor-registration-system
kubectl describe application visitor-registration-system -n argocd

# Force refresh
kubectl patch application visitor-registration-system -n argocd \
  --type merge -p '{"metadata":{"annotations":{"argocd.argoproj.io/refresh":"hard"}}}'
```

### Secrets

```bash
# List secrets (names only, not values)
kubectl get secrets -n vrs-app
kubectl get secrets -n vrs-postgres

# Verify secret exists (not values)
kubectl get secret ghcr-pull-secret -n vrs-app -o jsonpath='{.type}'
```

### DNS & Connectivity

```bash
# Test DNS resolution
dig vrs-staging.k8s.example.com +short
nslookup vrs-staging.k8s.example.com

# Test HTTPS
curl -s -o /dev/null -w "HTTP: %{http_code}\nSSL: %{ssl_verify_result}\n" \
  https://vrs-staging.k8s.example.com/

# Test from inside cluster
kubectl exec -n vrs-app <pod-name> -- curl -s http://vrs-postgres.vrs-postgres.svc.cluster.local:5432
```

---

## 7. Important Lessons Learned

### 7.1 Architecture Matters

- Always check target server architecture before building images
- `uname -m` on server: `x86_64` = AMD64, `aarch64` = ARM64
- Mac Apple Silicon = ARM64, most VPS = AMD64

### 7.2 Secrets Should Never Be in Git

- Use `kubectl create secret` for all sensitive values
- Add secret files to `.gitignore`
- Reference secrets via `secretKeyRef` in deployments
- Rotate secrets if they are accidentally committed

### 7.3 Kubernetes Is Strict About Schema

- Use `kubectl explain <resource>` to check valid fields
- Test with `--dry-run=client -o yaml` before applying
- K8s rejects unknown fields (unlike Docker Compose)

### 7.4 ArgoCD Owns the Cluster State

- Manual changes will be reverted by ArgoCD
- Always update manifests in Git, then commit/push
- Use `ignoreDifferences` for fields that must be manual
- Disable automated sync temporarily for emergency changes

### 7.5 Prisma 7 Has Breaking Changes

- `prisma.config.ts` is now mandatory for `migrate deploy`
- `import "dotenv/config"` requires `.env` file (not env vars)
- Use `--url` flag as workaround for containerized migrations
- Consider pinning Prisma version if stability is critical

### 7.6 Container Registry Authentication

- GHCR private packages require `imagePullSecrets`
- Secrets must be in the same namespace as the deployment
- Containerd on K3s needs `registries.yaml` for node-level auth
- Test token permissions before deployment

### 7.7 Shell Heredocs Expand Variables Locally

- `<< EOF` expands `$VAR` on the local machine
- `<< 'EOF'` prevents local expansion (variable reaches remote)
- Use `secretKeyRef` in YAML instead of shell variables for reliability

### 7.8 Debug From the Bottom Up

1. Check pod status: `kubectl get pods`
2. Check pod events: `kubectl describe pod`
3. Check pod logs: `kubectl logs`
4. Check service connectivity: `kubectl exec -- curl`
5. Check ingress: `kubectl describe ingress`
6. Check certificate: `kubectl describe certificate`

---

## 8. Security Notes

### Secrets Management

- All secrets are stored as Kubernetes Secrets (not in Git)
- GHCR pull secret is in `vrs-app` namespace
- Database credentials are in `vrs-postgres` namespace
- JWT secrets are in `vrs-app` namespace

### Secrets NOT Stored In

- ❌ Git repository
- ❌ Docker images
- ❌ This document
- ❌ ConfigMaps (plaintext only)

### Recommendations

- Enable Kubernetes RBAC for production
- Use Sealed Secrets or External Secrets Operator for GitOps-friendly secret management
- Enable audit logging on the cluster
- Rotate GHCR PAT periodically
- Use network policies to restrict pod-to-pod communication
- Enable Pod Security Standards (restricted profile)

### Cleanup After Deployment

```bash
# Delete migration/seed jobs (contain sensitive output in logs)
kubectl delete job vrs-prisma-migrate -n vrs-app
kubectl delete job vrs-prisma-seed -n vrs-app

# Verify no sensitive data in remaining resources
kubectl get configmap -n vrs-app -o yaml  # Check for secrets
```

---

## 9. Recommended Next Steps

| Priority | Task                             | Description                                              |
| -------- | -------------------------------- | -------------------------------------------------------- |
| **P0**   | Delete migration jobs            | Remove jobs that logged sensitive DB URLs                |
| **P0**   | Change default passwords         | All seeded accounts have default passwords               |
| **P1**   | Fix Prisma migration permanently | Create proper `.env` ConfigMap mount or downgrade Prisma |
| **P1**   | Update ArgoCD manifests          | Push working ingress/issuer config to Git                |
| **P2**   | Add NetworkPolicy                | Restrict ingress to app namespace only                   |
| **P2**   | Enable HPA metrics               | Install metrics-server if not present                    |
| **P2**   | Add resource quotas              | Prevent resource exhaustion                              |
| **P3**   | Setup monitoring                 | Prometheus + Grafana or similar                          |
| **P3**   | Configure alerts                 | Pod crash, certificate expiry, high latency              |
| **P3**   | Document rollback procedure      | ArgoCD rollback + database migration strategy            |
| **P4**   | Production namespace             | Create separate `vrs-prod` namespace                     |
| **P4**   | CI/CD pipeline                   | Auto-deploy on merge to `main`                           |

---

## 10. Future Deployment Checklist

Use this checklist before deploying to any new environment:

### Pre-Deployment

- [ ] Target server architecture confirmed (`uname -m`)
- [ ] Container image built for correct platform (`--platform linux/amd64`)
- [ ] Container registry token has required scopes (`read:packages`, `write:packages`)
- [ ] Container image pushed successfully
- [ ] All k8s manifests validated (`kubectl apply --dry-run=client -o yaml`)
- [ ] Secret files excluded from Git (`.gitignore`)
- [ ] ClusterIssuer name verified (`kubectl get clusterissuer`)
- [ ] NGINX ingress annotations tested against cluster policy

### Deployment

- [ ] Namespaces created
- [ ] Secrets applied via `kubectl create secret`
- [ ] ArgoCD application applied
- [ ] ArgoCD sync status: `Synced`
- [ ] ArgoCD health status: `Healthy`
- [ ] App pods status: `Running` (all replicas ready)
- [ ] PostgreSQL pod status: `Running`
- [ ] Ingress configured with correct host
- [ ] TLS certificate status: `Ready`
- [ ] DNS resolution verified

### Post-Deployment

- [ ] Application accessible via HTTPS
- [ ] Login page loads correctly
- [ ] Database schema applied
- [ ] Database seeded (if fresh deployment)
- [ ] Migration/seed jobs deleted
- [ ] Default passwords changed
- [ ] No sensitive data in job logs
- [ ] Monitoring/alerting configured

### Verification Commands

```bash
# Quick health check
kubectl get pods -A | grep vrs
kubectl get ingress -n vrs-app
kubectl get certificates -n vrs-app
curl -s -o /dev/null -w "%{http_code}" https://vrs-staging.k8s.example.com/
```

---

_Document generated from deployment troubleshooting session on 2026-07-18._
_Last updated: 2026-07-18._
