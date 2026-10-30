# Routing correctness and evidence boundaries

BRAD's skill is an AI wrapper; its optional CLI preflight is deterministic and
does not dispatch workflows. A label-based evaluator
cannot prove that the native workflow executed. Before invoking a specialist,
read the **actual installed** native `SKILL.md` and its prerequisite/input contract.

## High-impact intent distinctions

| Requested outcome | Preferred native owner **if actually installed** | Wrong fallback |
|---|---|---|
| Generate epics/stories from approved PRD | `bmad-create-epics-and-stories` (v6), native PO/ticket planning (v7) | `bmad-prd` (creates PRD, not stories) |
| Create/update sprint plan or assess readiness | native sprint planning/status | `bmad-create-epics-and-stories` alone |
| Refine ticket with no coding | PO/refinement native workflow | `bmad-build` implementation |
| E2E tests | `bmad-qa-generate-e2e-tests` | `bmad-help` pretending tests were generated |
| Acceptance tests before code | `bmad-testarch-atdd` | Code review or generic help |
| Test-suite quality audit, read-only | `bmad-testarch-test-review` | `bmad-help` or code modification |
| Trace requirements to tested evidence | `bmad-testarch-trace` | Mark gate green without trace evidence |
| PR code review | `bmad-code-review` with edit policy | `bmad-help` output as review evidence |
| Architecture correction/replanning | native `bmad-correct-course` or PO replanning | just architecture document generation |
| Status/prompts like "where am I" | `bmad-help`/hub | Full developer Build |

If the requested skill is not installed, do not force the nearest sounding
workflow as a substitute. Explain the missing module or find a genuinely
compatible installed workflow, identify the changed capabilities, and request
approval if the alternative would materially change the outcome.

## Independent verification

- **L1:** static spec contract; **L2:** target resolve; **L3:** selected native
  skill; **L4:** execution trace referencing a real invocation; **L5:** delivered
  output with test, artifact or remote evidence. These are distinct denominators.
- Compare native skill identifiers **exactly**, not prefixes (`bmad-build` is
  not `bmad-build-auto`; `bmad-prd` is not epic planning).
- Report `PASS`, `FAIL`, `PARTIAL`, `BLOCKED`, `UNSUPPORTED`, and `NOT_RUN`.
  Missing logs do not imply success. A route label is not a specialist trace.
- Use `scripts/audit_routing_results.py` to audit JSON observations against
  `evals/routing-cases.json`; read the evaluator's limitations. For conditional
  expected routes it returns `REVIEW_REQUIRED` instead of guessing.
- The sample `evals/reported-regressions.json` records selected labels in a
  separately supplied October 2026 validation dossier for regression testing.
  Those entries **are not** independently verified host execution traces.
- Never use an arbitrary badge or a summary such as "85/85 static passes" to
  claim "85/85 native agent calls passed".
