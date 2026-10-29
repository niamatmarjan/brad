# BRAD Gate 04 Implementation Plan: Real Routing, Native Delegation & Multi-Agent Production Readiness

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a reliable, production-ready BRAD routing engine and delegation coordinator that allows stakeholders to submit natural requests without knowing BMAD internals, safely routes and delegates to installed native BMAD v6.12 workflows, executes multi-agent handoffs, recovers from interruptions, and truthfully reports execution posture.

**Architecture:** Implement a deterministic semantic router in BRAD core (`src/router.mjs`) alongside an optional CLI diagnostic command (`brad route <task>`). Enhance BRAD's host-native skill (`SKILL.md` and references) so AI hosts follow the identical intent taxonomy without guessing. Implement structured specialist handoffs with minimal project fixtures, robust session resumption, and truthful status classification.

**Tech Stack:** Node.js (v20/22/24 ES Modules, `node:test`, `node:crypto`, `node:fs`, `node:path`), Python 3 (`inspect_bmad.py`), Git, BMAD v6.12 installed skills.

**Spec:** User Request, BRAD Issue #39, BRAD Issue #33, Gate 03 Commit `2b5c349b05e1feb096a05d8d04137b8a9d365c2a`.

## Global Constraints

- Do not invoke or report `brad route` as already implemented prior to Gate 04.
- Do not build a competing BMAD orchestrator or recreate BMAD control loops.
- BMAD v6.12 is the primary stable baseline; keep v7 preview isolated.
- Zero preselected routes and zero hard-coded case IDs in the execution harness.
- A matching artifact does not automatically prove host agent completion (`TASK_COMPLETION_AUTHENTICATED`).
- Maintain release gate restrictions: `SUPERVISED_PILOT=CONDITIONAL_GO`, `GATE03_AUTHENTICATED_ROUTING=NOT_VERIFIED`, `BLIND_EVALUATION=BLOCKED`, `UNATTENDED_PRODUCTION=NO_GO`.
- Publish on a separate development branch (`feat/gate-04-real-routing`) and draft PR. No merges, tags, releases, or npm publishes.

## Review Focus

1. **Natural utterance misclassification:** Ensure all 10 canonical stakeholder request types (PRD, epic/story refinement, build story, continue story, code review, acceptance tests, test quality audit, architecture, release readiness, refusal/ambiguous) route correctly based on intent and installed capabilities.
2. **Missing skill handling:** When a requested capability is not installed in the workspace (e.g. `bmad-ux` or `bmad-tea`), route must return `SPECIALIST_UNAVAILABLE` rather than hallucinating or substituting an unrelated build/help workflow.
3. **Dangerous action refusal:** Destructive requests (deleting production branches, force pushing to main, bypassing CI) must trigger `REFUSAL_POLICY_DECISION` with 0 Git/file mutations.
4. **Ambiguous request handling:** Vague prompts ("do that thing") must trigger `CLARIFICATION_REQUIRED` rather than arbitrary backlog execution.
5. **Multi-agent handoff integrity:** Developer -> QA -> Reviewer -> Dev correction lifecycle must carry structured task state with blockers and evidence, rather than simulated single-function persona strings.

---

### Task 1: Audit BRAD Execution Architecture (Phase 1)
- Audit `cli/core.mjs`, `cli/brad.mjs`, `skills/brad/SKILL.md`, `skills/brad/references/`, and BMAD v6.12 workflows.
- Produce concise gap analysis between current CLI installer/skill wrapper and end-to-end stakeholder delegation requirements.

### Task 2: Implement Core Dynamic Task Router (Phase 2)
- Create `src/router.mjs` with `resolveRoute({ utterance, projectRoot, installedSkills, options })`.
- Classify intents across:
  - `PRD_SPECIFICATION` -> `bmad-prd`
  - `EPIC_STORY_PLANNING` -> `bmad-create-epics-and-stories`
  - `BUILD_WORK_UNIT` -> `bmad-build`
  - `CONTINUE_WORK_UNIT` -> `bmad-build` (resume mode)
  - `CODE_REVIEW_READONLY` -> `bmad-code-review`
  - `ACCEPTANCE_TEST_GENERATION` -> `bmad-testarch-atdd` / `bmad-tea`
  - `TEST_QUALITY_AUDIT` -> `bmad-testarch-test-design`
  - `ARCHITECTURE_INVESTIGATION` -> `bmad-architecture`
  - `RELEASE_READINESS_AUDIT` -> `bmad-retrospective` / `bmad-review`
  - `UNAUTHORIZED_DESTRUCTIVE_REQUEST` -> `REFUSAL_POLICY_DECISION`
  - `AMBIGUOUS_REQUEST` -> `CLARIFICATION_REQUIRED`
  - Missing specialist -> `SPECIALIST_UNAVAILABLE`
- Add unit tests in `tests/router.test.mjs` covering all 10 intent categories with varied natural language prompts.

### Task 3: Expose Programmatic Routing via CLI & Package Exports
- Wire `brad route <utterance> [--dir <path>] [--json] [--explain]` into `cli/core.mjs` and `cli/brad.mjs`.
- Update `package.json` with `"exports": { ".": "./src/index.mjs", "./router": "./src/router.mjs" }`.
- Add CLI tests in `tests/cli.test.mjs` testing `brad route` and its `--json` output.

### Task 4: Enhance AI Host Skill & References (Phase 3)
- Update `skills/brad/SKILL.md` to incorporate the natural request routing taxonomy.
- Add `skills/brad/references/natural-task-routing.md` detailing the 10 intent patterns, discovery protocol, and execution rules.
- Ensure host-native skill invocation, same-session inline execution, and helper scripts are truthfully distinguished.

### Task 5: Implement Genuine Multi-Agent Handoff & Continuation Protocol (Phases 4 & 5)
- Create `src/handoff.mjs` managing structured task state between roles:
  - Developer: implements unit and generates deliverable.
  - QA: runs acceptance checks, generates defect report if issues found.
  - Reviewer: reviews code diffs read-only, issues approval or remediation requirements.
  - Developer: applies correction based on QA/Reviewer feedback.
- Test handoff cycle in `tests/handoff.test.mjs` with minimal project fixture.
- Implement durable task continuation: branch detection, duplicate handling, rollback on collision.

### Task 6: Supervised Product Validation & Final Report (Phases 6 & 7)
- Run complete test suite (`npm test`).
- Execute real stakeholder routing on installed BMAD fixtures (`live-smoke-service` in lab).
- Verify truthful evidence classification.
- Commit all changes to `feat/gate-04-real-routing`, push, and open/update draft PR.
- Produce evidence-backed final report.
