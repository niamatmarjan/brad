# Native BMAD Host Dispatch & Execution Handoff

**Author:** BRAD Evaluation & Validation Engineer  
**Date:** 2026-10-20  
**Target Environments:** GitHub Copilot (VS Code), Claude Code, Antigravity CLI / IDE (Post-Restart)  
**Workspace Path:** `C:\Projects\Personal\brad-labs\relaydesk-v050\bmad-workspace`  
**Installed Runtime:** Official BMAD Method v6.12.4, BMM Module v6.12.4, TEA Module v1.27.2, BRAD v0.5.0  

---

## 1. Executive Summary & The 5-Level Evidence Ladder

In strict adherence to BRAD priority rules (Contract Rule 2 & 7), cached instructions or local disk files must never be cited as proof of live host skill invocation.

| Level | Evidence Stage | State in RelayDesk Lab | Verification Method |
|---|---|---|---|
| **Level 1** | External Cache | **VERIFIED** | Official package signatures confirmed (`bmad-method@6.12.4`, `bmad-method-test-architecture-enterprise@1.27.2`). |
| **Level 2** | Workspace Installation | **VERIFIED** | Installed in `bmad-workspace` with `_bmad`, `.agents/skills`, `.claude/skills`, and `.agent/skills`. `python skills/brad/scripts/inspect_bmad.py` reports `bmad_runtime_present: true`, `tea: true`. |
| **Level 3** | Host Discovery | **UNVERIFIED IN ACTIVE SESSION** | The active AI host session was initialized before workspace skills were configured; requires fresh session startup to mount skills. |
| **Level 4** | Native Invocation | **BLOCKED IN ACTIVE SESSION** | Active session cannot dispatch host-native `/bmad-*` slash-commands directly; no simulated fallback is claimed. |
| **Level 5** | Delivered Outcome | **NOT_RUN IN ACTIVE SESSION** | Zero synthetic artifacts fabricated. Verifiable in supported host using the protocol below. |

---

## 2. Python Scripting Runtime Verification

BMAD skills execute underlying helper scripts via Python `uv`. In `bmad-workspace`, the Python runtime is 100% operational:

- **Config Resolution Check:**
  ```powershell
  uv run C:\Projects\Personal\brad-labs\relaydesk-v050\bmad-workspace\_bmad\scripts\resolve_config.py --project-root C:\Projects\Personal\brad-labs\relaydesk-v050\bmad-workspace
  ```
  *Observed Output:* Successfully returns merged JSON configuration for `core`, `modules.bmm`, `modules.tea`, and registered agents (Mary, John, Sally, Winston, Amelia, Murat).

- **BRAD Doctor Readiness:**
  ```powershell
  node cli/brad.mjs doctor --dir C:\Projects\Personal\brad-labs\relaydesk-v050\bmad-workspace --json
  ```
  *Observed Output:* `ok: true`, `bradFiles: VERIFIED`, `nativeBmad: LOCAL_CONFIG_AND_SKILLS_FOUND`, 39 native skills discovered.

---

## 3. Protocol for 8 Core Native BMAD Workflows

When launching an AI session inside `C:\Projects\Personal\brad-labs\relaydesk-v050\bmad-workspace`, follow this executable dispatch sequence:

### Workflow 1: Product Requirements Refinement
- **Target Native Skill:** `bmad-prd` (or `bmad-product-brief`)
- **Host Invocation Syntax:**
  - Claude Code: `/bmad-prd`
  - GitHub Copilot: `@brad /brad plan "Refine RelayDesk Service Request Intake & SLA Monitoring"`
- **Prerequisites:** `docs/product/PRODUCT_BRIEF.md`
- **Native Script Executed:** `uv run _bmad/scripts/resolve_customization.py --skill .agents/skills/bmad-prd --project-root . --key workflow`
- **Expected Artifact:** `_bmad-output/planning-artifacts/prd.md` with YAML frontmatter `status: draft` and `.memlog.md`.
- **Validation Criteria:** FRs numbered with stable IDs, cross-cutting NFRs, zero implementation tech stack in PRD (overflow to `addendum.md`).

### Workflow 2: Architecture Review
- **Target Native Skill:** `bmad-architecture` (Winston, System Architect)
- **Host Invocation Syntax:**
  - Claude Code: `/bmad-architecture`
  - GitHub Copilot: `@brad /brad architect "Review RelayDesk Node 24 SQLite + Webhook Architecture"`
