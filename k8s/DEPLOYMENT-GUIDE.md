# Kubernetes Deployment Guide

## Visitor Registration System — Complete Production Guide

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Repository Structure](#2-repository-structure)
3. [Kubernetes Architecture](#3-kubernetes-architecture)
4. [Deployment Workflow](#4-deployment-workflow)
5. [Kustomize](#5-kustomize)
6. [GitOps & Argo CD](#6-gitops--argo-cd)
7. [Networking](#7-networking)
8. [Storage](#8-storage)
9. [Security Review](#9-security-review)
10. [Troubleshooting Guide](#10-troubleshooting-guide)
11. [Validation Checklist](#11-validation-checklist)
12. [Production Readiness Review](#12-production-readiness-review)
13. [DevOps/SRE Interview Preparation](#13-devops-sre-interview-preparation)

---

## 1. Project Overview

### Project Purpose

The Visitor Registration System (VRS) is a digital replacement for paper-based visitor logs in condos, apartments, offices, and warehouses. It provides QR-based digital registration, approval workflows, security check-in/out, and audit trails.

### Kubernetes Platform

| Property              | Value                                    |
| --------------------- | ---------------------------------------- |
| **Distribution**      | K3s (lightweight Kubernetes)             |
| **Version**           | v1.36.2+k3s1                             |
| **Node**              | Single-node cluster on Hetzner Cloud VPS |
| **Container Runtime** | containerd                               |
| **Node Name**         | vmi3350762                               |

### Deployment Strategy

| Aspect             | Approach                                     |
| ------------------ | -------------------------------------------- |
| **Method**         | GitOps via Argo CD                           |
| **Manifests**      | Kustomize (base + overlays)                  |
| **Image Registry** | Docker Hub (public)                          |
| **CI/CD**          | GitHub Actions → Docker Hub → Argo CD        |
| **Environments**   | Staging (active), Production (overlay ready) |

### GitOps Workflow

```mermaid
graph LR
    Dev[Developer] -->|git push| GitHub[GitHub]
    GitHub -->|webhook| ArgoCD[Argo CD]
    ArgoCD -->|render manifests| Kustomize[Kustomize]
    Kustomize -->|apply| K8s[Kubernetes API]
    K8s -->|creates| Pods[Pods]
    Pods -->|serves| App[Application]
```

### Environment Layout

| Environment    | Branch                   | Domain                   | Database               |
| -------------- | ------------------------ | ------------------------ | ---------------------- |
| **Staging**    | `staging/argocd-k8s-lab` | `YOUR_STAGING_DOMAIN`    | Self-hosted PostgreSQL |
| **Production** | `main`                   | `YOUR_PRODUCTION_DOMAIN` | Supabase (managed)     |

### Technology Stack

| Layer             | Technology    | Version       |
| ----------------- | ------------- | ------------- |
| **Application**   | Next.js       | 16.2.9        |
| **Language**      | TypeScript    | 5.x           |
| **ORM**           | Prisma        | 7.8.0         |
| **Database**      | PostgreSQL    | 16-alpine     |
| **Container**     | Docker        | Multi-stage   |
| **Orchestration** | K3s           | v1.36.2       |
| **GitOps**        | Argo CD       | Latest        |
| **Ingress**       | ingress-nginx | Latest        |
| **TLS**           | cert-manager  | Let's Encrypt |

---

## 2. Repository Structure

### Directory Tree

```
k8s/
├── apps/                                    # Argo CD Application
│   ├── argocd-application.yaml             # Application CRD definition
│   └── kustomization.yaml                  # Wraps argocd-application.yaml
│
├── base/                                    # Base manifests (shared across environments)
│   ├── kustomization.yaml                  # Base kustomize root
│   │
│   ├── app/                                # Next.js application resources (9 files)
│   │   ├── configmap.yaml                 # Non-sensitive configuration
│   │   ├── deployment.yaml                # App deployment with init containers
│   │   ├── hpa.yaml                       # Horizontal Pod Autoscaler
│   │   ├── ingress.yaml                   # Ingress with TLS and rate limiting
│   │   ├── namespace.yaml                 # vrs-app namespace with PSS labels
│   │   ├── network-policy.yaml            # Ingress/Egress firewall rules
│   │   ├── pdb.yaml                       # Pod Disruption Budget
│   │   ├── resource-quota.yaml            # CPU/memory/pod limits
│   │   ├── secret.yaml                    # Secret template (gitignored)
│   │   └── service.yaml                   # ClusterIP service
│   │
│   └── postgres/                           # PostgreSQL database resources (8 files)
│       ├── backup-cronjob.yaml            # Daily pg_dump CronJob
│       ├── configmap.yaml                 # PGDATA and init configuration
│       ├── namespace.yaml                 # vrs-postgres namespace with PSS labels
│       ├── network-policy.yaml            # Database ingress restriction
│       ├── resource-quota.yaml            # Database resource limits
│       ├── secret.yaml                    # Database credentials (gitignored)
│       ├── service.yaml                   # ClusterIP service
│       └── statefulset.yaml              # PostgreSQL StatefulSet with PVC
│
├── overlays/                               # Environment-specific patches
│   ├── staging/                            # Staging overlay
│   │   ├── kustomization.yaml             # References base + applies patches
│   │   └── patches/
│   │       ├── container-image.yaml       # Docker Hub image override
│   │       ├── ingress-host.yaml          # Staging domain override
│   │       └── resource-limits.yaml       # Reduced resource limits
│   │
│   └── production/                         # Production overlay
│       ├── kustomization.yaml             # References base + applies patches
│       └── patches/
│           ├── ingress-host.yaml          # Production domain override
│           ├── replicas.yaml              # 3 replicas minimum
│           └── resource-limits.yaml       # Higher resource limits
│
├── deployment-status-lessons.md           # Deployment lessons learned
└── README.md                              # K8s directory documentation
```

### File Inventory

| Category      | Directory              | Files              | Purpose                    |
| ------------- | ---------------------- | ------------------ | -------------------------- |
| Argo CD       | `apps/`                | 2                  | Application definition     |
| App Base      | `base/app/`            | 9                  | Application manifests      |
| DB Base       | `base/postgres/`       | 8                  | Database manifests         |
| Staging       | `overlays/staging/`    | 4                  | Staging patches            |
| Production    | `overlays/production/` | 4                  | Production patches         |
| Documentation | `k8s/`                 | 2                  | README and lessons learned |
| **Total**     |                        | **29 YAML + 2 MD** |                            |

### Manifest Dependencies

```mermaid
graph TD
    BaseKustomize["base/kustomization.yaml<br/>Imports all base resources"]
    StagingOverlay["overlays/staging/kustomization.yaml<br/>References base + patches"]
    ProductionOverlay["overlays/production/kustomization.yaml<br/>References base + patches"]
    ArgoApp["apps/argocd-application.yaml<br/>Points to overlays/staging"]

    BaseKustomize --> AppNS["app/namespace.yaml"]
    BaseKustomize --> AppCM["app/configmap.yaml"]
    BaseKustomize --> AppDeploy["app/deployment.yaml"]
    BaseKustomize --> AppSvc["app/service.yaml"]
    BaseKustomize --> AppIngress["app/ingress.yaml"]
    BaseKustomize --> AppHPA["app/hpa.yaml"]
    BaseKustomize --> AppNP["app/network-policy.yaml"]
    BaseKustomize --> AppPDB["app/pdb.yaml"]
    BaseKustomize --> AppRQ["app/resource-quota.yaml"]

    BaseKustomize --> PgNS["postgres/namespace.yaml"]
    BaseKustomize --> PgCM["postgres/configmap.yaml"]
    BaseKustomize --> PgSTS["postgres/statefulset.yaml"]
    BaseKustomize --> PgSvc["postgres/service.yaml"]
    BaseKustomize --> PgNP["postgres/network-policy.yaml"]
    BaseKustomize --> PgRQ["postgres/resource-quota.yaml"]
    BaseKustomize --> PgCron["postgres/backup-cronjob.yaml"]

    StagingOverlay --> BaseKustomize
    ProductionOverlay --> BaseKustomize
    ArgoApp --> StagingOverlay
```

### Why Each Resource Exists

| Resource                  | Why It Exists                                               |
| ------------------------- | ----------------------------------------------------------- |
| `namespace.yaml`          | Isolates app and database in separate namespaces            |
| `configmap.yaml`          | Stores non-sensitive configuration (SMTP, JWT expiry, etc.) |
| `secret.yaml`             | Stores sensitive data (DB URL, JWT secrets, SMTP password)  |
| `deployment.yaml`         | Runs the Next.js application with rolling updates           |
| `statefulset.yaml`        | Runs PostgreSQL with stable storage and network identity    |
| `service.yaml`            | Provides stable DNS endpoint for pods                       |
| `ingress.yaml`            | Routes external HTTPS traffic to the application            |
| `hpa.yaml`                | Automatically scales pods based on CPU/memory usage         |
| `pdb.yaml`                | Ensures minimum availability during voluntary disruptions   |
| `network-policy.yaml`     | Restricts network traffic between namespaces                |
| `resource-quota.yaml`     | Limits resource consumption per namespace                   |
| `backup-cronjob.yaml`     | Automated daily database backups                            |
| `argocd-application.yaml` | GitOps automation for deployment                            |

---

## 3. Kubernetes Architecture

### Namespace Layout

```mermaid
graph TB
    subgraph Cluster["K3s Cluster (vmi3350762)"]
        subgraph ArgoCDNS["Namespace: argocd"]
            ArgoCDServer[Argo CD Server]
            ArgoCDApp[Application CRD]
        end

        subgraph AppNS["Namespace: vrs-app"]
            AppDeploy[Deployment: vrs-app]
            AppRS[ReplicaSet]
            AppPod1[Pod vrs-app-xxx-abc]
            AppPod2[Pod vrs-app-xxx-def]
            AppSvc[Service: vrs-app]
            AppIngress[Ingress: vrs-app]
            AppHPA[HPA: vrs-app]
            AppPDB[PDB: vrs-app]
            AppNP[NetworkPolicy]
            AppRQ[ResourceQuota]
            AppCM[ConfigMap: vrs-app-config]
            AppSecret[Secret: vrs-app-secret]
        end

        subgraph DBNS["Namespace: vrs-postgres"]
            PgSTS[StatefulSet: vrs-postgres]
            PgPod[Pod: vrs-postgres-0]
            PgSvc[Service: vrs-postgres]
            PgPVC[PVC: postgres-data-vrs-postgres-0]
            PgNP[NetworkPolicy]
            PgRQ[ResourceQuota]
            PgCM[ConfigMap: vrs-postgres-config]
            PgSecret[Secret: vrs-postgres-secret]
            PgCron[CronJob: vrs-postgres-backup]
        end
    end

    ArgoCDApp -->|syncs| AppDeploy
    ArgoCDApp -->|syncs| PgSTS
    AppDeploy --> AppRS
    AppRS --> AppPod1
    AppRS --> AppPod2
    AppIngress --> AppSvc
    AppSvc --> AppPod1
    AppSvc --> AppPod2
    AppHPA --> AppDeploy
    AppPod1 -->|TCP:5432| PgSvc
    AppPod2 -->|TCP:5432| PgSvc
    PgSvc --> PgPod
    PgPod --> PgPVC
    PgCron -->|backups via| PgSvc
```

### Resource Relationships

#### Deployment → ReplicaSet → Pod

```mermaid
graph TD
    Deploy[Deployment: vrs-app<br/>spec.replicas: 1]
    RS[ReplicaSet<br/>managed by Deployment]
    Pod1[Pod: vrs-app-788bc7c57b-abc12<br/>Phase: Running]

    Deploy -->|creates/manages| RS
    RS -->|creates| Pod1

    style Deploy fill:#4CAF50,color:#fff
    style RS fill:#2196F3,color:#fff
    style Pod1 fill:#FF9800,color:#fff
```

**How it works:**

1. Deployment defines desired state (replicas, image, config)
2. Deployment creates ReplicaSet to maintain pod count
3. ReplicaSet creates Pods based on pod template
4. If a pod dies, ReplicaSet creates a replacement
5. If you update the Deployment, ReplicaSet creates new pods

#### StatefulSet → Pod → PVC

```mermaid
graph TD
    STS[StatefulSet: vrs-postgres<br/>spec.replicas: 1]
    Pod[Pod: vrs-postgres-0<br/>Stable identity]
    PVC[PVC: postgres-data-vrs-postgres-0<br/>5Gi, Bound]
    PV[PV: dynamic<br/>local-path]
    SC[StorageClass: local-path<br/>rancher.io/local-path]

    STS -->|creates| Pod
    STS -->|creates| PVC
    PVC -->|bound to| PV
    PV -->|provisioned by| SC

    style STS fill:#9C27B0,color:#fff
    style Pod fill:#FF9800,color:#fff
    style PVC fill:#F44336,color:#fff
    style PV fill:#795548,color:#fff
```

**Why StatefulSet for PostgreSQL:**

- Stable network identity (`vrs-postgres-0`, not random hash)
- Stable storage (PVC persists across pod restarts)
- Ordered deployment (pod-0 starts before pod-1)
- `persistentVolumeClaimRetentionPolicy: Retain` (PVC survives StatefulSet deletion)

#### Service → Endpoints

```mermaid
graph LR
    Svc[Service: vrs-app<br/>ClusterIP: 10.43.x.x<br/>Port: 3000]
    EP1[Endpoint: 10.42.0.32:3000]
    EP2[Endpoint: 10.43.0.33:3000]
    EP3[Endpoint: 10.42.0.35:3000]
    Pod1[Pod: vrs-app-xxx-pnrbv]
    Pod2[Pod: vrs-app-xxx-n8hsf]
    Pod3[Pod: vrs-app-xxx-7jkw7]

    Svc -->|selects via labels| EP1
    Svc -->|selects via labels| EP2
    Svc -->|selects via labels| EP3
    EP1 --> Pod1
    EP2 --> Pod2
    EP3 --> Pod3
```

**How Service discovery works:**

1. Service uses label selector: `app.kubernetes.io/name: visitor-registration-system`
2. Endpoints controller finds all pods matching those labels
3. Service gets a ClusterIP (virtual IP) and DNS name
4. DNS: `vrs-app.vrs-app.svc.cluster.local` resolves to ClusterIP
5. kube-proxy routes traffic to backend pods

### Pod Anatomy

```mermaid
graph TB
    subgraph Pod["Pod: vrs-app-788bc7c57b-abc12"]
        subgraph InitContainers["Init Containers (sequential)"]
            IC1["1. wait-for-postgres<br/>busybox:1.36<br/>nc -z postgres:5432"]
            IC2["2. run-migrations<br/>vrs:staging<br/>prisma migrate deploy"]
            IC3["3. seed-database<br/>vrs:staging<br/>prisma db seed"]
        end

        subgraph MainContainer["Main Container"]
            MC["vrs-app<br/>ghcr.io/.../vrs:staging<br/>Next.js 16.2.9<br/>Port 3000"]
        end

        subgraph Volumes["Volumes"]
            Vol1["kube-api-access<br/>Projected service account token"]
        end
    end

    IC1 -->|PostgreSQL ready| IC2
    IC2 -->|Migrations done| IC3
    IC3 -->|Seed complete| MC
    MC --> Vol1
```

### Labels and Selectors

| Resource      | Labels                                                | Selector                                              |
| ------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| Deployment    | `app.kubernetes.io/name: visitor-registration-system` | `app.kubernetes.io/name: visitor-registration-system` |
| Pods          | `app.kubernetes.io/name: visitor-registration-system` | N/A (created by ReplicaSet)                           |
| Service       | N/A                                                   | `app.kubernetes.io/name: visitor-registration-system` |
| Ingress       | N/A                                                   | Routes to Service                                     |
| NetworkPolicy | N/A                                                   | `app.kubernetes.io/name: visitor-registration-system` |
| PDB           | N/A                                                   | `app.kubernetes.io/name: visitor-registration-system` |

**Common labels applied via kustomize:**

```yaml
app.kubernetes.io/part-of: visitor-registration-system
managed-by: argocd
```

---

## 4. Deployment Workflow

### Prerequisites

Before deploying, verify:

```bash
# 1. Check cluster connectivity
kubectl cluster-info

# 2. Check node status
kubectl get nodes

# 3. Check Argo CD is running
kubectl get pods -n argocd

# 4. Check ingress-nginx is running
kubectl get pods -n ingress-nginx

# 5. Check cert-manager is running
kubectl get pods -n cert-manager
```

### Step 1: Create Namespaces

**Purpose:** Isolate application and database resources.

```bash
kubectl create namespace vrs-app --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace vrs-postgres --dry-run=client -o yaml | kubectl apply -f -
```

**Expected result:**

```
namespace/vrs-app created
namespace/vrs-postgres created
```

**Internal process:**

1. `kubectl` sends namespace creation request to Kubernetes API
2. API server creates namespace objects in etcd
3. Namespace is immediately available for resource deployment

**Validation:**

```bash
kubectl get namespaces | grep vrs
```

**Rollback:**

```bash
kubectl delete namespace vrs-app
kubectl delete namespace vrs-postgres
```

### Step 2: Create Secrets

**Purpose:** Store sensitive data (database credentials, JWT secrets) securely.

```bash
# PostgreSQL secret
kubectl create secret generic vrs-postgres-secret \
  --namespace vrs-postgres \
  --from-literal=POSTGRES_USER=vrs_user \
  --from-literal=POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 20) \
  --from-literal=POSTGRES_DB=vrs_db \
  --dry-run=client -o yaml | kubectl apply -f -

# Application secret
kubectl create secret generic vrs-app-secret \
  --namespace vrs-app \
  --from-literal=DATABASE_URL="postgresql://vrs_user:YOUR_DB_PASSWORD@vrs-postgres.vrs-postgres.svc.cluster.local:5432/vrs_db?connection_limit=5" \
  --from-literal=DIRECT_DATABASE_URL="postgresql://vrs_user:YOUR_DB_PASSWORD@vrs-postgres.vrs-postgres.svc.cluster.local:5432/vrs_db" \
  --from-literal=JWT_SECRET="$(openssl rand -base64 32)" \
  --from-literal=JWT_REFRESH_SECRET="$(openssl rand -base64 32)" \
  --from-literal=SMTP_PASS="unused" \
  --dry-run=client -o yaml | kubectl apply -f -
```

**Expected result:**

```
secret/vrs-postgres-secret created
secret/vrs-app-secret created
```

**Validation:**

```bash
kubectl get secrets -n vrs-postgres
kubectl get secrets -n vrs-app
```

**Common failures:**

- `Error: secret "vrs-app-secret" already exists` → Delete and recreate, or use `--dry-run=client -o yaml` to update
- `The connection to the server was refused` → Check cluster connectivity

### Step 3: Apply Kustomize Manifests

**Purpose:** Deploy all base resources with staging overlay patches.

```bash
kubectl apply -k k8s/overlays/staging/
```

**Expected result:**

```
namespace/vrs-app configured
namespace/vrs-postgres configured
resourcequota/vrs-app-quota created
resourcequota/vrs-postgres-quota created
configmap/vrs-app-config created
configmap/vrs-postgres-config created
service/vrs-app created
service/vrs-postgres created
deployment.apps/vrs-app created
statefulset.apps/vrs-postgres created
cronjob.batch/vrs-postgres-backup created
poddisruptionbudget.policy/vrs-app created
horizontalpodautoscaler.autoscaling/vrs-app created
ingress.networking.k8s.io/vrs-app created
networkpolicy.networking.k8s.io/vrs-app-network-policy created
networkpolicy.networking.k8s.io/vrs-postgres-network-policy created
```

**Internal process:**

1. Kustomize renders `base/kustomization.yaml` + `overlays/staging/patches/`
2. Patches override: image, ingress host, resource limits
3. ConfigMapGenerator merges staging-specific values
4. `kubectl apply` sends each resource to Kubernetes API
5. API server validates and stores each resource in etcd
6. Controllers react to new resources (Deployment controller, Ingress controller, etc.)

**Validation:**

```bash
kubectl get all -n vrs-app
kubectl get all -n vrs-postgres
```

**Dry run (validate without applying):**

```bash
kubectl kustomize k8s/overlays/staging/ | kubectl apply --dry-run=client -f -
```

**Diff (see what will change):**

```bash
kubectl diff -k k8s/overlays/staging/
```

### Step 4: Apply Argo CD Application

**Purpose:** Enable GitOps automation for ongoing deployments.

```bash
kubectl apply -f k8s/apps/argocd-application.yaml
```

**Expected result:**

```
application.argoproj.io/visitor-registration-system created
```

**Validation:**

```bash
kubectl get application visitor-registration-system -n argocd
kubectl get application visitor-registration-system -n argocd \
  -o jsonpath='Sync: {.status.sync.status}, Health: {.status.health.status}'
```

**Expected output:**

```
Sync: Synced, Health: Healthy
```

### Step 5: Verify Deployment

**Check pods:**

```bash
kubectl get pods -n vrs-app -o wide
kubectl get pods -n vrs-postgres -o wide
```

**Check services:**

```bash
kubectl get svc -n vrs-app
kubectl get svc -n vrs-postgres
```

**Check ingress:**

```bash
kubectl get ingress -n vrs-app
```

**Check health endpoint:**

```bash
curl -k https://YOUR_STAGING_DOMAIN/api/health
```

**Check application logs:**

```bash
kubectl logs -n vrs-app deployment/vrs-app --tail=20
```

**Check init container logs:**

```bash
kubectl logs -n vrs-app <pod-name> -c wait-for-postgres
kubectl logs -n vrs-app <pod-name> -c run-migrations
kubectl logs -n vrs-app <pod-name> -c seed-database
```

### Step 6: Monitor Pod Startup

```bash
# Watch pods in real-time
kubectl get pods -n vrs-app -w

# Check events
kubectl get events -n vrs-app --sort-by='.lastTimestamp'
kubectl get events -n vrs-postgres --sort-by='.lastTimestamp'
```

**Expected startup sequence:**

1. Pod scheduled to node
2. `wait-for-postgres` init container starts (~2s)
3. `run-migrations` init container starts (~30-40s)
4. `seed-database` init container starts (~10s)
5. Main container starts
6. Startup probe passes
7. Readiness probe passes
8. Pod added to Service endpoints
9. Traffic flows through Ingress

### Step 7: Rollback (if needed)

```bash
# Rollback deployment
kubectl rollout undo deployment/vrs-app -n vrs-app

# Check rollout status
kubectl rollout status deployment/vrs-app -n vrs-app

# View rollout history
kubectl rollout history deployment/vrs-app -n vrs-app
```

---

## 5. Kustomize

### What is Kustomize?

Kustomize is a Kubernetes-native configuration management tool that allows you to customize manifests without templates. Instead of Helm's templating approach, Kustomize uses **overlays** that patch base manifests.

### How This Project Uses Kustomize

```mermaid
graph TD
    Base["base/kustomization.yaml<br/>16 resources"]
    Staging["overlays/staging/kustomization.yaml<br/>3 patches + configMap"]
    Production["overlays/production/kustomization.yaml<br/>3 patches + configMap"]

    Base --> Staging
    Base --> Production

    Staging --> S1["patches/container-image.yaml<br/>Docker Hub image"]
    Staging --> S2["patches/ingress-host.yaml<br/>Staging domain"]
    Staging --> S3["patches/resource-limits.yaml<br/>Reduced resources"]

    Production --> P1["patches/ingress-host.yaml<br/>Production domain"]
    Production --> P2["patches/replicas.yaml<br/>3 replicas"]
    Production --> P3["patches/resource-limits.yaml<br/>Higher resources"]
```

### Base Resources (k8s/base/kustomization.yaml)

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  # PostgreSQL
  - postgres/namespace.yaml
  - postgres/configmap.yaml
  - postgres/statefulset.yaml
  - postgres/service.yaml
  - postgres/network-policy.yaml
  - postgres/resource-quota.yaml
  - postgres/backup-cronjob.yaml

  # Application
  - app/namespace.yaml
  - app/configmap.yaml
  - app/deployment.yaml
  - app/service.yaml
  - app/ingress.yaml
  - app/hpa.yaml
  - app/network-policy.yaml
  - app/pdb.yaml
  - app/resource-quota.yaml

commonLabels:
  app.kubernetes.io/part-of: visitor-registration-system
  managed-by: argocd
```

**Key points:**

- Lists all base resources explicitly
- `commonLabels` adds labels to ALL resources
- Secrets are NOT listed (created via kubectl, gitignored)

### Staging Overlay

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

patches:
  - path: patches/resource-limits.yaml # Reduce CPU/memory
  - path: patches/ingress-host.yaml # Staging domain
  - path: patches/container-image.yaml # Docker Hub image

configMapGenerator:
  - name: vrs-app-config
    namespace: vrs-app
    behavior: merge
    literals:
      - NEXT_PUBLIC_APP_URL=https://YOUR_STAGING_DOMAIN
      - APP_BASE_URL=https://YOUR_STAGING_DOMAIN
      - EMAIL_PROVIDER=noop
```

**How patches work:**

```yaml
# patches/container-image.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vrs-app
  namespace: vrs-app
spec:
  template:
    spec:
      initContainers:
        - name: run-migrations
          image: docker.io/YOUR_DOCKERHUB_USERNAME/vrs:staging
        - name: seed-database
          image: docker.io/YOUR_DOCKERHUB_USERNAME/vrs:staging
      containers:
        - name: vrs-app
          image: docker.io/YOUR_DOCKERHUB_USERNAME/vrs:staging
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "500m"
```

### Production Overlay

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

patches:
  - path: patches/resource-limits.yaml # Higher resources
  - path: patches/replicas.yaml # 3 replicas
  - path: patches/ingress-host.yaml # Production domain

configMapGenerator:
  - name: vrs-app-config
    namespace: vrs-app
    behavior: merge
    literals:
      - NEXT_PUBLIC_APP_URL=https://YOUR_PRODUCTION_DOMAIN
      - APP_BASE_URL=https://YOUR_PRODUCTION_DOMAIN
      - EMAIL_PROVIDER=smtp
```

### Resource Comparison

| Resource           | Base          | Staging               | Production               |
| ------------------ | ------------- | --------------------- | ------------------------ |
| App Replicas       | 1             | 1 (HPA: 1-3)          | 3                        |
| App CPU Request    | 100m          | 100m                  | 250m                     |
| App CPU Limit      | 500m          | 500m                  | 1000m                    |
| App Memory Request | 256Mi         | 128Mi                 | 256Mi                    |
| App Memory Limit   | 512Mi         | 256Mi                 | 512Mi                    |
| DB CPU Request     | 100m          | 50m                   | 500m                     |
| DB CPU Limit       | 500m          | 250m                  | 2000m                    |
| DB Memory Request  | 256Mi         | 128Mi                 | 1Gi                      |
| DB Memory Limit    | 512Mi         | 256Mi                 | 4Gi                      |
| Domain             | `YOUR_DOMAIN` | `YOUR_STAGING_DOMAIN` | `YOUR_PRODUCTION_DOMAIN` |
| Email              | smtp          | noop                  | smtp                     |

### Kustomize Commands

```bash
# Render manifests without applying
kubectl kustomize k8s/overlays/staging/

# Dry run (validate without applying)
kubectl kustomize k8s/overlays/staging/ | kubectl apply --dry-run=client -f -

# Diff (see what will change)
kubectl diff -k k8s/overlays/staging/

# Apply
kubectl apply -k k8s/overlays/staging/

# Build and save
kubectl kustomize k8s/overlays/staging/ > /tmp/staging-manifests.yaml
```

---

## 6. GitOps & Argo CD

### Core Concepts

| Concept           | Definition                              |
| ----------------- | --------------------------------------- |
| **Desired State** | What's defined in Git (k8s/ directory)  |
| **Live State**    | What's actually running in the cluster  |
| **Sync**          | Making live state match desired state   |
| **Prune**         | Deleting resources removed from Git     |
| **Self Heal**     | Reverting manual changes to match Git   |
| **Health Status** | Whether resources are running correctly |
| **Sync Status**   | Whether live matches desired            |

### Argo CD Application Configuration

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: visitor-registration-system
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/YOUR_GITHUB_USERNAME/vct-visitor-registration-system.git
    targetRevision: staging/argocd-k8s-lab
    path: k8s/overlays/staging
  destination:
    server: https://kubernetes.default.svc
    namespace: vrs-app
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
      - PruneLast=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
    - group: apps
      kind: StatefulSet
      jqPathExpressions:
        - .spec.volumeClaimTemplates[]
      jsonPointers:
        - /metadata/managedFields
        - /spec/updateStrategy/rollingUpdate
        - /spec/podManagementPolicy
```

### Configuration Explained

| Setting                             | Value                    | Why                                             |
| ----------------------------------- | ------------------------ | ----------------------------------------------- |
| `automated.prune: true`             | Delete removed resources | Keeps cluster clean                             |
| `automated.selfHeal: true`          | Revert manual changes    | Enforces Git as source of truth                 |
| `CreateNamespace=true`              | Auto-create namespaces   | Simplifies first deployment                     |
| `PrunePropagationPolicy=foreground` | Delete dependents first  | Prevents orphaned resources                     |
| `PruneLast=true`                    | Delete after create      | Ensures new resources exist before removing old |
| `retry.limit: 5`                    | Retry 5 times            | Handles transient failures                      |
| `ignoreDifferences`                 | Ignore HPA replicas, VCT | Prevents OutOfSync loops                        |

### Complete GitOps Workflow

```mermaid
sequenceDiagram
    participant D as Developer
    participant G as GitHub
    participant A as Argo CD
    participant K as K8s API
    participant C as Controllers
    participant P as Pods

    D->>G: git push (new code/image)
    G->>A: Webhook notification
    A->>G: Fetch manifests from staging/argocd-k8s-lab
    A->>A: Render kustomize (base + staging overlay)
    A->>K: Compare desired vs live state
    A->>K: Apply differences (create/update/delete)
    K->>C: Notify controllers
    C->>K: Create/update resources
    K->>P: Rolling update begins
    P->>P: Init containers (wait → migrate → seed)
    P->>P: Start main container
    P->>K: Report health status
    A->>K: Verify health
    A-->>D: Synced + Healthy
```

### Argo CD Status Commands

```bash
# Check sync and health status
kubectl get application visitor-registration-system -n argocd \
  -o jsonpath='Sync: {.status.sync.status}, Health: {.status.health.status}'

# Check all resources
kubectl get application visitor-registration-system -n argocd \
  -o jsonpath='{range .status.resources[*]}{.kind}/{.name}: {.status}{"\n"}{end}'

# Force hard refresh
kubectl patch application visitor-registration-system -n argocd \
  --type merge -p '{"metadata":{"annotations":{"argocd.argoproj.io/refresh":"hard"}}}'

# View Argo CD UI
# https://argocd.k8s.cmtmm.online/
```

### What Happens When Git Changes

1. **Git push** → GitHub receives commit
2. **Webhook** → Argo CD is notified (or polls every 3 minutes)
3. **Fetch** → Argo CD pulls latest manifests from Git
4. **Render** → Kustomize applies patches to base manifests
5. **Compare** → Argo CD compares rendered manifests with live state
6. **Diff** → Argo CD identifies differences
7. **Apply** → Argo CD sends create/update/delete requests to K8s API
8. **Reconcile** → K8s controllers react to changes
9. **Health** → Argo CD monitors resource health
10. **Status** → Argo CD updates Application status

---

## 7. Networking

### Request Flow

```mermaid
graph TB
    Client[Client Browser]
    DNS[DNS Resolution<br/>YOUR_STAGING_DOMAIN]
    Traefik[Traefik Edge Proxy<br/>HTTPS :443]
    Nginx[ingress-nginx<br/>NodePort :32443]
    Ingress[Ingress: vrs-app<br/>TLS Termination]
    Service[Service: vrs-app<br/>ClusterIP:3000]
    Pod1[Pod: vrs-app-xxx<br/>:3000]
    Pod2[Pod: vrs-app-xxx<br/>:3000]
    PGService[Service: vrs-postgres<br/>ClusterIP:5432]
    PGPod[Pod: vrs-postgres-0<br/>:5432]

    Client -->|HTTPS| DNS
    DNS --> Traefik
    Traefik -->|HTTP| Nginx
    Nginx --> Ingress
    Ingress --> Service
    Service --> Pod1
    Service --> Pod2
    Pod1 --> PGService
    Pod2 --> PGService
    PGService --> PGPod
```

### Service Types

| Service        | Type      | ClusterIP | Port | Purpose            |
| -------------- | --------- | --------- | ---- | ------------------ |
| `vrs-app`      | ClusterIP | 10.43.x.x | 3000 | Application access |
| `vrs-postgres` | ClusterIP | 10.43.x.x | 5432 | Database access    |

**Why ClusterIP:**

- Services are only accessible within the cluster
- External access is through Ingress (not LoadBalancer)
- More secure (no direct external exposure)

### Ingress Configuration

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: vrs-app
  namespace: vrs-app
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-production
    nginx.ingress.kubernetes.io/limit-rps: "10"
    nginx.ingress.kubernetes.io/limit-burst-multiplier: "5"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - YOUR_STAGING_DOMAIN
      secretName: vrs-staging-app-tls
  rules:
    - host: YOUR_STAGING_DOMAIN
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: vrs-app
                port:
                  number: 3000
```

### TLS Configuration

| Setting            | Value                              |
| ------------------ | ---------------------------------- |
| ClusterIssuer      | `letsencrypt-production`           |
| Protocol           | ACME HTTP-01 challenge             |
| Certificate Secret | `vrs-staging-app-tls`              |
| Auto-renewal       | cert-manager handles automatically |

### DNS Resolution Inside Cluster

```
# Service DNS format
<service-name>.<namespace>.svc.cluster.local

# Examples
vrs-app.vrs-app.svc.cluster.local         → App Service
vrs-postgres.vrs-postgres.svc.cluster.local → PostgreSQL Service

# Short form (within same namespace)
vrs-app                                    → App Service
vrs-postgres                               → PostgreSQL Service (cross-namespace needs FQDN)
```

### Network Policies

**App NetworkPolicy:**

```yaml
# INGRESS: Only from ingress-nginx namespace
ingress:
  - from:
      - namespaceSelector:
          matchLabels:
            kubernetes.io/metadata.name: ingress-nginx
    ports:
      - port: 3000

# EGRESS: DNS + PostgreSQL + External HTTPS
egress:
  # DNS resolution (all namespaces)
  - to: [namespaceSelector: {}]
    ports: [53 UDP, 53 TCP]

  # PostgreSQL (vrs-postgres namespace only)
  - to:
      - namespaceSelector:
          matchLabels:
            kubernetes.io/metadata.name: vrs-postgres
    ports: [5432 TCP]

  # External HTTPS (SMTP, webhooks)
  - to:
      - ipBlock:
          cidr: 0.0.0.0/0
          except: [10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16]
    ports: [443 TCP, 587 TCP, 25 TCP]
```

**PostgreSQL NetworkPolicy:**

```yaml
# INGRESS: Only from vrs-app namespace
ingress:
  - from:
      - namespaceSelector:
          matchLabels:
            kubernetes.io/metadata.name: vrs-app
    ports: [5432 TCP]
```

**What this means:**

- App pods can ONLY receive traffic from ingress-nginx
- App pods can ONLY talk to PostgreSQL in vrs-postgres namespace
- App pods can ONLY reach external IPs (not cluster-internal)
- PostgreSQL can ONLY receive connections from app pods

---

## 8. Storage

### Storage Architecture

```mermaid
graph TB
    subgraph Cluster["K3s Cluster"]
        SC[StorageClass: local-path<br/>rancher.io/local-path<br/>ReclaimPolicy: Retain<br/>AllowVolumeExpansion: true]

        subgraph StatefulSet["StatefulSet: vrs-postgres"]
            Pod[Pod: vrs-postgres-0]
            VCT[VolumeClaimTemplate<br/>5Gi, ReadWriteOnce]
        end

        PVC[PVC: postgres-data-vrs-postgres-0<br/>Bound, 5Gi]
        PV[PV: dynamic<br/>local-path]

        subgraph Host["Node Filesystem"]
            HostPath["/var/lib/rancher/k3s/storage/<br/>pvc-..._vrs-postgres_postgres-data-vrs-postgres-0"]
        end
    end

    StatefulSet -->|creates| PVC
    PVC -->|bound to| PV
    PV -->|provisioned by| SC
    PV -->|stored on| HostPath
    Pod -->|mounts| PVC
```

### StorageClass Properties

| Property             | Value                       | Implication                |
| -------------------- | --------------------------- | -------------------------- |
| Provisioner          | `rancher.io/local-path`     | Host-level storage         |
| ReclaimPolicy        | `Retain` (manually changed) | PVC survives deletion      |
| AllowVolumeExpansion | `true` (manually enabled)   | Can resize PVC             |
| VolumeBindingMode    | `WaitForFirstConsumer`      | Binds after pod scheduling |

### PersistentVolume Details

```
PV Name: pvc-9230daa3-cd2b-49f0-a080-19e87da837a7
Capacity: 5Gi
Access Mode: ReadWriteOnce
Reclaim Policy: Retain
Storage Class: local-path
Status: Bound
Node: vmi3350762 (pinned via node affinity)
```

### PVC Lifecycle

| Event                   | What Happens                                              |
| ----------------------- | --------------------------------------------------------- |
| **PVC created**         | K8s finds matching StorageClass, provisions PV, binds PVC |
| **Pod deleted**         | PVC and PV persist (pod can be recreated with same PVC)   |
| **StatefulSet deleted** | PVC persists (retention policy: Retain)                   |
| **PVC deleted**         | PV is released (Retain policy = data preserved)           |
| **PV deleted**          | Data is lost (but PV can't be deleted while PVC exists)   |

### How to Resize PVC

```bash
# Expand from 5Gi to 10Gi
kubectl patch pvc postgres-data-vrs-postgres-0 -n vrs-postgres \
  -p '{"spec":{"resources":{"requests":{"storage":"10Gi"}}}}'

# Verify
kubectl get pvc postgres-data-vrs-postgres-0 -n vrs-postgres
```

**Note:** With `local-path` provisioner, this updates metadata only. Actual storage uses host disk. Real expansion works with cloud StorageClasses (EBS, Ceph, NFS).

### Backup Storage

The CronJob uses `emptyDir` for backup storage:

```yaml
volumes:
  - name: backup-storage
    emptyDir:
      sizeLimit: 1Gi
```

**⚠️ Warning:** Backups are lost when the pod restarts. For production, use:

- PersistentVolumeClaim
- S3-compatible storage (MinIO, AWS S3)
- NFS mount

---

## 9. Security Review

### Security Checklist

| Category          | Setting                           | Status | Notes                          |
| ----------------- | --------------------------------- | ------ | ------------------------------ |
| **Pod Security**  | `runAsNonRoot: true`              | ✅     | App runs as UID 1001           |
| **Pod Security**  | `runAsUser: 1001`                 | ✅     | Non-root user                  |
| **Pod Security**  | `allowPrivilegeEscalation: false` | ✅     | No privilege escalation        |
| **Pod Security**  | `capabilities.drop: ALL`          | ✅     | All capabilities dropped       |
| **Pod Security**  | `seccompProfile: RuntimeDefault`  | ✅     | Seccomp enabled                |
| **Network**       | App NetworkPolicy                 | ✅     | Ingress from nginx only        |
| **Network**       | DB NetworkPolicy                  | ✅     | Ingress from app only          |
| **Network**       | Egress restrictions               | ✅     | DNS + DB + external HTTPS only |
| **TLS**           | cert-manager                      | ✅     | Automatic Let's Encrypt        |
| **Rate Limiting** | nginx ingress                     | ✅     | 10 rps, burst 5                |
| **Secrets**       | Not in git                        | ✅     | .gitignore configured          |
| **Secrets**       | K8s Secrets                       | ✅     | Created via kubectl            |
| **Quotas**        | CPU/memory limits                 | ✅     | Both namespaces                |
| **PDB**           | minAvailable: 1                   | ✅     | Zero-downtime                  |
| **PSS**           | baseline enforce                  | ✅     | Audit: restricted              |

### Security Context Analysis

**App Container:**

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  runAsGroup: 1001
  fsGroup: 1001
  seccompProfile:
    type: RuntimeDefault
containers:
  - name: vrs-app
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: false
      capabilities:
        drop:
          - ALL
```

**PostgreSQL Container:**

```yaml
# NOTE: PostgreSQL container needs to run as root for initialization
# Pod Security Standards set to "baseline" to allow this
containers:
  - name: postgres
    # No securityContext (runs as root)
```

### Secrets Management

**What's in Secrets (created via kubectl, NOT in git):**

| Secret                | Namespace    | Keys                                                                         |
| --------------------- | ------------ | ---------------------------------------------------------------------------- |
| `vrs-postgres-secret` | vrs-postgres | POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB                                |
| `vrs-app-secret`      | vrs-app      | DATABASE_URL, DIRECT_DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, SMTP_PASS |

**How secrets are created:**

```bash
kubectl create secret generic vrs-app-secret \
  --namespace vrs-app \
  --from-literal=DATABASE_URL="postgresql://..." \
  --from-literal=JWT_SECRET="$(openssl rand -base64 32)" \
  --from-literal=JWT_REFRESH_SECRET="$(openssl rand -base64 32)" \
  --from-literal=SMTP_PASS="unused" \
  --from-literal=DIRECT_DATABASE_URL="postgresql://..." \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Security Risks

| Risk                            | Severity | Mitigation                        |
| ------------------------------- | -------- | --------------------------------- |
| PostgreSQL runs as root         | Medium   | PSS set to baseline (allows root) |
| `readOnlyRootFilesystem: false` | Low      | Next.js needs to write temp files |
| Backup uses emptyDir            | High     | Backups lost on pod restart       |
| No encryption at rest           | Medium   | PVC data not encrypted            |
| No RBAC configuration           | Low      | Using default ServiceAccount      |

---

## 10. Troubleshooting Guide

### Pod stuck in Pending

**Symptoms:**

```bash
kubectl get pods -n vrs-app
# NAME                    READY   STATUS    RESTARTS   AGE
# vrs-app-xxx-abc         0/1     Pending   0          5m
```

**Root causes:**

- ResourceQuota exceeded
- PVC not bound
- Node resource pressure
- NodeSelector mismatch

**Investigation:**

```bash
kubectl describe pod <pod-name> -n vrs-app
# Look for Events section
```

**Resolution:**

```bash
# Check ResourceQuota
kubectl get resourcequota -n vrs-app
kubectl describe resourcequota vrs-app-quota -n vrs-app

# Check PVC status
kubectl get pvc -n vrs-postgres

# Check node resources
kubectl describe node vmi3350762 | grep -A5 "Allocated resources"
```

### CrashLoopBackOff

**Symptoms:**

```bash
kubectl get pods -n vrs-app
# NAME                    READY   STATUS             RESTARTS   AGE
# vrs-app-xxx-abc         0/1     CrashLoopBackOff   5          10m
```

**Root causes:**

- Application error on startup
- Missing environment variables
- Database connection failed
- Invalid configuration

**Investigation:**

```bash
# Check logs
kubectl logs <pod-name> -n vrs-app --previous

# Check environment variables
kubectl exec -it <pod-name> -n vrs-app -- env | grep DATABASE

# Test database connection
kubectl exec -it <pod-name> -n vrs-app -- nc -z vrs-postgres.vrs-postgres.svc.cluster.local 5432
```

**Resolution:**

```bash
# Check secret exists
kubectl get secret vrs-app-secret -n vrs-app

# Verify secret has correct keys
kubectl get secret vrs-app-secret -n vrs-app -o jsonpath='{.data.DATABASE_URL}' | base64 -d

# Restart deployment
kubectl rollout restart deployment/vrs-app -n vrs-app
```

### ImagePullBackOff

**Symptoms:**

```bash
kubectl get pods -n vrs-app
# NAME                    READY   STATUS             RESTARTS   AGE
# vrs-app-xxx-abc         0/1     ImagePullBackOff   0          2m
```

**Root causes:**

- Image doesn't exist
- Wrong image tag
- Registry authentication failed
- Network issues

**Investigation:**

```bash
kubectl describe pod <pod-name> -n vrs-app
# Look for Events: "Failed to pull image"

# Test image exists
docker pull docker.io/YOUR_DOCKERHUB_USERNAME/vrs:staging
```

**Resolution:**

```bash
# Verify image in deployment
kubectl get deployment vrs-app -n vrs-app -o jsonpath='{.spec.template.spec.containers[0].image}'

# Check image pull secrets (if using private registry)
kubectl get deployment vrs-app -n vrs-app -o jsonpath='{.spec.template.spec.imagePullSecrets}'
```

### Argo CD OutOfSync

**Symptoms:**

```bash
kubectl get application visitor-registration-system -n argocd
# NAME                        STATUS       HEALTH
# visitor-registration-system  OutOfSync   Healthy
```

**Root causes:**

- New git commit not yet synced
- StatefulSet immutable field changes
- ManagedFields conflict
- VolumeClaimTemplate size mismatch

**Investigation:**

```bash
# Check which resources are out of sync
kubectl get application visitor-registration-system -n argocd \
  -o jsonpath='{range .status.resources[*]}{.kind}/{.name}: {.status}{"\n"}{end}'

# Check Argo CD logs
kubectl logs -n argocd deployment/argocd-application-controller --tail=20
```

**Resolution:**

```bash
# Force hard refresh
kubectl patch application visitor-registration-system -n argocd \
  --type merge -p '{"metadata":{"annotations":{"argocd.argoproj.io/refresh":"hard"}}}'

# If StatefulSet is the issue, delete and recreate
kubectl delete statefulset vrs-postgres -n vrs-postgres
kubectl apply -k k8s/overlays/staging/
```

### Argo CD Degraded

**Symptoms:**

```bash
kubectl get application visitor-registration-system -n argocd
# NAME                        STATUS   HEALTH
# visitor-registration-system  Synced   Degraded
```

**Root causes:**

- Pod not ready (init containers failing)
- ResourceQuota blocking pods
- Secret not found
- NetworkPolicy blocking traffic

**Investigation:**

```bash
# Check pod status
kubectl get pods -n vrs-app
kubectl describe pod <pod-name> -n vrs-app

# Check events
kubectl get events -n vrs-app --sort-by='.lastTimestamp' | tail -20

# Check ResourceQuota
kubectl describe resourcequota vrs-app-quota -n vrs-app
```

**Resolution:**

```bash
# If ResourceQuota issue, add resource limits to init containers
# Check deployment for missing resources
kubectl get deployment vrs-app -n vrs-app -o json | jq '.spec.template.spec.initContainers[].resources'

# If secret issue, recreate secret
kubectl get secret vrs-app-secret -n vrs-app
```

---

## 11. Validation Checklist

### Cluster Health

```bash
# Check cluster info
kubectl cluster-info

# Check node status
kubectl get nodes
# Expected: STATUS = Ready

# Check system pods
kubectl get pods -n kube-system
# Expected: All pods Running
```

### Namespaces

```bash
kubectl get namespaces | grep vrs
# Expected: vrs-app and vrs-postgres exist
```

### Deployments

```bash
kubectl get deployment vrs-app -n vrs-app
# Expected: READY = 1/1, UP-TO-DATE = 1, AVAILABLE = 1
```

### Pods

```bash
kubectl get pods -n vrs-app
# Expected: All pods Running and Ready (1/1)

kubectl get pods -n vrs-postgres
# Expected: vrs-postgres-0 Running and Ready (1/1)
```

### Services

```bash
kubectl get svc -n vrs-app
# Expected: vrs-app ClusterIP exists

kubectl get svc -n vrs-postgres
# Expected: vrs-postgres ClusterIP exists
```

### Endpoints

```bash
kubectl get endpoints vrs-app -n vrs-app
# Expected: ENDPOINTS has pod IP(s)

kubectl get endpoints vrs-postgres -n vrs-postgres
# Expected: ENDPOINTS has pod IP
```

### Ingress

```bash
kubectl get ingress -n vrs-app
# Expected: HOSTS = YOUR_STAGING_DOMAIN, ADDRESS = nginx IP

kubectl describe ingress vrs-app -n vrs-app
# Expected: TLS configured, backend service exists
```

### DNS

```bash
# Test from inside cluster
kubectl run dns-test --image=busybox:1.36 --rm -it --restart=Never -- nslookup vrs-app.vrs-app.svc.cluster.local
# Expected: Name resolves to ClusterIP

kubectl run dns-test --image=busybox:1.36 --rm -it --restart=Never -- nslookup vrs-postgres.vrs-postgres.svc.cluster.local
# Expected: Name resolves to ClusterIP
```

### TLS

```bash
kubectl get certificate -n vrs-app
# Expected: READY = True

kubectl describe certificate vrs-staging-app-tls -n vrs-app
# Expected: Certificate is valid and not expiring soon
```

### Storage

```bash
kubectl get pvc -n vrs-postgres
# Expected: STATUS = Bound

kubectl get pv | grep vrs-postgres
# Expected: PV exists and is Bound
```

### Argo CD Sync

```bash
kubectl get application visitor-registration-system -n argocd
# Expected: STATUS = Synced, HEALTH = Healthy
```

### Application Health

```bash
curl -k https://YOUR_STAGING_DOMAIN/api/health
# Expected: {"status":"ok","database":"connected","timestamp":"..."}
```

---

## 12. Production Readiness Review

### Scoring

| Area                     | Score      | Notes                                            |
| ------------------------ | ---------- | ------------------------------------------------ |
| Repository Structure     | 8/10       | Clean Kustomize layout, good separation          |
| Kubernetes Configuration | 7/10       | Good manifests, missing some production features |
| GitOps Maturity          | 8/10       | Argo CD with auto-sync, self-heal, retry         |
| Security                 | 7/10       | Good NetworkPolicies, missing RBAC               |
| Networking               | 8/10       | NetworkPolicies, rate limiting, TLS              |
| Storage                  | 5/10       | local-path only, no HA, no encryption            |
| Scalability              | 6/10       | HPA configured, but single-node cluster          |
| High Availability        | 4/10       | Single PostgreSQL, single node                   |
| Maintainability          | 7/10       | Good docs, clear structure                       |
| Disaster Recovery        | 3/10       | Backup to emptyDir, no restore testing           |
| Observability            | 4/10       | No monitoring, no alerting                       |
| **Overall**              | **6.2/10** | Good foundation, needs production hardening      |

### Strengths

| Strength                  | Details                                       |
| ------------------------- | --------------------------------------------- |
| **GitOps automation**     | Argo CD with auto-sync, self-heal, and retry  |
| **Kustomize overlays**    | Clean staging/production separation           |
| **Security hardening**    | NetworkPolicies, Pod Security, ResourceQuotas |
| **Zero-downtime deploys** | Rolling updates with PDB                      |
| **Health checks**         | DB-aware health endpoint                      |
| **Graceful shutdown**     | SIGTERM handler with preStop hook             |
| **Backup strategy**       | Daily pg_dump CronJob                         |
| **Secret management**     | Not in git, created via kubectl               |

### Weaknesses

| Weakness                                    | Impact                            | Recommendation                 |
| ------------------------------------------- | --------------------------------- | ------------------------------ |
| **Single PostgreSQL replica**               | No HA, data loss on node failure  | Use managed DB (Supabase, RDS) |
| **Backup to emptyDir**                      | Backups lost on pod restart       | Use PVC or S3                  |
| **No monitoring**                           | Can't detect issues proactively   | Add Prometheus + Grafana       |
| **No alerting**                             | No notification of failures       | Add Alertmanager               |
| **Single-node cluster**                     | No node HA                        | Add worker nodes               |
| **local-path storage**                      | No replication, no encryption     | Use NFS or cloud storage       |
| **No migration Job**                        | Race condition with multiple pods | Use separate K8s Job           |
| **No SMTP_USER**                            | Manual configuration needed       | Add to ConfigMap               |
| **No backup verification**                  | Corrupt backups go undetected     | Add restore test CronJob       |
| **No resource requests on init containers** | ResourceQuota issues              | Already fixed ✅               |

### Top 5 Recommendations

1. **Use managed PostgreSQL** — Supabase, AWS RDS, or Google Cloud SQL for HA and backups
2. **Add monitoring** — Prometheus + Grafana for metrics, alerting for failures
3. **Fix backup storage** — Use PVC or S3 instead of emptyDir
4. **Add migration Job** — Separate Prisma migrations from init containers
5. **Add restore test** — CronJob that tests backup restoration

---

## 13. DevOps/SRE Interview Preparation

### Project Explanation (30 Seconds)

> "I deployed a Next.js Visitor Registration System on K3s using GitOps with Argo CD. The architecture uses Kustomize overlays for staging and production, with PostgreSQL as a StatefulSet. Security is enforced through NetworkPolicies, Pod Security Standards, and ResourceQuotas. The deployment pipeline is fully automated — code push triggers GitHub Actions, which builds a Docker image, and Argo CD syncs it to the cluster with zero-downtime rolling updates."

### Project Explanation (2 Minutes)

> "The Visitor Registration System replaces paper-based visitor logs with QR-based digital registration. It's deployed on a single-node K3s cluster using a GitOps workflow with Argo CD.
>
> **Architecture:** Two namespaces — `vrs-app` for the Next.js application and `vrs-postgres` for PostgreSQL. The app uses a Deployment with 3 init containers (wait-for-postgres, run-migrations, seed-database) and a main container. PostgreSQL uses a StatefulSet with persistent storage.
>
> **GitOps:** Argo CD watches the `staging/argocd-k8s-lab` branch. When code is pushed, GitHub Actions builds a Docker image, and Argo CD detects the new image tag, renders Kustomize manifests, and syncs to the cluster. Auto-sync, self-heal, and prune are enabled.
>
> **Security:** NetworkPolicies restrict traffic — app only receives from ingress-nginx, PostgreSQL only accepts connections from app. Pod Security Standards enforce non-root execution. ResourceQuotas prevent resource exhaustion.
>
> **Networking:** Traffic flows through Traefik (public HTTPS) → ingress-nginx (cluster routing) → Ingress → Service → Pod. TLS is automated via cert-manager with Let's Encrypt.
>
> **Challenges solved:** Fixed ArgoCD OutOfSync by ignoring StatefulSet managedFields. Fixed startup probe failures by adjusting timeoutSeconds. Fixed ResourceQuota violations by adding resource limits to init containers."

### Senior-Level Explanation (5 Minutes)

> "Let me walk you through the complete architecture and the decisions behind it.
>
> **Platform choice:** K3s on a single Hetzner VPS. K3s is lightweight (single binary, <100MB), perfect for learning and small workloads. The trade-off is no node HA, but for a staging environment, it's acceptable.
>
> **GitOps with Argo CD:** I chose Argo CD over Flux because of its better UI and simpler configuration. The Application CRD watches a specific path in Git (`k8s/overlays/staging`). When the repo changes, Argo CD renders Kustomize manifests and applies them. Self-heal reverts manual changes, prune deletes removed resources.
>
> **Kustomize over Helm:** Kustomize is simpler for this use case — no templating language to learn, just patches. The base contains all shared resources, and overlays patch environment-specific values (domain, image, resources). This is cleaner than Helm's value injection for straightforward configurations.
>
> **Database as StatefulSet:** PostgreSQL needs stable storage and network identity. A StatefulSet provides `vrs-postgres-0` as a stable hostname and creates PVCs via volumeClaimTemplates. The `persistentVolumeClaimRetentionPolicy: Retain` ensures data survives StatefulSet deletion.
>
> **Security layers:** I implemented defense-in-depth. NetworkPolicies restrict traffic at the network layer. Pod Security Standards enforce non-root execution. ResourceQuotas prevent resource exhaustion. Secrets are managed outside Git.
>
> **Production gaps I identified:** Single PostgreSQL replica (no HA), backup to emptyDir (data loss risk), no monitoring/observability. The next steps would be managed PostgreSQL, Prometheus + Grafana, and proper backup storage.
>
> **Key learning:** The biggest challenge was ArgoCD OutOfSync loops caused by Kubernetes adding default fields (managedFields, rollingUpdate partition, podManagementPolicy) that weren't in the manifests. I solved this with ignoreDifferences using jqPathExpressions."

### Interview Questions & Answers

#### Kubernetes

**Q: What is the difference between a Deployment and a StatefulSet?**

A: In this project, the app uses a Deployment and PostgreSQL uses a StatefulSet. A Deployment creates pods with random names (e.g., `vrs-app-788bc7c57b-abc12`) and uses ReplicaSets for scaling. A StatefulSet creates pods with stable names (`vrs-postgres-0`) and stable storage (PVC per pod). StatefulSets are for stateful applications like databases that need persistent identity.

**Q: How does a Rolling Update work in Kubernetes?**

A: When you update a Deployment, Kubernetes creates a new ReplicaSet with the updated pod template. It gradually scales up the new ReplicaSet while scaling down the old one. In this project, the preStop hook (`sleep 5`) ensures the pod is removed from Service endpoints before termination, preventing dropped connections. The PDB ensures at least 1 pod is always available during the update.

**Q: What is the purpose of init containers?**

A: Init containers run sequentially before the main container starts. In this project, there are 3 init containers: `wait-for-postgres` checks database connectivity, `run-migrations` applies Prisma migrations, and `seed-database` seeds initial data. The main container only starts after all init containers complete successfully.

#### GitOps

**Q: What is GitOps and why use it?**

A: GitOps is a deployment paradigm where Git is the single source of truth for infrastructure. Argo CD watches a Git repository and automatically synchronizes the desired state (Git) with the live state (cluster). Benefits include audit trail (every change is a Git commit), rollback (revert to previous commit), and consistency (same process for all environments).

**Q: What happens when Argo CD detects a difference between desired and live state?**

A: Argo CD first compares the manifests. If `automated.syncPolicy.prune: true`, it deletes resources removed from Git. If `selfHeal: true`, it reverts manual changes. It applies create/update/delete requests to the Kubernetes API. Then it monitors resource health until the Application status shows "Synced" and "Healthy".

#### Argo CD

**Q: How does Argo CD handle StatefulSet OutOfSync issues?**

A: StatefulSets have immutable fields (volumeClaimTemplates, updateStrategy). Kubernetes adds default fields like `rollingUpdate.partition: 0` and `podManagementPolicy: OrderedReady` that aren't in the manifest. Argo CD sees these as differences. I solved this by adding `ignoreDifferences` in the Application CRD using jqPathExpressions to ignore volumeClaimTemplates and jsonPointers for managedFields and updateStrategy.

**Q: What is the difference between Sync and Health status?**

A: Sync status indicates whether the live state matches the desired state (Git). "Synced" means they match, "OutOfSync" means there are differences. Health status indicates whether resources are running correctly. "Healthy" means all resources are functioning, "Degraded" means some resources have issues (e.g., pod CrashLoopBackOff). You can have Synced but Degraded (resources match Git but pods are failing).

#### Networking

**Q: How does traffic reach the application pod?**

A: Traffic flows: Client → DNS (resolves to VPS IP) → Traefik (HTTPS termination) → ingress-nginx (NodePort :32443) → Ingress (routes by host header) → Service (ClusterIP:3000) → Pod (load balanced across replicas). NetworkPolicies ensure only ingress-nginx can reach the app pods.

**Q: What is the purpose of NetworkPolicies in this project?**

A: NetworkPolicies act as firewalls between pods. The app's NetworkPolicy allows ingress only from the ingress-nginx namespace and egress to DNS, PostgreSQL, and external HTTPS. PostgreSQL's NetworkPolicy allows ingress only from the app namespace. This implements defense-in-depth — even if one pod is compromised, it can't access other services.

#### Storage

**Q: What happens when a StatefulSet is deleted?**

A: With `persistentVolumeClaimRetentionPolicy: Retain`, the PVCs are NOT deleted. They persist with their data intact. When you recreate the StatefulSet, it creates new pods that bind to the existing PVCs. This is critical for databases — you don't lose data when redeploying.

**Q: What is the difference between emptyDir and PVC?**

A: `emptyDir` is a temporary volume that exists only while the pod is running — data is lost when the pod restarts. A PVC (PersistentVolumeClaim) is a request for durable storage that persists across pod restarts. The backup CronJob currently uses emptyDir (backups lost on restart) — for production, it should use a PVC.

#### Troubleshooting

**Q: How would you debug a pod stuck in CrashLoopBackOff?**

A: First, check logs with `kubectl logs <pod> --previous` to see the crash output. Then check init container logs if applicable. Verify environment variables are set correctly. Test database connectivity. Check ResourceQuotas aren't blocking pods. Check Secrets exist and have correct keys. Finally, describe the pod to see Events.

**Q: A user reports the application returns 401 Unauthorized. How do you investigate?**

A: First, check if the health endpoint works without auth: `curl /api/health`. If it returns 200, the issue is with the specific API endpoint. Check if the user has a valid JWT token. Verify the middleware allows the endpoint (publicApiPaths includes `/api/health`). Check JWT_SECRET in the Secret matches what the app expects.

#### High Availability

**Q: What would you change for production deployment?**

A: Five critical changes: (1) Use managed PostgreSQL (Supabase, RDS) instead of self-hosted for HA and automated backups. (2) Add Prometheus + Grafana for monitoring and alerting. (3) Use PVC or S3 for backup storage instead of emptyDir. (4) Separate Prisma migrations into a K8s Job to avoid race conditions. (5) Add worker nodes for node-level HA.

---

_Document generated from repository analysis._
_Based on actual k8s/ directory contents — no assumed resources._
