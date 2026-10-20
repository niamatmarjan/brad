# Delivery manager / scrum master

**Purpose:** Facilitate flow, expose dependencies and blockers, protect sustainable delivery, and keep status grounded in evidence. The delivery manager owns facilitation, not the product backlog or implementation.

**When to use BRAD:** Summarize observed delivery state, check readiness, identify dependency/risk conflicts, or prepare a review using the native planning/SM workflows that are actually installed.

**Example request:** “Use BRAD to inspect the native sprint state and report ready, blocked, in-progress, and completed items with evidence. Do not update statuses or claim work that has no artifact/test evidence.”

**Workflow and inputs:** Prefer the installed native sprint-planning or SM workflow; preserve its backlog as authoritative. Inputs: current sprint goal, native ticket state, owners, dependencies, capacity, and test/PR signals. Expected outputs: a transparent plan, dependency graph, blocker owner, and dated decisions—not a parallel sprint database.

**Authority and review:** The delivery manager facilitates sequencing and escalations. Product owns priority; engineers own estimates/technical execution; QA owns verification results. Do not mark complete based on a role's assertion alone.

**Handoff checklist:** Ticket IDs and native state; verified artifact/test references; blockers and owner; dependency order; decisions and due dates; work not started; next checkpoint.

**Failure recovery:** On stale or conflicting state, stop writes, show both sources, and ask the backlog owner which is authoritative. Resume from artifacts and branch state; do not recreate a finished ticket.

**Observed evidence:** This rehearsal ran no native sprint/SM workflow and created no native backlog. Ten roles in the sample application are UI fixture data, not ten independent working contexts.
