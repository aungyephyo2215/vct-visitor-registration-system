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

### AI-Powered with Claude Code

---

## 🔍 Problem → 🎯 Solution

**Problem:** Paper visitor logs are slow, insecure, unsearchable. No real-time host notification. Zero audit trail.

**Solution:** A web-based VRS with visitor registration, QR check-in/check-out, role-based access control, notification system, and audit logging.

---

## 🧠 Claude Code AI Workflow

```text
Product Manager Agent → Architect Agent
        ↓                      ↓
  Requirements          System Design
        ↓                      ↓
 Database Review ← Prisma Reviewer
        ↓
 API Review ← API Reviewer
        ↓
 Feature Code ← Backend + Frontend Agents
        ↓
 Testing ← Software Tester + Playwright MCP
        ↓
 Release ← Release Manager + GitHub MCP
```

---

## 🔧 MCP, Skills & Agents

**5 MCP Servers:** Context7, Playwright, Sequential Thinking, GitHub, PostgreSQL

**18 Skills:** database-design, qr-workflow, security-review, testing, docker-production, speckit-\* suite

**5 Agents:** Product Manager, Software Architect, Backend, Frontend, UI/UX

**6 Subagents:** API Reviewer, DevOps Engineer, Prisma Reviewer, Release Manager, Software Tester, Document Writer

**5 Workflows:** audit, generate-release-notes, review-code, run-tests, verify-phase

---

## 🏗️ Architecture & Security

```text
Browser → Next.js 16 (Route Handlers)
       ├── JWT Auth (jose) + 5 RBAC Roles
       ├── Visitor/Visit/Invitation/QR Modules
       ├── Notification: Bell + 7 Event Types
       └── Prisma 7 → PostgreSQL 16
```

14 Models, 16 Enums, Full Indexes, Multi-Tenancy

---

## 🔔 Notification Module (v1.2.0)

- 7 event types across full invitation + visit lifecycle
- Bell icon with real-time unread badge + 30s polling
- 4-file library: templates → builder → recipients → service
- Fire-and-forget design: notification failure never blocks parent operation
- Server-truth re-fetch: no optimistic UI guess

---

## 🧪 Quality Gates

```text
npm ci → lint → type check → unit tests → build
                          ↓
              PLAYWRIGHT=true → 33 E2E tests
```

| Suite            | Tests    | Status |
| :--------------- | -------- | :----- |
| Unit (Vitest)    | 147      | ✅     |
| E2E (Playwright) | 33       | ✅     |
| TypeScript       | 0 errors | ✅     |
| npm audit        | 0 vulns  | ✅     |

---

## 📦 Git Releases & Methodology

```text
v1.0.0 (Jun 16) → v1.1.0 (Jun 17) → v1.2.0 (Jun 18)
```

**Methodology:** Requirements → Architecture → Database → API → UI → Code → Test → Docker → CI/CD → Release

**Rule:** Never code first. Design before implementation. Every feature: architecture review, security review, automated tests, Docker ready.

---

<!-- _class: lead -->

## 🙏 Thank You

Visitor Registration System v1.2.0

🔗 github.com/aungyephyo2215/vct-visitor-registration-system

Built with ❤️ using Claude Code AI
