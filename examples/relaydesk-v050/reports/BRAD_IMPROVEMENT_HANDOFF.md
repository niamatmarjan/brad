# BRAD Improvement Engineering Handoff

**Author:** Gemini 3.8 Flash (High)  
**Baseline Release:** v0.5.0 (Immutable)  
**Candidate Branch:** `candidate/v0.5.1-improvements`  
**Candidate Commit SHA:** `0b61d38`  
**Date:** 2026-10-20  

---

## 1. Executive Summary for Maintainers & Incoming Agents

This document provides complete instructions for maintainers or incoming coding agents to inspect, verify, and incorporate candidate improvements developed during the RelayDesk enterprise SDLC evaluation.

All candidate changes have been isolated in branch `candidate/v0.5.1-improvements` in worktree `C:\Projects\Personal\brad-labs\brad-candidate`. The baseline repository at `C:\Projects\Personal\brad` remains completely unmodified on `main`.

---

## 2. Confirmed Defect List & Priorities

| ID | Title | Severity | Priority | Affected Files | Status |
|---|---|---|---|---|---|
| FND-001 | Missing `installCommand` property in `doctor` JSON output | HIGH | HIGH | `cli/core.mjs`, `tests/cli.test.mjs` | Verified Fixed in Candidate |
| FND-002 | Ambiguous routing between module increment deltas and greenfield PRDs | MEDIUM | HIGH | `skills/brad/SKILL.md`, `skills/brad/references/epics-and-stories.md` | Verified Fixed in Candidate |
| FND-003 | Ticket-to-PR over-eager branch creation on read-only review requests | MEDIUM | HIGH | `skills/brad/SKILL.md`, `skills/brad/references/ticket-to-pr.md` | Verified Fixed in Candidate |
| FND-004 | Absence of multi-worktree conflict detection in delivery preflight | LOW | MEDIUM | `skills/brad/scripts/delivery_preflight.py` | Backlog for v1.0 |
| FND-005 | Missing configurable local tracker mapping adapter | LOW | MEDIUM | `skills/brad/references/ticket-to-pr.md` | Backlog for v1.0 |

---

## 3. Reproduction Commands & Evidence

### FND-001 Reproduction
```powershell
# Run doctor on an empty or unconfigured folder with --json
node cli/brad.mjs doctor --dir (New-Item -ItemType Directory -Path "$env:TEMP\brad-repro" -Force).FullName --json
```
**Baseline Behavior:** Output JSON has `bmad.detected = false` and `bmad.note`, but `bmad.installCommand` is `undefined`.  
**Candidate Behavior:** Output JSON explicitly contains `"installCommand": "npx bmad-method install"`.

### Verification Suite Commands
```powershell
cd C:\Projects\Personal\brad-labs\brad-candidate

# 1. Run Node.js test suite (34 tests including new regression test)
node --test tests/*.test.mjs

# 2. Run Python unittests (21 tests)
python -m unittest discover -s skills/brad/tests -v

# 3. Run repository hygiene and contract audit
python tools/check_repository.py

# 4. Run npm package dry-run check
npm.cmd pack --dry-run --json
```

---

## 4. Exact File Modifications & Diffs

### 1. `cli/core.mjs`
```diff
--- a/cli/core.mjs
+++ b/cli/core.mjs
@@ -248,4 +248,5 @@ export function bmadDoctor(root) {
     },
     stateHints: { v6, v7, mixed: v6 && v7 }, warnings,
+    installCommand: detected ? null : 'npx bmad-method install',
     note: detected ? 'BMAD installation hints found...' : 'BMAD Method not detected...'
   };
 }
```

### 2. `tests/cli.test.mjs`
```diff
--- a/tests/cli.test.mjs
+++ b/tests/cli.test.mjs
@@ -118,3 +118,7 @@ test('doctor reports missing BMAD rather than claiming installation', () => fixt
   assert.match(r.bmad.note, /not detected/);
 }));
+test('doctor provides machine-readable installCommand when BMAD is not detected', () => fixture(root => {
+  const r = execute(['doctor', '--dir', root]);
+  assert.equal(r.bmad.detected, false);
+  assert.equal(r.bmad.installCommand, 'npx bmad-method install');
+}));
```

### 3. `skills/brad/SKILL.md`
```diff
--- a/skills/brad/SKILL.md
+++ b/skills/brad/SKILL.md
@@ -95,2 +95,4 @@
 - `/brad epic 2` / `finish sprint`: resolve scope/dependencies, choose
   native planning or installed orchestrator; see epics-and-stories.
+- `/brad increment <name>`, `refine increment`, `extend increment`: **module increment lane**;
+  inspect existing PRD and architecture first, refine approved increment delta without rewriting greenfield PRD.
```

### 4. `skills/brad/references/ticket-to-pr.md`
```diff
--- a/skills/brad/references/ticket-to-pr.md
+++ b/skills/brad/references/ticket-to-pr.md
@@ -6,2 +6,5 @@
 lane unless the user explicitly asks for status, planning, QA or review only.
+Read-only review safety: When a request specifies 'review', 'audit', 'inspect',
+or 'assess', ticket-to-pr delivery is strictly forbidden from creating topic branches,
+writing code, or publishing PRs without explicit write authorization.
```

---

## 5. Candidate Test Results Summary

- **Node.js Test Suite:** 34 passed, 0 failed (36.8s)
- **Python Unittest Suite:** 21 passed, 0 failed (3.8s)
- **check_repository.py Audit:** PASS (Version 0.5.0, policy links, source hygiene)
- **npm pack Check:** PASS (36 files, 0 warnings, sha `9eb2e812b8c87eac18c2329d2ecd5b1dd7df866a`)

---

## 6. Remaining Limitations & Boundaries

1. **Host Native BMAD Installation:** BRAD remains a thin coordinator. It does NOT automatically install BMAD without user consent. The machine-readable `installCommand` property enables client agents to prompt the user or execute the setup command cleanly.
2. **Subagent Execution Proof:** Executing instructions within the same AI agent context does not constitute independent subagent collaboration. Multi-agent proof requires separate agent sessions or host-level subagent spawning APIs.
3. **No Automatic Version Bump or Tagging:** As per protocol Section 15, `VERSION` remains `0.5.0`. Do NOT bump package version or create git tags until maintainer review and authorization.

---

## 7. Recommended Next Version Scope (v0.6.0 / v1.0)

1. Integrate the `candidate/v0.5.1-improvements` branch into `main` via maintainer PR.
2. Implement multi-worktree conflict detection in `delivery_preflight.py` (IMP-005).
3. Introduce configurable external tracker JSON/YAML mapping fixture (IMP-004).
4. Run validation on a host with pre-installed BMAD v6.12 and v7 preview to unlock live L4/L5 execution measurements.
