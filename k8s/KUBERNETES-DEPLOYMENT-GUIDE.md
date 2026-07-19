# Kubernetes Deployment Guide

## Visitor Registration System — Complete K8s Reference

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Repository Structure](#2-repository-structure)
3. [Kubernetes Resources](#3-kubernetes-resources)
4. [Kustomize Layout](#4-kustomize-layout)
5. [ArgoCD GitOps](#5-argocd-gitops)
6. [Deployment Workflow](#6-deployment-workflow)
7. [Networking](#7-networking)
8. [Storage](#8-storage)
9. [Security](#9-security)
10. [Monitoring & Health](#10-monitoring--health)
11. [Troubleshooting](#11-troubleshooting)
12. [Production Recommendations](#12-production-recommendations)
13. [Interview Preparation](#13-interview-preparation)

---

## 1. Architecture Overview

### System Architecture

```mermaid
graph TB
    subgraph Internet
        User[User Browser]
    end

    subgraph VPS["Hetzner VPS (YOUR_VPS_IP)"]
        subgraph Docker["Docker Engine"]
            Traefik[Traefik Edge Proxy<br/>HTTPS :443]
        end

        subgraph K3s["K3s Kubernetes"]
            subgraph IngressLayer["Ingress Layer"]
                Nginx[ingress-nginx<br/>NodePort 32280/32443]
                CertMgr[cert-manager<br/>Let's Encrypt]
            end

            subgraph AppNamespace["Namespace: vrs-app"]
                AppDeployment[Deployment: vrs-app<br/>Next.js 16.2.9]
                AppService[Service: vrs-app<br/>ClusterIP:3000]
                AppIngress[Ingress: vrs-app<br/>TLS Termination]
                HPA[HPA: vrs-app<br/>1-3 replicas]
                PDB[PDB: vrs-app<br/>minAvailable: 1]
                AppNP[NetworkPolicy<br/>Ingress/Egress]
                AppQuota[ResourceQuota<br/>2 CPU / 2Gi]
            end

            subgraph DBNamespace["Namespace: vrs-postgres"]
                PGStatefulSet[StatefulSet: vrs-postgres<br/>PostgreSQL 16]
                PGService[Service: vrs-postgres<br/>ClusterIP:5432]
                PVC[PVC: postgres-data<br/>5Gi local-path]
                PGNP[NetworkPolicy<br/>App-only access]
                PGQuota[ResourceQuota<br/>1 CPU / 1Gi]
                BackupCron[CronJob: backup<br/>Daily 2AM]
            end

            subgraph ArgoCDNamespace["Namespace: argocd"]
                ArgoCD[ArgoCD Server<br/>Auto-sync GitOps]
                ArgoApp[Application CRD<br/>visitor-registration-system]
            end
        end
    end

    subgraph External["External Services"]
        DockerHub[Docker Hub<br/>YOUR_DOCKERHUB_USERNAME/vrs:staging]
        GitHub[GitHub<br/>staging/argocd-k8s-lab]
        SMTP[SMTP Server<br/>smtp.gmail.com]
    end

    User -->|HTTPS| Traefik
    Traefik -->|HTTP| Nginx
    Nginx -->|路由| AppIngress
    AppIngress --> AppService
    AppService --> AppDeployment
    AppDeployment -->|TCP:5432| PGService
    PGService --> PGStatefulSet
    PGStatefulSet --> PVC

    ArgoCD -->|监控| ArgoApp
    ArgoApp -->|同步| AppDeployment
    ArgoApp -->|同步| PGStatefulSet

    GitHub -->|push触发| ArgoCD
    DockerHub -->|拉取镜像| AppDeployment
    AppDeployment -->|发送邮件| SMTP
```

### Traffic Flow

```mermaid
sequenceDiagram
    participant U as User Browser
    participant T as Traefik (HTTPS)
    participant N as ingress-nginx
    participant I as Ingress (TLS)
    participant S as Service (ClusterIP)
    participant P as Pod (Next.js)
    participant DB as PostgreSQL

    U->>T: HTTPS Request
    T->>T: TLS Termination + Bearer Token Auth
    T->>N: HTTP Forward
    N->>I: Route by Host Header
    I->>S: Forward to Service
    S->>P: Load Balance to Pod
    P->>P: Process Request (API Route)
    P->>DB: SQL Query (Prisma ORM)
    DB-->>P: Result Set
    P-->>U: JSON Response
```

### Dual Runtime Model

The cluster uses a **dual runtime model**:

| Layer                | Technology     | Purpose                                                |
| -------------------- | -------------- | ------------------------------------------------------ |
| **Public Edge**      | Docker Traefik | HTTPS termination, Bearer Token auth, rate limiting    |
| **Cluster Internal** | ingress-nginx  | HTTP routing, path-based routing, TLS via cert-manager |

**Why two layers:**

- Traefik is the **public security boundary** (handles Let's Encrypt, bot protection)
- ingress-nginx is **cluster-internal routing only** (routes to K8s Services)
- Authorization headers are stripped at the Traefik edge

---

## 2. Repository Structure

### Directory Tree

```
k8s/
├── apps/                                    # ArgoCD Application
│   ├── argocd-application.yaml             # ArgoCD app definition (136 lines)
│   └── kustomization.yaml                  # Wraps argocd-application.yaml
│
├── base/                                    # Base manifests (shared across envs)
│   ├── kustomization.yaml                  # Base kustomize root (27 lines)
│   │
│   ├── app/                                # Next.js application (9 files)
│   │   ├── configmap.yaml                 # Non-sensitive configuration
│   │   ├── deployment.yaml                # App deployment (252 lines, largest file)
│   │   ├── hpa.yaml                       # Horizontal Pod Autoscaler
│   │   ├── ingress.yaml                   # Ingress with TLS + rate limiting
│   │   ├── namespace.yaml                 # vrs-app namespace + PSS labels
│   │   ├── network-policy.yaml            # Ingress/Egress firewall rules
│   │   ├── pdb.yaml                       # Pod Disruption Budget
│   │   ├── resource-quota.yaml            # CPU/memory/pod limits
│   │   ├── secret.yaml                    # Secret template (gitignored)
│   │   └── service.yaml                   # ClusterIP service
│   │
│   └── postgres/                           # PostgreSQL database (8 files)
│       ├── backup-cronjob.yaml            # Daily pg_dump CronJob
│       ├── configmap.yaml                 # PGDATA, init args
│       ├── namespace.yaml                 # vrs-postgres namespace + PSS labels
│       ├── network-policy.yaml            # DB ingress restriction
│       ├── resource-quota.yaml            # DB resource limits
│       ├── secret.yaml                    # DB credentials (gitignored)
│       ├── service.yaml                   # ClusterIP service
│       └── statefulset.yaml              # PostgreSQL StatefulSet + PVC
│
├── overlays/                               # Environment-specific patches
│   ├── staging/                            # Staging overlay
│   │   ├── kustomization.yaml             # References base + patches
│   │   └── patches/
│   │       ├── container-image.yaml       # Docker Hub image override
│   │       ├── ingress-host.yaml          # YOUR_STAGING_DOMAIN
│   │       └── resource-limits.yaml       # Reduced resources
│   │
│   └── production/                         # Production overlay
│       ├── kustomization.yaml             # References base + patches
│       └── patches/
│           ├── ingress-host.yaml          # YOUR_PRODUCTION_DOMAIN
│           ├── replicas.yaml              # 3 replicas
│           └── resource-limits.yaml       # Higher resources
│
├── deployment-status-lessons.md           # Deployment lessons learned
└── README.md                              # K8s directory documentation
```

### File Count by Category

| Category           | Files              | Total Lines (approx) |
| ------------------ | ------------------ | -------------------- |
| Base manifests     | 17                 | ~600                 |
| Staging overlay    | 4                  | ~80                  |
| Production overlay | 4                  | ~60                  |
| ArgoCD             | 2                  | ~55                  |
| Documentation      | 2                  | ~200                 |
| **Total**          | **29 YAML + 2 MD** | **~1000**            |

---

## 3. Kubernetes Resources

### Complete Resource Inventory

```mermaid
graph LR
    subgraph "Namespace: vrs-app"
        NS1[Namespace]
        CM1[ConfigMap:<br/>vrs-app-config]
        DEP[Deployment:<br/>vrs-app]
        SVC1[Service:<br/>vrs-app]
        ING[Ingress:<br/>vrs-app]
        HPA[HPA:<br/>vrs-app]
        PDB[PDB:<br/>vrs-app]
        RQ1[ResourceQuota:<br/>vrs-app-quota]
        NP1[NetworkPolicy:<br/>vrs-app-network-policy]
        SEC1[Secret:<br/>vrs-app-secret]
    end

    subgraph "Namespace: vrs-postgres"
        NS2[Namespace]
        CM2[ConfigMap:<br/>vrs-postgres-config]
        STS[StatefulSet:<br/>vrs-postgres]
        SVC2[Service:<br/>vrs-postgres]
        PVC[PVC:<br/>postgres-data-vrs-postgres-0]
        RQ2[ResourceQuota:<br/>vrs-postgres-quota]
        NP2[NetworkPolicy:<br/>vrs-postgres-network-policy]
        SEC2[Secret:<br/>vrs-postgres-secret]
        CRON[CronJob:<br/>vrs-postgres-backup]
    end

    subgraph "Namespace: argocd"
        APP[Application:<br/>visitor-registration-system]
    end

    DEP -->|uses| CM1
    DEP -->|reads| SEC1
    DEP -->|routes via| SVC1
    ING -->|targets| SVC1
    HPA -->|scales| DEP

    STS -->|uses| CM2
    STS -->|reads| SEC2
    STS -->|creates| PVC
    STS -->|serves via| SVC2
    CRON -->|backs up| SVC2

    APP -->|syncs| DEP
    APP -->|syncs| STS
```

### Resource Details

#### Deployment: vrs-app

| Field         | Value                                                                                                                              |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Namespace** | vrs-app                                                                                                                            |
| **Replicas**  | 1 (HPA: 1-3)                                                                                                                       |
| **Image**     | `docker.io/YOUR_DOCKERHUB_USERNAME/vrs:staging` (init) / `ghcr.io/YOUR_GITHUB_USERNAME/visitor-registration-system:staging` (main) |
| **Port**      | 3000                                                                                                                               |
| **Strategy**  | RollingUpdate (default)                                                                                                            |

**Init Containers (3, sequential):**

| Order | Name              | Image        | Purpose                              |
| ----- | ----------------- | ------------ | ------------------------------------ |
| 1     | wait-for-postgres | busybox:1.36 | Wait for PostgreSQL TCP connectivity |
| 2     | run-migrations    | vrs:staging  | Execute `prisma migrate deploy`      |
| 3     | seed-database     | vrs:staging  | Execute `prisma db seed`             |

**Main Container:**

| Setting           | Value                                             |
| ----------------- | ------------------------------------------------- |
| Security Context  | `runAsNonRoot: true`, `runAsUser: 1001`           |
| Capabilities      | `drop: ALL`                                       |
| Liveness Probe    | `/api/health` (30s delay, 15s period)             |
| Readiness Probe   | `/api/health` (10s delay, 10s period)             |
| Startup Probe     | `/api/health` (10s delay, 10s period, 30 retries) |
| Lifecycle         | `preStop: sleep 5`                                |
| Termination Grace | 30s                                               |

#### StatefulSet: vrs-postgres

| Field              | Value                        |
| ------------------ | ---------------------------- |
| **Namespace**      | vrs-postgres                 |
| **Replicas**       | 1                            |
| **Image**          | postgres:16-alpine           |
| **Port**           | 5432                         |
| **Strategy**       | RollingUpdate (partition: 0) |
| **PVC Retention**  | Retain (on delete and scale) |
| **Pod Management** | OrderedReady                 |

**Volume:**

| Setting      | Value                      |
| ------------ | -------------------------- |
| Mount Path   | `/var/lib/postgresql/data` |
| Sub Path     | `pgdata`                   |
| Storage      | 5Gi                        |
| StorageClass | local-path                 |

#### Service: vrs-app

| Field    | Value                                                 |
| -------- | ----------------------------------------------------- |
| Type     | ClusterIP                                             |
| Port     | 3000 → 3000/TCP                                       |
| Selector | `app.kubernetes.io/name: visitor-registration-system` |

#### Service: vrs-postgres

| Field    | Value                                  |
| -------- | -------------------------------------- |
| Type     | ClusterIP                              |
| Port     | 5432 → 5432/TCP                        |
| Selector | `app.kubernetes.io/name: vrs-postgres` |

#### Ingress: vrs-app

| Field      | Value                                 |
| ---------- | ------------------------------------- |
| Class      | nginx                                 |
| Host       | `YOUR_STAGING_DOMAIN`                 |
| TLS        | cert-manager (letsencrypt-production) |
| Rate Limit | 10 rps, burst multiplier 5            |
| Backend    | vrs-app:3000                          |

#### HPA: vrs-app

| Field         | Value           |
| ------------- | --------------- |
| Min Replicas  | 1               |
| Max Replicas  | 3               |
| CPU Target    | 70% utilization |
| Memory Target | 80% utilization |

#### CronJob: vrs-postgres-backup

| Field     | Value                        |
| --------- | ---------------------------- |
| Schedule  | `0 2 * * *` (Daily 2 AM UTC) |
| Image     | postgres:16-alpine           |
| Command   | `pg_dump` + gzip             |
| Retention | 30 days                      |
| Storage   | emptyDir (1Gi)               |

---

## 4. Kustomize Layout

### How Kustomize Works

Kustomize is a template-free way to customize Kubernetes manifests. Instead of templates, it uses **overlays** that patch base manifests.

```mermaid
graph TD
    Base["base/kustomization.yaml<br/>16 resources"]
    Staging["overlays/staging/kustomization.yaml<br/>3 patches + configMap"]
    Production["overlays/production/kustomization.yaml<br/>3 patches + configMap"]

    Base --> Staging
    Base --> Production

    Staging --> S1["container-image.yaml<br/>Docker Hub image"]
    Staging --> S2["ingress-host.yaml<br/>YOUR_STAGING_DOMAIN"]
    Staging --> S3["resource-limits.yaml<br/>Reduced resources"]

    Production --> P1["ingress-host.yaml<br/>YOUR_PRODUCTION_DOMAIN"]
    Production --> P2["replicas.yaml<br/>3 replicas"]
    Production --> P3["resource-limits.yaml<br/>Higher resources"]
```

### Base Resources (k8s/base/kustomization.yaml)

```yaml
resources:
  # PostgreSQL (7 resources)
  - postgres/namespace.yaml
  - postgres/configmap.yaml
  - postgres/statefulset.yaml
  - postgres/service.yaml
  - postgres/network-policy.yaml
  - postgres/resource-quota.yaml
  - postgres/backup-cronjob.yaml

  # Application (9 resources)
  - app/namespace.yaml
  - app/configmap.yaml
  - app/deployment.yaml
  - app/service.yaml
  - app/ingress.yaml
  - app/hpa.yaml
  - app/network-policy.yaml
  - app/pdb.yaml
  - app/resource-quota.yaml
```

**Total base resources: 16**

### Staging Overlay (k8s/overlays/staging/kustomization.yaml)

```yaml
resources:
  - ../../base # Inherit all base resources

patches:
  - path: patches/resource-limits.yaml # Reduce CPU/memory
  - path: patches/ingress-host.yaml # YOUR_STAGING_DOMAIN
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

### Production Overlay (k8s/overlays/production/kustomization.yaml)

```yaml
resources:
  - ../../base # Inherit all base resources

patches:
  - path: patches/resource-limits.yaml # Higher CPU/memory
  - path: patches/replicas.yaml # 3 replicas
  - path: patches/ingress-host.yaml # YOUR_PRODUCTION_DOMAIN

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

| Resource           | Staging             | Production             |
| ------------------ | ------------------- | ---------------------- |
| App Replicas       | 1 (HPA: 1-3)        | 3                      |
| App CPU Request    | 100m                | 250m                   |
| App CPU Limit      | 500m                | 1000m                  |
| App Memory Request | 128Mi               | 256Mi                  |
| App Memory Limit   | 256Mi               | 512Mi                  |
| DB CPU Request     | 50m                 | 500m                   |
| DB CPU Limit       | 250m                | 2000m                  |
| DB Memory Request  | 128Mi               | 1Gi                    |
| DB Memory Limit    | 256Mi               | 4Gi                    |
| Domain             | YOUR_STAGING_DOMAIN | YOUR_PRODUCTION_DOMAIN |
| Email              | noop                | smtp                   |

### How to Deploy Each Environment

```bash
# Staging (current)
kubectl apply -k k8s/overlays/staging/

# Production (not yet deployed)
kubectl apply -k k8s/overlays/production/

# Dry run (validate without applying)
kubectl kustomize k8s/overlays/staging/ | kubectl apply --dry-run=client -f -
```

---

## 5. ArgoCD GitOps

### What is GitOps?

GitOps is a deployment paradigm where **Git is the single source of truth** for infrastructure. ArgoCD watches a Git repository and automatically synchronizes the desired state (Git) with the live state (cluster).

```mermaid
graph LR
    Dev[Developer] -->|git push| Git[GitHub Repo]
    Git -->|webhook/poll| ArgoCD[ArgoCD Server]
    ArgoCD -->|compare| Desired[Desired State<br/>(from Git)]
    ArgoCD -->|compare| Live[Live State<br/>(in cluster)]
    ArgoCD -->|sync if different| K8s[K8s API Server]
    K8s -->|apply| Resources[K8s Resources]
```

### ArgoCD Application (k8s/apps/argocd-application.yaml)

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
    targetRevision: staging/argocd-k8s-lab # Branch to watch
    path: k8s/overlays/staging # Path to kustomize
  destination:
    server: https://kubernetes.default.svc # Local cluster
    namespace: vrs-app # Target namespace
  syncPolicy:
    automated:
      prune: true # Delete resources removed from Git
      selfHeal: true # Revert manual changes
      allowEmpty: false # Prevent deleting all resources
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
        - /spec/replicas # HPA manages replicas
    - group: apps
      kind: StatefulSet
      jqPathExpressions:
        - .spec.volumeClaimTemplates[]
      jsonPointers:
        - /metadata/managedFields
        - /spec/updateStrategy/rollingUpdate
        - /spec/podManagementPolicy
```

### Key Configuration Explained

| Setting                    | Value                    | Why                             |
| -------------------------- | ------------------------ | ------------------------------- |
| `automated.prune: true`    | Delete removed resources | Keeps cluster clean             |
| `automated.selfHeal: true` | Revert manual changes    | Enforces Git as source of truth |
| `CreateNamespace=true`     | Auto-create namespaces   | Simplifies first deployment     |
| `ignoreDifferences`        | Ignore HPA replicas, VCT | Prevents OutOfSync loops        |
| `retry.limit: 5`           | Retry 5 times            | Handles transient failures      |

### Sync Flow

```mermaid
sequenceDiagram
    participant D as Developer
    participant G as GitHub
    participant A as ArgoCD
    participant K as K8s API
    participant P as Pods

    D->>G: git push (new image tag)
    G->>A: Webhook / Poll (3min)
    A->>G: Fetch manifests from staging/argocd-k8s-lab
    A->>A: Render kustomize (base + staging overlay)
    A->>K: Compare desired vs live state
    A->>K: Apply differences
    K->>P: Rolling update
    P->>P: Init containers (wait → migrate → seed)
    P->>P: Start main container
    A->>A: Verify health
    A-->>D: Synced + Healthy
```

### ArgoCD Status Commands

```bash
# Check sync status
kubectl get application visitor-registration-system -n argocd

# Get detailed status
kubectl get application visitor-registration-system -n argocd \
  -o jsonpath='Sync: {.status.sync.status}, Health: {.status.health.status}'

# Check all resources
kubectl get application visitor-registration-system -n argocd \
  -o jsonpath='{range .status.resources[*]}{.kind}/{.name}: {.status}{"\n"}{end}'

# Force refresh
kubectl patch application visitor-registration-system -n argocd \
  --type merge -p '{"metadata":{"annotations":{"argocd.argoproj.io/refresh":"hard"}}}'

# View ArgoCD UI
# https://argocd.YOUR_DOMAIN/
```

---

## 6. Deployment Workflow

### End-to-End Deployment Flow

```mermaid
graph TD
    A[Developer pushes to staging/argocd-k8s-lab] --> B[GitHub Actions triggered]
    B --> C[Build Docker image]
    C --> D[Push to Docker Hub<br/>YOUR_DOCKERHUB_USERNAME/vrs:staging]
    D --> E[ArgoCD detects new image]
    E --> F[Render kustomize<br/>base + staging overlay]
    F --> G[Compare with live state]
    G --> H{Changes?}
    H -->|Yes| I[Apply to cluster]
    H -->|No| J[No-op]
    I --> K[Rolling update begins]
    K --> L[Pod termination<br/>preStop: sleep 5]
    L --> M[New pod starts]
    M --> N[Init Container 1:<br/>wait-for-postgres]
    N --> O[Init Container 2:<br/>run-migrations]
    O --> P[Init Container 3:<br/>seed-database]
    P --> Q[Main container starts<br/>Next.js]
    Q --> R[Startup probe checks<br/>/api/health]
    R --> S{Healthy?}
    S -->|Yes| T[Ready to serve traffic]
    S -->|No| U[Restart after 30 retries]
    T --> V[Readiness probe passes]
    V --> W[Service adds pod to endpoints]
    W --> X[Ingress routes traffic]
```

### Deployment Timeline

```
t=0s    git push
t=30s   GitHub Actions starts
t=3m    Docker image built and pushed
t=3m    ArgoCD detects change
t=3m10s ArgoCD applies manifests
t=3m15s Old pod receives SIGTERM
t=3m20s Old pod preStop hook (sleep 5)
t=3m25s Old pod terminated
t=3m25s New pod scheduled
t=3m27s Init Container 1 starts (wait-for-postgres)
t=3m29s PostgreSQL ready
t=3m29s Init Container 2 starts (run-migrations)
t=3m65s Migrations complete
t=3m65s Init Container 3 starts (seed-database)
t=3m75s Seed complete
t=3m75s Main container starts
t=3m85s Startup probe first check
t=3m95s App healthy, ready to serve
```

**Total deployment time: ~4 minutes**

### What Happens During Deployment

| Phase     | Duration   | What Happens                     |
| --------- | ---------- | -------------------------------- |
| Build     | ~2.5 min   | Docker multi-stage build         |
| Push      | ~30s       | Push 300MB image to Docker Hub   |
| Sync      | ~10s       | ArgoCD renders and applies       |
| Terminate | ~5s        | Old pod drains connections       |
| Init      | ~50s       | Wait + migrations + seed         |
| Start     | ~10s       | Next.js boots                    |
| Health    | ~10s       | Probe passes                     |
| **Total** | **~4 min** | **Zero-downtime rolling update** |

---

## 7. Networking

### Network Architecture

```mermaid
graph TB
    subgraph Internet
        Browser[User Browser]
    end

    subgraph VPS
        Traefik[Traefik<br/>:443 HTTPS]
    end

    subgraph K3sCluster["K3s Cluster"]
        subgraph IngressController["ingress-nginx"]
            Nginx[nginx<br/>:32280 HTTP<br/>:32443 HTTPS]
        end

        subgraph AppNS["vrs-app namespace"]
            AppNP[NetworkPolicy]
            AppSvc[Service<br/>ClusterIP:3000]
            AppPod[Pod<br/>vrs-app:3000]
        end

        subgraph DBNS["vrs-postgres namespace"]
            DBNP[NetworkPolicy]
            DBSvc[Service<br/>ClusterIP:5432]
            DBPod[Pod<br/>vrs-postgres:5432]
        end

        subgraph ExternalTraffic
            DNS[DNS<br/>:53]
            SMTP[SMTP<br/>:587]
            HTTPS[HTTPS<br/>:443]
        end
    end

    Browser -->|HTTPS| Traefik
    Traefik -->|HTTP| Nginx
    Nginx --> AppSvc
    AppSvc --> AppPod

    AppPod -->|TCP:5432| DBSvc
    DBSvc --> DBPod

    AppPod --> DNS
    AppPod --> SMTP
    AppPod --> HTTPS

    AppNP -.->|allows| Nginx
    AppNP -.->|allows| DBPod
    AppNP -.->|allows| DNS
    AppNP -.->|allows| SMTP
    DBNP -.->|allows| AppPod
```

### NetworkPolicy Details

#### App NetworkPolicy (vrs-app-network-policy)

```yaml
# INGRESS: Only from ingress-nginx namespace
ingress:
  - from:
      - namespaceSelector:
          matchLabels:
            kubernetes.io/metadata.name: ingress-nginx
    ports:
      - port: 3000 # App port only

# EGRESS: DNS + PostgreSQL + External HTTPS
egress:
  # DNS resolution
  - to: [all namespaces]
    ports: [53 UDP, 53 TCP]

  # PostgreSQL in vrs-postgres namespace
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

**What this means:**

- App pods can ONLY receive traffic from ingress-nginx
- App pods can ONLY talk to PostgreSQL in vrs-postgres namespace
- App pods can ONLY reach external IPs (not cluster-internal) on HTTPS/SMTP ports
- DNS is allowed to all namespaces

#### PostgreSQL NetworkPolicy (vrs-postgres-network-policy)

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

- PostgreSQL can ONLY receive connections from app pods
- No other namespace can access the database
- No external access to PostgreSQL

### Ingress Configuration

| Setting          | Value                                      |
| ---------------- | ------------------------------------------ |
| Host             | `YOUR_STAGING_DOMAIN`                      |
| TLS              | cert-manager with `letsencrypt-production` |
| TLS Secret       | `vrs-staging-app-tls`                      |
| Backend          | `vrs-app:3000`                             |
| Rate Limit       | 10 requests/second                         |
| Burst Multiplier | 5x (allows bursts up to 50)                |

### DNS Resolution Inside Cluster

```
vrs-app.vrs-app.svc.cluster.local        → App Service
vrs-postgres.vrs-postgres.svc.cluster.local → PostgreSQL Service
```

---

## 8. Storage

### Storage Architecture

```mermaid
graph TB
    subgraph Node["K3s Node (vmi3350762)"]
        subgraph K3sStorage["K3s Storage"]
            LocalPath[local-path provisioner<br/>rancher.io/local-path]
        end

        subgraph FileSystem["File System"]
            HostPath["/var/lib/rancher/k3s/storage/<br/>pvc-..._vrs-postgres_postgres-data-vrs-postgres-0"]
        end

        subgraph Pod["PostgreSQL Pod"]
            Mount["/var/lib/postgresql/data<br/>subPath: pgdata"]
        end
    end

    LocalPath --> HostPath
    HostPath --> Mount
```

### Storage Stack

| Layer            | Technology          | Details                                |
| ---------------- | ------------------- | -------------------------------------- |
| **StorageClass** | local-path          | K3s default, rancher.io/local-path     |
| **PV**           | Dynamic             | Created automatically by StatefulSet   |
| **PVC**          | VolumeClaimTemplate | 5Gi, ReadWriteOnce                     |
| **Filesystem**   | Host path           | `/var/lib/rancher/k3s/storage/pvc-...` |

### StorageClass Properties

| Property             | Value                     | Implication                |
| -------------------- | ------------------------- | -------------------------- |
| Provisioner          | rancher.io/local-path     | Host-level storage         |
| ReclaimPolicy        | Retain (manually changed) | PVC survives deletion      |
| AllowVolumeExpansion | true (manually enabled)   | Can resize PVC             |
| VolumeBindingMode    | WaitForFirstConsumer      | Binds after pod scheduling |

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

### How to Resize PVC

```bash
# Expand from 5Gi to 10Gi
kubectl patch pvc postgres-data-vrs-postgres-0 -n vrs-postgres \
  -p '{"spec":{"resources":{"requests":{"storage":"10Gi"}}}}'

# Verify
kubectl get pvc postgres-data-vrs-postgres-0 -n vrs-postgres
```

**Note:** With `local-path` provisioner, this updates metadata only. Actual storage uses host disk (144GB available). Real expansion works with cloud StorageClasses (EBS, Ceph, NFS).

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

## 9. Security

### Security Layers

```mermaid
graph TB
    subgraph Layer1["Layer 1: Network"]
        NP1[NetworkPolicy<br/>App]
        NP2[NetworkPolicy<br/>PostgreSQL]
    end

    subgraph Layer2["Layer 2: Ingress"]
        TLS[TLS Termination<br/>cert-manager]
        RL[Rate Limiting<br/>10 rps]
    end

    subgraph Layer3["Layer 3: Pod Security"]
        PSS[Pod Security Standards<br/>baseline enforce]
        SC[Security Context<br/>runAsNonRoot: 1001]
        CAP[Capabilities<br/>drop: ALL]
    end

    subgraph Layer4["Layer 4: Access Control"]
        NS1[ResourceQuota<br/>vrs-app]
        NS2[ResourceQuota<br/>vrs-postgres]
        PDB[PDB<br/>minAvailable: 1]
    end

    subgraph Layer5["Layer 5: Secrets"]
        SEC1[K8s Secret<br/>vrs-app-secret]
        SEC2[K8s Secret<br/>vrs-postgres-secret]
        GI[.gitignore<br/>excludes secrets]
    end

    Layer1 --> Layer2
    Layer2 --> Layer3
    Layer3 --> Layer4
    Layer4 --> Layer5
```

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

**Secret templates in git (have `CHANGE_ME` placeholders):**

```yaml
# k8s/base/app/secret.yaml (gitignored)
stringData:
  DATABASE_URL: "postgresql://vrs_user:CHANGE_ME@vrs-postgres.vrs-postgres.svc.cluster.local:5432/vrs_db"
  JWT_SECRET: "CHANGE_ME_GENERATE_WITH_openssl_rand_base64_32"
  JWT_REFRESH_SECRET: "CHANGE_ME_GENERATE_WITH_openssl_rand_base64_32"
  SMTP_PASS: "CHANGE_ME_IF_USING_SMTP"
```

### Pod Security Standards

| Namespace    | Enforce  | Audit      | Warn       |
| ------------ | -------- | ---------- | ---------- |
| vrs-app      | baseline | restricted | restricted |
| vrs-postgres | baseline | restricted | restricted |

**Why `baseline` not `restricted`:**

- PostgreSQL container needs to run as root for initialization
- `restricted` would block the PostgreSQL pod
- `baseline` allows root while still blocking privileged containers

---

## 10. Monitoring & Health

### Health Check Architecture

```mermaid
graph LR
    subgraph Probes
        Liveness[Liveness Probe<br/>/api/health<br/>30s delay, 15s period]
        Readiness[Readiness Probe<br/>/api/health<br/>10s delay, 10s period]
        Startup[Startup Probe<br/>/api/health<br/>10s delay, 10s period, 30 retries]
    end

    subgraph Endpoint["/api/health"]
        Health[Health Check]
        DBCheck[Database Check<br/>SELECT 1]
    end

    Liveness --> Endpoint
    Readiness --> Endpoint
    Startup --> Endpoint
    Endpoint --> DBCheck
```

### Health Endpoint (src/app/api/health/route.ts)

```typescript
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", database: "connected", timestamp: new Date().toISOString() },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { status: "error", database: "disconnected", timestamp: new Date().toISOString() },
      { status: 503 },
    );
  }
}
```

### Probe Configuration

| Probe     | Path        | Initial Delay | Period | Timeout | Failure Threshold | Purpose                 |
| --------- | ----------- | ------------- | ------ | ------- | ----------------- | ----------------------- |
| Startup   | /api/health | 10s           | 10s    | 10s     | 30                | Wait for app to start   |
| Readiness | /api/health | 10s           | 10s    | 5s      | 3                 | Control traffic routing |
| Liveness  | /api/health | 30s           | 15s    | 5s      | 3                 | Restart if unhealthy    |

### Graceful Shutdown

```mermaid
sequenceDiagram
    participant K as K8s
    participant P as Pod
    participant A as App

    K->>P: SIGTERM
    P->>P: preStop hook (sleep 5)
    Note over P: Pod removed from Service endpoints
    P->>A: SIGTERM handler
    A->>A: Stop accepting new connections
    A->>A: Wait for in-flight requests
    A->>A: prisma.$disconnect()
    A->>P: process.exit(0)
    P-->>K: Pod terminated
```

### Pod Lifecycle

```
Pod Created
    ↓
Init Container 1: wait-for-postgres
    ↓ (PostgreSQL ready)
Init Container 2: run-migrations
    ↓ (Migrations applied)
Init Container 3: seed-database
    ↓ (Seed complete)
Main Container: vrs-app
    ↓ (Next.js starting)
Startup Probe: /api/health
    ↓ (App healthy)
Readiness Probe: /api/health
    ↓ (Pod added to Service)
Liveness Probe: /api/health
    ↓ (Monitors health)
...
SIGTERM received
    ↓
preStop: sleep 5
    ↓
Graceful shutdown
    ↓
Pod terminated
```

---

## 11. Troubleshooting

### Common Issues and Fixes

#### 1. Pod stuck in Pending

```bash
# Check why
kubectl describe pod <pod-name> -n vrs-app

# Common causes:
# - ResourceQuota exceeded
# - PVC not bound
# - Node resource pressure
# - NodeSelector mismatch
```

**Fix:** Check ResourceQuota usage:

```bash
kubectl get resourcequota -n vrs-app
kubectl describe resourcequota vrs-app-quota -n vrs-app
```

#### 2. Pod stuck in Init

```bash
# Check init container logs
kubectl logs <pod-name> -n vrs-app -c wait-for-postgres
kubectl logs <pod-name> -n vrs-app -c run-migrations
kubectl logs <pod-name> -n vrs-app -c seed-database
```

**Common causes:**

- `wait-for-postgres`: PostgreSQL not ready
- `run-migrations`: Database connection failed
- `seed-database`: Seed script error

#### 3. ArgoCD OutOfSync

```bash
# Check status
kubectl get application visitor-registration-system -n argocd -o jsonpath='{.status.sync.status}'

# Check which resources are out of sync
kubectl get application visitor-registration-system -n argocd \
  -o jsonpath='{range .status.resources[*]}{.kind}/{.name}: {.status}{"\n"}{end}'

# Force refresh
kubectl patch application visitor-registration-system -n argocd \
  --type merge -p '{"metadata":{"annotations":{"argocd.argoproj.io/refresh":"hard"}}}'
```

**Common causes:**

- New git commit not yet synced
- StatefulSet immutable field changes
- ManagedFields conflict
- VolumeClaimTemplate size mismatch

#### 4. Startup Probe Failed

```bash
# Check events
kubectl describe pod <pod-name> -n vrs-app | grep -A20 "Events:"

# Check if app is actually running
kubectl exec -it <pod-name> -n vrs-app -- curl -s localhost:3000/api/health
```

**Common causes:**

- `timeoutSeconds` too low (was 1s, now 10s)
- `initialDelaySeconds` too low (was 10s, now 10s but counts from container start)
- App takes too long to start

#### 5. Application Returns 401/403

```bash
# Check middleware
# /api/health is in publicApiPaths (no auth required)
# All other /api/* routes require JWT token

# Test without auth
curl -k https://YOUR_STAGING_DOMAIN/api/health

# Test with auth
curl -k -b "access_token=<token>" https://YOUR_STAGING_DOMAIN/api/v1/visitors
```

#### 6. Database Connection Failed

```bash
# Check PostgreSQL pod
kubectl get pods -n vrs-postgres
kubectl logs vrs-postgres-0 -n vrs-postgres

# Test connectivity from app pod
kubectl exec -it <app-pod> -n vrs-app -- nc -z vrs-postgres.vrs-postgres.svc.cluster.local 5432

# Check secret
kubectl get secret vrs-app-secret -n vrs-app -o jsonpath='{.data.DATABASE_URL}' | base64 -d
```

#### 7. Ingress Not Working

```bash
# Check ingress
kubectl get ingress -n vrs-app
kubectl describe ingress vrs-app -n vrs-app

# Check TLS certificate
kubectl get certificate -n vrs-app
kubectl describe certificate vrs-staging-app-tls -n vrs-app

# Check ingress-nginx logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx --tail=20
```

### Debug Commands

```bash
# Quick status overview
kubectl get pods,svc,ingress,pdb,hpa -n vrs-app
kubectl get pods,svc,pvc,cronjob -n vrs-postgres
kubectl get application visitor-registration-system -n argocd

# Detailed pod info
kubectl describe pod <pod-name> -n vrs-app

# Pod logs (all containers including init)
kubectl logs <pod-name> -n vrs-app --all-containers

# Port forward for local testing
kubectl port-forward -n vrs-app svc/vrs-app 3000:3000
kubectl port-forward -n vrs-postgres svc/vrs-postgres 5432:5432

# Shell into pod
kubectl exec -it <pod-name> -n vrs-app -- sh
kubectl exec -it vrs-postgres-0 -n vrs-postgres -- psql -U vrs_user -d vrs_db

# Check events
kubectl get events -n vrs-app --sort-by='.lastTimestamp'
kubectl get events -n vrs-postgres --sort-by='.lastTimestamp'
```

---

## 12. Production Recommendations

### Current Gaps

| Gap                           | Risk                              | Priority  | Recommendation                     |
| ----------------------------- | --------------------------------- | --------- | ---------------------------------- |
| Backup uses emptyDir          | Data loss on pod restart          | 🔴 High   | Use PVC or S3 for backup storage   |
| Single PostgreSQL replica     | No HA, data loss on node failure  | 🔴 High   | Add read replica or use managed DB |
| No monitoring                 | No metrics/alerting               | 🟡 Medium | Add Prometheus ServiceMonitor      |
| Migrations in init containers | Race condition with multiple pods | 🟡 Medium | Use separate K8s Job               |
| Production overlay untested   | Unknown issues                    | 🟡 Medium | Deploy to staging first            |
| No backup verification        | Corrupt backups                   | 🟡 Medium | Add restore test CronJob           |
| `commonLabels` deprecated     | Kustomize warning                 | 🟢 Low    | Switch to `labels` field           |
| No SMTP_USER in ConfigMap     | Manual setup needed               | 🟢 Low    | Add to ConfigMap                   |

### Production Checklist

```yaml
# Before deploying to production:

# 1. Create production namespace
kubectl create namespace vrs-app
kubectl create namespace vrs-postgres

# 2. Create production secrets
kubectl create secret generic vrs-app-secret \
  --namespace vrs-app \
  --from-literal=DATABASE_URL="<production-db-url>" \
  --from-literal=JWT_SECRET="$(openssl rand -base64 32)" \
  --from-literal=JWT_REFRESH_SECRET="$(openssl rand -base64 32)" \
  --from-literal=SMTP_PASS="<smtp-password>" \
  --from-literal=DIRECT_DATABASE_URL="<direct-db-url>"

# 3. Create PostgreSQL secrets
kubectl create secret generic vrs-postgres-secret \
  --namespace vrs-postgres \
  --from-literal=POSTGRES_USER=vrs_user \
  --from-literal=POSTGRES_PASSWORD="$(openssl rand -base64 24)" \
  --from-literal=POSTGRES_DB=vrs_db

# 4. Apply production overlay
kubectl apply -k k8s/overlays/production/

# 5. Configure ArgoCD for production
# Update argocd-application.yaml to watch production overlay

# 6. Configure DNS
# Point YOUR_PRODUCTION_DOMAIN to cluster IP

# 7. Verify TLS
kubectl get certificate -n vrs-app

# 8. Test health
curl -k https://YOUR_PRODUCTION_DOMAIN/api/health

# 9. Test login
# https://YOUR_PRODUCTION_DOMAIN/login
```

### Scaling Considerations

| Component    | Current      | Recommended          | Notes                    |
| ------------ | ------------ | -------------------- | ------------------------ |
| App Replicas | 1 (HPA: 1-3) | 2-5                  | Depends on traffic       |
| PostgreSQL   | 1 replica    | Managed DB           | AWS RDS, Supabase, etc.  |
| Backup       | Daily        | Every 6 hours        | Depends on RPO           |
| Monitoring   | None         | Prometheus + Grafana | Essential for production |

---

## 13. Interview Preparation

### K8s Concepts Covered by This Project

#### Pod Lifecycle

**Q: What happens when a pod starts in this project?**

A: Three init containers run sequentially:

1. `wait-for-postgres` (busybox) — checks TCP connectivity to PostgreSQL
2. `run-migrations` (vrs:staging) — executes `prisma migrate deploy`
3. `seed-database` (vrs:staging) — executes `prisma db seed`

Then the main container starts Next.js, and startup/readiness/liveness probes verify health.

#### Rolling Updates

**Q: How does this project achieve zero-downtime deployments?**

A: The Deployment uses RollingUpdate strategy (default). With HPA minReplicas=1 and PDB minAvailable=1, Kubernetes ensures at least one pod is always running. The preStop hook (sleep 5) gives time for the pod to be removed from Service endpoints before termination.

#### NetworkPolicy

**Q: Why are NetworkPolicies important?**

A: They act as a firewall between pods. In this project:

- App pods can ONLY receive traffic from ingress-nginx
- App pods can ONLY talk to PostgreSQL
- PostgreSQL can ONLY receive connections from app pods
- This limits the blast radius of a compromised pod

#### StatefulSet vs Deployment

**Q: Why use StatefulSet for PostgreSQL but Deployment for the app?**

A: StatefulSet provides:

- Stable network identity (pod-0, pod-1)
- Stable storage (PVC per pod)
- Ordered deployment/scaling
- PersistentVolumeClaim retention policy

The app is stateless (all state in PostgreSQL), so Deployment is appropriate.

#### ResourceQuota

**Q: What happens when a namespace hits its ResourceQuota?**

A: New pods are rejected with "Forbidden" error. In this project, the ResourceQuota requires all containers (including init containers) to have CPU/memory limits. Without limits on init containers, pods fail with "must specify limits.cpu for: run-migrations".

#### ArgoCD GitOps

**Q: What is the difference between ArgoCD and kubectl apply?**

A: `kubectl apply` is imperative — you manually run it. ArgoCD is declarative — it continuously watches Git and syncs automatically. ArgoCD also:

- Detects drift (manual changes)
- Self-heals (reverts drift)
- Prunes removed resources
- Provides UI for visibility

#### HPA

**Q: How does the Horizontal Pod Autoscaler work?**

A: HPA monitors CPU (70%) and memory (80%) usage. When usage exceeds targets, it scales up. When usage drops, it scales down. In this project:

- Min: 1 replica
- Max: 3 replicas
- Current: 3 replicas (based on memory usage)

#### PDB

**Q: What is a PodDisruptionBudget and why is it needed?**

A: PDB guarantees minimum availability during voluntary disruptions (node drains, cluster upgrades). This project's PDB ensures at least 1 pod is always running, preventing downtime during maintenance.

### Architecture Decision Records

| Decision                       | Why                          | Trade-off                           |
| ------------------------------ | ---------------------------- | ----------------------------------- |
| K3s over managed K8s           | Cost (free on VPS), learning | More operational overhead           |
| PostgreSQL in K8s vs managed   | Simplicity, cost             | No HA, manual backups               |
| ArgoCD over Flux               | Better UI, simpler config    | More resource usage                 |
| Kustomize over Helm            | Simpler, no templating       | Less flexible for complex scenarios |
| NetworkPolicies                | Security isolation           | More complexity                     |
| init containers for migrations | Automatic on deploy          | Slow startup, race conditions       |

### Key Metrics to Monitor

| Metric                 | Why                        | Alert Threshold       |
| ---------------------- | -------------------------- | --------------------- |
| Pod restart count      | Crash loops                | > 3 in 10 minutes     |
| Pod memory usage       | OOM kills                  | > 80% of limit        |
| Pod CPU usage          | Throttling                 | > 80% of limit        |
| PVC usage              | Disk full                  | > 80% of capacity     |
| HTTP 5xx rate          | App errors                 | > 1% of requests      |
| Response time          | Performance                | > 2 seconds p99       |
| ArgoCD sync status     | Deployment health          | OutOfSync > 5 minutes |
| PostgreSQL connections | Connection pool exhaustion | > 80% of max          |

---

## Appendix: Quick Reference

### Essential Commands

```bash
# Status
kubectl get pods,svc,ingress -n vrs-app
kubectl get pods,pvc -n vrs-postgres
kubectl get application visitor-registration-system -n argocd

# Debug
kubectl logs <pod> -n vrs-app --all-containers
kubectl describe pod <pod> -n vrs-app
kubectl exec -it <pod> -n vrs-app -- sh

# Deploy
kubectl apply -k k8s/overlays/staging/
kubectl rollout status deployment/vrs-app -n vrs-app

# ArgoCD
kubectl patch application visitor-registration-system -n argocd \
  --type merge -p '{"metadata":{"annotations":{"argocd.argoproj.io/refresh":"hard"}}}'
```

### File Locations

| Purpose                | Path                                 |
| ---------------------- | ------------------------------------ |
| ArgoCD App             | `k8s/apps/argocd-application.yaml`   |
| Base manifests         | `k8s/base/`                          |
| Staging overlay        | `k8s/overlays/staging/`              |
| Production overlay     | `k8s/overlays/production/`           |
| App deployment         | `k8s/base/app/deployment.yaml`       |
| PostgreSQL StatefulSet | `k8s/base/postgres/statefulset.yaml` |
| NetworkPolicies        | `k8s/base/app/network-policy.yaml`   |
| Health endpoint        | `src/app/api/health/route.ts`        |
| Graceful shutdown      | `src/lib/graceful-shutdown.ts`       |

---

_Document generated from repository analysis on 2026-07-20._
_Based on actual k8s/ directory contents — no assumed resources._
