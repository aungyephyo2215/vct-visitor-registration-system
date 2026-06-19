<!-- ch-3 personal-project report. Copy this file to ch-3/<your-github-username>/report.md -->

# ch-3 Personal Project — Report

github_username: aungyephyo2215
personal_repo_url: https://github.com/aungyephyo2215/vct-visitor-registration-system
project_summary: Visitor Registration System — QR-based digital visitor management for condos, apartments, offices, and warehouses with JWT auth, 5-role RBAC, QR check-in/out, invitation/approval workflow, notification bell, and 180 automated tests.
slides_url: https://github.com/aungyephyo2215/vct-visitor-registration-system/blob/main/slides/ch3-pechakucha-20x20.md
slides_url: https://github.com/aungyephyo2215/vct-visitor-registration-system/blob/main/slides/ch3-pechakucha-6x20.md

## Methodology

<!-- How you worked: project-based approach + your git workflow (commit as you build). 2-4 sentences. -->

I followed spec-driven development documented in `.claude/methodology.md` — 10 core principles with the rule "Never Code First." Every feature went through Requirements → Architecture → Database → API → UI before any code was written. I committed incrementally across 30 commits on `main`, each a self-contained logical step. Three semantic-version releases (v1.0.0 → v1.1.0 → v1.2.0) each have full GitHub Release notes. Claude Code agents, subagents, MCP servers, and multi-agent workflows were used at every phase — architecture review, database validation, implementation, testing, and release management.

## Evidence — Claude Code usage

<!-- List the ACTUAL paths in your personal repo. The validator checks these exist. -->

### MCP

- path: .mcp.json
- what: Five MCP servers — **Context7** (`@upstash/context7-mcp`) for real-time library documentation lookup, **Playwright** (`@playwright/mcp`) for browser automation and E2E testing, **Sequential Thinking** (`@modelcontextprotocol/server-sequential-thinking`) for complex problem decomposition, **GitHub** (`ghcr.io/github/github-mcp-server`) for repository management and releases, and **PostgreSQL** (`@modelcontextprotocol/server-postgres`) for direct database introspection. Database credentials use `${DATABASE_URL}` env expansion — no secrets in the file.

### Skill

- path: .claude/skills/database-design/SKILL.md
- what: Defines PostgreSQL + Prisma design rules — UUID primary keys, multi-tenancy with `property_id` on every table, soft delete via `deleted_at`, composite indexes on query patterns, foreign key constraints. Used to enforce schema consistency across 14 models and 16 enums in the Visitor Registration System.

### Agent

- path: .claude/agents/software-architect.md
- what: Senior Software Architect responsible for system architecture review, database design validation, security review, and scalability assessment. Enforces the "design before code" principle — reviews architecture before any feature implementation begins.

### Subagent

- path: .claude/subagents/devops-engineer.md
- what: Senior DevOps Engineer responsible for Docker, CI/CD pipelines, GitHub Actions, environment management, and production readiness reviews. Audited the development environment and integrated Prettier, Husky, lint-staged, Vitest, and the `cache: "no-store"` fix for browser fetch caching.

### Workflow

- path: .claude/workflows/audit-project.js
- what: Multi-agent orchestration script that runs a code quality audit across the entire project — dispatches parallel agents for security review, database review, and architecture review dimensions, then synthesizes findings into a consolidated report with pass/fail verdicts.
