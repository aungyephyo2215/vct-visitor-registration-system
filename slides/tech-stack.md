---
marp: true
theme: uncover
paginate: true
auto-scaling: true
size: 16:9
---

<!-- _class: lead -->

# 🏢 Visitor Registration System

## Tech Stack & AI-Powered Development

### Chapter 5 — How It's Built

---

## 🛠️ Tech Stack

| Layer        | Technology                                                        |
| ------------ | ----------------------------------------------------------------- |
| **Frontend** | Next.js 16 · React 19 · TypeScript 5 · Tailwind CSS 4 · shadcn/ui |
| **Backend**  | Next.js Route Handlers · Server Actions                           |
| **Database** | PostgreSQL 16 · Prisma 7 ORM                                      |
| **Auth**     | JWT (jose) · bcryptjs · Refresh Token Rotation                    |
| **QR**       | qrcode · html5-qrcode (camera scanner)                            |
| **Email**    | Nodemailer                                                        |
| **Testing**  | Vitest (264 unit) · Playwright (~50 E2E)                          |
| **DevOps**   | Docker Compose · GitHub Actions · Vercel                          |
| **Language** | TypeScript (strict mode)                                          |

---

## 🤖 Claude Agents

Five specialized agents in `.claude/agents/`:

| Agent                  | Role                                                                    |
| ---------------------- | ----------------------------------------------------------------------- |
| **software-architect** | System architecture review, database design validation, security review |
| **backend-agent**      | Senior Backend Engineer — API, auth, database logic                     |
| **frontend-agent**     | Senior Frontend Engineer — UI components, pages, hooks                  |
| **ui-ux-agent**        | Senior UI/UX Designer — layout, design system, responsiveness           |
| **product-manager**    | Product Manager — requirements, workflow, feature prioritization        |

Each agent is invoked by Claude Code when the task matches its domain.

---

## 🧩 Claude Skills

18 skills in `.claude/skills/`:

**Custom Skills (10):**

| Skill                | Purpose                                    |
| -------------------- | ------------------------------------------ |
| database-design      | PostgreSQL + Prisma schema rules           |
| prisma-best-practice | Prisma migration and query patterns        |
| qr-workflow          | QR generation, check-in/out, gate workflow |
| security-review      | Auth, RBAC, vulnerability review           |
| testing              | Unit + E2E test strategy                   |
| ui-dashboard         | Dashboard UI patterns                      |
| docker-production    | Production Docker setup                    |
| github-actions       | CI/CD pipeline creation                    |

**Spec Kit Skills (8):** specify, plan, tasks, implement, analyze, clarify, constitution, checklist

---

## 🧩 Claude Skills — Trigger & Command

| Skill           | Trigger                                   | Command                            |
| --------------- | ----------------------------------------- | ---------------------------------- |
| database-design | When designing or modifying Prisma schema | Referenced automatically by Claude |
| qr-workflow     | When building QR check-in/out features    | Referenced automatically by Claude |
| security-review | Before deployment or after auth changes   | `/review-security`                 |
| testing         | When writing unit or E2E tests            | Referenced automatically by Claude |
| ui-dashboard    | When building dashboard pages             | Referenced automatically by Claude |

Skills activate based on context — Claude matches the task to the relevant skill.

---

## 🔧 Claude Commands

Four review commands in `.claude/commands/`:

| Command                | What It Does                                                 |
| ---------------------- | ------------------------------------------------------------ |
| `/review-architecture` | Reviews system architecture for scalability and consistency  |
| `/review-database`     | Reviews Prisma schema, migrations, and query patterns        |
| `/review-security`     | Reviews auth, RBAC, input validation, and vulnerabilities    |
| `/review-ui`           | Reviews UI components, accessibility, and design consistency |

---

## 🔌 MCP Servers

Five MCP servers in `.mcp.json`:

| Server                  | Package                                            | Purpose                                |
| ----------------------- | -------------------------------------------------- | -------------------------------------- |
| **Context7**            | `@upstash/context7-mcp`                            | Real-time library documentation lookup |
| **Playwright**          | `@playwright/mcp`                                  | Browser automation and E2E testing     |
| **Sequential Thinking** | `@modelcontextprotocol/server-sequential-thinking` | Complex problem decomposition          |
| **GitHub**              | `ghcr.io/github/github-mcp-server`                 | Repository management and releases     |
| **PostgreSQL**          | `@modelcontextprotocol/server-postgres`            | Direct database introspection          |

---

## 🔄 Development Methodology

**Spec-Driven Development — "Never Code First"**

```
Requirements → Architecture → Database → API → UI → Code → Test → Docker → Deploy
```

**10 Core Principles:**

1. Never Code First
2. Design Before Implementation
3. Review Before Coding
4. Database First (PostgreSQL + Prisma)
5. API First (document before build)
6. Security First (JWT, RBAC, audit)
7. Testing Strategy (unit + E2E)
8. Docker First (production-ready)
9. CI/CD (GitHub Actions)
10. AI Features Last

---

## ⚡ Development Workflow

```
git commit → GitHub Actions CI → lint → type-check → unit tests → build
```

**Per-feature workflow:**

1. Spec written in markdown
2. Architecture reviewed by software-architect agent
3. Database migration created
4. API implemented with validation
5. UI built with shadcn/ui components
6. Tests added (unit + E2E)
7. Security review via /review-security
8. Docker tested locally
9. Deployed to Vercel

---

## 📋 Useful Commands

| Command                     | Purpose                     |
| --------------------------- | --------------------------- |
| `npm run dev`               | Start development server    |
| `npm test`                  | Run 264 unit tests (Vitest) |
| `npx playwright test`       | Run ~50 E2E tests           |
| `npm run check`             | TypeScript + ESLint         |
| `npm run build`             | Production build            |
| `docker compose up --build` | Full Docker deployment      |
| `npx prisma migrate dev`    | Create database migration   |
| `npx prisma db seed`        | Seed database               |
| `npx prisma studio`         | Open Prisma Studio          |
| `/review-security`          | Security review command     |

---

<!-- _class: lead -->

# ✅ Summary

| Category               | Count |
| ---------------------- | ----- |
| Tech stack layers      | 9     |
| Claude Agents          | 5     |
| Claude Skills          | 18    |
| Claude Commands        | 4     |
| MCP Servers            | 5     |
| Methodology principles | 10    |
| Unit tests             | 264   |
| E2E tests              | ~50   |

**Built entirely with Claude Code AI-powered development.**
