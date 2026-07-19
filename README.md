# Chatterly

> **AI-native team messaging platform built for engineering teams who demand intelligent communication with complete data sovereignty.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-AKS-326CE5.svg)](https://azure.microsoft.com/en-us/products/kubernetes-service)
[![Azure DevOps](https://img.shields.io/badge/CI%2FCD-Azure%20DevOps-0078D7.svg)](https://azure.microsoft.com/en-us/products/devops)

---

## The Problem

Engineering teams lose **2-3 hours daily** switching between disconnected tools:

```
Slack          → chat (no code intelligence)
GitHub         → code (no discussion threading)
Jira           → tasks (no real-time communication)
ChatGPT/Copilot → AI help (no context about your codebase)
```

None of these tools talk to each other intelligently. Every context switch costs focus, time, and money. And when your team uses SaaS messaging tools, **your conversations, code snippets, and business logic live on someone else's servers.**

---

## The Solution

Chatterly is a **self-hosted, AI-native messaging platform** that unifies team communication with built-in intelligence:

- **Semantic search** — find any conversation, decision, or code snippet by meaning, not keywords
- **Code intelligence** — analyze code snippets inline without leaving the conversation
- **Auto-summarization** — catch up on what happened while you were away in seconds
- **Task extraction** — automatically identify action items from conversations
- **Data sovereignty** — your data stays in your own Kubernetes cluster, always

---

## Why Self-Hosted Matters

```
SaaS messaging (Slack, Teams):          Chatterly:
├── Your data on their servers          ├── Your data on your infrastructure
├── Compliance nightmares (HIPAA, SOC2) ├── Full audit logs built-in
├── $12-15/user/month                   ├── Infrastructure cost only
├── AI add-ons cost extra               ├── AI-native from day one
└── Vendor lock-in                      └── Open, extensible architecture
```

Regulated industries (healthcare, fintech, legal, government) can't use SaaS messaging due to compliance requirements. Chatterly solves this with a **one-command Kubernetes deployment** that keeps all data within their own Azure infrastructure.

---

## Current Status

```
✅ Production backend deployed on Azure Kubernetes Service (AKS)
✅ Real-time messaging (Socket.io WebSockets)
✅ Authentication system (JWT, MFA, OTP via SMS)
✅ Posts + Comments system (async discussions)
✅ Social features (friendships, likes, notifications)
✅ Email + SMS notifications (Mailtrap, Twilio)
✅ Enterprise CI/CD pipeline (Azure DevOps, templatized)
✅ Full observability stack (Prometheus, Grafana, Loki, AlertManager)
✅ Security hardening (Azure Key Vault, Trivy image scanning, RBAC)
✅ Infrastructure as Code (Terraform, modular, enterprise structure)
🔄 Frontend in active development (React)
🔄 AI features in development (RAG, semantic search, pgvector)
🔄 Microservices migration (Strangler Fig pattern, NestJS)
```

---

## Architecture

### Current — Production Monolith on AKS

```
                          Internet
                             │
                    ┌────────▼────────┐
                    │   nginx Ingress  │
                    │  (Load Balancer) │
                    └────────┬────────┘
                             │
              ┌──────────────▼──────────────┐
              │         AKS Cluster          │
              │                              │
              │  ┌─────────────────────┐    │
              │  │    Chatterly API     │    │
              │  │  (Node.js/Express)  │    │
              │  │   Socket.io WS      │    │
              │  └──────┬──────┬───────┘    │
              │         │      │             │
              │  ┌──────▼──┐ ┌▼──────────┐ │
              │  │PostgreSQL│ │   Redis   │ │
              │  │(Prisma)  │ │  (Cache)  │ │
              │  └──────────┘ └───────────┘ │
              │                              │
              │  ┌───────────────────────┐  │
              │  │   Monitoring Stack    │  │
              │  │  Prometheus + Grafana │  │
              │  │  Loki + AlertManager  │  │
              │  └───────────────────────┘  │
              └──────────────────────────────┘
                             │
              ┌──────────────▼──────────────┐
              │        Azure Services        │
              │  ACR │ Key Vault │ DevOps    │
              └──────────────────────────────┘
```

### Target — AI-Native Microservices Platform

```
                          Internet
                             │
                    ┌────────▼────────┐
                    │   Kong Gateway   │
                    │ (AI + API Layer) │
                    └────────┬────────┘
                             │
              ┌──────────────▼──────────────────────────┐
              │              AKS Cluster                  │
              │                                           │
              │  ┌──────────┐  ┌──────────┐             │
              │  │   Auth   │  │Messaging │             │
              │  │ Service  │  │ Service  │             │
              │  └────┬─────┘  └────┬─────┘             │
              │       │             │                     │
              │  ┌────▼─────┐  ┌───▼──────┐             │
              │  │Notification│ │   AI     │             │
              │  │ Service  │  │ Service  │             │
              │  └──────────┘  └────┬─────┘             │
              │                     │                     │
              │  ┌──────────────────▼─────────────────┐ │
              │  │           Event Bus                  │ │
              │  │    Kafka (domain events + CDC)       │ │
              │  │    RabbitMQ (service RPC)            │ │
              │  │    BullMQ (job queues)               │ │
              │  └──────────────────────────────────────┘ │
              │                                           │
              │  ┌──────────┐  ┌──────────┐             │
              │  │pgvector  │  │ ClickHouse│             │
              │  │(RAG/     │  │(Analytics)│             │
              │  │Semantic) │  └──────────┘             │
              │  └──────────┘                            │
              └──────────────────────────────────────────┘
                             │
              ┌──────────────▼──────────────┐
              │        Azure Services        │
              │  Azure OpenAI │ Key Vault    │
              │  ACR │ DevOps │ Front Door   │
              └──────────────────────────────┘
```

---

## Technology Stack

### Backend

| Layer      | Technology              | Purpose                 |
| ---------- | ----------------------- | ----------------------- |
| Runtime    | Node.js 20 + TypeScript | Core application        |
| Framework  | Express.js → NestJS     | HTTP + WebSocket server |
| Real-time  | Socket.io               | WebSocket messaging     |
| ORM        | Prisma                  | Database access layer   |
| Validation | Zod v4                  | Runtime type safety     |
| Auth       | JWT + bcrypt            | Authentication          |
| MFA        | TOTP + Twilio OTP       | Multi-factor auth       |
| Email      | Nodemailer + Mailtrap   | Notifications           |
| Build      | esbuild (Nx monorepo)   | Fast bundling           |

### Data Layer

| Component  | Technology        | Purpose                        |
| ---------- | ----------------- | ------------------------------ |
| Primary DB | PostgreSQL 16     | Relational data                |
| Cache      | Redis 7           | Session + caching              |
| Vector DB  | pgvector → Qdrant | Semantic search (planned)      |
| Analytics  | ClickHouse        | Usage analytics (planned)      |
| Search     | Azure AI Search   | Full-text + semantic (planned) |

### AI Layer (In Development)

| Component     | Technology              | Purpose             |
| ------------- | ----------------------- | ------------------- |
| LLM           | Azure OpenAI (GPT-4o)   | Chat intelligence   |
| Orchestration | LangChain / LlamaIndex  | RAG pipelines       |
| Embeddings    | Azure OpenAI Embeddings | Semantic search     |
| Multi-agent   | AutoGen / CrewAI        | Workflow automation |
| ML Platform   | MLflow + Azure ML       | Model management    |

### Event Architecture (In Development)

| Component     | Technology   | Purpose                    |
| ------------- | ------------ | -------------------------- |
| Domain events | Apache Kafka | CDC + event streaming      |
| Service RPC   | RabbitMQ     | Synchronous service calls  |
| Job queues    | BullMQ       | Background jobs + cron     |
| CDC           | Debezium     | Zero-downtime DB migration |

### Infrastructure

| Component               | Technology               | Purpose                   |
| ----------------------- | ------------------------ | ------------------------- |
| Container orchestration | AKS (Kubernetes 1.33)    | Production deployment     |
| Infrastructure as Code  | Terraform (modular)      | Cloud provisioning        |
| Package management      | Helm charts              | Kubernetes deployments    |
| Container registry      | Azure Container Registry | Docker image storage      |
| Secrets management      | Azure Key Vault + CSI    | Production secrets        |
| Service mesh            | Istio (planned)          | mTLS + traffic management |

### Observability

| Component  | Technology               | Purpose                       |
| ---------- | ------------------------ | ----------------------------- |
| Metrics    | Prometheus + prom-client | Application + infra metrics   |
| Dashboards | Grafana (Golden Signals) | Visualization                 |
| Logs       | Loki + Promtail          | Log aggregation               |
| Alerts     | AlertManager → Slack     | Incident notification         |
| Tracing    | OpenTelemetry + Tempo    | Distributed tracing (planned) |
| Uptime     | Prometheus SLOs          | Availability tracking         |

### CI/CD Pipeline

| Component         | Technology                 | Purpose                   |
| ----------------- | -------------------------- | ------------------------- |
| Pipeline          | Azure DevOps (templatized) | Build + deploy automation |
| Security scanning | Trivy                      | CVE detection             |
| Image registry    | ACR                        | Artifact storage          |
| Deployment        | Helm + --atomic flag       | Zero-downtime deploys     |
| GitOps            | ArgoCD (in progress)       | Declarative deployments   |

---

## Production Infrastructure Details

### AKS Cluster Configuration

```
Cluster:     aks-chatterly-dev (Kubernetes 1.33)
Node pools:  2x Standard_DS2_v2 (app workloads)
Networking:  Azure CNI + nginx Ingress
Storage:     Azure managed-csi StorageClass
Registry:    acrchatterlydev.azurecr.io
```

### Security Posture

```
✅ Secrets: Azure Key Vault CSI driver (zero secrets in Git)
✅ Images: Trivy scanning with CRITICAL/HIGH gate
✅ Auth: Workload Identity (no static credentials)
✅ Network: NSG + nginx Ingress TLS termination
✅ RBAC: Namespace-scoped roles (in progress)
✅ Supply chain: .trivyignore with documented risk acceptance
```

### Monitoring Stack

```
✅ Prometheus: scraping app metrics every 15s
✅ Grafana: Golden Signals dashboard (Traffic, Latency, Errors, Saturation)
✅ Loki: pod log aggregation across all namespaces
✅ AlertManager: routing to Slack (PodCrashLooping, HighErrorRate, PVCAlmostFull)
✅ ServiceMonitor: auto-discovery of new services
```

### CI/CD Pipeline Stages

```
1. Install dependencies (npm ci + Prisma generate)
2. Build (Nx esbuild — single bundled index.cjs)
3. Docker build (multi-stage, minimal runtime image)
4. Trivy security scan (blocks on CRITICAL/HIGH with fix)
5. Push to ACR (with Build.BuildId immutable tag)
6. Helm deploy (--atomic --wait, auto-rollback on failure)
7. Health check verification
```

---

## Getting Started

### Prerequisites

```bash
node >= 20.x
docker >= 24.x
kubectl >= 1.28
helm >= 3.12
terraform >= 1.6
```

### Local Development

```bash
# Clone the repository
git clone https://github.com/usmankhandev/chatterly-app
cd chatterly-app

# Install dependencies
npm install

# Start local infrastructure
docker compose up -d

# Run database migrations
npx nx run api:migrate:dev

# Start the API
npx nx serve api
```

### Deploy to Kubernetes

```bash
# Provision Azure infrastructure
cd terraform/environments/dev
terraform init
terraform apply

# Deploy application via Helm
helm upgrade --install chatterly-dev ./k8s/chatterly \
  --namespace chatterly-dev \
  --create-namespace \
  -f k8s/chatterly/values-dev.yaml

# Verify deployment
kubectl get pods -n chatterly-dev
curl http://<INGRESS_IP>/health
```

### Deploy Monitoring Stack

```bash
# Install kube-prometheus-stack
helm install kube-prometheus-stack \
  prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace

# Install Loki
helm install loki grafana/loki \
  --namespace monitoring \
  --set loki.auth_enabled=false

# Install Promtail
helm install promtail grafana/promtail \
  --namespace monitoring
```

---

## Project Structure

```
chatterly-app/
├── apps/
│   ├── api/                    # Express.js backend (current)
│   │   ├── src/
│   │   │   ├── routes/         # Auth, posts, comments, notifications
│   │   │   ├── services/       # Business logic
│   │   │   ├── middleware/     # Auth, metrics, error handling
│   │   │   └── websocket/      # Socket.io real-time layer
│   │   ├── prisma/             # Database schema + migrations
│   │   └── Dockerfile          # Multi-stage, minimal runtime
│   ├── gateway/                # NestJS API gateway (in development)
│   └── websocket/              # NestJS WebSocket service (planned)
├── libs/
│   ├── observability/          # Shared Prometheus metrics library
│   └── nest-observability/     # NestJS metrics adapter (planned)
├── k8s/
│   └── chatterly/              # Helm chart
│       ├── templates/
│       │   ├── api/            # Deployment, Service, ServiceMonitor
│       │   ├── postgres/       # StatefulSet, PVC
│       │   ├── redis/          # Deployment, PVC
│       │   ├── ingress/        # nginx Ingress
│       │   └── monitoring/     # PrometheusRules, AlertmanagerConfig
│       ├── values.yaml         # Default values
│       ├── values-dev.yaml     # Development overrides
│       └── values-qa.yaml      # QA overrides
├── terraform/
│   ├── modules/
│   │   ├── aks/               # AKS cluster module
│   │   ├── acr/               # Container registry module
│   │   ├── keyvault/          # Key Vault + secrets module
│   │   └── networking/        # VNet, NSG, subnets module
│   └── environments/
│       └── dev/               # Dev environment composition
├── .azure-pipelines/
│   └── templates/
│       ├── stages/            # build-node.yml (reusable)
│       └── steps/             # install, build, trivy, push, deploy
├── azure-pipelines.yml        # Root pipeline (15 lines, extends template)
└── .trivyignore               # Documented CVE risk acceptance
```

---

## Roadmap

### Phase 1 — Production Hardening (Current)

- [x] AKS deployment with Terraform
- [x] Helm chart with multi-environment support
- [x] Templatized Azure DevOps CI/CD pipeline
- [x] Full observability stack (Prometheus, Grafana, Loki)
- [x] Security hardening (Key Vault, Trivy, RBAC)
- [ ] ArgoCD GitOps deployment
- [ ] Multiple namespaces (dev, qa, staging, prod)
- [ ] HPA + PodDisruptionBudgets
- [ ] Network Policies

### Phase 2 — AI Integration

- [ ] Azure OpenAI integration (GPT-4o)
- [ ] RAG pipeline (pgvector → Qdrant)
- [ ] Semantic search across conversations
- [ ] Message summarization
- [ ] Code analysis inline
- [ ] LiteLLM AI gateway

### Phase 3 — Microservices Migration

- [ ] NestJS auth-service (Strangler Fig)
- [ ] NestJS messaging-service
- [ ] Kafka event bus (CDC via Debezium)
- [ ] RabbitMQ service RPC
- [ ] BullMQ job queues
- [ ] CloudNativePG operator (replace StatefulSet)

### Phase 4 — Scale & Enterprise

- [ ] React frontend
- [ ] Multi-region deployment (Azure Front Door)
- [ ] Istio service mesh (mTLS)
- [ ] Thanos multi-cluster monitoring
- [ ] Chaos engineering (Chaos Mesh)
- [ ] SOC2 compliance hardening

---

## Key Engineering Decisions

| Decision        | Choice                          | Rationale                                                           |
| --------------- | ------------------------------- | ------------------------------------------------------------------- |
| Build tool      | esbuild (not tsc)               | Single bundled artifact, 4x faster, no runtime module resolution    |
| Monorepo        | Nx                              | Shared libs (observability), incremental builds, affected detection |
| Secrets         | Azure Key Vault CSI             | Zero secrets in Git, rotation without restart, audit trail          |
| Migrations      | Strangler Fig + Debezium        | Zero-downtime microservices migration via WAL-based CDC             |
| Messaging       | Kafka + RabbitMQ                | Kafka for domain events/CDC, RabbitMQ for synchronous RPC           |
| Deploy strategy | Helm --atomic                   | Auto-rollback on failure, no stuck partial deploys                  |
| CVE policy      | --ignore-unfixed + .trivyignore | Block actionable CVEs, document accepted risks                      |

---

## Real Production Incidents (Postmortem Bank)

These are real incidents from building Chatterly — each one is a debugged, documented learning:

| Incident                           | Root Cause                                            | Resolution                                                    |
| ---------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------- |
| `kubectl logs` returning 504       | NSG blocking kubelet port 10250                       | Added inbound NSG rule for AKS required ports                 |
| CoreDNS `bad address postgres-svc` | Same NSG blocking VNet DNS (port 53)                  | Allowed VNet-internal traffic before deny-internet rule       |
| Postgres CrashLoopBackOff          | CSI disk mounts to root, `lost+found` blocking initdb | Set `PGDATA=/var/lib/postgresql/data/pgdata` subdirectory     |
| ACR ImagePullBackOff               | Kubelet identity missing AcrPull role                 | Assigned AcrPull to kubelet managed identity                  |
| Prisma enums undefined at runtime  | Dockerfile copied un-generated Prisma client          | Copy node_modules from builder stage (post prisma generate)   |
| esbuild MODULE_NOT_FOUND           | @nx/webpack/plugin shadowing build target             | Removed webpack plugin from nx.json plugins array             |
| Trivy blocking pipeline            | node:20-alpine libssl3 CVEs                           | Documented in .trivyignore with risk acceptance + review date |

---

## Contributing

Chatterly is currently in active development by a solo founder. Contributions, feedback, and architectural suggestions are welcome.

```bash
# Fork and clone
git clone https://github.com/usmankhandev/chatterly-app

# Create feature branch
git checkout -b feature/your-feature

# Make changes and test
npx nx affected --target=build
npx nx affected --target=test

# Submit PR against development branch
```

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## About the Builder

Built by **Muhammad Usman Pervaiz Khan** — Senior DevOps Engineer with 6 years of experience in backend engineering and cloud infrastructure. Chatterly is both a real product and a living portfolio demonstrating production-grade DevOps, Kubernetes, and AI platform engineering.

- GitHub: [@usmankhandev](https://github.com/usmankhandev)
- Email: chatterly.app@outlook.com
- Location: Lahore, Pakistan

---

_Chatterly — Because your team's knowledge shouldn't live in someone else's cloud._
