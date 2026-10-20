# MVP delivery slice

These are implementation tickets for the isolated local demo, not a native BMAD backlog. Ownership is planned; completion will be recorded only from actual branch, commit, and test evidence.

| ID | Outcome | Owner | Dependency |
|---|---|---|---|
| CON-01 | SQLite schema, migrations, deterministic ten-user seed, and per-worktree database configuration | DEV-01 | None |
| CON-02 | Opaque demo sessions, role-aware server authorization, and session API | DEV-01 | CON-01 |
| CON-03 | Project, initiative/story CRUD, acceptance criteria, dependencies, and version-checked updates | DEV-01 | CON-01/02 |
| CON-04 | Server-enforced state machine, transition history, and audit feed | DEV-01 | CON-03 |
| CON-05 | Responsive application shell, sign-in, project overview, backlog and story detail | DEV-02 | API contract |
| CON-06 | Role-aware development board, assignment, review queue, and decision controls | DEV-02 | CON-03/04 |
| CON-07 | Comments and activity display | DEV-03 | CON-03/04 |
| CON-08 | QA cases/runs, defects, severity, retests, and blocking-defect rule | DEV-03 | CON-03/04 |
| CON-09 | Release readiness derived from stories, defects, and test evidence | DEV-03 | CON-08 |
| CON-10 | API, domain, role, concurrency, and integration regression tests | DEV-03 / QA-02 | CON-01–09 |
| CON-11 | Browser journeys, responsive/accessibility checks, and defect/retest evidence | QA-01 / QA-02 | CON-05–10 |
| CON-12 | Reviewed integration, reproducible runbook, sanitized evidence, and release recommendation | TL-01 / PM-01 | CON-01–11 |

The API contract in `docs/api/CONTRACT.md` and schema ownership in CON-01 are the integration boundary. Schema changes require a reviewed change request from the backend owner before implementation.
