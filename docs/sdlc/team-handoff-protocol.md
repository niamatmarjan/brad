# Team handoff protocol

Every handoff carries enough evidence for the next owner to resume without guessing. A handoff can be rejected or blocked; that is a status, not a failure to communicate.

## Required handoff record

- **From / to:** stakeholder owners and decision authority.
- **Request and target:** exact product decision, ticket, artifact, branch, or test scope.
- **State:** current native BMAD version and authoritative ticket source; do not copy state into a parallel tracker.
- **Evidence:** observed artifacts, commands, exit codes, review findings, commit/PR/CI links where available. Label inferred content.
- **Decision needed:** question, options, recommendation, approver, and deadline if one is real.
- **Dependencies and risks:** blocked work, shared contract/migration, external access, privacy or security boundary.
- **Next action:** specific owner and exact resume instruction; distinguish no-op, retry, and new work.
- **Authorization:** whether local writes, branch push, PR, merge, deployment, or publication is allowed.

## Transfer checkpoints

- Product → BA: approved outcome and unresolved assumptions.
- BA → Architect: traced requirements, constraints, edge cases, and acceptance examples.
- Architect → Tech lead: accepted decisions/contracts, NFRs, risks, and migration notes.
- Tech lead → Developer: one buildable ticket, criteria, dependencies, tests, branch boundary.
- Developer → QA: exact build/commit, changed behavior, known limitations, run commands.
- QA → Developer: reproducible failure, expected/actual, evidence, severity, retest conditions.
- QA → Product: tested scope, failed/blocked cases, residual risk, acceptance decision request.
- Product → Delivery: accepted/rejected scope and priority changes.
- Tech lead → Release owner: verified code/test/review and explicit unresolved release gates.

## Recovery

Do not discard dirty state or overwrite another owner's files. Reconstruct from native story state, filesystem, branch/commit, and existing PR; reconcile conflicts with the owner. Repeated delivery requests must not create duplicate commits/PRs. Never call a test pass when it did not run.

This protocol is a recommendation. The local Concourse rehearsal did not run real stakeholder-to-stakeholder handoffs.
