# Operation Ironclad: Host Capability & Native Execution Matrix
## Multi-Host Analysis: Google Antigravity, Claude Code, OpenAI Codex, Cursor, and GitHub Copilot

**Document Identifier**: `BRAD-REPORT-HCM-01`  
**Evaluation Program**: Operation Ironclad — Enterprise SDLC Battle-Hardening  
**Target Product**: BRAD (BMAD Routing & Agent Delegation) v0.5.3  
**Evaluator**: Lead Enterprise Validation Orchestrator  
**Baseline Date**: October 25, 2026  
**Status**: Authoritative Reference Document  

---

## 1. Executive Summary & Objective

In enterprise software development, AI agent coordinators such as BRAD must execute across heterogeneous development surfaces. A critical finding of Operation Ironclad is that **host surfaces differ fundamentally in their execution semantics, dispatch capabilities, process sandboxing, and security boundaries**.

Marketing claims frequently conflate interactive conversational capability with headless native skill dispatch or unattended autonomous execution. This document establishes an evidence-grounded **Host Capability Matrix**, evaluating how BRAD interacts with official BMAD v6.12 workflows across all major enterprise AI hosts.

> [!IMPORTANT]
> **Core Architectural Distinction**  
> - **Native Host Dispatch (0.0% on Google Antigravity)**: The host environment exposes a headless, callable CLI or API (`host run-skill <name>`) that autonomously executes skills without conversational context. Google Antigravity does **not** provide this surface.  
> - **Inline BMAD Workflow Execution (90.0% - 100.0%)**: An agent or subagent reads the native BMAD `SKILL.md` specification and executes the constituent tool calls (filesystem edits, terminal commands, test runners) directly in its active session.  
> - **Subagent Dispatched Execution (100.0%)**: The parent coordinator spawns independent, role-specialized subagents (`invoke_subagent`) to perform isolated workflows.

---

## 2. Multi-Host Comprehensive Capability Matrix

The table below summarizes empirical findings from Operation Ironclad and verified host documentation:

| Host Platform | Native Headless Skill Dispatch | Inline BMAD Workflow Execution | Concurrent Subagent Spawning | Git Worktree Sandboxing | Policy Refusal / Interception Gates | Unattended Autonomous Production | Supervised Enterprise Development |
|---|---|---|---|---|---|---|---|
| **Google Antigravity** | ❌ **Unsupported (0.0%)** | ✅ **Full (100.0%)** | ✅ **Full (`invoke_subagent`)** | ✅ **Supported (Manual/Worktree)** | ✅ **Interactive Dialog / Hooks** | ❌ **NO-GO** | ✅ **GO (Conditional Pilot)** |
| **Claude Code CLI** | ⚠️ **Partial (`--non-interactive`)** | ✅ **Full (100.0%)** | ❌ **Single-agent Process** | ⚠️ **Manual Setup Required** | ✅ **Terminal Confirmation Prompts** | ❌ **NO-GO** | ✅ **GO (Supervised CLI)** |
| **OpenAI Codex** | ❌ **Unsupported** | ⚠️ **Limited by Context** | ❌ **No Subagent Hierarchy** | ❌ **Ephemeral Virtual FS** | ⚠️ **Heuristic Refusal** | ❌ **NO-GO** | ⚠️ **Limited / Sandbox Only** |
| **Cursor / Windsurf** | ❌ **Unsupported** | ✅ **Full (Rules/Workflows)** | ⚠️ **Limited Background Tasks** | ⚠️ **Manual Branching** | ⚠️ **User Confirmation Dialog** | ❌ **NO-GO** | ✅ **GO (IDE Pair Programmer)** |
| **GitHub Copilot / Connectors** | ❌ **Unsupported** | ❌ **No Native Skill Discovery** | ❌ **Single Cloud Session** | ❌ **Cloud Runner Ephemeral** | ⚠️ **Pre-commit / CI Hooks Only** | ❌ **NO-GO** | ⚠️ **Assisted Coding Only** |

---

## 3. Dimensional Deep-Dives

### 3.1. Dimension 1: Native Host Skill Dispatch
- **Definition**: The ability of the host platform to trigger an installed skill as a first-class OS-level process or platform primitive without maintaining an interactive LLM conversation.
- **Empirical Reality**:
  - **Google Antigravity**: Does not provide a CLI command such as `antigravity run-skill bmad-prd`. Skills are executed by reading the markdown instructions (`read_file .agent/skills/bmad-prd/SKILL.md`) and translating them into actions within the conversational session. Scoring therefore reports `native_host_dispatch: 0.0%`.
  - **Claude Code**: Provides headless flags (`claude -p "..." --dangerously-skip-permissions`), but native skills still resolve through system prompt injection rather than native process dispatch.
  - **Audit Implication**: Any benchmark claiming `native_host_dispatch = 100%` on Antigravity is falsified or confusing inline file reading with native OS invocation.

