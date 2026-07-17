# Kubernetes Deployment — Visitor Registration System

## Overview

This directory contains Kubernetes manifests for deploying the Visitor Registration System
to the K3s cluster managed by Argo CD.

## Directory Structure

```
k8s/
├── base/                          # Base manifests (shared across environments)
│   ├── kustomization.yaml
│   ├── postgres/                  # PostgreSQL StatefulSet
│   │   ├── namespace.yaml
│   │   ├── statefulset.yaml
│   │   ├── service.yaml
│   │   ├── pvc.yaml
│   │   ├── secret.yaml
│   │   └── configmap.yaml
│   └── app/                       # Next.js application
│       ├── namespace.yaml
│       ├── deployment.yaml
│       ├── service.yaml
│       ├── ingress.yaml
│       ├── hpa.yaml
│       ├── secret.yaml
│       └── configmap.yaml
├── overlays/
│   └── staging/                   # Staging environment overrides
│       ├── kustomization.yaml
│       └── patches/
│           ├── resource-limits.yaml
│           ├── ingress-host.yaml
│           └── container-image.yaml
├── apps/
│   ├── argocd-application.yaml    # ArgoCD Application resource
│   └── kustomization.yaml
└── README.md
```

## Prerequisites

| Component      | Status | Notes                                      |
| -------------- | ------ | ------------------------------------------ |
| K3s cluster    | ✅     | Single-node cluster                        |
| ArgoCD         | ✅     | Installed in `argocd` namespace            |
| cert-manager   | ✅     | ClusterIssuer `letsencrypt-prod` available |
| ingress-nginx  | ✅     | NodePort 80:32280, 443:32443               |
| Docker Traefik | ✅     | Public HTTPS edge proxy                    |

## Traffic Flow

```
Public Internet
    → Docker Traefik (HTTPS, Bearer Token auth)
        → K3s ingress-nginx (HTTP)
            → vrs-app Service (ClusterIP:3000)
                → vrs-app Pod
                    → vrs-postgres Service (ClusterIP:5432)
                        → vrs-postgres Pod
```

## Deployment Steps

### 1. Build and Push Container Image

```bash
# Build the Docker image
docker build -t ghcr.io/<org>/visitor-registration-system:staging .

# Push to container registry
docker push ghcr.io/<org>/visitor-registration-system:staging
```

### 2. Update Secrets

```bash
# Generate secure secrets
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 24)

# Update k8s/base/postgres/secret.yaml
# Update k8s/base/app/secret.yaml
```

### 3. Deploy via ArgoCD

```bash
# Option A: Apply the ArgoCD Application directly
kubectl apply -f k8s/apps/argocd-application.yaml

# Option B: Use ArgoCD CLI
argocd app create visitor-registration-system \
  --repo https://github.com/<org>/visitor-registration-system.git \
  --path k8s/overlays/staging \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace vrs-app \
  --sync-policy automated \
  --auto-prune \
  --self-heal
```

### 4. Verify Deployment

```bash
# Check ArgoCD application status
kubectl get applications -n argocd visitor-registration-system

# Check pods
kubectl get pods -n vrs-postgres
kubectl get pods -n vrs-app

# Check services
kubectl get svc -n vrs-postgres
kubectl get svc -n vrs-app

# Check ingress
kubectl get ingress -n vrs-app

# Check logs
kubectl logs -n vrs-app -l app.kubernetes.io/name=visitor-registration-system --tail=100
```

### 5. Configure DNS

Add DNS record for the staging domain:

```
vrs-staging.<your-domain> → <your-server-ip>
```

### 6. Configure Traefik Route

Docker Traefik must route the staging domain to K3s ingress-nginx.
This is typically done via Traefik's file provider or Docker labels.

## Environment Variables

### Secrets (stored in K8s Secrets)

| Variable             | Description                  | Example                                                        |
| -------------------- | ---------------------------- | -------------------------------------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string | `postgresql://user:pass@vrs-postgres.vrs-postgres:5432/vrs_db` |
| `JWT_SECRET`         | JWT signing key              | `openssl rand -base64 32`                                      |
| `JWT_REFRESH_SECRET` | Refresh token signing key    | `openssl rand -base64 32`                                      |
| `SMTP_PASS`          | SMTP password                | Your app password                                              |

### Config (stored in ConfigMaps)

| Variable              | Description    | Default                     |
| --------------------- | -------------- | --------------------------- |
| `NODE_ENV`            | Environment    | `production`                |
| `NEXT_PUBLIC_APP_URL` | Public app URL | `https://vrs.<your-domain>` |
| `APP_BASE_URL`        | Base URL       | `https://vrs.<your-domain>` |
| `JWT_EXPIRES_IN`      | JWT expiry     | `24h`                       |
| `QR_EXPIRES_MINUTES`  | QR code expiry | `1440`                      |

## Troubleshooting

### Pod not starting

```bash
kubectl describe pod -n vrs-app <pod-name>
kubectl logs -n vrs-app <pod-name> --previous
```

### Database connection refused

```bash
# Check if postgres is running
kubectl get pods -n vrs-postgres

# Test connectivity from app pod
kubectl exec -it -n vrs-app <pod-name> -- nc -z vrs-postgres.vrs-postgres.svc.cluster.local 5432
```

### ArgoCD sync failing

```bash
argocd app get visitor-registration-system
argocd app sync visitor-registration-system --force
```

### Ingress not routing

```bash
# Check ingress exists
kubectl get ingress -n vrs-app

# Check ingress-nginx logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx --tail=50
```

## Rollback

```bash
# Via ArgoCD
argocd app rollback visitor-registration-system

# Or revert Git commit
git revert HEAD
# ArgoCD will auto-sync the revert
```
