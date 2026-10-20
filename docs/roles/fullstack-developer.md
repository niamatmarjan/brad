# Full-stack developer

**Purpose:** Deliver a bounded vertical slice across presentation, application behavior, and persistence while respecting shared contracts and ownership.

**When to use BRAD:** Resolve a ticket whose UI and data/API changes are intentionally one unit, or resume a slice whose local state is clear.

**Example request:** “Use BRAD to deliver ticket [ID] as one vertical slice through the installed Build workflow. Confirm the approved contract, implement only its acceptance scope, run client/server tests, and list any integration dependency that remains.”

**Workflow and inputs:** Use native `bmad-build` for one story; add installed TEA/review workflows only for relevant quality gates. Inputs: user journey, API/data contract, acceptance examples, migration rules, and test commands. Outputs: end-to-end changes, test evidence, migration notes, and explicit limits.

**Authority and review:** Own the slice but not the backlog or shared architecture. Coordinate shared-file and migration edits before landing; ask for independent review rather than treating self-review as independent.

**Handoff checklist:** Ticket/criteria; changed layers; API and schema compatibility; tests; accessibility/security checks; commit/branch; dependent tickets; outstanding approval.

**Failure recovery:** Break apart changes if contract owners disagree; preserve partial commits and task state. Never mark a remote integration complete without actual push/PR/CI evidence.

**Observed evidence:** The archived prototype was browser-local. The current app has SQLite migrations and separate frontend/backend integration evidence. An independent BRAD full-stack stakeholder task and application-ticket-to-PR delivery were not executed.
