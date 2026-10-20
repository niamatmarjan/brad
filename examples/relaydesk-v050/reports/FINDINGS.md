# Confirmed Findings & Root-Cause Analysis

**Evaluation Run:** `relaydesk-v050-exp-01`  
**BRAD Baseline Version:** 0.5.0  

---

## Finding 1: Lack of Machine-Readable Installation Guidance in `doctor` Output

- **Finding ID:** `FND-001`
- **Severity:** HIGH
- **Category:** BMAD Compatibility / Host Diagnostics
- **Expected Behavior:** When BMAD Method is uninstalled in the host project, running `brad doctor --json` should expose a structured, machine-readable command property so automated coding agents can take immediate, deterministic recovery action without heuristic string parsing.
- **Observed Behavior in v0.5.0:** `doctor` returned `bmad: { detected: false, note: "BMAD Method not detected. Install it separately using the official npx bmad-method install or v7 skills setup." }`. The installation command was embedded inside an informal human note string.
- **Root Cause:** In `cli/core.mjs`, `bmadDoctor(root)` constructed notes and warnings but omitted an explicit `installCommand` property in the returned JSON structure.
- **Verified Fix in Candidate:** Added `installCommand: detected ? null : 'npx bmad-method install'` to `bmadDoctor` in `cli/core.mjs`.
- **Regression Test:** Added unit test `tests/cli.test.mjs: doctor provides machine-readable installCommand when BMAD is not detected`.

---

## Finding 2: Ambiguous Routing Between Module Increments and Greenfield PRDs

- **Finding ID:** `FND-002`
- **Severity:** MEDIUM
- **Category:** BRAD Routing & Intent Classification
- **Expected Behavior:** When delivery stakeholders request changes to an already-approved functional increment (e.g., "extend intake increment with SLA tracking", "refine module increment"), BRAD should recognize that an authoritative PRD already exists and route to increment refinement rather than triggering greenfield PRD generation.
- **Observed Behavior in v0.5.0:** Without an explicit ticket number (like `1.1`), requests containing phrases like "module increment" or "refine increment" could collapse into greenfield PRD authoring (`bmad-prd`), risking destructive overwriting of established product specifications.
- **Root Cause:** `SKILL.md` input recognition section mapped bare names or goals directly to planning or PRD authoring without distinguishing delta/increment requests on existing modules.
- **Verified Fix in Candidate:** Added explicit module increment lane in `skills/brad/SKILL.md`:
  `- /brad increment <name>, refine increment, extend increment: module increment lane; inspect existing PRD and architecture first, refine approved increment delta without rewriting greenfield PRD.`

---

## Finding 3: Ticket-to-PR Delivery Over-Eagerness on Read-Only Review Requests

- **Finding ID:** `FND-003`
- **Severity:** MEDIUM
- **Category:** BRAD Delivery Policy & Safety
- **Expected Behavior:** When a user asks to review, audit, inspect, or trace a work item, ticket-to-PR delivery MUST NEVER create a Git topic branch, stage commits, or open/update a remote PR.
- **Observed Behavior in v0.5.0:** Because Priority Rule #4 ("One command, one requested outcome") defaults to implemented + verified + PR delivery, automated agents could interpret "review story 1.1" as an authorization to create a topic branch and open a review PR if PR delivery was previously enabled.
- **Root Cause:** Insufficiently explicit boundary in `skills/brad/references/ticket-to-pr.md` distinguishing review-only and audit intents from active coding and delivery.
- **Verified Fix in Candidate:** Added explicit Read-Only Review Safety clause in `skills/brad/references/ticket-to-pr.md`:
  `Read-only review safety: When a request specifies 'review', 'audit', 'inspect', or 'assess', ticket-to-pr delivery is strictly forbidden from creating topic branches, writing code, or publishing PRs without explicit write authorization.`
