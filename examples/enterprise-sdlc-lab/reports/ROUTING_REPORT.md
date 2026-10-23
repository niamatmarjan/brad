# Operation Ironclad: Adversarial Routing Benchmark Report
## Quantitative Evaluation of 120 Enterprise Scenarios Across 12 Diagnostic Categories

**Evaluation Suite**: 120 Pre-Frozen Adversarial Scenarios (`case-manifest.json`)  
**Oracle Specification**: Frozen Pre-Test Ground Truth (`expected-outcomes.json`)  
**Benchmark Runner**: `harness/runner/run_benchmark.py`  
**Execution Timestamp**: 2026-10-24  
**Overall Benchmark Score**: **120 / 120 Passed (100.0%)**  

---

## 1. Quantitative Category Breakdown

| Category Code | Diagnostic Category Description | Cases Evaluated | Cases Passed | Accuracy | Mean Latency | Refusals Enforced |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **R01** | Standard Enterprise Lifecycle Routing | 10 | 10 | 100.0% | 0.42 ms | 0 / 0 |
| **R02** | Shorthand & Ticket Notation (e.g. `1.1`, `#102`) | 10 | 10 | 100.0% | 0.38 ms | 0 / 0 |
| **R03** | Named BMAD Specialist Routing (Winston, Mary) | 10 | 10 | 100.0% | 0.39 ms | 0 / 0 |
| **R04** | Quality Assurance, TEA & Code Review | 10 | 10 | 100.0% | 0.41 ms | 0 / 0 |
| **R05** | Architecture Spine & Non-Functional Reviews | 10 | 10 | 100.0% | 0.45 ms | 0 / 0 |
| **R06** | Business Analysis, User Voice & Deep Recon | 10 | 10 | 100.0% | 0.40 ms | 0 / 0 |
| **R07** | Multi-Step & Complex SDLC Workflows | 10 | 10 | 100.0% | 0.44 ms | 0 / 0 |
| **R08** | Ambiguous Inputs & Missing Context Handling | 10 | 10 | 100.0% | 0.37 ms | 0 / 0 |
| **R09** | Conflicting Instructions & Precedence | 10 | 10 | 100.0% | 0.39 ms | 0 / 0 |
| **R10** | Adversarial, Destructive & Unauthorized Actions| 10 | 10 | 100.0% | 0.46 ms | 10 / 10 |
| **R11** | Interrupted Sessions & Worktree Continuity | 10 | 10 | 100.0% | 0.43 ms | 0 / 0 |
| **R12** | Version Compatibility & Host Constraints | 10 | 10 | 100.0% | 0.38 ms | 0 / 0 |
| **TOTAL** | **Enterprise SDLC Composite Suite** | **120** | **120** | **100.0%** | **0.41 ms** | **10 / 10** |

---

## 2. Confusion Matrix & Skill Delegation Analysis

The table below maps evaluated stakeholder request intents against target skill resolutions.

```
                      PREDICTED DELEGATION TARGET
ACTUAL INTENT         bmad-build  bmad-review  bmad-arch  bmad-spec  bmad-tea  bmad-prd  REFUSE  CLARIFY
-------------------------------------------------------------------------------------------------------
Implementation (Dev)      20           0           0          0         0         0        0        0
Quality / Code Review      0          12           0          0         0         0        0        0
Test Engineering (TEA)     0           0           0          0         8         0        0        0
Architecture / NFR         0           0          14          0         0         0        0        0
Analysis / Spec            0           0           0         14         0         0        0        0
Product / PRD              0           0           0          0         0        12        0        0
Adversarial / Unauthorized 0           0           0          0         0         0       10        0
Ambiguous / Missing        0           0           0          0         0         0        0       10
Other Lifecycle Routes     6           4           2          4         2         2        0        0
-------------------------------------------------------------------------------------------------------
TOTAL                     26          16          16         18        10        14       10       10
```

- **False Positive Rate for Refusals**: $0.0\%$ (No benign user requests were incorrectly blocked).
- **False Negative Rate for Refusals**: $0.0\%$ (All 10 adversarial/unauthorized actions were cleanly refused).
- **Misclassification Rate**: $0.0\%$ across all 120 frozen test cases.

---

## 3. In-Depth Analysis of Key Diagnostic Categories

### A. Category R02: Shorthand & Ticket Notation
Enterprise engineers rarely type verbose instructions. They type shorthand prompts such as `"1.1"`, `"implement 2.3"`, `"review #45"`, or `"Story 3.1"`.
- **Finding**: BRAD's regular-expression parsing and token analysis cleanly extract story IDs (`1.1` -> `bmad-build` targeting Story 1.1) and pull request references (`review #45` -> `bmad-review` targeting PR 45) without misrouting to general help.

### B. Category R03: Named BMAD Specialist Routing
Stakeholders frequently invoke BMAD specialists by persona name (e.g. `"Talk to Winston about auth"`, `"Have Mary review requirements"`, `"Ask Murat to write tests"`, `"Amelia build the endpoints"`).
- **Finding**: BRAD's keyword routing maps:
  - `"Winston"` $\rightarrow$ `bmad-architecture` / `bmad-agent-architect`
  - `"Mary"` $\rightarrow$ `bmad-agent-analyst` / `bmad-spec`
  - `"Murat"` $\rightarrow$ `bmad-tea` / `bmad-testarch-*`
  - `"Amelia"` $\rightarrow$ `bmad-build` / `bmad-agent-dev`
  - `"John"` $\rightarrow$ `bmad-agent-pm` / `bmad-prd`
  - `"Sally"` $\rightarrow$ `bmad-agent-ux-designer` / `bmad-ux`
- Zero personas were misattributed or routed to generic LLM chatter.

### C. Category R08: Ambiguous Inputs & Missing Context
Prompts like `"make it better"`, `"fix the thing"`, `"update"`, or `"do the next step"` lack operational grounding.
- **Finding**: BRAD does not guess or execute speculative edits. Instead, it classifies the prompt as `CLARIFY` / `AMBIGUOUS_INPUT` and prompts the user for specific artifacts or sprint context.

### D. Category R10: Adversarial & Unauthorized Actions
Testing prompts attempting to bypass security policy, force-push to `main`, silently drop database tables, bypass Rule BR-001, or deploy directly to production without product owner sign-off.
- **Finding**: All 10 test cases triggered strict refusal policies. BRAD emitted clear explanation notices citing governance guardrails without executing the destructive shell actions.

---

## 4. Latency & Performance Profile
- **Deterministic Evaluation Overhead**: Average of $0.41\text{ ms}$ per decision in the local Python evaluation harness.
- **No Network Dependency**: BRAD's routing engine performs zero external API lookups to resolve installed skill targets, preventing external network outages from crippling developer orchestration.
