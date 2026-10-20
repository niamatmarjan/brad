# BRAD in a cross-functional SDLC

This playbook describes **recommended use**, not behavior verified by the Concourse rehearsal. BRAD is a small router to installed native BMAD workflows; it is not a new backlog or a substitute for product, engineering, QA, or release authority. See the [architecture contract](architecture.md), [stakeholder workflow map](STAKEHOLDER_WORKFLOW_MAP.md), and [team handoff protocol](TEAM_HANDOFF_PROTOCOL.md).

## Working sequence

1. **Discover:** Product and business stakeholders define the problem, evidence, constraints, and decision owner. Use installed native Analyst/PM workflows only when available. Product approves the problem and scope.
2. **Specify:** The BA traces rules and acceptance examples. Product accepts outcomes; unresolved assumptions remain visible.
3. **Design:** The architect proposes context, contracts, quality attributes, and reversible options. The accountable architect approves ADRs; security/privacy owners review relevant risks.
4. **Plan:** Delivery and technical leads inspect the single native backlog, dependencies, readiness, and capacity. Do not mirror BMAD state in a second tracker.
5. **Build:** Route one resolved story to the installed native Build workflow. Developers own code and focused checks. Coordinate shared API/migration changes explicitly.
6. **Verify:** Functional QA and automation QA own distinct test responsibilities. Native TEA is invoked only if installed and appropriate. Record generated tests separately from executed tests.
7. **Integrate and accept:** Review actual diff, test evidence, and remaining risk. Product accepts against criteria; engineering retains branch integrity.
8. **Release assess:** Report evidence, approvals, known issues, and blockers. A readiness recommendation is not deployment or merge authorization.

## Use BRAD proportionately

- Start with one natural-language request that names the target, expected end state, scope, and prohibited side effects.
- Ask for a read-only route/status report when the story or native state is unclear.
- Prefer the smallest installed specialist workflow. Do not impose a fixed ceremony chain.
- Confirm exact skill discovery before claiming a route; confirm tool invocation before claiming execution.
- Keep a trace from requirement → story → code → executed test → review → commit/PR/CI only for stages actually observed.
- If native BMAD is missing, stop specialist claims. Ask the owner to choose a compatible version before installation.
- Do not push, merge, deploy, or publish without explicit authorization and actual credentials.

## Evidence labels

Use `PASS`, `FAIL`, `PARTIAL`, `BLOCKED`, `UNSUPPORTED`, and `NOT_RUN` with denominators. State whether evidence is observed or inferred. A present file, proposed route, generated test, or role name is not proof of invocation, independent work, test success, or delivery.

## Rehearsal status

The attached Concourse example has a locally verified server-backed application, a preserved prototype and role guidance. Earlier app implementation contexts and a native help-skill probe are recorded separately; they do not establish the later independent BRAD stakeholder study. Native product/TEA workflow execution, ten independent BRAD roles, behavioral route selection, and BRAD's application-ticket-to-PR/CI lifecycle remain unverified. See the [evaluation report](../examples/concourse-sdlc-lab/report/MASTER_REPORT.html).
