export const meta = {
  name: "run-tests",
  description:
    "Run all quality checks in parallel: build, lint, typecheck, E2E tests, then synthesize results",
  phases: [
    { title: "Run", detail: "Parallel: build, lint, typecheck, E2E tests" },
    { title: "Report", detail: "Synthesize pass/fail report across all suites" },
  ],
};

const suite = typeof args === "object" && args?.suite ? args.suite : "all";

// ── Phase 1: Run all checks in parallel ─────────────────────
phase("Run");

const CHECKS = [
  {
    key: "build",
    label: "npm run build",
    prompt: `Run "npm run build" in this project.
Report: exit code, any errors, any warnings, build duration.
If it fails, capture the exact error messages.
Return JSON with pass/fail, output summary, and any actionable errors.`,
  },
  {
    key: "lint",
    label: "npm run lint",
    prompt: `Run "npm run lint" (ESLint) in this project.
Report: exit code, error count, warning count, any files with issues.
If it fails, list the files and error messages.
Return JSON with pass/fail, error/warning counts, and top issues.`,
  },
  {
    key: "typecheck",
    label: "TypeScript Check",
    prompt: `Run TypeScript type checking in this project (npx tsc --noEmit).
Report: any type errors, their locations, and whether they block the build.
If there are pre-existing errors, distinguish them from new ones.
Return JSON with pass/fail, error count, and critical type errors.`,
  },
  {
    key: "e2e",
    label: "Playwright E2E",
    prompt: `Run Playwright E2E tests in this project (npx playwright test).
Report: total tests, passed, failed, skipped, flaky, duration.
For any failures, capture the test name, file, and error message.
Also note: any console errors during tests, any timeouts, any retries used.
Return JSON with pass/fail, test counts, and failure details.`,
  },
];

const isFull = suite === "all";
const checksToRun = isFull ? CHECKS : CHECKS.filter((c) => c.key === suite);

const results = await parallel(
  checksToRun.map(
    (c) => () =>
      agent(c.prompt, {
        label: c.label,
        phase: "Run",
        schema: {
          type: "object",
          properties: {
            check: { type: "string" },
            passed: { type: "boolean" },
            exitCode: { type: "number" },
            duration: { type: "string" },
            output: { type: "string" },
            errors: { type: "array", items: { type: "string" } },
            warnings: { type: "array", items: { type: "string" } },
            stats: { type: "object" },
          },
          required: ["check", "passed", "output"],
        },
      }),
  ),
);

const checkResults = [];
for (let i = 0; i < checksToRun.length; i++) {
  const r = results[i];
  checkResults.push({
    key: checksToRun[i].key,
    label: checksToRun[i].label,
    passed: r?.passed ?? false,
    exitCode: r?.exitCode,
    duration: r?.duration,
    errors: r?.errors || [],
    warnings: r?.warnings || [],
    output: r?.output || "No output",
    stats: r?.stats || {},
  });
}

const passed = checkResults.filter((c) => c.passed).length;
const total = checkResults.length;
const allPassed = passed === total;

log(`${passed}/${total} passed${allPassed ? " ✅" : " ❌"}`);

// ── Phase 2: Synthesize report ──────────────────────────────
phase("Report");

if (allPassed) {
  return {
    passed: true,
    summary: `All ${total} checks passed`,
    checks: checkResults,
    recommendation: "Ready to proceed.",
  };
}

const report = await agent(
  `Synthesize a test report from these results:

${checkResults
  .map(
    (c) =>
      `${c.passed ? "✅" : "❌"} ${c.label}: ${c.output}
   Errors: ${c.errors.join("; ") || "none"}
   Warnings: ${c.warnings.join("; ") || "none"}`,
  )
  .join("\n\n")}

Generate a concise report:
1. Overall result: PASS/FAIL
2. Which checks failed and why
3. What the developer should fix first
4. Whether the failures are likely pre-existing or new

Return JSON.`,
  {
    label: "test-report",
    phase: "Report",
    schema: {
      type: "object",
      properties: {
        overall: { type: "string", enum: ["PASS", "FAIL"] },
        summary: { type: "string" },
        fixFirst: { type: "array", items: { type: "string" } },
        likelyNew: { type: "boolean" },
      },
      required: ["overall", "summary", "fixFirst", "likelyNew"],
    },
  },
);

return {
  passed: false,
  summary: report.summary,
  report,
  checks: checkResults,
  recommendation:
    report.fixFirst.length > 0 ? report.fixFirst[0] : "Investigate failures manually.",
};
