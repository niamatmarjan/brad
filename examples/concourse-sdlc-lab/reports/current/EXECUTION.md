# Current integration execution record

**Overall: PARTIAL.** The integrated app and core cross-functional release journey work locally. The app reports the tested project ready, but the overall acceptance/release recommendation remains blocked by unresolved acceptance oracles, partial RBAC/responsive/accessibility coverage, and unverified native BMAD workflow execution. No CI, PR, remote push, deployment, or production release was performed.

## Tested revision and environment

- Repository: `<isolated-integration-checkout>` (local absolute path redacted for publication)
- Branch and code revision: `main`, `88b1d7c2b4d6ba54f866463dc2cbf167aba7547b`
- OS/runtime: Windows, Node `v24.19.0`, npm `12.0.2`
- Browser: Playwright Chromium; fixture-driven matrix ran desktop, tablet, and mobile projects
- Live local endpoints during the browser acceptance journey: Vite `http://localhost:5173`, API `http://localhost:4173`
- The QA document and this report are follow-up documentation edits after the tested code revision; no application code changed after the listed checks.

## Commands and results

| Package | Exact command | Result |
|---|---|---|
| `server` | `npm run typecheck` | PASS, exit 0 |
| `server` | `npm test` | PASS, 27 tests, 0 failures, exit 0 |
| `web` | `npm run lint` | PASS, exit 0 |
| `web` | `npm run build` | PASS, TypeScript project build and Vite production bundle, exit 0 |
| `web` | `npm test` | PASS, 15 tests, 0 failures, exit 0 |
| `web` | `npm run test:quality` | PASS, 40 tests, 0 failures, exit 0; includes the real HTTP adapter lifecycle using in-memory SQLite |
| `web` | `$env:CONCOURSE_SERVER_ROOT=(Resolve-Path '..\server').Path; npm run test:delivery` | PASS, 3 real HTTP/SQLite integration tests, 0 failures, exit 0; original machine-specific path replaced with equivalent relative resolution for publication. |
| `web` | `npm run test:browser` | PASS, 27 Playwright tests across desktop/tablet/mobile, 0 failures, exit 0 |

The first delivery-test invocation omitted its required `CONCOURSE_SERVER_ROOT` and failed during test setup; rerunning with the documented server path passed. The first multi-role browser driver attempts also exposed ambiguous Playwright selectors. The journey was resumed with scoped selectors and its final persisted app state was checked directly; these were test-driver issues, not API errors.

## Live journey evidence

The separate Playwright browser contexts used seeded PM, developer, technical-lead, and QA accounts against the live Vite client and SQLite-backed API. On project `Full journey 1792439599590` and story `Receipt acceptance 1792439599590`, the UI/API sequence completed:

1. PM requirements review and approval; work moved to Ready.
2. Assigned developer moved the story through In Development and Code Review.
3. Technical lead approved code review and moved it to Ready for QA.
4. QA recorded a failed run and filed a blocking defect. The UI showed not-ready and disabled acceptance.
5. Developer marked the defect fixed; a failed retest reopened it.
6. Developer fixed it again; a passing retest closed it.
7. QA recorded a fresh passing run and discussion comment, then accepted the story.
8. PM completed it. A refreshed live read showed `Ready for release`, 1 work item, 0 open blocking defects; the defect was `Closed`, both retests and both QA runs were visible, and audit history included `defect.retested` and the final transitions.

Screenshots are captured from that final application state:

- [`evidence/delivery-ready.png`](evidence/delivery-ready.png) — readable release-readiness and selected work item viewport.
- [`evidence/audit-history.png`](evidence/audit-history.png) — audit-history viewport with persisted failed run and blocker activity.
- [`evidence/delivery-ready-full.png`](evidence/delivery-ready-full.png) — full-page quality and activity capture.

SHA-256:

| Evidence file | SHA-256 |
|---|---|
| `delivery-ready.png` | `60D1F7E844E15EB5D9D851B971A8AE736EC37FA143D7F65B4CAEE9A430E8BAA6` |
| `audit-history.png` | `11F163024A739046DB83F6DAE67148FE73675A9E5C03A6E3B01761F2259E3B3E` |
| `delivery-ready-full.png` | `858B63A0CCFE6AA3E89CC708932DDE3B51C7DF06F0D26252334DCCDC62A03664` |

The earlier live-browser persistence journey also verified project/story visibility after reload and from a separately authenticated developer context. The browser fixture suite separately exercised stale-draft handling; the server/API suites tested two competing updates and verified one successful write plus one `409 VERSION_CONFLICT`.

## Scope limits and remaining blockers

- The 12-case acceptance matrix records per-case PASS, PARTIAL, or BLOCKED results. AC-02's exhaustive role/action sweep is blocked until an approved permission matrix exists; AC-04 has no agreed missing-criteria oracle; AC-03 sprint organization and AC-07's separate changes-requested journey remain incomplete.
- Automation A04 remains partial; A12 does not exercise the full quality screen at every viewport; A13 still needs manual assistive-technology review and coverage of the quality workspace.
- The server's release-readiness result for the exercised project is not a product-release approval. Required specification and review gates are unresolved.
- A separate project session successfully loaded BRAD's native skill with `functions.skill({"skill":"brad"})` and then loaded `bmad-help` with `functions.skill({"skill":"bmad-help"})`; the host returned “Skill ‘bmad-help’ loaded successfully.” The help instructions recommended `bmad-product-brief`; no BMM workflow was started and no BMAD-authored artifact was produced. Native skill invocation is verified; native workflow execution is not claimed.
- No remote GitHub/CI/PR or hosted deployment evidence exists.
- The API and Vite development servers were stopped after screenshots and live checks were captured. Their local SQLite demo database remains in the isolated integration checkout and was not copied into BRAD.

