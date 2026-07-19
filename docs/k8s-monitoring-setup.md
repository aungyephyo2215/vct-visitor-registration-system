# Kubernetes Monitoring & Logging Setup

## Overview

This document describes the monitoring and logging stack implemented for the Visitor Registration System on K3s.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         K3s Cluster (46.250.227.69)                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    monitoring namespace                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │ Prometheus  │  │   Grafana   │  │ Alertmanager│              │   │
│  │  │  (Metrics)  │  │(Dashboards) │  │   (Alerts)  │              │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     logging namespace                             │   │
│  │  ┌─────────────┐  ┌─────────────┐                               │   │
│  │  │    Loki     │  │  Promtail   │                               │   │
│  │  │  (Storage)  │←─│  (Collector)│                               │   │
│  │  └─────────────┘  └─────────────┘                               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Components

### Monitoring Stack

| Component              | Purpose                       | Namespace  | Resource Usage               |
| ---------------------- | ----------------------------- | ---------- | ---------------------------- |
| **Prometheus**         | Metrics collection & alerting | monitoring | 500m CPU, 1Gi-4Gi Memory     |
| **Grafana**            | Visualization dashboards      | monitoring | 100m CPU, 256Mi-512Mi Memory |
| **Alertmanager**       | Alert routing & notifications | monitoring | 100m CPU, 128Mi-256Mi Memory |
| **kube-state-metrics** | K8s object metrics            | monitoring | 50m CPU, 64Mi-256Mi Memory   |
| **node-exporter**      | Host-level metrics            | monitoring | 50m CPU, 64Mi-128Mi Memory   |

### Logging Stack

| Component    | Purpose                   | Namespace | Resource Usage             |
| ------------ | ------------------------- | --------- | -------------------------- |
| **Loki**     | Log aggregation & storage | logging   | 250m CPU, 512Mi-2Gi Memory |
| **Promtail** | Log collection agent      | logging   | 50m CPU, 64Mi-128Mi Memory |

## Files Created

### Monitoring Stack (`k8s/base/monitoring/`)

| File                     | Purpose                                   |
| ------------------------ | ----------------------------------------- |
| `namespace.yaml`         | Monitoring namespace with security labels |
| `prometheus-values.yaml` | Prometheus Helm chart values              |
| `grafana-values.yaml`    | Grafana Helm chart values                 |
| `alert-rules.yaml`       | PrometheusRule for VRS app alerts         |
| `ingress.yaml`           | Ingress rules for external access         |
| `network-policy.yaml`    | Network policies for traffic control      |
| `resource-quota.yaml`    | Resource quotas and limit ranges          |
| `secret.yaml`            | Secrets, ServiceAccount, and RBAC         |

### Logging Stack (`k8s/base/logging/`)

| File                   | Purpose                                |
| ---------------------- | -------------------------------------- |
| `namespace.yaml`       | Logging namespace with security labels |
| `loki-values.yaml`     | Loki Helm chart values                 |
| `promtail-values.yaml` | Promtail Helm chart values             |
| `network-policy.yaml`  | Network policies for logging traffic   |

### ArgoCD Applications (`k8s/apps/`)

| File                          | Purpose                                 |
| ----------------------------- | --------------------------------------- |
| `monitoring-application.yaml` | ArgoCD Application for monitoring stack |
| `logging-application.yaml`    | ArgoCD Application for logging stack    |

## Deployment

### Prerequisites

1. **K3s Cluster** running at 46.250.227.69
2. **ArgoCD** installed and accessible
3. **Helm** installed on the cluster
4. **StorageClass** available for PVCs

### Step 1: Commit and Push Changes

```bash
cd /Users/macbookprom1/Documents/vibe-code-tours/visitor-registration-system
git add k8s/
git commit -m "feat(monitoring): add Prometheus, Grafana, Loki, and Promtail stacks"
git push origin staging/argocd-k8s-lab
```

### Step 2: Sync ArgoCD Applications

Option A: Via ArgoCD UI

1. Open ArgoCD at `https://argocd.k8s.cmtmm.online`
2. Click "New App" or sync existing
3. Sync `monitoring-stack` application
4. Sync `logging-stack` application

Option B: Via CLI

```bash
# Sync monitoring stack
argocd app sync monitoring-stack

# Sync logging stack
argocd app sync logging-stack
```

### Step 3: Verify Deployment

```bash
# Check monitoring pods
kubectl get pods -n monitoring

# Check logging pods
kubectl get pods -n logging

# Check services
kubectl get svc -n monitoring
kubectl get svc -n logging
```

### Step 4: Access Services

After deployment, access via:

| Service          | URL                                     |
| ---------------- | --------------------------------------- |
| **Grafana**      | `https://grafana.k8s.cmtmm.online`      |
| **Prometheus**   | `https://prometheus.k8s.cmtmm.online`   |
| **Alertmanager** | `https://alertmanager.k8s.cmtmm.online` |

