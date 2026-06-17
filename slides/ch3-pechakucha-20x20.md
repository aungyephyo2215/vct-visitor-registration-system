---
marp: true
theme: uncover
paginate: true
auto-scaling: true
size: 16:9
---

<!-- _class: lead -->

# 🏢 Visitor Registration System

## QR-Based Digital Visitor Management

### Claude Code AI-Powered Development

---

## 🔍 The Problem

- Paper visitor logs are **slow, insecure, and unsearchable**
- No real-time host notification when visitors arrive
- Zero audit trail for security incidents
- Condos, apartments, offices, and warehouses all face the same challenge

---

## 🎯 The Solution

A **web-based Visitor Registration System** with:

- 👤 Visitor & Visit Management
- 🔲 Secure QR Code Generation
- ✅ QR Check-In / Check-Out
- 🛡️ Role-Based Access Control (5 roles)
- 🔔 Real-time Notification System
- 📊 Dashboard & Audit Logging
- 🏢 Multi-Property Support

---

## 🧠 Claude Code AI Workflow

| Phase           | Tool                      |
| :-------------- | :------------------------ |
| Requirements    | Product Manager Agent     |
| Architecture    | Software Architect Agent  |
| Database Design | Prisma Reviewer Subagent  |
| API Design      | API Reviewer Subagent     |
| Implementation  | Backend + Frontend Agents |
| Testing         | Software Tester Subagent  |
| DevOps          | DevOps Engineer Subagent  |
| Release         | Release Manager Subagent  |

---

## 🔧 MCP Infrastructure

**5 MCP Servers configured:**

- **Context7** — Real-time library documentation
- **Playwright** — Browser automation & E2E
- **Sequential Thinking** — Complex problem solving
- **GitHub** — Repository management
- **PostgreSQL** — Direct database introspection

---

## 🤖 Skills & Agents

**18 Skills** in `.claude/skills/`:

- `database-design`, `qr-workflow`, `testing`
- `security-review`, `docker-production`, `github-actions`
- `prisma-best-practice`, `ui-dashboard`, `speckit-*` suite

**5 Agents** in `.claude/agents/`:

- Product Manager, Software Architect
- Backend Developer, Frontend Developer
- UI/UX Designer

---

## 🔄 Multi-Agent Workflows

**6 Workflows** in `.claude/workflows/`:

```text
audit-project.js         — Code quality audit
generate-release-notes.js — Automated changelogs
review-code.js           — Multi-agent code review
run-tests.js             — Parallel test execution
verify-phase.js          — Phase completion check
```

---

## 💻 Tech Stack

| Layer    | Technology                       |
| :------- | :------------------------------- |
| Frontend | Next.js 16, React 19, TypeScript |
| Styling  | Tailwind CSS 4, shadcn/ui        |
| Backend  | Next.js Route Handlers           |
| Database | PostgreSQL 16, Prisma 7          |
| Auth     | JWT (jose), bcryptjs             |
| Testing  | Vitest (147) + Playwright (33)   |
| DevOps   | Docker Compose, GitHub Actions   |

---

## 🏗️ System Architecture

```text
Browser → Next.js App
            ├── Authentication (JWT + RBAC)
            ├── Visitor Module
            ├── Visit Module
            ├── Invitation + Approval
            ├── QR Service (SHA-256 hashing)
            ├── Badge Service
            ├── Notification Service
            └── 14 Models / 16 Enums
```

---

## 🔐 Security Architecture

- **JWT Authentication** with refresh tokens
- **RBAC** — 5 roles, property-level data isolation
- **Rate Limiting** — In-memory with test-mode bypass
- **Audit Logs** — 20+ event types
- **QR Replay Protection** — Single-use tokens
- **Soft Delete** — All user-facing data

---

## 🔳 QR Workflow

```text
Invitation → Approval → QR Generate → Email QR
                                          ↓
                                    Visitor Arrives
                                          ↓
                              Security Scan & Verify
                                          ↓
                                    Check-In / Check-Out
                                          ↓
                                     Audit Log
```

---

## 🔔 Notification Module (v1.2.0)

- 📬 **7 Event Types** across full lifecycle
- 🔔 **Bell Icon** with real-time unread badge
- 📋 **Dropdown List** with relative timestamps
- ✅ **Mark Read / Mark All Read** with server verification
- 🧩 **4-File Library** — templates, builder, recipients, service

---

## 📊 Database Design

**14 Models, 16 Enums, Full Index Coverage**

- `Property` → `Unit` → `User`
- `Visitor` → `Visit` → `QRCode`
- `Invitation` → `Approval` → `Badge`
- `Verification` → `AuditLog` → `Blocklist`
- `Notification` (v1.2.0)

**Multi-tenancy:** Every table scoped by `property_id`

---

## 🐳 Docker Architecture

```yaml
services:
  postgres: # PostgreSQL 16 Alpine
    - Healthcheck: pg_isready
    - Named volume: vrs_postgres_data
  app: # Next.js (standalone output)
    - Multi-stage build
    - Non-root user (nextjs:nodejs)
    - Depends on postgres (healthy)
```

`docker compose up --build -d` → Production ready

---

## 🧪 Testing Strategy

| Suite                      | Count   | Status      |
| :------------------------- | ------- | :---------- |
| Unit Tests (Vitest)        | **147** | ✅ All Pass |
| E2E Smoke                  | 8       | ✅ All Pass |
| E2E Invitation             | 6       | ✅ All Pass |
| E2E Notification           | 8       | ✅ All Pass |
| E2E RBAC                   | 5       | ✅ All Pass |
| **Total E2E (Playwright)** | **33**  | ✅ All Pass |

`npm ci → lint → type check → unit tests → build`

---

## 📦 Git Releases

| Version | Date         | Key Feature                    |
| :------ | :----------- | :----------------------------- |
| v1.0.0  | Jun 16, 2026 | Core MVP                       |
| v1.1.0  | Jun 17, 2026 | Invitation & Approval Workflow |
| v1.2.0  | Jun 18, 2026 | Notification Module            |

**30 commits** on `main`, semantic versioning, GitHub Releases with full notes

---

## 📈 Development Methodology

```text
Requirements → Architecture → Database → API → UI
                                                  ↓
                                            Code + Test
                                                  ↓
                                     Docker + CI/CD + Deploy
```

Rule: Never code first. Design before implementation.

---

## 🗺️ Roadmap

| Phase | Feature                          | Status      |
| :---- | :------------------------------- | :---------- |
| 1-6   | Core + Invitation + Notification | ✅ Complete |
| 6.5   | QR Email Delivery                | 📋 Planned  |
| 7     | Self-Kiosk, Mobile QR Scanner    | 🔜 Upcoming |
| 8     | AI Analytics, Suspicious Alerts  | 🔜 Upcoming |

---

<!-- _class: lead -->

## 🙏 Thank You

Visitor Registration System v1.2.0

🔗 github.com/aungyephyo2215/vct-visitor-registration-system

Built with ❤️ using Claude Code AI
