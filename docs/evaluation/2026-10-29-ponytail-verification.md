# Gate 04 Ponytail changes and evidence

Scope: BRAD core, based on `217fd2756335af97d56f42a53a2d6fca32ed68a2` on
`feat/gate-04-real-routing`. Improvement branch: `refactor/ponytail-gate04`.
The [baseline audit](2026-10-29-ponytail-audit.md) has 18 ranked findings.
This document records local observations, not native-host execution certification.

## Bugs fixed

- Findings 1–6: preserve inspection/preview constraints; stop story review/QA
  falling into Build; distinguish test review, test design, ATDD and E2E;
  respect explicit workflow selection; separate PRD operations and human approval;
  stop using Help for missing Build or retrospective for release readiness.
- Findings 7–11: validate portable task IDs and stored identities, reject symlink
  state paths, surface corruption, replace flushed temporary files under an
  exclusive write lock, reject stale revisions, restore the exact suspended gate,
  and enforce stage/role and blocker checks before acceptance.
- Findings 12–15: preserve unchanged file records through corrections; hash empty
  bytes correctly; retain other defects' blockers; share CLI discovery, recognize
  official BMM configuration, expose conflicting copies and mixed runtime hints;
  allow harmless destructive-operation discussion while refusing bounded action forms.
- Finding 16: new state defaults to `NOT_VERIFIED`; branch-only and interrupted
  work require explicit continuation. The API now documents its evidence limits.
- Findings 17–18: share repeated result/event/file construction, remove an unused
  CLI import and enable the existing checks for PRs targeting the Gate 04 branch.

The final source review also reproduced and fixed action/artifact overlaps:
`Build story 1.1 from the approved PRD`, `Review PR #40 adding E2E tests`,
`Plan how to build story 1.1`, and epic refinement mentioning architecture.
Review also restored remote-tracking branch recognition after catching its loss
in the first simplified implementation. Each correction was checked red, then green.

## Verification

Environment: macOS arm64, Node.js 24.22.1, Python 3.15.2. An isolated temporary
npm cache was used because the default cache was unwritable in this session.
This was an environment limitation, not a BRAD defect; the default cache was unchanged.

| Check | Original Gate 04 | Improvement branch |
|---|---:|---:|
| Existing Node suite | 74/74 pass | Preserved, with wrong workflow expectations corrected |
| Added regression tests run against original source | 0/27 pass | 27/27 pass |
| Full Node suite | 74/74 pass | 101/101 pass |
| Python BRAD skill suite | 28/28 pass | 28/28 pass |
| Python repository-quality suite | 5/5 pass | 5/5 pass |
| Repository audit | Pass | Pass |
| Release ZIP build | Pass, 29 files | Pass, 29 files |
| npm dry-run package check | Pass, 40 files | Pass, 41 files |
| Packed CLI and ESM smoke | Baseline exports inspected | CLI starts; all 19 public exports preserved |

Commands: `npm test`, `python3 -m unittest discover -s skills/brad/tests -v`,
`python3 -m unittest discover -s tests -p 'test_repository_quality.py' -v`,
`python3 tools/check_repository.py`, `python3 tools/build_release.py`,
`npm run pack:check`, `npm pack --dry-run --json`, and `git diff --check`.

The new regressions were also copied into an exported original-commit tree and
run there: all 27 failed. The concurrency regression starts two real Node processes,
waits until both load one revision, and lets both save: exactly one succeeds;
the other must report a held lock or a stale revision. The saved file stays valid.
This proves local checkpoint contention handling, not concurrent native BMAD execution.
Failed serialization and a held lock also leave the previous checkpoint intact.

Read-only discovery against the existing `live-smoke-service` BMAD fixture found
57 native BMAD skills with no conflicting definitions and `v6_likely`. Its own
manifest declares BMAD 6.12.0. The Python inspector found 58 skill definitions,
including BRAD itself. All ten stakeholder prompts from the brief were inspected;
ambiguous story QA asks for native context, and every result retains `execution: NOT_RUN`.
No lab source, installed BMAD source or evidence history was changed.

