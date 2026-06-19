export const meta = {
  name: "verify-phase",
  description: "Verify a development phase is complete: tests, build, migrations, docs, security",
  phases: [
    { title: "Check", detail: "Parallel checks: build, tests, lint, migrations, docs, security" },
    { title: "Report", detail: "Synthesize pass/fail report with actionable fixes" },
  ],
};

const phaseName = typeof args === "object" && args?.phase ? args.phase : "current";

// ── Phase 1: Parallel checks ────────────────────────────────
phase("Check");

const CHECKS = [
  {
    key: "build",
    label: "Build",
    prompt: `Run "npm run build" in this project and report the result.
Check: Does the production build pass? Any TypeScript errors? Any warnings?
Return: pass/fail, any errors found, warnings to address.`,
  },
  {
    key: "tests",
    label: "E2E Tests",
    prompt: `Run Playwright E2E tests in this project.
Check: Do all tests pass? Any flaky tests? Any skipped tests?
Look at the test files in tests/e2e/ and report on coverage and reliability.
Return: pass/fail, test counts (pass/fail/skip), any failures with details.`,
  },
  {
    key: "lint",
    label: "Lint",
    prompt: `Check for linting issues in this project.
Review eslint.config.mjs, check for any lint warnings or errors in source files.
Return: pass/fail, any lint issues found, severity breakdown.`,
  },
  {
    key: "migrations",
    label: "Migrations",
    prompt: `Verify database migrations are in good shape.
Check: Are all migrations applied? Is prisma/schema.prisma consistent with migration history?
Any drift between schema and migrations? Any missing indexes?
Return: pass/fail, any migration issues, recommendations.`,
  },
  {
    key: "docs",
    label: "Documentation",
    prompt: `Verify documentation is up to date for the ${phaseName} development phase.
Check: CLAUDE.md phase status, docs/releases/ for this version, README.md,
architecture docs, API spec coverage.
Return: pass/fail, outdated docs, missing docs, documentation gaps.`,
  },
  {
    key: "security",
    label: "Security",
    prompt: `Quick security scan for the ${phaseName} phase.
Check: Any hardcoded secrets, exposed .env files in git, cookies.txt in repo,
unvalidated API inputs, missing auth on new routes, new dependencies with known CVEs.
Return: pass/fail, any security issues found, severity.`,
  },
];

const results = await parallel(
  CHECKS.map(
    (c) => () =>
      agent(c.prompt, {
        label: c.label,
        phase: "Check",
        schema: {
          type: "object",
          properties: {
            check: { type: "string" },
            passed: { type: "boolean" },
            errors: { type: "array", items: { type: "string" } },
            warnings: { type: "array", items: { type: "string" } },
            details: { type: "string" },
          },
          required: ["check", "passed", "details"],
        },
      }),
  ),
);

const checkResults = [];
for (let i = 0; i < CHECKS.length; i++) {
  const r = results[i];
  checkResults.push({
    key: CHECKS[i].key,
    label: CHECKS[i].label,
    passed: r?.passed ?? false,
    errors: r?.errors || [],
    warnings: r?.warnings || [],
    details: r?.details || "No results returned",
  });
}

const passed = checkResults.filter((c) => c.passed).length;
const failed = checkResults.filter((c) => !c.passed).length;
const totalErrors = checkResults.reduce((s, c) => s + c.errors.length, 0);

log(`${passed}/${CHECKS.length} checks passed · ${totalErrors} errors · ${failed} failing`);

// ── Phase 2: Synthesize report ──────────────────────────────
phase("Report");

const report = await agent(
  `Synthesize a phase verification report for "${phaseName}".

Passed (${passed}/${CHECKS.length}):
${checkResults
  .filter((c) => c.passed)
  .map((c) => `✅ ${c.label}: ${c.details}`)
  .join("\n")}

Failed (${failed}/${CHECKS.length}):
${
  checkResults
    .filter((c) => !c.passed)
    .map((c) => `❌ ${c.label}: ${c.errors.join("; ")}`)
    .join("\n") || "(none)"
}

Warnings:
${
  checkResults
    .filter((c) => c.warnings.length > 0)
    .map((c) => `⚠️ ${c.label}: ${c.warnings.join("; ")}`)
    .join("\n") || "(none)"
}

Write a concise phase gate report:
1. Overall verdict: READY / NOT READY with brief explanation
2. Blocking issues (must fix before proceeding)
3. Non-blocking recommendations
4. Confidence level (HIGH/MEDIUM/LOW)

Return JSON.`,
  {
    label: "phase-report",
    phase: "Report",
    schema: {
      type: "object",
      properties: {
        verdict: { type: "string", enum: ["READY", "NOT READY"] },
        explanation: { type: "string" },
        blocking: { type: "array", items: { type: "string" } },
        recommendations: { type: "array", items: { type: "string" } },
        confidence: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
      },
      required: ["verdict", "explanation", "confidence"],
    },
  },
);

return {
  phase: phaseName,
  report,
  checks: checkResults,
  summary: `${passed}/${CHECKS.length} passed · ${failed} failed · ${totalErrors} errors`,
  verdict: report.verdict,
  passed: report.verdict === "READY",
};