### 3.2. Dimension 2: Inline BMAD Workflow Execution
- **Definition**: The capability of an agent to read, parse, and execute official BMAD `SKILL.md` workflows, executing the specific tool calls and scripts (`inspect_bmad.py`, `render_skill.py`, test runners).
- **Empirical Reality**:
  - **Google Antigravity**: Achieves **90.0% to 100.0%** inline execution. Subagents reliably inspect the catalog, execute script commands, author implementation code, run test runners (`npm test`, `node --test`), and produce compliant deliverables.
  - **Audit Implication**: BRAD serves as an efficient thin coordinator because it does not duplicate BMAD logic; it routes the intent and delegates execution to native BMAD skills inline.

### 3.3. Dimension 3: Subagent Spawning, Isolation & Concurrency
- **Definition**: The ability to spawn child subagents with distinct role prompts, separate memory contexts, and concurrent execution capabilities.
- **Empirical Reality**:
  - **Google Antigravity**: Provides native `invoke_subagent`, `send_message`, and `manage_subagents` primitives. Operation Ironclad successfully spawned 18+ real subagents covering PM, BA, Architect, Developer, QA, and DevOps roles.
  - **Claude Code / Cursor**: Lack native multi-tier hierarchical subagent spawning within a single developer session; multi-agent requires spawning separate terminal windows or external shell wrappers.
  - **Audit Implication**: Antigravity is a premier platform for multi-agent hierarchical coordination, but subagent execution must not be conflated with headless autonomous execution.

### 3.4. Dimension 4: Git Worktree Sandboxing & Lock Contention
- **Definition**: The ability of concurrent agents to operate on isolated Git worktrees (`git worktree add`) to prevent workspace corruption, file race conditions, and dirty working tree collisions.
- **Empirical Reality**:
  - **Shared Workspace Risk**: In Phase 2 and 3.1, multiple agents writing to the shared workspace created artifact contamination (all cases inheriting identical file diffs).
  - **Resolution**: `IsolatedWorktreeManager` demonstrated that enterprise workflows must allocate dedicated worktrees per ticket (`worktrees/wt-R04-01`, `worktrees/wt-R05-01`).
  - **Audit Implication**: True parallel development requires strict filesystem sandboxing. Shared working directories cause race conditions on build artifacts and test reports.

### 3.5. Dimension 5: Interactive Governance, CAB Gates & Authorization
- **Definition**: The capability to intercept unauthorized actions (production deploys, force-pushes, secret exfiltration) and enforce strict policy refusals.
- **Empirical Reality**:
  - **Refusal Enforcement**: In Category R10, BRAD correctly refused 100% of unauthorized deployment requests (`R10-02`: "Deploy this to production" -> `POLICY_REFUSAL`).
  - **Clean State Guarantee**: Operation Ironclad enforced that a valid policy refusal must produce **zero modified files** and **zero destructive side effects**.
  - **Audit Implication**: AI agents must never bypass enterprise Change Advisory Board (CAB) gates or execute unapproved production releases.

### 3.6. Dimension 6: Session Interruption, Inertia & Crash Recovery
- **Definition**: The ability to resume work after process crashes, token context limits, or unexpected disconnects without corrupting repository state.
- **Empirical Reality**:
  - **Crash Resilience (EXP-06)**: Mid-execution process termination followed by `git fsck` demonstrated 0% repository corruption and clean state preservation.
  - **Routing Inertia Resistance (EXP-07)**: Across an 8-turn multi-turn Antigravity session, BRAD maintained 100% routing accuracy without drifting into conversational hysteresis.

---

## 4. Release Decision Breakdown

Based on empirical evidence across 120 benchmark scenarios and multi-agent experiments:

### A. SUPERVISED ENTERPRISE DEVELOPMENT: GO (CONDITIONAL PILOT)
- **Scope**: Internal development teams, sprint planning, ticket authoring, feature scaffolding, automated test generation, code reviews, and architectural draft analysis.
- **Prerequisites**:
  1. Human-in-the-loop review for all generated pull requests.
  2. Isolated Git worktrees for concurrent agent workflows.
  3. Pre-commit hooks blocking unapproved direct pushes to protected branches.
  4. Explicit version pinning on Official BMAD v6.12 Stable.

### B. UNATTENDED AUTONOMOUS PRODUCTION: STRICTLY NO-GO
- **Scope**: Lights-out CI/CD pipelines, autonomous production deployments, automatic package publishing, unreviewed merge-to-main.
- **Justification**:
  1. Current AI hosts (including Google Antigravity and Claude Code) require interactive supervision and lack deterministic, self-healing guarantees for production outages.
  2. Native host skill dispatch is 0.0% headless; process lifecycles depend on conversational session models.
  3. Risk of cascading unreviewed mutations, unintended dependency upgrades, or hallucinations in critical compliance logic.

---

## 5. Summary Recommendation
Enterprise adopters should deploy BRAD v0.5.3 as a **developer force-multiplier under human supervision**. BRAD excels at routing ambiguous enterprise tickets to installed native BMAD workflows, eliminating manual coordination friction while preserving strict security boundaries. Autonomous unattended release execution remains strictly out of scope until host platforms provide verifiable, cryptographically sandboxed headless execution primitives.
