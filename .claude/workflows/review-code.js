export const meta = {
  name: "review-code",
  description:
    "Multi-perspective code review: security, correctness, performance, style — with adversarial verification",
  phases: [
    { title: "Review", detail: "4 parallel review agents per changed file" },
    { title: "Verify", detail: "Adversarial verification of findings" },
    { title: "Synthesize", detail: "Deduplicate and generate review summary" },
  ],
};

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
          line: { type: "number" },
          title: { type: "string" },
          description: { type: "string" },
          suggestion: { type: "string" },
        },
        required: ["severity", "file", "title", "description", "suggestion"],
      },
    },
  },
  required: ["findings"],
};

const VERDICT_SCHEMA = {
  type: "object",
  properties: {
    isReal: { type: "boolean" },
    isActionable: { type: "boolean" },
    explanation: { type: "string" },
  },
  required: ["isReal", "isActionable", "explanation"],
};

// Files to review — from args if provided, otherwise auto-discovered
const files = Array.isArray(args) && args.length > 0 ? args : null; // null = agent auto-discovers changed files

const LENSES = [
  {
    key: "security",
    label: "Security",
    prompt: `Review for SECURITY issues: injection attacks, XSS, auth bypass, secrets exposure, insecure dependencies, missing access control, unsafe data handling, path traversal, CSRF, improper encryption. For each issue state severity, file, line, title, description, suggestion.`,
  },
  {
    key: "correctness",
    label: "Correctness",
    prompt: `Review for CORRECTNESS issues: logic errors, null/undefined handling, race conditions, off-by-one errors, incorrect types, broken error handling, missing edge cases, state management bugs, API contract violations. For each issue state severity, file, line, title, description, suggestion.`,
  },
  {
    key: "performance",
    label: "Performance",
    prompt: `Review for PERFORMANCE issues: N+1 queries, missing memoization, large bundles, unnecessary re-renders, missing indexes, excessive API calls, unoptimized images, blocking operations, memory leaks, inefficient data structures. For each issue state severity, file, line, title, description, suggestion.`,
  },
  {
    key: "style",
    label: "Style",
    prompt: `Review for STYLE & MAINTAINABILITY issues: inconsistent naming, unclear variable names, missing comments on complex logic, God functions, deep nesting, magic numbers, duplicated code, missing TypeScript types, inconsistent patterns. For each issue state severity, file, line, title, description, suggestion.`,
  },
];

// ── Phase 1: Review ─────────────────────────────────────────
phase("Review");

const scopeHint = files
  ? `Review ONLY these files: ${files.join(", ")}`
  : "Auto-discover recently changed files (git diff / changed in current branch) and review them.";

const reviewResults = await parallel(
  LENSES.map(
    (l) => () =>
      agent(
        `${l.prompt}\n\n${scopeHint}\n\nReturn JSON with a "findings" array. If you find no issues, return an empty array.`,
        { label: l.label, phase: "Review", schema: FINDING_SCHEMA },
      ),
  ),
);

const allFindings = [];
for (let i = 0; i < LENSES.length; i++) {
  if (reviewResults[i]?.findings?.length) {
    for (const f of reviewResults[i].findings) {
      allFindings.push({ ...f, lens: LENSES[i].key });
    }
  }
}
log(`${allFindings.length} findings across ${LENSES.length} review lenses`);

if (allFindings.length === 0) {
  return {
    summary: "No issues found. Code looks good across all lenses.",
    findings: [],
    refuted: [],
    lensCounts: {},
    actionable: 0,
  };
}

// ── Phase 2: Adversarial verify ────────────────────────────
phase("Verify");
const toVerify = allFindings.filter((f) => f.severity === "CRITICAL" || f.severity === "HIGH");

const verified =
  toVerify.length > 0
    ? await parallel(
        toVerify.map(
          (f) => () =>
            agent(
              `Adversarially verify this code review finding. Try to REFUTE it.

[${f.severity}] ${f.title}
File: ${f.file}:${f.line || "?"}  ·  Lens: ${f.lens}
${f.description}
Suggestion: ${f.suggestion}

Is this a real bug/issue? Is the suggestion actionable? Would it actually improve the code?
If it's a false positive, nitpick, or not actionable, mark isReal=false.
Return JSON.`,
              { label: `verify:${f.title.slice(0, 30)}`, phase: "Verify", schema: VERDICT_SCHEMA },
            ).then((v) => ({ ...f, verdict: v })),
        ),
      )
    : [];

const confirmed = verified.filter(Boolean).filter((f) => f.verdict?.isReal);
const refuted = verified.filter(Boolean).filter((f) => !f.verdict?.isReal);
const mediumLow = allFindings.filter((f) => f.severity !== "CRITICAL" && f.severity !== "HIGH");

log(`${confirmed.length} confirmed · ${refuted.length} refuted · ${mediumLow.length} other`);

// ── Phase 3: Deduplicate & synthesize ──────────────────────
phase("Synthesize");
const final = [...confirmed, ...mediumLow].sort((a, b) => {
  const o = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  return o[a.severity] - o[b.severity];
});

// Count by lens
const lensCounts = {};
for (const f of final) {
  lensCounts[f.lens] = (lensCounts[f.lens] || 0) + 1;
}

// Dedup by file+title similarity (simple: keep first occurrence)
const seen = new Set();
const deduped = final.filter((f) => {
  const key = `${f.file || ""}:${f.title.slice(0, 40)}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

const summary = await agent(
  `Synthesize this code review into a concise summary for the developer.

Files reviewed: ${files ? files.join(", ") : "auto-discovered"}
Critical: ${deduped.filter((f) => f.severity === "CRITICAL").length}
High: ${deduped.filter((f) => f.severity === "HIGH").length}
Medium: ${deduped.filter((f) => f.severity === "MEDIUM").length}
Low: ${deduped.filter((f) => f.severity === "LOW").length}
Refuted: ${refuted.length}
Deduped: ${final.length - deduped.length} duplicates removed

Lens breakdown: ${JSON.stringify(lensCounts)}

Top issues:
${deduped
  .slice(0, 5)
  .map((f, i) => `${i + 1}. [${f.severity}][${f.lens}] ${f.title} — ${f.file}:${f.line || "?"}`)
  .join("\n")}

Write 2-4 sentence summary of what needs fixing and the overall code quality.
Return JSON: { "summary": "...", "grade": "A|B|C|D|F", "mustFix": number, "niceToHave": number }`,
  {
    label: "summary",
    phase: "Synthesize",
    schema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        grade: { type: "string", enum: ["A", "B", "C", "D", "F"] },
        mustFix: { type: "number" },
        niceToHave: { type: "number" },
      },
      required: ["summary", "grade", "mustFix", "niceToHave"],
    },
  },
);

return {
  summary,
  findings: deduped,
  refuted,
  lensCounts,
  actionable: deduped.filter((f) => f.verdict?.isActionable !== false).length,
};