The draft PR's live checks and exact final commit are reported in the PR and final
handoff. Local macOS checks are not a substitute for Windows/Linux matrix results.
No CI status is inferred from the local test counts.

## Measurements

Production source here means `src/*.mjs` and `cli/*.mjs`, including the new shared
discovery module. Physical lines include comments and blank lines; byte counts
make clear that line-count reduction is not equivalent to removing as much logic.

| Measurement | Before | After | Change |
|---|---:|---:|---:|
| Production physical lines | 1,915 | 1,313 | -602 |
| Production nonblank lines | 1,792 | 1,239 | -553 |
| Production source bytes | 79,991 | 75,992 | -3,999 |
| Production dependencies | 0 | 0 | 0 |
| npm unpacked bytes | 232,006 | 229,559 | -2,447 |
| npm compressed bytes | 69,388 | 71,280 | +1,892 |
| npm packaged files | 40 | 41 | +1 shared module |
| Exported API names | 19 | 19 | Preserved |

No tests, required documentation, supported workflows or safety checks were
deleted to reduce counts. Compressed size increased with the new checks and
contract documentation; this change does not claim a package-size optimization.

One local timing sample used five runs of 10,000 mixed route inspections after
warmup with an already-supplied inventory. Median per-route time was approximately
0.00125 ms before and 0.00163 ms after. Seven CLI process launches against the real
fixture had medians of 31.96 ms and 32.16 ms. The difference is immaterial for this
supervised interface; these measurements are not independent performance certification.

## Compatibility and source review

All existing module export names and package subpaths remain. Corrected behavior
intentionally rejects illegal transitions, unsafe IDs, corrupt/mismatched state,
unknown defect resolutions and stale saves that were previously accepted silently.
`saveTaskState` still returns a path; it now advances the supplied mutable snapshot's
revision after success. Safe legacy checkpoint filenames and valid legacy inline
execution labels remain readable. Legacy interruptions recover their gate from history.
Execution-mode declarations and `ACCEPTED` remain caller reports, not authenticated proof.

Ponytail Review was applied in the same session to the final implementation and
adjacent callers: CLI route/doctor/setup, exported APIs, installer/package behavior,
legacy state recovery, correction/QA/reviewer loops, filesystem writes, tests,
skill instructions and the CI trigger. No unresolved must-fix source finding
remained in that review. This was not a separate-agent or independent native BMAD review.

## Deliberately skipped and remaining product gaps

- No LLM dependency, second workflow engine, native ticket parser/database,
  distributed execution lock, automatic stale-lock stealing or new agent personas.
- The optional handoff module is retained for public API compatibility; it is not
  connected as a second authoritative backlog. Public stage constants remain.
- Exact ticket resolution and duplicate initiative handling still require native
  BMAD/project context. The CLI explicitly marks candidates unresolved.
- Version indicators remain hints; the host must inspect actual configuration and
  owning native state. A real v7 ticket lifecycle and all-host parity remain unverified.
- Host-native skill-loader events, independent reviewer identity, approval identity,
  actual native workflow execution and acceptance still need genuine host evidence.
- Git branch/PR identity and delivery evidence must be queried by the authorized
  host. Checkpoints do not prove a branch exists or a PR belongs to this task.
- A killed checkpoint writer may leave a lock/temp file. Inspect the old file,
  native state and active writer before manual cleanup; never restart from corruption.
  Power-loss durability on every filesystem and hostile same-user filesystem races
  are not certified by the local process tests.

Verdict: The bounded preflight and local checkpoint defects are repaired. Keep the
stacked PR draft and unmerged; authentic native host execution and unattended
production readiness remain unverified. No merge, tag, release, deployment or npm
publication was performed.
