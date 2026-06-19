export const meta = {
  name: "audit-project",
  description: "Multi-dimension audit with adversarial verification and synthesized report",
  phases: [
    {
      title: "Audit",
      detail: "6 parallel audit agents (security, architecture, DB, code, UI, tests)",
    },
    { title: "Verify", detail: "Adversarial verification of CRITICAL/HIGH findings" },
    { title: "Synthesize", detail: "Merge verified findings into executive report" },
  ],
};
// ── Dimensions & prompts ────────────────────────────────────
const FINDING_SCHEMA = {
  type: "object",
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
          file: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          fix: { type: "string" },
        },
        required: ["severity", "title", "description", "fix"],
      },
    },
  },
  required: ["findings"],
};

const VERDICT_SCHEMA = {
  type: "object",
  properties: {
    isReal: { type: "boolean" },
    adjustedSeverity: { type: "string", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
    explanation: { type: "string" },
  },
  required: ["isReal", "adjustedSeverity", "explanation"],
};

const DIMS = [
  {
    key: "security",
    label: "Security",
    prompt: `Act as Senior Security Engineer. Audit this project:
- JWT auth, RBAC, rate limiting, QR replay protection
- SQL injection, XSS, input validation, secrets exposure
- Audit log completeness, multi-tenant isolation
Return findings JSON.`,
  },
  {
    key: "architecture",
    label: "Architecture",
    prompt: `Act as Senior Software Architect. Audit this project:
- system-architecture.md alignment, multi-tenancy design
- API route structure, separation of concerns
- Docker production readiness, error handling, middleware
Return findings JSON.`,
  },
  {
    key: "database",
    label: "Database",
    prompt: `Act as Senior Database Architect. Audit this project:
- Indexing strategy, FK relationships, multi-tenant property_id
- Soft delete consistency, enum usage, migration history
- N+1 query risks in route handlers, seed data completeness
Return findings JSON.`,
  },
  {
    key: "code",
    label: "Code Quality",
    prompt: `Act as Senior Backend Engineer. Audit code quality:
- TypeScript strictness, error handling, DRY violations
- Dead code, missing validation, inconsistent naming
- API response consistency, server vs client component usage
Return findings JSON.`,
  },
  {
    key: "frontend",
    label: "Frontend",
    prompt: `Act as Senior Frontend Engineer. Audit the frontend:
- Component reusability, a11y, responsive design
- Loading/error/empty states, form validation UX
- Suspense boundaries, shadcn/ui usage, bundle concerns
Return findings JSON.`,
  },
  {
    key: "tests",
    label: "Testing",
    prompt: `Act as Senior QA Engineer. Audit the test suite:
- Coverage gaps, missing scenarios, flaky test patterns
- RBAC test completeness, invitation/QR workflow coverage
- Edge cases, test helper quality
Return findings JSON.`,
  },
];

// ── Phase 1: Parallel audit ─────────────────────────────────
phase("Audit");
const auditResults = await parallel(
  DIMS.map(
    (d) => () => agent(d.prompt, { label: d.label, phase: "Audit", schema: FINDING_SCHEMA }),
  ),
);

// Tag each finding with its source dimension (parallel preserves order)
const allFindings = [];
for (let i = 0; i < DIMS.length; i++) {
  const result = auditResults[i];
  if (result?.findings?.length) {
    for (const f of result.findings) {
      allFindings.push({ ...f, dimension: DIMS[i].key });
    }
  }
}
log(`${allFindings.length} findings across ${DIMS.length} dimensions`);

if (allFindings.length === 0) {
  return {
    summary: { summary: "No issues found.", topActionItems: [], healthRating: 9 },
    findings: [],
    refuted: [],
    dimensions: DIMS.map((d) => d.key),
    verifiedCount: 0,
    refutedCount: 0,
  };
}

// ── Phase 2: Adversarial verify (CRITICAL + HIGH only) ─────
phase("Verify");
const toVerify = allFindings.filter((f) => f.severity === "CRITICAL" || f.severity === "HIGH");

const verified =
  toVerify.length > 0
    ? await parallel(
        toVerify.map(
          (f) => () =>
            agent(
              `Adversarially verify this finding. Try to REFUTE it.

[${f.severity}] ${f.title}
File: ${f.file || "N/A"}
${f.description}
Proposed fix: ${f.fix}

Is the file/pattern actually present? Is the severity justified? Would the fix help?
If WRONG or OVERSTATED, mark refuted=true.
Return JSON.`,
              { label: `verify:${f.title.slice(0, 30)}`, phase: "Verify", schema: VERDICT_SCHEMA },
            ).then((v) => ({ ...f, verdict: v })),
        ),
      )
    : [];

const confirmed = verified
  .filter(Boolean)
  .filter((f) => f.verdict?.isReal)
  .map((f) => ({ ...f, severity: f.verdict.adjustedSeverity || f.severity }));
const refuted = verified.filter(Boolean).filter((f) => !f.verdict?.isReal);
const mediumLow = allFindings.filter((f) => f.severity !== "CRITICAL" && f.severity !== "HIGH");

log(`${confirmed.length} confirmed · ${refuted.length} refuted · ${mediumLow.length} medium/low`);

// ── Phase 3: Synthesize ────────────────────────────────────
phase("Synthesize");
const final = [...confirmed, ...mediumLow].sort((a, b) => {
  const o = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  return o[a.severity] - o[b.severity];
});
const crit = final.filter((f) => f.severity === "CRITICAL").length;
const high = final.filter((f) => f.severity === "HIGH").length;
const med = final.filter((f) => f.severity === "MEDIUM").length;
const low = final.filter((f) => f.severity === "LOW").length;

const top5 = final
  .slice(0, 5)
  .map((f, i) => `${i + 1}. [${f.severity}] ${f.title} — ${f.file || "N/A"}`)
  .join("\n");

const summary = await agent(
  `Write an executive summary (max 300 words) for this project audit:

Critical: ${crit} · High: ${high} · Medium: ${med} · Low: ${low} · Refuted: ${refuted.length}

Top findings:
${top5}

Cover: overall health, critical issues to fix immediately, top 3 recommendations, what's working well.
Return JSON.`,
  {
    label: "exec-summary",
    phase: "Synthesize",
    schema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        topActionItems: { type: "array", items: { type: "string" } },
        healthRating: { type: "number", minimum: 1, maximum: 10 },
      },
      required: ["summary", "topActionItems", "healthRating"],
    },
  },
);

return {
  summary,
  findings: final,
  refuted,
  dimensions: DIMS.map((d) => d.key),
  verifiedCount: final.length,
  refutedCount: refuted.length,
};
