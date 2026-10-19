# QA & release workflows: delegate the specific objective

Always inspect installed TEA skills and their own inputs/outputs. TEA is an
optional BMAD module. QA does not mean "run everything" and code review is not
an interchangeable substitute for executable tests.

| Exact request | Native owner if installed | Actual deliverable |
|---|---|---|
| "Review code/PR/diff" | `bmad-code-review` | findings, triage and optional patches if authorized |
| "Generate E2E tests" | `bmad-qa-generate-e2e-tests` | executable tests, actual run results |
| "Plan QA / risk matrix" | `bmad-testarch-test-design` | scenario/risk plan |
| "Tests before dev / ATDD" | `bmad-testarch-atdd` | failing acceptance scaffolds (red expected) |
| "Improve automated coverage" | `bmad-testarch-automate` | expanded tests with evidence |
| "Audit the tests" | `bmad-testarch-test-review` | test quality findings |
| "Create CI" | `bmad-testarch-ci` | CI configuration and verified runs |
| "Set up test framework" | `bmad-testarch-framework` | framework, running examples |
| "Nonfunctional readiness" | `bmad-testarch-nfr` | security/performance/reliability evidence assessment |
| "Trace criteria to tests" | `bmad-testarch-trace` | coverage/gate verdict |
| "Review requirements/docs" | `bmad-review` or installed editorial/PM workflow | document review findings |
| "Ready to release R1?" | evidence collection + relevant native TEA/Build checks | PASS / CONCERNS / FAIL / UNVERIFIED, with blockers |

For a vague `qa feature`: inspect code, test inventory and acceptance criteria;
choose next meaningful QA work (often run existing tests first). If very
materially ambiguous (e.g., "QA" could mean review-only vs write-test-suites
with hours of work) ask one scope question; do not always ask by default.

For a ticket-to-PR lane, Build's native review is enough for a low-risk change
unless gaps exist; don't stack a redundant independent review by ritual. Use
risk-based extra TEA coverage on authentication, payment, data integrity,
authorization, migrations, privacy and critical reliability changes.

## Release evaluation != release deployment

- Determine exact tag/commit, branch, environment, migration and rollback
  plan. Fetch real check outputs, failures, warnings and known waivers.
- Test checklist: required lint, typechecks, unit/integration/e2e, build,
  smoke, dependency/auth checks and CI per repo policy; NFR/trace when needed.
- Distinguish `PASS`, `FAIL`, `NOT RUN`, `NOT AVAILABLE`, `PENDING`; never infer
  PASS because no failure was mentioned.
- Status report must name exact covered commit SHA and environment. A QA gate
  cannot approve an untested changed SHA just because tests passed previously.
- Result: `ready` only with required evidence; `not ready` with concrete
  blockers; `unverified` with missing evidence. Explicit waivers are traceable.
- "Get ready for release" permits ordinary reversible corrections; not
  pushing to production, deleting resources or overriding branch protections.

References:
https://github.com/bmad-code-org/bmad-method-test-architecture-enterprise/blob/main/docs/reference/commands.md
https://github.com/bmad-code-org/BMAD-METHOD/blob/main/docs/build/autonomous-development-loops.md
