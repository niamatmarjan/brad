# Natural Task Routing & BMAD Workflow Delegation

This guide explains how BRAD dynamically resolves natural stakeholder requests to installed BMAD v6.12 workflows without preselecting routes, requiring hardcoded case IDs, or asking stakeholders to understand BMAD agent internals.

---

## 1. Core Principle

A stakeholder should be able to invoke BRAD with an ordinary task in natural language, and have BRAD:
1. **Classify Intent:** Detect the underlying requirement (planning, build, review, testing, architecture, release audit).
2. **Discover Installed Capabilities:** Inspect project-local `.agents/skills`, `.agent/skills`, and host directories for genuine native BMAD skills.
3. **Check Safety & Policy:** Enforce Contract Rule 8 (refuse destructive operations, force push, and CI bypass with zero mutations).
4. **Delegate or Clarify:** Select the smallest installed workflow matching the intent. If ambiguous, ask a material question. If the specialist is not installed, report `SPECIALIST_UNAVAILABLE` rather than guessing or substituting an unrelated build workflow.
5. **Truthful Evidence Classification:** Report whether execution was host-native, inline, or helper-script-only.

---

## 2. Canonical Intent Taxonomy

| Intent | Natural Triggers | Target BMAD Skill | Mutates Code? |
|---|---|---|---|
| `PRD_SPECIFICATION` | "Create a PRD for notifications", "Write product requirements", "Improve the PRD" | `bmad-prd` (fallback: `bmad-create-prd`) | No (planning docs only) |
| `EPIC_STORY_PLANNING` | "Refine epic 2", "Break down story 1.2 into tasks", "Create epics and stories" | `bmad-create-epics-and-stories` (fallback: `bmad-ticket`) | No (planning docs only) |
| `BUILD_WORK_UNIT` | "Build story 1.1", "Implement ticket 1.2", "Code up story 2" | `bmad-build` (or `bmad-build-auto`) | Yes |
| `CONTINUE_WORK_UNIT` | "Continue interrupted story", "Resume work", "/brad resume" | `bmad-build` (resumption mode) | Yes |
| `CODE_REVIEW_READONLY` | "Review PR #12 without changing code", "Code review changes" | `bmad-code-review` (fallback: `bmad-review`) | Strictly No (Read-Only) |
| `ACCEPTANCE_TEST_GENERATION` | "Generate acceptance tests", "Write Playwright E2E tests", "ATDD" | `bmad-testarch-atdd` (fallback: `bmad-testarch-automate`, `bmad-tea`) | Yes (tests only) |
| `TEST_QUALITY_AUDIT` | "Audit test quality", "Review test coverage", "Critique tests" | `bmad-testarch-test-design` (fallback: `bmad-testarch-trace`, `bmad-tea`) | No (audit report only) |
| `ARCHITECTURE_INVESTIGATION`| "Investigate scaling architecture", "System design trade-offs" | `bmad-architecture` (fallback: `bmad-agent-architect`) | No (architecture doc only) |
| `RELEASE_READINESS_AUDIT` | "Determine release readiness", "Audit release candidate", "Retrospective" | `bmad-retrospective` (fallback: `bmad-review`) | No (verdict/report only) |
| `UX_DESIGN` | "Conduct UX design audit", "UI user flow" | `bmad-ux` (if installed) | No |
| `UNAUTHORIZED_DESTRUCTIVE` | "Force push to main", "Drop tables", "Delete prod branches", "Bypass CI" | Refusal Policy (`REFUSAL_POLICY_DECISION`) | Strictly Refused (0 mutations) |
| `AMBIGUOUS_REQUEST` | "Do that thing", "Update it", "Fix something" | Clarification Prompt (`CLARIFICATION_REQUIRED`) | No |

---

## 3. Specialist Availability & Fallback Rules

- **Strict Capability Boundary:** If a stakeholder asks for a UX audit or QA test architecture and `bmad-ux` or `bmad-testarch-*` is **not installed** in the workspace, BRAD **must return `SPECIALIST_UNAVAILABLE`**.
- **No Hallucinated Fallbacks:** BRAD must **never** route a missing specialist request to `bmad-build`, `bmad-help`, or an arbitrary backlog implementation.
- **Ambiguous Request Handling:** When an utterance lacks actionable target information, ask **one** specific question instead of executing arbitrary code or picking an unexpected backlog story.

---

## 4. Execution Posture & Evidence Reporting

When executing or reporting a delegated workflow, agents must truthfully state the execution mode:

1. `HOST_NATIVE_SKILL_INVOKED`: The workflow was dispatched through host-native skill or tool mechanisms.
2. `INLINE_WORKFLOW_INLINE`: The workflow instructions were loaded and executed in the same conversational context. Disclose that independent review or verification authority does not apply.
3. `SPECIALIST_DISPATCHED`: The workflow was delegated to an isolated subagent with independent memory/context.
4. `HELPER_SCRIPTS_ONLY`: Only read-only diagnostics or preflight scripts were run.

Unavailable external provenance must be honestly classified as `REVIEW_REQUIRED`, and blind evaluation boundaries without a genuine withheld oracle must be classified as `BLOCKED`.

---

## 5. Programmatic Router Interface

The routing engine is available both as an ESM module and as a CLI diagnostic subcommand:

### CLI Usage:
```bash
# Evaluate route for a natural task
brad route "create a new PRD for user billing" --dir .

# Structured JSON for automation
brad route "build story 1.1" --dir . --json
```

### Module API:
```javascript
import { resolveRoute, formatRouteExplanation } from '@niamatmarjan/brad/router';

const route = resolveRoute({
  utterance: 'review pull request without changing code',
  projectRoot: process.cwd()
});

console.log(route.intent);         // 'CODE_REVIEW_READONLY'
console.log(route.selected_route); // 'bmad-code-review'
console.log(route.is_authorized);  // true
console.log(route.requires_mutations); // false
```
