# BRAD for each stakeholder — prompt recipes and handoffs

BRAD selects installed native BMAD workflows; it does **not** generate ten simulated agent personas. Every role below has a dedicated [full guide](README.md). These are **coding-host chat requests**, not terminal CLI commands or universally available slash syntax.

| Stakeholder | Good starting request | Handoff / acceptance |
|---|---|---|
| [Product Manager / PO](product-manager.md) | “Use BRAD and the installed native PM workflow to **draft** a PRD for [goal], listing users, outcomes, measures, non-goals and decisions. Don't approve scope for me.” | Approved intent, priorities, success measures, owner |
| [Business Analyst](business-analyst.md) | “Use BRAD for **read-only** analysis of [journey]; map actors, source-backed business rules, exceptions, acceptance examples and unknowns.” | Rules and provenance, glossary, traced acceptance |
| [Delivery Manager / Scrum Master](delivery-manager.md) | “Use BRAD to inspect native sprint state and report ready/blocked/active work with evidence; don't mutate statuses.” | Real dependencies, owners, blockers, next action |
| [Solution Architect](solution-architect.md) | “Use BRAD to compare [options] against [NFRs] and draft an **unapproved** ADR; request my architecture decision.” | Approved decision, interfaces, risks and migration |
| [Technical Lead](technical-lead.md) | “Use BRAD to resolve exact ticket [ID], inspect existing contracts and branch state, and produce a smallest-safe implementation plan **without writes**.” | Source ticket, scope, test/review gate, assignee |
| [Backend Developer](backend-developer.md) | “Use BRAD to implement [ID] through installed Build. Preserve API/DB contracts; test errors, validation and security; **do not push**.” | Diff, migrations, real unit/integration test exits |
| [Frontend Developer](frontend-developer.md) | “Use BRAD to implement [ID] in native Build. Cover keyboard, mobile, focus and empty/loading/error cases; keep local.” | UI states, a11y checks, API assumptions, actual tests |
| [Full-stack Developer](fullstack-developer.md) | “Use BRAD to implement [ID] end-to-end within approved interfaces; run frontend/backend/integration checks and report gaps.” | Verified slice, schema changes, risks, test evidence |
| [Functional QA](functional-qa.md) | “Use BRAD and installed TEA/QA to produce and **execute available** acceptance tests for [criteria]; separate PASS, FAIL, BLOCKED and NOT_RUN.” | Steps, expected vs actual, reproducible defects |
| [Automation QA](automation-qa.md) | “Use BRAD to select installed TEA for [approved cases]; add deterministic checks, run focused tests and distinguish generated scripts from executed results.” | Test code, exit counts, flaky cases, real CI evidence |

## End-to-end handoff example

1. **PM → BA:** PM approves the objective, BA traces rules and exceptions to acceptance cases without silently changing the scope.
2. **BA → Architect/Tech Lead:** The architect decides cross-system contracts; the technical lead identifies the exact native ticket and implementation boundary.
3. **Dev → QA:** Developer executes the installed Build workflow, creates a scoped diff and proves actual tests; a distinct QA agent is independent **only if a real separate context was invoked**.
4. **QA → Product/Delivery:** QA reports evidence and risks, product accepts scope, delivery tracks native sprint status. A generated test is **not** an executed test.
5. **Remote gate:** A project policy or explicit user permission is required for a PR. Neither `--pr` nor a role guide authorizes merge/deployment or native BMAD upgrade.

## Copyable handoff record

```text
Project & native ticket: [root, exact ID/source, BMAD v6/v7]
Mode and authorization: [plan/read-only | local | approved PR]
Installed native workflow: [name, actual SKILL.md path, version]
Execution provenance: [HOST_NATIVE_INVOKED | NATIVE_WORKFLOW_INLINE |
  SEPARATE_SPECIALIST_INVOKED | HELPER_SCRIPTS_ONLY | NOT_VERIFIED]
Work/artifacts: [scope, changed files, requirement links]
Verification: [real commands/exit codes/counts or BLOCKED/NOT_RUN]
Open decisions: [risks, sources, accountable decision maker]
Next handoff: [role, requested action and approval needed]
```

For exact steps and owner responsibilities, use the ten role guides above and the [SDLC playbook](../sdlc/sdlc-playbook.md). For installation or uncertain command availability, use [host support](../getting-started/host-support.md) and [version selection](../getting-started/choose-bmad-version.md).
