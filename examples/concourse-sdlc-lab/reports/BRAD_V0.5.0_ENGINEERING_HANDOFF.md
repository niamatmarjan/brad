# BRAD v0.5.0 engineering handoff

**Baseline under evaluation:** BRAD v0.4.1 (`v0.4.1`, `dcad5e7d9d463c562f6cd94ea0ac5f6231ce23c8`)

**Evaluation run:** `brad-v0.4.1-8ecc17ba`

**Current verdict:** Application verified / BRAD orchestration partially validated.

This is a candidate engineering backlog, not v0.5.0 release notes. No BRAD runtime code or released baseline files were changed by the Concourse demo session. Installer-test candidates remain isolated in a separate worktree on branch `niamatm-brad-installer-candidates`.

## Ranked findings and tasks

### B50-01 — Make the npm pack contract test tolerate npm JSON result shapes

- **Priority:** P1 (verified test defect; broad CI reliability impact)
- **Evidence:** The v0.4.1 Node suite fails `tests/cli.test.mjs` because `JSON.parse(stdout)[0]` is undefined under the observed npm 12.0.2 output. `npm pack --dry-run --json --ignore-scripts` returned a package-name-keyed object with `files`, while the test assumes an array. `npm run pack:check` and package contents themselves succeed.
- **Reproduction:** On Windows 11, Node v24.19.0 and npm 12.0.2, run `npm test`; observe 27/29 and the `distribution contains files required by the npm CLI` failure. Run `npm run pack:check`; observe valid JSON and 33 package entries.
- **Current behavior:** The test crashes before checking package paths when npm returns the object shape.
- **Desired behavior:** Normalize supported array and package-name-keyed JSON shapes; validate object shape, package identity and `files`; retain parse/nonzero-exit errors as failures.
- **Candidate files:** `tests/cli.test.mjs`, contributor test documentation.
- **Candidate implementation and tests:** Normalize the result only in the test harness; add array/object fixtures, malformed/empty payload and nonzero exit cases.
- **Acceptance:** Focused parser tests pass for supported shapes; package-path assertions still run; malformed output and npm failure remain explicit failures.
- **Candidate evidence:** Separate candidate branch reports 32/32 Node tests passing and npm pack dry-run passing. Legacy array behavior is fixture-tested, not cross-version executed.
- **Risk/dependencies:** Low; confirm npm versions in the declared support matrix before promising compatibility.
- **Verification:** Windows Node v24.19.0/npm 12.0.2 is observed; another Node/npm/OS combination was not run.

### B50-02 — Make the symlink safety test runnable on Windows without elevated privileges

- **Priority:** P1 (verified test-harness portability defect)
- **Evidence:** The v0.4.1 test fails at `symlinkSync(..., 'dir')` with `EPERM` before BRAD code executes. That is an environment/Windows symlink privilege limitation, not an observed installer failure.
- **Reproduction:** On the observed Windows host, run `npm test`; the failure points to setup in `tests/cli.test.mjs:84`.
- **Current behavior:** The security regression test cannot reach the assertion under the available Windows privilege context.
- **Desired behavior:** Exercise the same linked-target rejection without requiring admin/developer-mode symbolic links.
- **Candidate files:** `tests/cli.test.mjs`.
- **Candidate implementation and tests:** Use a real Windows directory junction and POSIX symlink on other platforms; assert `lstat`/`realpath`, and verify install, update and uninstall do not touch an external sentinel.
- **Acceptance:** The test reaches BRAD's rejection code on Windows and POSIX; external sentinel data remains intact; unsupported link creation is not silently converted into a passing test.
- **Candidate evidence:** Separate candidate branch reports the expanded safety tests passing and the complete Node suite at 32/32.
- **Risk/dependencies:** Low; filesystem and cleanup behavior must be confirmed on the supported Windows versions.
- **Verification:** Only Windows 11 Enterprise was executed in this run; other OS/Node versions remain untested.

### B50-03 — Make host-native workflow capability explicit and evidence-backed

- **Priority:** P1 (host compatibility / observability; not yet a confirmed BRAD defect)
- **Evidence:** In this current host context, TEA workflow instructions were present in an external module cache but were absent from the workspace BMAD installation and native skill inventory. The native loader reported the workflow unavailable. No workflow ran and no artifact was produced.
- **Reproduction:** Use a clean Copilot project without `_bmad`, while a TEA instruction file exists only in an external cache; ask BRAD to invoke that TEA workflow and record actual loader outcome.
- **Current behavior:** The session cannot establish that a cached skill file is discoverable or executable by the active host.
- **Desired behavior:** BRAD reports cached, workspace-installed, host-discovered and actually-invoked as separate states, with a precise blocker rather than a completion claim.
- **Candidate files/modules:** `skills/brad/SKILL.md`, `skills/brad/references/hosts-and-handoffs.md`, host discovery/diagnostic guidance and routing evaluation.
- **Tests to add:** Fixture with cached-but-undiscovered TEA file; native loader unavailable; assertion that BRAD reports blocked and never claims execution.
- **Acceptance:** No native invocation is counted without actual host evidence; unsupported workflows are reported with host/workspace distinction.
- **Risk/dependencies:** Depends on host APIs; do not duplicate BMAD workflows or install modules without approval.
- **Verification:** Current session native TEA attempt is blocked; implementation change remains a proposal, not a verified BRAD runtime defect.

## Test-only candidate status

The separate candidate worktree reports changes to `tests/cli.test.mjs` and `CONTRIBUTING.md`, with no CLI core, package version, Concourse, release, push, or publication changes. Its reported commands were:

- `npm test` — 32/32 passed.
- `node --test --test-name-pattern="symlinked|pack file parser|distribution contains" tests\cli.test.mjs` — 5/5 passed.
- `python -m unittest discover -s skills\brad\tests -v` — 21/21 passed.
- `python tools/check_repository.py` — passed.
- `python tools/build_release.py` — passed; generated archive removed by the candidate session.
- `npm pack --dry-run --json` — passed, 33 entries.
- `git diff --check` — passed.

The child-session report is the evidence source for candidate results; its worktree remains separate and uncommitted. Do not cherry-pick or publish without review and explicit authorization.
