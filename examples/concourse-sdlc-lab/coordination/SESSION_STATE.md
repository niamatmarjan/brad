# BRAD Concourse evaluation session state

- **Run:** `brad-v0.4.1-8ecc17ba`
- **Started:** 2026-10-20 08:53:43 +05:30
- **BRAD baseline:** tag `v0.4.1`, commit `dcad5e7d9d463c562f6cd94ea0ac5f6231ce23c8`
- **Current demo branch:** `demo/concourse-v050-evaluation` at `57fad81b340f11430900568e8cc8500678b7004a`; demo work remains uncommitted.
- **Recoverability:** before editing, a 180-file snapshot of the pre-existing lab and related contributor docs was copied to the session's private files area and SHA-256-verified. It is not part of the public example.
- **Baseline package:** a local npm tarball was created without publishing; SHA-256 `28A5871DB43E11B00BD1E9B784AC217A1801536BF66EC00D127EF0C25C4912AB`. Packaged BRAD inputs match the v0.4.1 tag.
- **Local release archive:** `dist/brad-v0.4.1.zip` is present at 45,376 bytes from the local build; it was inspected and left in place. It was not published.
- **App fingerprint:** server-backed source tree SHA-256 is recorded in the run manifest after excluding generated dependencies and build output.

## Verified this session

- Server typecheck and 27 server tests passed.
- Web lint/build, 15 unit tests, 40 quality tests, 3 real HTTP/SQLite delivery integration tests, and 27 desktop/tablet/mobile Playwright tests passed.
- Legacy local prototype domain tests passed 5/5.
- BRAD Python tests passed 21/21; repository audit, npm package dry-run, and release archive generation passed.
- BRAD Node suite reproduced 27/29: a Windows symlink setup failed with `EPERM` before BRAD ran, and the distribution test assumed npm pack JSON was an array although npm 12.0.2 returned a package-name-keyed object.
- A separate candidate worktree reports those two test portability defects fixed; its candidate suite passed 32/32. No candidate change was applied to this branch or released v0.4.1.
- AC-04 was observed against an ephemeral in-memory HTTP/SQLite service: empty and omitted criteria both returned 201 and persisted `[]` in Draft. The missing acceptance oracle remains unresolved.
- Existing screenshot files and their previously recorded hashes were re-verified.

## Still open / limitations

- AC-02 has no approved role/action matrix; AC-04 has no approved missing-criteria oracle. AC-03, AC-07, A01, A04, A12 and A13 remain partial as detailed in `reports/current/CLOSURE_MATRIX.md`.
- A separate project session loaded BRAD's `bmad-help` skill, but no BMM/Architect/Build/TEA workflow execution is established. The current TEA loader probe was blocked; skill documentation is not execution evidence.
- Three independent developer worktrees and two independent QA stakeholder sessions were not executed. The separate read-only review found the AC-04 contract/matrix conflict and did not execute the endpoint.
- All 85 canonical cases have only metadata/static validation; do not call them behavioral passes.
- No matched direct-BMAD control, remote GitHub PR/CI, publication, merge, deployment, or production acceptance was performed.
- Concrete Auto-selected model ID, token usage, model cost, and complete AI workflow timing are unavailable.

## Artifact validation status

- The versioned run and root offline report are generated from `run-input.json`; the report includes per-suite counts and durations, evidence-linked acceptance results, all ten role rows, collaboration boundaries, QA lifecycle scope, the findings register, and the proposed v1.0 gate link.
- Proposed quantitative v1.0 criteria are documented in `reports/V1_READINESS_GATES.md`; these are future thresholds, not current results.
- Report validation is separate from application acceptance. Final `evaluation-tools/validate-run.mjs brad-v0.4.1-8ecc17ba` passed: 85 scenarios, 20 evidence records, 16 events, and 2 reports. The browser opened the offline report and confirmed its title/verdict, outcome tables, role matrix, evidence-linked sections, and responsive findings table.
- This evaluation remains **PARTIAL** until acceptance-owner decisions, native workflow execution, behavioral routing, the collaboration study, a direct-BMAD control, and remote delivery evidence are completed.

## Continuation

1. Keep unresolved oracles and host limitations visible; final verdict must be **Application verified / BRAD orchestration partially validated**.
2. Do not publish, merge, deploy, or edit BRAD v0.4.1 source in this demo branch.
