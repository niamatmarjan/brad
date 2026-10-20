# Native BMAD Execution & Host Skill Discovery Audit

**Evaluation Run:** `relaydesk-v050-exp-01`  
**Date:** 2026-10-20  
**Target:** ChatGPT (BRAD Core Architect & Engineering Lead)  
**Evaluator:** Antigravity (Operating as Disciplined Validation Engineer)  
**Standard:** Strict distinction between files on disk, model routing selection (L3), native host skill dispatch (L4), and verified host delivery (L5). Zero synthetic tool calls.

---

## 1. Executive Summary & Verified Counts

| Evaluation Level | Canonical 85 Suite | 25 High-Priority Suite | Status | Core Root Cause |
|---|---|---|---|---|
| **L1: Contract Schema** | 85 / 85 PASS | 25 / 25 PASS | **PASS** | Specification schema matches contract |
| **L2: Target Resolve** | 7 PASS, 78 NOT_RUN | 6 PASS, 19 NOT_RUN | **PARTIAL** | Verified exact ticket numbers on observed trials |
| **L3: Model Route Selection** | 7 PASS, 78 NOT_RUN | 6 PASS, 19 NOT_RUN | **PARTIAL** | Exact canonical stimuli evaluated without answer exposure |
| **L4: Native Invocation** | **0 / 85 (7 BLOCKED, 78 NOT_RUN)** | **0 / 25 (6 BLOCKED, 19 NOT_RUN)** | **BLOCKED** | Host session root mismatch prevents skill registration |
| **L5: Verified Outcome** | **0 / 85 NOT_RUN** | **0 / 25 NOT_RUN** | **NOT_RUN** | Dependent on Level 4 host dispatch |

**Official CLI Audit Result (`skills/brad/scripts/audit_routing_results.py`):**
```json
{
  "total": 85,
  "observed": 7,
  "selection": {
    "PASS": 7,
    "NOT_RUN": 78
  },
  "invocation": {
    "NOT_RUN": 85
  },
  "delivery": {
    "BLOCKED": 7,
    "NOT_RUN": 78
  }
}
```

---

## 2. Environment & Host Discovery Analysis