## Current-session verification — 2026-10-20

This is a follow-up verification of the current server-backed source in the BRAD evaluation workspace. It does not replace the earlier integrated-revision record above. The app files in this checkout are uncommitted; source-tree identity and the exact run ID are in `../evaluations/brad-v0.4.1/brad-v0.4.1-8ecc17ba/manifest.json`.

| Working directory | Exact command | Observed result |
|---|---|---|
| `server-backed\server` | `npm ci` | PASS, 3 packages installed, 0 vulnerabilities reported. |
| `server-backed\server` | `npm run typecheck` | PASS, exit 0. |
| `server-backed\server` | `npm test` | PASS, 27 tests, 0 failures. |
| `server-backed\web` | `npm ci` | PASS, 122 packages installed, 0 vulnerabilities reported. |
| `server-backed\web` | `npm run lint` | PASS, exit 0. |
| `server-backed\web` | `npm run build` | PASS, TypeScript and Vite production build, exit 0. |
| `server-backed\web` | `npm test` | PASS, 15 tests, 0 failures. |
| `server-backed\web` | `npm run test:quality` | PASS, 40 tests, 0 failures. |
| `server-backed\web` | `$env:CONCOURSE_SERVER_ROOT=(Resolve-Path '..\server').Path; npm run test:delivery` | PASS, 3 real HTTP/SQLite tests, 0 failures. |
| `server-backed\web` | `npm run test:browser` | PASS, 27 Playwright tests across desktop, tablet, and mobile, 0 failures. |
| `app` (legacy prototype) | `npm test` | PASS, 5 tests, 0 failures; this is not the server-backed acceptance suite. |
| repository root | `npm test` | FAIL, 27/29; Windows `symlinkSync(..., 'dir')` raised `EPERM` before BRAD ran, and npm 12.0.2 returned a name-keyed pack JSON object where the test assumed an array. |
| repository root | `python -m unittest discover -s skills\brad\tests -v` | PASS, 21 tests. |
| repository root | `npm run pack:check` | PASS, npm 12.0.2 dry-run listed 33 package entries; output is keyed by package name rather than an array. |
| repository root | `npm run check:repo` | PASS, BRAD repository audit. |
| repository root | `python tools\build_release.py` | PASS, local ZIP generation reported 45,376 bytes and 28 files; no publication occurred. |

The two BRAD Node failures were also investigated in a separate candidate worktree. Its report says the symlink tests now use real Windows junctions and check linked target/parent safety; the package test normalizes array and name-keyed shapes and validates malformed output. Candidate `npm test` reportedly passed 32/32. This is candidate evidence only and is not a change to the v0.4.1 baseline or this demo branch.

### AC-04 API observation

An ephemeral in-memory SQLite/HTTP probe created a story twice as the seeded planner: once with `acceptanceCriteria: []` and once with the field omitted. Both POST requests returned **201**, and each subsequent GET returned `acceptanceCriteria: []` in `Draft`. The domain suite separately confirms that incomplete requirements cannot advance to `Requirements Review` (`409 REQUIREMENTS_INCOMPLETE`). This records actual behavior only. AC-04 remains blocked because the acceptance matrix and API contract do not agree on the omission oracle; see `CLOSURE_MATRIX.md`.

### Current native-workflow and independent-review probes

- A separate BRAD-routed probe found TEA instructions only in an external module cache; the Concourse workspace had no `_bmad` installation, and the native Copilot skill inventory did not expose `bmad-testarch-test-review`. The native loader reported it unavailable. The workflow did not run, wrote no artifact, and remains **BLOCKED**. A report-only mode would write a file, conflicting with the probe's no-write instruction.
- An independent read-only code-review context identified the AC-04 API-contract/acceptance-matrix wording conflict. It did not execute the endpoint; the HTTP probe above is the separate execution evidence. No file changes resulted from the review.
- No independent developer stakeholder sessions, three-developer worktree collaboration, two-QA stakeholder study, remote PR/CI, direct-BMAD control, merge, or deployment are claimed.

### Evaluation report generation and validation — 2026-10-20

The structured run input generated both the versioned report and `report/MASTER_REPORT.html`. The report includes separate suite denominators and available test-runner durations, evidence-linked acceptance outcomes, all ten role rows, the observed collaboration and QA scope, a finding/root-cause register, and explicit proposed v1.0 gates. The gate thresholds are future criteria, not results from this run.

| Working directory | Exact command | Observed result |
|---|---|---|
| repository root | `node --check examples\concourse-sdlc-lab\evaluation-tools\build-run.mjs` | PASS, exit 0. |
| repository root | `node examples\concourse-sdlc-lab\evaluation-tools\build-run.mjs` | PASS, generated 85 scenario records; L1 catalog metadata only; report status PARTIAL. |
| repository root | `node examples\concourse-sdlc-lab\evaluation-tools\validate-run.mjs brad-v0.4.1-8ecc17ba` | PASS, 85 scenarios, 19 evidence records, 13 event records, and both HTML reports. |

The browser opened the root HTML report and confirmed the run title/verdict, suite counts and durations, all ten `NOT_RUN` stakeholder rows, evidence-linked report sections, and the horizontally scrollable findings table. The validator checked both report copies for local link/anchor resolution and disallowed remote scripts/stylesheets. After report event `evt-0015`, validation passed with 85 scenarios, 20 evidence records, 15 events, and both report copies. The final archive-retention event `evt-0016` was then appended; the final validator rerun passed with 85 scenarios, 20 evidence records, 16 events, and both reports.

The generated local `dist\brad-v0.4.1.zip` was present at 45,376 bytes on the final workspace check. It was left intact; no archive was published.
