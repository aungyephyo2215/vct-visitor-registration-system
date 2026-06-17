---
marp: true
theme: uncover
paginate: true
auto-scaling: true
size: 16:9
---

<!-- _class: lead -->
<!-- 20s -->

# 🏢 Visitor Registration System

## QR-Based Digital Visitor Management

### AI-Powered Development with Claude Code

> 🎤 _"Hi, I'm Aung. I built a visitor registration system that replaces paper logs with QR codes — entirely with Claude Code AI. Here's the story."_

---

<!-- 20s -->

## 🔍 Problem → 🎯 Solution

**Problem:** Paper logs. No audit trail. No host notifications. Slow security checks. Four property types share the same challenge.

**Solution:** Web-based VRS — QR check-in/out with cryptographic tokens, 5-role RBAC, real-time notification bell, blocklist validation, and complete audit logging.

![bg right 30%](./docs/screenshots/dashboard.png)

> 🎤 _"Every condo, office, and warehouse uses clipboards at the front desk. Our system replaces that with a QR code scan — instant blocklist check, identity verification, host notification, all in seconds."_

---

<!-- 20s -->

## 🧠 Claude Code AI Workflow

```text
Product Manager → Architect → Prisma Reviewer → API Reviewer
      ↓               ↓               ↓               ↓
Requirements    System Design    Database Review    API Design
      ↓               ↓               ↓               ↓
Backend + Frontend Agents → Software Tester → Release Manager
```

**5 MCP Servers · 18 Skills · 5 Agents · 6 Subagents · 5 Workflows**

> 🎤 _"Every phase used a dedicated AI agent with real tools. MCP gives Claude a browser, database access, and GitHub. Skills encode our project rules — database design standards, QR security, testing strategy. Workflows run multiple agents in parallel for code review and testing."_

---

<!-- 20s -->

## 🏗️ Architecture & Security

```text
Browser → Next.js 16 → JWT + 5-Role RBAC
                    → Visitor / Visit / Invitation / QR Modules
                    → Notification Bell + 7 Event Types
                    → Prisma 7 → PostgreSQL 16
```

**14 Models · 16 Enums · Full Indexes · Multi-Tenancy**

**Notification Module:** 4-file library · Fire-and-forget · Server-truth re-fetch

**Security:** JWT with refresh tokens · Rate limiting · QR replay protection · 20+ audit event types · Property-level data isolation

![bg right 35%](./docs/screenshots/notification-bell.png)

> 🎤 _"Next.js modular monolith. Five roles scoped by property_id. The notification module is a 4-file library with fire-and-forget design — failures never block parent operations. QR tokens are cryptographically random, SHA-256 hashed, single-use with expiry."_

---

<!-- 20s -->

## 🧪 Quality Gates & Releases

```text
npm ci → lint → type check → 147 unit tests → build → 33 E2E tests
```

| Suite               | Tests    | Result     |
| :------------------ | -------- | :--------- |
| Unit (Vitest)       | 147      | ✅ Passing |
| E2E (Playwright)    | 33       | ✅ Passing |
| TypeScript + ESLint | 0 errors | ✅ Clean   |
| npm audit           | 0 vulns  | ✅ Clean   |

**v1.0.0 → v1.1.0 → v1.2.0** · 30 commits · Semantic versioning · Docker ready

> 🎤 _"Every commit passes CI: lint, type check, 147 unit tests, build. 33 Playwright E2E tests cover the full workflow — smoke, invitation, notification, RBAC. Three releases in three days with full GitHub Release notes. One command to deploy: docker compose up."_

---

<!-- _class: lead -->
<!-- 20s -->

## 🙏 Thank You

**🔗 [github.com/aungyephyo2215/vct-visitor-registration-system](https://github.com/aungyephyo2215/vct-visitor-registration-system)**

📊 **180 Tests** · 🐳 **Docker Ready** · 🔐 **5-Role RBAC**

Built with ❤️ using Claude Code AI

> 🎤 _"The repo is public with full documentation, screenshots, and a one-command Docker deployment. I'm happy to take questions. Thank you."_