**Default Credentials:**

- Username: `admin`
- Password: `changeme123` (change in production!)

## Configuration

### Prometheus Scrape Configuration

Prometheus is configured to automatically scrape:

- All pods with `prometheus.io/scrape: "true"` annotation
- Kubernetes API metrics
- Node exporter metrics
- kube-state-metrics

### Grafana Datasources

Auto-provisioned datasources:

- **Prometheus**: `http://prometheus-k8s.monitoring.svc.cluster.local:9090`
- **Loki**: `http://loki-gateway.logging.svc.cluster.local:80`

### Grafana Dashboards

Auto-provisioned dashboards:

- Kubernetes Cluster Monitoring
- Kubernetes Pods
- Kubernetes Nodes
- Kubernetes Resources
- Kubernetes Network
- Kubernetes Storage
- Loki Logs

### Alert Rules

Custom alerts for VRS app:

- **VRSHighErrorRate**: API error rate > 5%
- **VRSHighLatency**: P99 latency > 2s
- **VRSPodCrashLooping**: Pod restarts
- **VRSHighMemoryUsage**: Memory > 90%
- **VRSHighCPUUsage**: CPU > 80%
- **VRSPodNotReady**: Pod not ready
- **VRSHPAAtMaxCapacity**: HPA at max replicas

Database alerts:

- **PostgreSQLHighConnections**: Connection pool > 80%
- **PostgreSQLLongRunningQueries**: Queries > 30s
- **PostgreSQLDown**: Database down
- **PostgreSQLLowCacheHitRatio**: Cache hit < 99%

Infrastructure alerts:

- **KubernetesNodeNotReady**: Node not ready
- **KubernetesHighNodeMemoryUsage**: Node memory > 90%
- **KubernetesHighNodeDiskUsage**: Node disk > 90%
- **KubernetesPodPendingTooLong**: Pod pending > 15min
- **KubernetesPVCPending**: PVC pending > 15min

## Network Policies

### Monitoring Namespace

- **prometheus-egress**: Allow Prometheus to scrape all namespaces
- **grafana-ingress**: Allow Grafana to query Prometheus and Loki

### Logging Namespace

- **loki-ingress**: Allow Promtail and Grafana to access Loki
- **promtail-egress**: Allow Promtail to push logs to Loki

### Cross-Namespace

- **vrs-app-logs-egress**: Allow VRS app to send logs

## Resource Quotas

### Monitoring Namespace

- CPU: 4 requests, 8 limits
- Memory: 4Gi requests, 8Gi limits
- Storage: 50Gi
- Pods: 20

### Logging Namespace

- CPU: 2 requests, 4 limits
- Memory: 2Gi requests, 4Gi limits
- Storage: 30Gi
- Pods: 10

## Troubleshooting

### Prometheus Not Scraping

```bash
# Check Prometheus targets
kubectl port-forward -n monitoring svc/prometheus-k8s 9090:9090
# Open http://localhost:9090/targets

# Check ServiceMonitors
kubectl get servicemonitors -A
```

### Grafana Not Showing Logs

```bash
# Check Loki is running
kubectl get pods -n logging

# Check Promtail is sending logs
kubectl logs -n logging -l app.kubernetes.io/name=promtail

# Test Loki query
kubectl port-forward -n logging svc/loki-gateway 8080:80
curl http://localhost:8080/loki/api/v1/labels
```

### Alerts Not Firing

```bash
# Check Alertmanager
kubectl port-forward -n monitoring svc/alertmanager-main 9093:9093
# Open http://localhost:9093

# Check Prometheus rules
kubectl port-forward -n monitoring svc/prometheus-k8s 9090:9090
# Open http://localhost:9090/rules
```

## Production Considerations

1. **Change Default Passwords**: Update `grafana-admin-credentials` secret
2. **TLS Certificates**: Use cert-manager for automatic TLS
3. **Alert Notifications**: Configure Slack/Email in Alertmanager
4. **Backup**: Backup Prometheus TSDB and Loki data
5. **Storage Class**: Ensure appropriate StorageClass for PVCs
6. **Resource Limits**: Adjust based on actual usage
7. **Retention**: Configure appropriate retention periods

## Next Steps

1. **Custom Dashboards**: Create VRS-specific dashboards
2. **Distributed Tracing**: Add Tempo or Jaeger
3. **Log-based Alerts**: Create Loki alert rules
4. **Cost Monitoring**: Add cloud cost tracking
5. **Capacity Planning**: Use metrics for planning

## References

- [kube-prometheus-stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack)
- [Grafana Loki](https://grafana.com/docs/loki/latest/)
- [Prometheus Operator](https://prometheus-operator.dev/)
- [CNCF Monitoring](https://www.cncf.io/phippy/the-childrens-guide-to-kubernetes-monitoring/)
