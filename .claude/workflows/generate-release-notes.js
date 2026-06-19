export const meta = {
  name: "generate-release-notes",
  description: "Analyze git commits since last tag and generate structured release notes",
  phases: [
    { title: "Analyze", detail: "Categorize commits and detect changes" },
    { title: "Draft", detail: "Generate release notes from categorized changes" },
    { title: "Review", detail: "Product manager reviews and improves notes" },
  ],
};

// ── Phase 1: Analyze commits ────────────────────────────────
phase("Analyze");

const sinceTag = typeof args === "object" && args?.since ? args.since : null;
const version = typeof args === "object" && args?.version ? args.version : null;

const tagHint = sinceTag ? `since git tag "${sinceTag}"` : "since the most recent git tag";

const changelog = await agent(
  `Analyze all git commits ${tagHint} in this repository.

For each commit, determine:
1. Type: feat, fix, chore, docs, refactor, test, perf, ci, style
2. Scope: which module/area it touches (auth, invitations, badges, QR, visits, visitors, dashboard, tests, CI, docs)
3. Impact: whether it's user-facing, developer-facing, or internal
4. A one-line summary suitable for release notes

Also identify:
- Breaking changes
- New features
- Bug fixes
- Dependency updates
- Documentation changes
- Any security fixes

Return JSON with categorized changes and a summary of what this release contains.`,
  {
    label: "analyze-commits",
    phase: "Analyze",
    schema: {
      type: "object",
      properties: {
        commits: {
          type: "array",
          items: {
            type: "object",
            properties: {
              hash: { type: "string" },
              message: { type: "string" },
              type: { type: "string" },
              scope: { type: "string" },
              impact: { type: "string" },
              summary: { type: "string" },
            },
            required: ["message", "type", "scope", "summary"],
          },
        },
        breaking: { type: "array", items: { type: "string" } },
        features: { type: "array", items: { type: "string" } },
        fixes: { type: "array", items: { type: "string" } },
        chore: { type: "array", items: { type: "string" } },
        totalCommits: { type: "number" },
      },
      required: ["commits", "breaking", "features", "fixes", "chore", "totalCommits"],
    },
  },
);

log(
  `${changelog.totalCommits} commits · ${changelog.features.length} features · ${changelog.fixes.length} fixes · ${changelog.breaking.length} breaking`,
);

// ── Phase 2: Draft release notes ────────────────────────────
phase("Draft");

const versionText = version || "NEXT";
const releaseNotes = await agent(
  `Write release notes for version ${versionText} of the "Visitor Registration System" based on these changes:

FEATURES (${changelog.features.length}):
${changelog.features.map((f) => `- ${f}`).join("\n")}

FIXES (${changelog.fixes.length}):
${changelog.fixes.map((f) => `- ${f}`).join("\n")}

BREAKING (${changelog.breaking.length}):
${changelog.breaking.map((f) => `- ${f}`).join("\n") || "(none)"}

CHORE/OTHER (${changelog.chore.length}):
${changelog.chore.map((f) => `- ${f}`).join("\n")}

Write release notes in this format:
1. Title: "Visitor Registration System v${versionText}"
2. One-paragraph overview
3. "## What's New" with feature highlights
4. "## Bug Fixes" (if any)
5. "## Breaking Changes" (if any, with migration notes)
6. "## Internal Changes" (summarized, not detailed)
7. "## Stats" (${changelog.totalCommits} commits, contributors, etc.)

Make it professional, concise, and suitable for a GitHub Release.`,
  {
    label: "draft-notes",
    phase: "Draft",
    schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        body: { type: "string" },
        tag: { type: "string" },
        isPrerelease: { type: "boolean" },
      },
      required: ["title", "body", "tag"],
    },
  },
);

log(`Release notes draft: ${releaseNotes.title}`);

// ── Phase 3: PM review ──────────────────────────────────────
phase("Review");

const reviewed = await agent(
  `You are the Product Manager. Review these release notes for quality, accuracy, and completeness.

Title: ${releaseNotes.title}
Body:
${releaseNotes.body}

Check:
- Are features described from the USER's perspective (not implementation details)?
- Is the overview paragraph compelling?
- Are breaking changes clearly explained with migration steps?
- Are there any missing notable changes?
- Is the tone professional and confident?

Return improved release notes with any corrections applied. If the notes are already excellent, return them as-is.`,
  {
    label: "pm-review",
    phase: "Review",
    schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        body: { type: "string" },
        tag: { type: "string" },
        isPrerelease: { type: "boolean" },
        changes: { type: "array", items: { type: "string" } },
      },
      required: ["title", "body", "tag"],
    },
  },
);

return {
  releaseNotes: reviewed,
  rawChangelog: changelog,
  version: reviewed.tag,
  isPrerelease: reviewed.isPrerelease || false,
};