### A. Host Configuration at Session Startup
- **Host IDE:** Google Antigravity 1.1.12 on Windows 11
- **Active Host Workspace Root:** `c:\Projects\Personal\brad` (Official local git repository)
- **Active Host Skill Catalog:** 53 global and built-in skills registered at session startup.
- **BMAD Presence in Active Host Root:** **0 BMAD skills registered.**
  - `c:\Projects\Personal\brad\.agents/` does not exist (adhering strictly to BRAD's rule against mutating the core repository with unbundled framework files).

### B. Isolated BMAD Workspace State
- **Workspace Path:** `C:\Projects\Personal\brad-labs\relaydesk-v050\bmad-workspace`
- **Installed Frameworks:**
  - BMAD Method v6.12.4
  - TEA (Test Architecture Enterprise) v1.27.2
  - BMM (Business/Management/Architecture) modules
- **Files on Disk:**
  - 40 skill packages installed in `.agents/skills/` (`bmad-prd`, `bmad-code-review`, `bmad-testarch-test-design`, `bmad-build`, `bmad-sprint-planning`, `bmad-create-epics-and-stories`, etc.)
  - Full Python runtime scripts in `_bmad/scripts/`
  - Central manifests in `_bmad/_config/` (`bmad-help.csv`, `skill-manifest.csv`)
- **Verified Script Execution:**
  Direct execution of `python _bmad/scripts/resolve_config.py --project-root .` was executed and returned code 0, resolving:
  - Core: user `NiamatMarjan`, project `bmad-workspace`, output `_bmad-output`
  - Module `bmm`: planning artifacts and implementation artifacts paths
  - Module `tea`: test design (`_bmad-output/test-artifacts/test-design`), review (`test-reviews`), and trace (`traceability`)
  - Agents: Mary (Analyst), John (PM), Sally (UX), Winston (Architect), Amelia (Senior Dev), Murat (Master Test Architect / TEA)

---

## 3. Workflow Execution Experiments (Tests A, B, C)

### Test A: Direct Native BMAD Workflow Execution
- **Intended Workflow:** `bmad-prd` (or `bmad-code-review`)
- **Host Invocation Stimulus:** Direct user slash command `/bmad-prd` or invocation via host agent.
- **Observed Behavior:**
  - The host session is anchored to `c:\Projects\Personal\brad`.
  - The host skill registry did not discover `bmad-workspace/.agents/skills` at startup because it scans only the active project root and global directories.
  - The host command parser fails to resolve `/bmad-prd` as a recognized skill or slash command.
- **Classification:** **HOST_SKILL_DISCOVERY_BOUNDARY_BLOCKER** (unbundled workspace dependency).
- **Evidence:** Host startup skill list contains 53 skills; exactly 0 match `bmad-*`.

### Test B: BRAD-Mediated Workflow Execution
- **Intended Workflow:** BRAD-coordinated planning lane (`/brad plan Create epics and stories from approved PRD; no code.`, scenario `V6-01`).
- **Observed BRAD Selection:**
  - Selected Workflow: `bmad-create-epics-and-stories`
  - Mutation Scope: `DOCUMENTS_ONLY`
  - Remote Permission: `NONE`
  - Ticket ID: `null` (unbounded planning phase)
  - Evaluator Verdict: **L3 PASS** (Exact canonical skill agreement)
- **Host Invocation Dispatch:**
  - BRAD coordinator instructs host to invoke native skill `bmad-create-epics-and-stories`.
  - Host fails to dispatch: skill identifier not in active host registry.
- **Classification:** **HOST_INTEGRATION_BLOCKER** (BRAD correctly selected the native workflow, but host could not dispatch).

### Test C: QA / TEA Test-Design Workflow Execution
- **Intended Workflow:** BRAD-coordinated QA lane (`/brad qa Create a risk-based P0-P3 test strategy for epic 4.`, scenario `QA-01`).
- **Observed BRAD Selection:**
  - Selected Workflow: `bmad-testarch-test-design`
  - Mutation Scope: `DOCUMENTS_ONLY`
  - Remote Permission: `NONE`
  - Target: `epic 4`
  - Evaluator Verdict: **L3 PASS** (Exact canonical skill agreement)
- **Host Invocation Dispatch:**
  - BRAD coordinator instructs host to invoke native skill `bmad-testarch-test-design`.
  - Host fails to dispatch: skill identifier not in active host registry.
- **Classification:** **HOST_INTEGRATION_BLOCKER**.

---

## 4. Defect vs Blocker Classification for ChatGPT

1. **Host/Integration Blocker (Not a BRAD Routing Defect):**
   - Native BMAD skills are discovered by Antigravity only when the workspace containing `.agents/skills/` is opened as the root project at session startup.
   - When BRAD operates in an external repository (e.g. `c:\Projects\Personal\brad`), Antigravity does not dynamically mount external workspace directories without host configuration or global plugin symlinking.
   - **Recommendation for BRAD Core:** `brad doctor` should explicitly check whether the active workspace root matches the configured BMAD installation path, and warn when BMAD is installed in a sibling workspace that the active host session cannot see.

2. **Stimulus Canonicality Audit:**
   - 7 scenarios (`V6-01`, `V6-02`, `V6-03`, `V6-10`, `QA-01`, `PLAN-01`, `DEL-05`) evaluated exact canonical prompts and are verified L3 PASS.
   - 5 scenarios (`V6-06`, `V6-08`, `V7-03`, `QA-08`, `EDGE-01`) evaluated variant prompts; they have been reclassified as exploratory tests and excluded from the benchmark numerator.
   - Canonical numerator is frozen at 7 PASS, 78 NOT_RUN.

3. **Minimal Reproduction for Host Native Dispatch:**
   To verify end-to-end L4 host dispatch in a future test lab:
   1. Open `C:\Projects\Personal\brad-labs\relaydesk-v050\bmad-workspace` directly as the workspace root in a fresh Antigravity window.
   2. Ensure `git init` is executed in `bmad-workspace` so that the Antigravity repository walker detects the project root.
   3. Verify at session initialization that `/bmad-*` skills appear in the host's available skills catalog.
