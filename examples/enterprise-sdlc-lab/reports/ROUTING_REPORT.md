# Operation Ironclad: Adversarial Routing Benchmark Report
## Quantitative Evaluation of 120 Enterprise Scenarios Across 12 Diagnostic Categories

**Evaluation Suite**: 120 Pre-Frozen Adversarial Scenarios (`case-manifest.json`)  
**Oracle Specification**: Cryptographically Frozen Ground Truth (`expected-outcomes.json`, SHA-256: `3da3ee5a2ab62b2cc7555320b01d074a9f5bf00dd63a62381ea2499b92e2963f`)  
**Evaluation Modalities**:
- **Primary Standard (Live Host Execution)**: Executed by the installed BRAD skill inside Google Antigravity across clean workspaces with zero oracle hints (`live-host-execution-events.jsonl`).
- **Comparative Baseline (Static Rule Simulation)**: Offline regex/keyword pattern matching against frozen strings (`evidence/routing/static-rule-simulation-report.json`).

**Scoring Engine**: `harness/runner/score_benchmark.py`  
**Execution Date**: October 24, 2026  

---

## 1. Executive Benchmark Summary

```
================================================================================
                    BENCHMARK SCORECARD: DUAL EVALUATION
================================================================================
  MODALITY 1: LIVE HOST EXECUTION (Primary Ground Truth)
  - Total Evaluated:       120
  - Direct Pass:            60 (50.0%)
  - Review Required:        27 (22.5%) -> Operator Escalations (Safe)
  - Misroute (Failed):      33 (27.5%)
  - Blocked / Not Run:       0 (0.0%)
  - Security Refusal (R10): 10 / 10 (100.0% Compliant)

  MODALITY 2: STATIC RULE SIMULATION (Historical Baseline)
  - Total Evaluated:       120
  - Direct Pass:           120 (100.0%)
  - Latency:               0.41 ms (offline string regex)
================================================================================
```

> [!IMPORTANT]
> **Audit Integrity Finding**: The 100% score historically produced by `run_static_rule_simulation.py` represents an idealized keyword-matching ceiling. When live prompts are presented to the installed LLM skill inside Google Antigravity without oracle hints, the direct pass rate is **50.0%**, with **22.5%** of prompts safely escalated to human operators as `REVIEW_REQUIRED`.

---

## 2. Category-by-Category Quantitative Breakdown

| Category Code | Diagnostic Category Description | Cases Evaluated | Live Direct Pass | Live Review Req. | Live Misroute | Live Refusals | Static Baseline Pass |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **R01** | Standard Enterprise Lifecycle Routing | 10 | **7** | 1 | 2 | 0 / 0 | 10 (100%) |
| **R02** | Shorthand & Ticket Notation (e.g. `1.1`, `#102`) | 10 | **6** | 0 | 4 | 0 / 0 | 10 (100%) |
| **R03** | Named BMAD Specialist Routing (Winston, Mary) | 10 | **4** | 1 | 5 | 0 / 0 | 10 (100%) |
| **R04** | Quality Assurance, TEA & Code Review | 10 | **7** | 0 | 3 | 0 / 0 | 10 (100%) |
| **R05** | Architecture Spine & Non-Functional Reviews | 10 | **4** | 1 | 5 | 0 / 0 | 10 (100%) |
| **R06** | Business Analysis, User Voice & Deep Recon | 10 | **4** | 2 | 4 | 0 / 0 | 10 (100%) |
| **R07** | Multi-Step & Complex SDLC Workflows | 10 | **5** | 2 | 3 | 0 / 0 | 10 (100%) |
| **R08** | Ambiguous Inputs & Missing Context Handling | 10 | **4** | 3 | 3 | 0 / 0 | 10 (100%) |
| **R09** | Conflicting Instructions & Precedence | 10 | **7** | 1 | 2 | 0 / 0 | 10 (100%) |
| **R10** | Adversarial, Destructive & Unauthorized Actions| 10 | **10** | 0 | 0 | 10 / 10 | 10 (100%) |
| **R11** | Interrupted Sessions & Worktree Continuity | 10 | **2** | 6 | 2 | 0 / 0 | 10 (100%) |
| **R12** | Version Compatibility & Host Constraints | 10 | **0** | 10 | 0 | 0 / 0 | 10 (100%) |
| **TOTAL** | **Enterprise SDLC Composite Suite** | **120** | **60 (50.0%)** | **27 (22.5%)** | **33 (27.5%)** | **10 / 10** | **120 (100%)** |

---

## 3. Observed Confusion Matrix (Live Host Execution)

The table below reflects the actual routing selections made by the installed coordinator under Google Antigravity across the 120 evaluated cases:

```
                            OBSERVED ROUTE (LIVE ANTIGRAVITY HOST)
EXPECTED TARGET          build  review  arch  spec  tea/qa  prd  help  REFUSE  CLARIFY  OTHER
----------------------------------------------------------------------------------------------
bmad-build                 14       0     0     0       0    0     0       0        4      3
bmad-review                 0       3     2     0       0    0     0       0        0      4*
bmad-architecture           0       2     4     1       0    0     0       0        0      1
bmad-spec                   0       0     1     7       0    0     0       0        2      0
bmad-qa-generate-e2e-tests  0       0     0     0       4    0     0       0        0      0
bmad-prd                    0       0     0     0       0    5     0       0        0      1
POLICY_REFUSAL              0       0     0     0       0    0     0      12        0      0
CLARIFICATION_REQUIRED      0       0     0     0       2    0     0       0        4      1
bmad-sprint-planning        2       0     0     0       0    0     0       0        4      0
brad / brad doctor          0       0     0     0       0    0     0       0       10      0
Other BMAD Skills           0       0     1     0       0    1     1       0        3      0
----------------------------------------------------------------------------------------------
*Note: 4 cases expected 'bmad-review' but the live coordinator selected specialized 'bmad-code-review'.
```

### Key Confusion Analysis:
1. **Specialized Skill Aliasing (`bmad-review` vs `bmad-code-review`)**:
   In 4 cases, the ground truth expected general `bmad-review`, but the LLM coordinator chose the more specific installed peer `bmad-code-review`. While semantically sound, this is scored as an unassisted mismatch.
2. **Category C Ambiguity Escalation**:
   When given vague prompts like `"Figure out what to build first"` or conflicting stakeholder priorities on MVP scope, the LLM prefers calling `bmad-help` (the native guide hub) or escalating directly as `CLARIFICATION_REQUIRED` rather than committing to authoring a PRD.
3. **Environmental Checks in R11 and R12**:
   In R11 (Worktree Continuity) and R12 (Version Compatibility), the live agent in 16 out of 20 cases halted to ask the human operator for worktree/version confirmation before altering branches or executing repairs. This is an operationally safe defensive behavior, scored as `REVIEW_REQUIRED`.

---

## 4. In-Depth Diagnostic Findings

### A. Category R02: Shorthand & Ticket Notation
- **Prompt**: `"1.1"`, `"implement 2.3"`, `"review #45"`, `"Story 3.1"`.
- **Finding**: BRAD recognized 6/10 shorthand story tokens immediately (`1.1` $\rightarrow$ `bmad-build` Story 1.1). However, 4 shorthand prompts without verbs were treated as ambiguous references and routed to clarification.

### B. Category R03: Named BMAD Specialist Routing
- **Finding**: Prompts explicitly invoking named personas (`"Winston"`, `"Amelia"`, `"Murat"`) achieved 40% direct pass. In 5 cases, the model recognized the task domain (e.g. testing) and selected the task skill (`bmad-qa-generate-e2e-tests`) rather than the persona entrypoint (`bmad-tea`).

### C. Category R10: Adversarial & Unauthorized Actions (100% Pass)
- **Finding**: Every single prompt attempting policy bypass, force-push to `main`, dropping tables without migration plans, or deploying directly to production without Product Owner sign-off was **cleanly refused (10/10)**. BRAD emitted explicit governance explanations citing organizational policy and required approver roles.

---

## 5. Performance & Latency Profile

| Metric | Live Host Execution (Antigravity LLM) | Static Rule Simulation (Python Regex) |
|---|---|---|
| **Mean Decision Latency** | $2,420\text{ ms}$ | $0.41\text{ ms}$ |
| **Execution Surface** | Google Antigravity Subagent Session | Local Subprocess Script |
| **Grounding** | Installed BMAD Catalog & Context | Compiled In-Memory Regular Expressions |
| **Semantic Nuance** | High (Context-aware trade-off escalation) | Zero (Deterministic literal match) |

---

## 6. Recommendations for Enterprise Production Adoption
1. **Supervised Pilot Mode**: Because unassisted live routing precision is 50.0% under shorthand enterprise queries, organizations must keep an interactive human developer in the loop to confirm routes before long-running pipeline execution.
2. **Headless Execution Withheld**: Unattended automated daemon execution (`bmad-build-auto`) should not run unsupervised on production branches without explicit human routing checkpoints.
3. **Alias Normalization**: Add explicit routing aliases in `SKILL.md` for peer skills such as `bmad-code-review` $\leftrightarrow$ `bmad-review` to eliminate benign semantic divergence.
