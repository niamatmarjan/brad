# Operation Ironclad: BMAD Version Compatibility Report
## Empirical Comparison: BMAD v6.12 Stable vs. BMAD v7 Preview

**Evaluator**: BRAD Engineering Operations  
**Stable Production Baseline**: Official BMAD v6.12 Stable (`workspace-v6-stable`)  
**Preview Comparison Workspace**: BMAD v7 Preview (`workspace-v7-preview`)  
**Target Orchestrator**: BRAD v0.5.3  
**Date**: October 24, 2026  

---

## 1. Architectural Differences Between v6.12 and v7 Preview

BMAD v6.12 stable and BMAD v7 preview represent distinct generations of the BMAD framework. Operation Ironclad verified both in isolated environments to evaluate compatibility, operational risks, and migration paths.

| Dimension | BMAD v6.12 Stable (Production Baseline) | BMAD v7 Preview (Experimental Workspace) |
|---|---|---|
| **Release Status** | Official, General Availability (GA) | Active Developer Preview (Pre-release) |
| **Module Architecture** | Monolithic modular skill packages (`bmad-*`) | Decoupled tool packages (`bmod-core-tools`, `bmod-method`) |
| **Dependency Locking** | Direct git repository references | Strict `skills-lock.json` manifest |
| **Workflow State Tracking** | Native `sprint-status.yaml` / `.bmad/` | Ephemeral tool state with lockfile synchronization |
| **Host Support Coverage** | Antigravity, Claude Code, Cursor, Codex | Antigravity (partial), experimental multi-host |
| **Production Readiness** | **READY (Recommended for all production use)** | **EXPERIMENTAL (Supervised evaluation only)** |

---

## 2. Experimental Verification in Isolated Workspaces

### A. BMAD v6.12 Stable Workspace Verification
- **Path**: `C:\Projects\Personal\brad-labs\prelive-acceptance-antigravity-2026-10-24\workspace-v6-stable`
- **Installed Components**:
  - `bmm` (BMAD Method Core)
  - `tea` (Test Engineering Architecture)
  - Full suite of native skills: `bmad-build`, `bmad-review`, `bmad-architecture`, `bmad-spec`, `bmad-prd`, `bmad-sprint-planning`.
- **Observed Behavior with BRAD**:
  - `brad doctor` cleanly reports all native skills discovered and up to date.
  - Native BMAD sprint state files (`sprint-status.yaml`) are read and updated natively without desynchronization.
  - Zero workflow breakages or missing module exceptions.

### B. BMAD v7 Preview Workspace Verification
- **Path**: `C:\Projects\Personal\brad-labs\prelive-acceptance-antigravity-2026-10-24\workspace-v7-preview`
- **Installed Components**:
  - `bmod-core-tools`
  - `bmod-method`
  - Manifest: `skills-lock.json`
- **Observed Behavior with BRAD**:
  - BRAD successfully identifies v7 modules via its discovery engine.
  - Workflows requiring backward-compatible v6 file structures encounter structural differences in tool paths.
  - Automatic migration between v6 and v7 is **not supported** without manual schema mapping and toolpath re-binding.

---

## 3. Migration Risks & Governance Guardrails

> [!WARNING]
> **Production Anti-Pattern: Silent Version Migration**  
> Under no circumstance should an enterprise orchestrator perform an unprompted, silent upgrade from BMAD v6.12 to v7 preview. The differences in lockfile schema and module resolution can break existing enterprise sprint tracking.

### Operational Guardrails Enforced by BRAD:
1. **Explicit Version Pinning**: BRAD requires the active BMAD version to be pinned in repository configuration.
2. **Version Mismatch Diagnostics**: If an enterprise workspace contains mixed v6/v7 artifacts, `brad doctor` emits a high-priority diagnostic warning and halts rather than corrupting tracking state.
3. **Dedicated Preview Sandboxing**: As demonstrated in Operation Ironclad, v7 preview testing must always occur in a dedicated, isolated sandbox workspace.

---

## 4. Conclusion & Recommendation
- **Enterprise Default**: Standardize on **BMAD v6.12 Stable** for all production and client engagements.
- **Preview Track**: Maintain v7 preview in isolated lab environments for forward compatibility testing until upstream declares official General Availability.