- **Prerequisites:** Approved `prd.md` in planning artifacts.
- **Expected Artifact:** `_bmad-output/planning-artifacts/architecture.md` (or `architecture-decision-records/`).
- **Validation Criteria:** Boring technology trade-off matrix, concurrency model, data schema, audit logging transport.

### Workflow 3: Epic & Story Refinement
- **Target Native Skill:** `bmad-create-epics-and-stories`
- **Host Invocation Syntax:**
  - Claude Code: `/bmad-create-epics-and-stories`
  - GitHub Copilot: `@brad /brad epic 1`
- **Prerequisites:** Approved PRD + Architecture document.
- **Expected Artifact:** `_bmad-output/planning-artifacts/epics.md` and discrete story files `story-1.1.md`, `story-1.2.md`.
- **Validation Criteria:** Acceptance criteria in Given/When/Then format with unambiguous verification boundaries.

### Workflow 4: Story Implementation
- **Target Native Skill:** `bmad-build` (Amelia, Senior Software Engineer)
- **Host Invocation Syntax:**
  - Claude Code: `/bmad-build story 1.1`
  - GitHub Copilot: `@brad /brad 1.1 --local`
- **Prerequisites:** Refined story file with explicit acceptance criteria.
- **Expected Artifact:** Implementation commits on topic branch, passing test suite, updated sprint status.
- **Validation Criteria:** Red-Green-Refactor test evidence, zero scope expansion beyond story ACs, clean git working tree.

### Workflow 5: Code Review
- **Target Native Skill:** `bmad-code-review`
- **Host Invocation Syntax:**
  - Claude Code: `/bmad-code-review`
  - GitHub Copilot: `@brad /brad review`
- **Prerequisites:** Working topic branch with committed implementation.
- **Safety Rule:** Read-only review lens. Strict prohibition against creating commits or modifying application code during review intent.
- **Expected Artifact:** `_bmad-output/implementation-artifacts/code-review-1.1.md`.
- **Validation Criteria:** Structured findings categorized by severity (Critical, High, Medium, Low) with explicit pass/fail verdict.

### Workflow 6: TEA Test Design
- **Target Native Skill:** `bmad-testarch-test-design` (Murat, Test Architect)
- **Host Invocation Syntax:**
  - Claude Code: `/bmad-testarch-test-design`
  - GitHub Copilot: `@brad /brad test-design epic 1`
- **Prerequisites:** Installed TEA module (`tea: true` in config).
- **Expected Artifact:** `_bmad-output/test-artifacts/test-design/test-strategy-epic-1.md`.
- **Validation Criteria:** Risk-based P0–P3 testing taxonomy, fixture architecture, boundary values, negative test scenarios.

### Workflow 7: QA & Test Quality Review
- **Target Native Skill:** `bmad-testarch-test-review`
- **Host Invocation Syntax:**
  - Claude Code: `/bmad-testarch-test-review`
  - GitHub Copilot: `@brad /brad qa audit`
- **Prerequisites:** Existing test suite in `server/tests/*.test.mjs`.
- **Expected Artifact:** `_bmad-output/test-artifacts/test-reviews/test-quality-audit.md`.
- **Validation Criteria:** Flakiness evaluation, assertions per test, coverage gaps, failure modes.

### Workflow 8: Resumption of Interrupted Work
- **Target Native Skill:** `bmad-correct-course` (or `bmad-sprint-planning status`)
- **Host Invocation Syntax:**
  - Claude Code: `/bmad-sprint-planning status`
  - GitHub Copilot: `@brad /brad resume`
- **Prerequisites:** Partially completed `.memlog.md` or git branch.
- **Expected Behavior:** Inspects existing workspace state, reads memory log, restores task without duplicate branch creation or regenerating completed assets.
- **Validation Criteria:** Reversible continuation from checkpoint, zero duplicate ticket creation.

---

## 4. Host Setup Verification Checklist

1. **GitHub Copilot in VS Code:**
   - Open folder `C:\Projects\Personal\brad-labs\relaydesk-v050\bmad-workspace` in VS Code.
   - Verify `.github/agents/brad.agent.md` appears under Agents menu (`@brad`).
   - Run `@brad /brad doctor` in Copilot chat to verify agent discovery.
2. **Claude Code:**
   - Run `claude` from `C:\Projects\Personal\brad-labs\relaydesk-v050\bmad-workspace`.
   - Verify `/brad` and `/bmad-help` appear in autocomplete slash-commands.
3. **Antigravity CLI (AGY):**
   - Run `agy` in `C:\Projects\Personal\brad-labs\relaydesk-v050\bmad-workspace`.
   - AGY loads `.agents/skills` at startup, mounting all 39 BMAD skills and BRAD.
