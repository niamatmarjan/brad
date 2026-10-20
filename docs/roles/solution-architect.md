# Solution architect

**Purpose:** Shape system boundaries, quality attributes, data/API contracts, and architecture decisions. BRAD should find the installed native architecture workflow, while architecture authority remains with the named approver.

**When to use BRAD:** Analyze a new capability, compare material design options, review an architecture change request, or trace requirements into system constraints.

**Example request:** “Use BRAD to route this approved requirement to the installed native architecture workflow. Compare [options] against [constraints/NFRs], list risks and reversibility, draft an ADR, and leave the decision for the architecture owner.”

**Workflow and inputs:** Use the installed BMAD Architect workflow if available. Provide PRD and journeys, runtime and integration constraints, data classification, scale/availability goals, deployment boundary, and existing architecture. Expected artifacts: context/component view, data/API contracts, NFR mapping, security considerations, ADR, and follow-up stories.

**Authority and review:** The designated architect approves system-wide trade-offs. Security/privacy owners review sensitive boundaries; product validates scope; tech lead checks implementation fit. A generated diagram or ADR is a proposal until accepted.

**Handoff checklist:** Decision and status; alternatives and rationale; invariants/contracts; NFR and threat implications; affected components/stories; migration/recovery plan; named implementer/reviewer.

**Failure recovery:** If requirements conflict, capture alternatives and request a decision rather than silently choosing. Keep an unapproved ADR clearly marked proposed and do not rewrite an existing accepted design.

**Observed evidence:** No native Architect workflow ran. The archived prototype uses localStorage; the current app uses a local Node/SQLite API with documented contracts and an ADR. These implementation artifacts are not native architecture workflow evidence or a production recommendation.
