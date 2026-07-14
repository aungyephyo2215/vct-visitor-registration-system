# Kubernetes Manifests for Visitor Registration System

ArgoCD-ready Kubernetes manifests with Kustomize overlays for multi-environment support.

---

## 📁 Directory Structure

```
k8s/
├── base/                          # Base manifests
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── postgres-pvc.yaml
│   ├── postgres-deployment.yaml
│   ├── postgres-service.yaml
│   ├── app-deployment.yaml
│   ├── app-service.yaml
│   ├── ingress.yaml
│   └── kustomization.yaml
├── overlays/
│   ├── dev/                       # Development environment
│   │   └── kustomization.yaml
│   ├── staging/                   # Staging environment
│   │   └── kustomization.yaml
│   └── production/                # Production environment
│       └── kustomization.yaml
└── argocd/
    ├── application.yaml           # ArgoCD Application
    └── application-set.yaml       # ArgoCD ApplicationSet (multi-env)
```

---

## 🚀 Quick Start

### Prerequisites

- Kubernetes cluster (minikube, kind, k3s, or cloud)
- kubectl configured
- Kustomize installed
- ArgoCD installed (for GitOps)

### Local Development (minikube/kind)

```bash
# Start minikube
minikube start

# Deploy dev environment
kubectl apply -k k8s/overlays/dev

# Check status
kubectl get pods -n visitor-registration-system-dev
kubectl get svc -n visitor-registration-system-dev
```

### Staging Environment

```bash
# Deploy staging
kubectl apply -k k8s/overlays/staging

# Check status
kubectl get pods -n visitor-registration-system-staging
```

### Production Environment

```bash
# Deploy production
kubectl apply -k k8s/overlays/production

# Check status
kubectl get pods -n visitor-registration-system-production
```

---

## 🔄 ArgoCD Setup

### Option 1: Single Application

```bash
# Apply ArgoCD application
kubectl apply -f k8s/argocd/application.yaml
```

### Option 2: ApplicationSet (Multi-Environment)

```bash
# Apply ArgoCD ApplicationSet
kubectl apply -f k8s/argocd/application-set.yaml
```

### Access ArgoCD UI

```bash
# Get ArgoCD password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Port-forward ArgoCD UI
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

---

## ⚙️ Configuration

### Environment Variables

| Variable             | Description          | Default        |
| -------------------- | -------------------- | -------------- |
| `NODE_ENV`           | Environment          | `production`   |
| `DB_HOST`            | PostgreSQL host      | `vrs-postgres` |
| `DB_PORT`            | PostgreSQL port      | `5432`         |
| `DB_NAME`            | Database name        | `vrs_db`       |
| `JWT_SECRET`         | JWT signing secret   | Required       |
| `JWT_REFRESH_SECRET` | Refresh token secret | Required       |

### Secrets

Update `k8s/base/secret.yaml` with production values:

```yaml
stringData:
  DB_USER: "your_db_user"
  DB_PASSWORD: "your_secure_password"
  DATABASE_URL: "postgresql://user:pass@host:5432/db"
  JWT_SECRET: "your_jwt_secret"
  JWT_REFRESH_SECRET: "your_refresh_secret"
```

**⚠️ Never commit real secrets to Git!**

Use one of these methods:

- Sealed Secrets
- External Secrets Operator
- Vault
- Cloud provider secrets (AWS Secrets Manager, GCP Secret Manager)

---

## 🌐 Ingress Configuration

### Update Domain

Edit `k8s/base/ingress.yaml`:

```yaml
spec:
  tls:
    - hosts:
        - vrs.yourdomain.com
      secretName: vrs-tls
  rules:
    - host: vrs.yourdomain.com
```

### SSL/TLS with cert-manager

1. Install cert-manager:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml
```

2. Create ClusterIssuer:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

---

## 🔧 Useful Commands

```bash
# View generated manifests
kubectl kustomize k8s/overlays/dev

# Dry run
kubectl apply -k k8s/overlays/dev --dry-run=client

# Check resources
kubectl get all -n visitor-registration-system-dev

# View logs
kubectl logs -f deployment/vrs-app-dev -n visitor-registration-system-dev

# Port forward (local access)
kubectl port-forward svc/vrs-app-dev 3000:80 -n visitor-registration-system-dev

# Scale deployment
kubectl scale deployment/vrs-app-dev --replicas=2 -n visitor-registration-system-dev

# Delete environment
kubectl delete namespace visitor-registration-system-dev
```

---

## 🐛 Troubleshooting

### Pod not starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n visitor-registration-system-dev

# Check logs
kubectl logs <pod-name> -n visitor-registration-system-dev
```

### Database connection issues

```bash
# Verify postgres is running
kubectl get pods -l app.kubernetes.io/component=postgres -n visitor-registration-system-dev

# Test connection
kubectl exec -it <postgres-pod> -n visitor-registration-system-dev -- psql -U vrs_user -d vrs_db
```

### Ingress not working

```bash
# Check ingress
kubectl get ingress -n visitor-registration-system-dev
kubectl describe ingress vrs-ingress-dev -n visitor-registration-system-dev

# Check ingress controller
kubectl get pods -n ingress-nginx
```

---

## 📚 Resources

- [Kustomize Documentation](https://kubectl.docs.kubernetes.io/)
- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
