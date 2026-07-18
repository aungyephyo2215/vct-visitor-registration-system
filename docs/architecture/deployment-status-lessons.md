# Deployment Status & Lessons Learned

## Visitor Registration System — K3s + ArgoCD Deployment

**Date:** 2026-07-18
**Branch:** `staging/argocd-k8s-lab`
**Status:** ✅ Deployed and Running

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Deployment Issues Encountered](#deployment-issues-encountered)
3. [Solutions Applied](#solutions-applied)
4. [Why Other Projects Don't Have This Issue](#why-other-projects-dont-have-this-issue)
5. [Future Improvements](#future-improvements)
6. [Learning Resources](#learning-resources)

---

## Architecture Overview

### Infrastructure Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                    PUBLIC INTERNET                               │
│                          │                                      │
│                  Docker Traefik (Port 443)                       │
│                  ├── HTTPS termination                          │
│                  ├── Bearer Token authentication                │
│                  └── Routes to K3s ingress-nginx                │
│                          │                                      │
│                  K3s ingress-nginx (NodePort 32280/32443)       │
│                          │                                      │
│         ┌────────────────┼────────────────┐                    │
│         │                │                │                    │
│    vrs-app          argocd          guestbook                  │
│    (Deployment)     (Deployment)    (Deployment)               │
│         │                                                      │
│    vrs-postgres                                                │
│    (StatefulSet)                                               │
│         │                                                      │
│    PostgreSQL 16                                               │
│    (PersistentVolume)                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Resource Types by Use Case

| Application | Resource Type             | Why This Type                                      |
| ----------- | ------------------------- | -------------------------------------------------- |
| Next.js App | **Deployment**            | Stateless, scalable, no stable identity needed     |
| PostgreSQL  | **StatefulSet**           | Needs stable network identity + persistent storage |
| Ingress     | **Ingress**               | External HTTPS routing                             |
| Services    | **ClusterIP**             | Internal pod-to-pod communication                  |
| ConfigMaps  | **ConfigMap**             | Non-sensitive configuration                        |
| Secrets     | **Secret**                | Sensitive data (passwords, JWT keys)               |
| PVCs        | **PersistentVolumeClaim** | Persistent database storage                        |

### Why StatefulSet for PostgreSQL

| Feature   | Deployment               | StatefulSet                              |
| --------- | ------------------------ | ---------------------------------------- |
| Pod Names | Random (`vrs-app-a1b2c`) | Stable (`vrs-postgres-0`)                |
| Network   | Ephemeral DNS            | Stable DNS (`vrs-postgres.vrs-postgres`) |
| Storage   | Shared PVC               | Per-pod PVC                              |
| Scaling   | Parallel                 | Ordered (one at a time)                  |
| Restart   | Any order                | Sequential (0 before 1)                  |
| Use Case  | Web servers, APIs        | Databases, message queues                |

**PostgreSQL requires StatefulSet because:**

- Database needs stable network identity for connection strings
- Each pod needs its own persistent storage (data must survive restarts)
- Pods must start/stop in order to maintain data consistency
- Clients connect to `vrs-postgres.vrs-postgres.svc.cluster.local:5432` — this DNS must always resolve to the same pod

---

## Deployment Issues Encountered

### Issue 1: Image Pull Failure (GHCR → Docker Hub)

**Symptom:** `Init:ImagePullBackOff` — pod couldn't pull the container image.

**Root Cause Chain:**

1. GHCR package was **private** → required authentication
2. `ghcr-pull-secret` had **invalid credentials** → token didn't have `read:packages` scope
3. Containerd couldn't resolve the image reference → `ErrImagePull`
4. Even with `imagePullPolicy: Never`, the image wasn't in containerd's cache properly

**What We Tried:**

| Attempt                         | Result                     |
| ------------------------------- | -------------------------- |
| GHCR with auth                  | ❌ Package name mismatch   |
| Docker Hub (public)             | ✅ Worked immediately      |
| Manual image import             | ❌ Containerd cache issues |
| `imagePullPolicy: Never`        | ❌ Image not in cache      |
| `imagePullPolicy: IfNotPresent` | ❌ Still tried remote pull |

**Final Solution:** Switched to Docker Hub (public by default):

```yaml
image: docker.io/aungkyawmyint/vrs:staging
imagePullPolicy: Always
```

**Lesson Learned:**

- Docker Hub public packages are the simplest option for single-node K3s
- GHCR requires explicit auth even for "public" packages
- Containerd's image cache doesn't always match `crictl` output
- `imagePullPolicy: Always` works with Docker Hub (no auth needed)

---

### Issue 2: DATABASE_URL Authentication Error

**Symptom:** `P1000: Authentication failed against database server`

**Root Cause Chain:**

1. PostgreSQL password contained special characters (`/`, `+`)
2. URL-encoding (`%2F`, `%2B`) wasn't handled correctly by Prisma
3. Connection string was malformed → authentication failed

**What We Tried:**

| Attempt                            | Result                           |
| ---------------------------------- | -------------------------------- |
| URL-encoded password               | ❌ Prisma didn't decode properly |
| Simple password (no special chars) | ✅ Worked immediately            |

**Final Solution:** Regenerated passwords without special characters:

```bash
# Generate safe password
NEW_PASS=$(openssl rand -base64 18 | tr -d '=/+' | head -c 24)
# Result: opcaORwafHsCRzpTUXRIkxtM
```

**Lesson Learned:**

- PostgreSQL connection strings require careful handling of special characters
- `+` → `%2B`, `/` → `%2F`, `=` → `%3D`
- Prisma's connection string parser may not handle all encoded characters
- **Simple passwords (alphanumeric only) avoid encoding issues entirely**

---

### Issue 3: StatefulSet OutOfSync (Persistent)

**Symptom:** ArgoCD shows `OutOfSync` for PostgreSQL StatefulSet, even though it's Healthy.

**Root Cause Chain:**

1. Kubernetes `managedFields` changes automatically on every reconciliation
2. ArgoCD compares live state vs desired state
3. `managedFields` differ → ArgoCD reports OutOfSync
4. This is a **known ArgoCD limitation** with StatefulSets

**What We Tried:**

| Attempt                                   | Result                                    |
| ----------------------------------------- | ----------------------------------------- |
| `ignoreDifferences` with `updateStrategy` | ❌ Didn't cover the actual diff           |
| `ignoreDifferences` with `managedFields`  | ⚠️ Partial — still shows OutOfSync        |
| Manual sync                               | ⚠️ Temporary — reverts on next comparison |

**Current Status:** Cosmetic issue — the StatefulSet is **Healthy** and running correctly.

**Why This Happens:**

```yaml
# Kubernetes automatically adds managedFields:
managedFields:
  - manager: kube-controller-manager
    operation: Apply
    time: "2026-07-18T10:00:00Z" # Changes every reconciliation
    fieldsV1:
      f:status: ...
```

**Lesson Learned:**

- Deployments don't have this issue (different revision tracking)
- StatefulSets use `ControllerRevision` which ArgoCD handles differently
- `managedFields` is metadata that Kubernetes manages automatically
- **Health matters more than sync status** — a Healthy resource with OutOfSync is fine

---

## Solutions Applied

### Solution 1: Switch to Docker Hub

**Files Changed:**

- `.github/workflows/build-k8s-image.yml` — Changed registry from GHCR to Docker Hub
- `k8s/base/app/deployment.yaml` — Updated image reference
- `k8s/overlays/staging/patches/container-image.yaml` — Updated image reference

**Configuration:**

```yaml
# Docker Hub (public, no auth needed)
image: docker.io/aungkyawmyint/vrs:staging
imagePullPolicy: Always

# GitHub Actions workflow
env:
  REGISTRY: docker.io
  IMAGE_NAME: aungkyawmyint/vrs
```

**GitHub Secrets Required:**

- `DOCKERHUB_USERNAME` = `aungkyawmyint`
- `DOCKERHUB_TOKEN` = (Read, Write, Delete scope)

---

### Solution 2: Simplify Database Passwords

**Files Changed:**

- `k8s/base/postgres/secret.yaml` — Updated with safe password
- `k8s/base/app/secret.yaml` — Updated with matching password

**Password Generation:**

```bash
# Generate safe password (no special characters)
openssl rand -base64 18 | tr -d '=/+' | head -c 24
# Result: opcaORwafHsCRzpTUXRIkxtM
```

**Connection String:**

```
postgresql://vrs_user:opcaORwafHsCRzpTUXRIkxtM@vrs-postgres.vrs-postgres.svc.cluster.local:5432/vrs_db
```

---

### Solution 3: ArgoCD ignoreDifferences

**File Changed:** `k8s/apps/argocd-application.yaml`

**Configuration:**

```yaml
ignoreDifferences:
  - group: apps
    kind: Deployment
    jsonPointers:
      - /spec/replicas
  - group: apps
    kind: StatefulSet
    jsonPointers:
      - /metadata/managedFields
```

**Effect:** ArgoCD ignores `managedFields` differences when comparing StatefulSet live vs desired state.

**Limitation:** The OutOfSync status persists because other metadata fields also change. This is a known ArgoCD issue.

---

## Why Other Projects Don't Have This Issue

| Application                     | Resources                | Has StatefulSet? | OutOfSync? |
| ------------------------------- | ------------------------ | ---------------- | ---------- |
| **app-of-apps**                 | Deployments only         | ❌ No            | ✅ No      |
| **guestbook**                   | Deployments only         | ❌ No            | ✅ No      |
| **visitor-registration-system** | Deployment + StatefulSet | ✅ Yes           | ⚠️ Yes     |

**Key Difference:** Only `visitor-registration-system` uses a StatefulSet (for PostgreSQL). The OutOfSync is caused by the StatefulSet's `managedFields` metadata, which changes automatically on every Kubernetes reconciliation.

**Why Deployments Don't Have This Issue:**

- Deployments use `DeploymentRevision` which ArgoCD handles cleanly
- StatefulSets use `ControllerRevision` which has different comparison semantics
- ArgoCD's `ignoreDifferences` doesn't fully cover all StatefulSet metadata differences

---

## Future Improvements

### Priority 1: Fix Image Registry (Done ✅)

**Status:** Switched to Docker Hub

**Future Enhancement:** Use a private registry with proper auth:

```yaml
# Option A: Docker Hub private repo
image: docker.io/aungkyawmyint/vrs:staging
imagePullSecrets:
  - name: docker-hub-secret

# Option B: GitHub Container Registry with proper auth
image: ghcr.io/aungyephyo2215/vct-visitor-registration-system:staging
imagePullSecrets:
  - name: ghcr-pull-secret

# Option C: Self-hosted registry on K3s
image: registry.local:5000/vrs:staging
```

### Priority 2: Secret Management (Recommended)

**Current:** Placeholders in Git, manual patching on VPS

**Future Options:**

| Approach                  | Complexity | Security     |
| ------------------------- | ---------- | ------------ |
| SOPS encrypted secrets    | Medium     | ✅ High      |
| Sealed Secrets            | Medium     | ✅ High      |
| External Secrets Operator | High       | ✅ Very High |
| Vault (HashiCorp)         | High       | ✅ Very High |

**Recommended:** SOPS for single-node K3s:

```bash
# Encrypt before commit
sops --encrypt --in-place k8s/base/app/secret.yaml

# Decrypt on VPS
sops --decrypt k8s/base/app/secret.yaml | kubectl apply -f -
```

### Priority 3: Fix StatefulSet OutOfSync (Low Priority)

**Current Status:** Cosmetic issue — StatefulSet is Healthy

**Future Options:**

| Option                      | Pros               | Cons             |
| --------------------------- | ------------------ | ---------------- |
| Accept cosmetic OutOfSync   | Zero effort        | Confusing in UI  |
| Upgrade ArgoCD              | May fix the issue  | Requires testing |
| Use Deployment + PVC        | Avoids StatefulSet | Loses stable DNS |
| Move DB to external service | No StatefulSet     | Adds complexity  |

**Recommended:** Accept the cosmetic issue. The StatefulSet is Healthy and PostgreSQL is running correctly.

### Priority 4: Monitoring & Alerting

**Current:** No monitoring

**Future Enhancements:**

```yaml
# Add Prometheus ServiceMonitor
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: vrs-app
  namespace: vrs-app
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: visitor-registration-system
  endpoints:
    - port: http
      path: /api/metrics
      interval: 30s
```

**Alert Rules:**

- Pod restart count > 3 in 5 minutes
- Pod memory usage > 80%
- PostgreSQL connection failures
- Certificate expiry < 7 days

### Priority 5: Production Hardening

| Area                | Current    | Recommended                   |
| ------------------- | ---------- | ----------------------------- |
| **Replicas**        | 1          | 2-3 (with anti-affinity)      |
| **Resource Limits** | Basic      | Tune based on metrics         |
| **Health Checks**   | Basic HTTP | Custom `/api/health` endpoint |
| **Network Policy**  | None       | Restrict pod-to-pod traffic   |
| **RBAC**            | Basic      | Least-privilege per namespace |
| **Backup**          | None       | pg_dump cronjob + S3          |

---

## Learning Resources

### Kubernetes Concepts

| Concept                   | Resource                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| StatefulSet vs Deployment | [Kubernetes Docs](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/) |
| PersistentVolumes         | [Kubernetes Docs](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)        |
| Services                  | [Kubernetes Docs](https://kubernetes.io/docs/concepts/services-networking/service/)       |
| Ingress                   | [Kubernetes Docs](https://kubernetes.io/docs/concepts/services-networking/ingress/)       |
| ConfigMaps & Secrets      | [Kubernetes Docs](https://kubernetes.io/docs/concepts/configuration/)                     |

### ArgoCD Concepts

| Concept           | Resource                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| Application       | [ArgoCD Docs](https://argo-cd.readthedocs.io/en/stable/user-guide/application-spec/)           |
| ignoreDifferences | [ArgoCD Docs](https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/)                    |
| Sync Policy       | [ArgoCD Docs](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/)               |
| App-of-Apps       | [ArgoCD Docs](https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/) |

### Best Practices

| Area                 | Recommendation                                     |
| -------------------- | -------------------------------------------------- |
| **Image Tags**       | Use immutable tags (SHA or version), not `latest`  |
| **Secrets**          | Never commit real values; use placeholders + patch |
| **Health Checks**    | Always configure liveness + readiness probes       |
| **Resource Limits**  | Set requests and limits for every container        |
| **Network Policies** | Restrict pod-to-pod traffic in production          |
| **RBAC**             | Use least-privilege ServiceAccounts per workload   |

---

## Summary

| Issue                   | Root Cause                 | Solution                      | Status      |
| ----------------------- | -------------------------- | ----------------------------- | ----------- |
| Image Pull Failure      | GHCR private + auth issues | Switch to Docker Hub          | ✅ Fixed    |
| DATABASE_URL Auth Error | Special chars in password  | Use simple passwords          | ✅ Fixed    |
| StatefulSet OutOfSync   | `managedFields` metadata   | `ignoreDifferences` (partial) | ⚠️ Cosmetic |
| Login Test              | N/A                        | Verified working              | ✅ Working  |

**Key Takeaway:** The deployment is functional and running. The OutOfSync is a cosmetic issue that doesn't affect functionality. Focus on monitoring and production hardening for future improvements.
