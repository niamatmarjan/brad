# BRAD v0.4.1 — Concourse SDLC Implementation & Evaluation

Concourse is a fictional delivery-workflow test application for BRAD. This example now includes a server-backed React/SQLite implementation and retains the earlier browser-local prototype for comparison. It is a **local validation build, not a production-ready service or a completed BRAD release assessment**.

## Run the server-backed app

Requirements: Node.js 24.x and npm. Run the API and browser client in separate PowerShell windows.

```powershell
Set-Location examples\concourse-sdlc-lab\server-backed\server
npm ci
$env:PORT = '4173'
$env:CONCOURSE_ORIGIN = 'http://localhost:5173'
npm run seed
npm start
```

In a second window:

```powershell
Set-Location examples\concourse-sdlc-lab\server-backed\web
npm ci
npm run dev -- --host localhost --port 5173
```

Open <http://localhost:5173>. Seeded identities are development-only demo accounts. The API persists records to SQLite under `server-backed\server\data`; it enforces roles, version conflicts, workflow gates, QA evidence, defect retests, and release readiness. This is not production authentication; do not use real or sensitive data.

Run the suites from their package directories:

```powershell
# server-backed\server
npm run typecheck
npm test

# server-backed\web
npm run lint
npm run build
npm test
npm run test:quality
npx playwright install chromium
$env:CONCOURSE_SERVER_ROOT = (Resolve-Path '..\server').Path
npm run test:delivery
npm run test:browser
```

The live integration, acceptance statuses, test outputs and screenshot hashes are in [`reports/current/EXECUTION.md`](reports/current/EXECUTION.md). The earlier localStorage version remains under `app/` and is also preserved in [`reports/previous-partial-validation/app`](reports/previous-partial-validation/app); neither is the current server-backed app.

See [ARTIFACTS.md](ARTIFACTS.md) for a concise map of the current application, legacy prototype, immutable v0.4.1 run, reports, and telemetry.

## Included

- `server-backed\server`: Node 24 API, SQLite persistence, sessions, role authorization, lifecycle/version gates, append-only audit, QA/defect/retest routes, and derived readiness.
- `server-backed\web`: React/Vite project, backlog, board, work-item details, and quality/collaboration workspace.
- `docs/qa`: functional acceptance and risk-based automation matrices with observed PASS/PARTIAL/BLOCKED outcomes.
- `reports/current`: current execution record and live-browser screenshots. `reports/previous-partial-validation` retains the prior prototype/report and evaluation artifacts unchanged.
- Root `docs/`, `evaluation/`, and `telemetry/`: BRAD adoption guidance and the prior 85-case routing-evaluation records. The app's tests do **not** execute those 85 BRAD behavioral routes.

## Evidence boundary

BRAD v0.4.1 setup/doctor and the isolated local app were verified. A separate Copilot project session successfully loaded BRAD's `bmad-help` skill; it recommended `bmad-product-brief`, but no BMAD workflow was launched and no BMAD-authored product artifacts were produced. Treat native skill invocation as verified, native workflow execution as not run. The 85 behavioral routes remain unexecuted; independent stakeholder sessions, remote PR/CI, customer acceptance, and deployment are not claimed. Antigravity was not the active host, and the concrete Auto-selected model ID was unavailable.

The final local app journey reached the app's server-reported ready state, but the overall outcome remains **PARTIAL** because permission/acceptance oracles and manual accessibility coverage are incomplete. An app readiness result is not release authorization. No remote was created, no branch was pushed, and no PR/CI/deployment is claimed.

All names, projects, sample tasks, comments and activity are fictional. See [`REPRODUCE.md`](REPRODUCE.md), the [manifest](MANIFEST.json), and the current execution record for observed results and remaining limits.

## BRAD evaluation runs

Reusable evaluation schemas, capture, metric calculation, and report validation live in [`evaluation-tools/`](evaluation-tools/README.md). This evaluation extends the original partial run in a unique session-scoped directory under [`evaluations/brad-v0.4.1/`](evaluations/brad-v0.4.1/). The run manifest, append-only event observations, evidence index, 85-case L1–L5 results, analytics, and offline report are generated from the same structured inputs. The root [`report/MASTER_REPORT.html`](report/MASTER_REPORT.html) identifies its source run. Older partial-run artifacts remain preserved under `reports/previous-partial-validation/`.

## License and provenance

Demo-specific source is MIT-licensed under [`LICENSE`](LICENSE). React and the build/test dependencies are recorded in the lockfiles; third-party starter assets and provenance are disclosed in [`NOTICE.md`](NOTICE.md). The canonical routing snapshot is evaluation input, not an application runtime. All application identities and records in screenshots are fictional fixtures.

## Publication review

The historical verdict remains **PARTIAL**. See [`reports/current/PUBLICATION.md`](reports/current/PUBLICATION.md) for redactions, publication-rerun results, artifact hashes, and the distinction between this evaluation PR and BRAD's unexecuted application-ticket-to-PR experiment. No candidate BRAD patches are included.
