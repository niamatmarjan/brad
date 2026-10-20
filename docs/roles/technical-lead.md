# Technical lead

**Purpose:** Translate accepted designs into bounded work, coordinate technical contracts, manage integration risk, and maintain engineering quality. The tech lead does not silently change product scope or replace architecture approval.

**When to use BRAD:** Break an accepted story into a buildable unit, route an implementation ticket, assess a technical blocker, or prepare code review/verification handoff.

**Example request:** “Use BRAD to inspect ticket [ID], accepted design, dependencies, and branch state. Route one bounded unit to the installed native Build workflow, preserve scope, run the required checks, and stop before any unapproved remote action.”

**Workflow and inputs:** Prefer native BMAD story readiness/SM guidance followed by installed `bmad-build` for one ticket; request native review/TEA only where needed. Inputs: accepted criteria, ADR/API contracts, ticket state, repository rules, and test commands. Outputs: implementation, focused tests, review findings, and a precise delivery report.

**Authority and review:** Own implementation coordination and local technical decisions within approved architecture. Escalate contract or scope changes to the proper owner. Verify actual diffs and test exit codes; one context reviewing its own change is not independent review.

**Handoff checklist:** Ticket/criteria; touched files and contract changes; migration/dependency risk; test command/results; review owner; branch/commit; unresolved issues; remote authorization status.

**Failure recovery:** Preserve dirty state, diagnose before retry, and resume from existing commits/PRs. Avoid duplicate work, shared-index concurrency, force operations, or claiming CI without a real check URL.

**Observed evidence:** Earlier app implementation worktrees and local integration commits are recorded in historical telemetry, and a separate read-only acceptance review found a contract conflict. They do not verify native Build/code-review workflow execution or the later BRAD collaboration study. Publishing this evaluation PR is separate from the unperformed BRAD application-ticket-to-PR experiment.
