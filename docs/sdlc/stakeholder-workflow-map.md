# Stakeholder-to-workflow map

Workflow IDs below are **intent labels**, not a promise that every host exposes a matching slash command. Inspect the installed BMAD `SKILL.md` and version before invocation. Native BMAD was installed in a separate Concourse fixture, but no product/TEA workflow execution was verified; all specialist behaviors below are recommended, not observed.

| Stakeholder | Typical intent | Candidate native capability | Human checkpoint |
|---|---|---|---|
| Product Manager / PO | Problem, PRD, value, scope, acceptance | BMM Analyst/PM/PRD, native PO | Approve problem, outcomes, scope and acceptance |
| Business Analyst | Journeys, rules, requirements, traceability | BMM Analyst / requirements | Validate rules with business owner |
| Delivery Manager | Readiness, sprint flow, blockers | Native sprint planning / SM | Confirm authoritative backlog and replanning |
| Solution Architect | System design, NFRs, ADRs | Native Architect | Approve architecture and material trade-offs |
| Technical Lead | Decomposition, contract coordination, review | Native story readiness, Build, code review | Keep scope/architecture approval with owners |
| Backend Developer | API, persistence, server behavior | Native `bmad-build` for one story | Approve migrations and contract changes |
| Frontend Developer | UI, interaction, accessibility | Native `bmad-build`; UX guidance if installed | Validate criteria and design constraints |
| Full-stack Developer | Bounded vertical slice | Native `bmad-build` | Coordinate shared API/schema and independent review |
| Functional QA | Exploratory and acceptance verification | Native TEA / QA test design | Product acceptance remains with product owner |
| Automation QA | ATDD, regression, framework/test review | Installed TEA test capabilities | Report actual test execution; no generated-test pass |

**Routing rule:** Select the smallest installed workflow matching the request. A route proposal is L3 evidence; a real tool invocation with inspectable result is L4; artifact and outcome verification is L5. Never infer later stages from an earlier one.
