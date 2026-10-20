# Baseline v0.5.0 vs Candidate Improvements: Regression Comparison

**Evaluation Run:** `relaydesk-v050-exp-01`  
**Date:** 2026-10-20  

---

## 1. Test Suite & Verification Matrix

| Check / Test Suite | Baseline v0.5.0 (`dd1cddc`) | Candidate (`0b61d38`) | Delta / Impact |
|---|---|---|---|
| Node.js CLI Tests (`tests/*.test.mjs`) | 33 passed, 0 failed | 34 passed, 0 failed | +1 new regression test verifying machine-readable `installCommand` |
| Python Unittest Suite (`skills/brad/tests`) | 21 passed, 0 failed | 21 passed, 0 failed | Zero regressions across inspector, preflight, audit |
| Repository Hygiene (`tools/check_repository.py`) | PASS | PASS | Maintained all policy links and contracts |
| Package Packaging Check (`npm pack --dry-run`) | PASS (36 files) | PASS (36 files) | Clean distribution, no unwanted artifacts |
| Canonical Routing Cases Audited | 85 cases (42 PASS, 43 REVIEW) | 85 cases (42 PASS, 43 REVIEW) | Preserved 100% contract compliance |
| Doctor Uninstalled BMAD JSON Schema | `installCommand: undefined` | `installCommand: 'npx bmad-method install'` | Deterministic agent recovery enabled |
| Increment-Aware Routing Spec | Missing explicit increment rule | Explicit increment lane defined in `SKILL.md` | Prevents greenfield PRD overwrite |
| Read-Only Review Safety Spec | Implicit via priority rules | Explicit prohibition of branch/PR on review | Eliminates accidental delivery writes |

---

## 2. Behavioral Differences & Risk Assessment

### Machine-Readable Doctor
- **Before:** When a user or agent ran `node cli/brad.mjs doctor --json` on a repository without BMAD, the agent had to perform natural language parsing on `note: "BMAD Method not detected. Install it separately using the official npx bmad-method install or v7 skills setup."` to deduce the recovery command.
- **After:** The JSON payload directly returns `"installCommand": "npx bmad-method install"`. The risk of this change is zero, as existing consumers ignoring unknown keys remain completely unaffected.

### Module Increment Lane
- **Before:** In an ongoing project with existing PRDs and multiple module increments (like RelayDesk), requesting "extend intake increment with SLA tracking" could be parsed as a new initiative, recommending `bmad-prd`.
- **After:** BRAD guides the agent to read existing PRDs and architecture first, isolating the change to an increment refinement workflow.

### Review-Only Safety
- **Before:** Ambiguity between Rule #1 ("Honor user intent") and Rule #4 ("One command, one requested outcome") could tempt models to prepare branches and draft PRs even when the user merely said "review ticket 1.1".
- **After:** `ticket-to-pr.md` explicitly forbids branch creation and PR opening on review requests without explicit write consent.
