# Production v1.0 Roadmap & Next Demo Plan

**Prepared By:** BRAD Validation Team  
**Date:** 2026-10-20  

---

## 1. Longitudinal Progression Context

Across successive releases, BRAD's validation experiments have progressively raised the rigor of evidence:

1. **v0.4.1 (Concourse Lab):** Evaluated early prototype vs initial server implementation. Verdict: `PARTIAL`. Established immutable baseline records.
2. **v0.5.0 (RelayDesk SDLC):** Built full-stack service request platform with persistent SQLite, 3 Git worktrees, 10 collaboration exercises, SLA engine, webhook dispatcher, 11 automated test suites, and audited all 85 canonical routing scenarios. Verified 3 candidate improvements on an isolated branch with failing tests first.

---

## 2. Production v1.0 Readiness Gap Analysis

| Readiness Category | Current Status in v0.5.0 | Discovered Gap | Required for v1.0 |
|---|---|---|---|
| **Installation Reliability** | HIGH | `doctor` lacked structured machine-readable setup commands | Integrated `installCommand` in candidate; verify across npm registries |
| **Routing Correctness** | MEDIUM-HIGH | 42 exact native matches, 43 conditional/freeform routes | Formalize regex patterns for conditional planning/status routes |
| **Native Invocation (L4)** | BLOCKED (in host) | Host environment lacked installed BMAD CLI | Execute evaluation in a host environment with pre-installed BMAD v6/v7 |
| **Collaboration & Git Safety** | HIGH | Worktree coordination verified; no automated multi-worktree conflict detection | Add multi-worktree conflict preflight in `delivery_preflight.py` |
| **QA / TEA Integration** | MEDIUM | Simulated QA defect lifecycle passed; TEA workflows uninstalled in host | Live execution with installed TEA modules |
| **Recovery / Resumption** | HIGH | Verified resumption from `INTAKE-PAUSE.json` without duplicated state | Standardize `.brad/checkpoint.json` convention |

---

## 3. Recommended Next Demonstration: NexusMesh (Multi-Tenant IoT Telemetry Gateway)

### Project Archetype
A distributed telemetry pipeline and ingestion gateway (Go / Node.js + TimescaleDB/SQLite + React dashboard) processing IoT edge device events.

### Specific Stress-Test Objectives
1. **Live Host BMAD Invocation:** Pre-install official BMAD v6.12 and v7 preview in the environment to execute all 85 scenarios with live L4/L5 execution traces.
2. **Multi-Agent Host Spawning:** Exercise native subagent spawning where the host supports concurrent independent sessions (e.g. Anthropic Claude Desktop or Antigravity team coordination).
3. **External Issue Tracker Adapter:** Stress-test the proposed local JSON/YAML tracking adapter (IMP-004) mapping Jira/Linear style epics and stories to native BMAD artifacts.
4. **Preflight Multi-Worktree Inspection:** Validate automated sibling-worktree conflict detection (IMP-005) before branches are created.
