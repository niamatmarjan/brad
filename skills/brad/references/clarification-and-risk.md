# Minimal interruption with meaningful human control

Classify an uncertainty before questioning the user:

**A — Already answered** by specs/PRD/plan/branch/established preference:
act and cite. **B — Safe reversible default**: choose project convention, note
briefly. **C — Material decision**: ask targeted question with 2–3 concrete
options and recommendation before the affected action. **D — Hard blocker**:
stop affected work, preserve state, show precise recovery action.

Ask for C/D: duplicate ticket refs, conflicting acceptance criteria, legal or
security impacts, destructive migrations, permission uncertainty for remote
publication, no authoritative target, blocked dependencies with multiple valid
orders, product behavior choice that changes architecture, requirement that
changes another team's contract, missing secret needed to run the test.

Do **not** ask for: obvious choice already fixed by repo policy, names of native
BMAD skills the router can inspect, lint/test commands listed in package.json,
confirmation at every routine phase, whether to use already approved PRD.

Questions are interactive: stop only the affected branch, give a concise
summary and a recommended option, accept response and resume the same ticket
without repeating previously settled decisions. Multiple independent work
streams can continue safely if they don't change the blocked choice.

**One-time publishing preference:** on first bare ticket-to-PR run without
policy, say "For `/brad 1.1`, should I push and open a PR after required
checks pass? I can also make that your default for subsequent ticket runs."
Options: this run only; always for this repository; local-only. Do not force
push until authorized. For an explicitly requested `--pr`, no extra generic
approval question is needed unless the host/repo demands it.

**At the end** distinguish user decision needed vs terminal run failure vs
finished with caveats. Do not ask for arbitrary praise or redundant approval.
