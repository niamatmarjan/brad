# Reproduce BRAD v0.4.1 — Concourse SDLC Implementation & Evaluation

**Verdict: PARTIAL.** This is a local fictional application and an evidence package, not a production service, a v0.5.0 implementation, or a completed native BMAD study.

## Prerequisites and isolation

- Clone this evaluation branch from `https://github.com/niamatmarjan/brad`; start the commands below at its repository root.
- Use Node.js **24.x** (required by the server's built-in SQLite) and npm. The observed host was Windows with Node v24.19.0, npm 12.0.2 and Python 3.13.14.
- Install Python 3.11+ for BRAD checks. Browser tests need Playwright Chromium (`npx playwright install chromium` from the web package).
- Use fictional data only. Demo sign-in is not production authentication. Dependencies restore from committed lockfiles with `npm ci`.
- Start with unused loopback ports 4173, 5173 and 5182. Do not share the demo database between checkouts. Never expose this development app publicly.

## Run the application

In the first PowerShell window, starting at the repository root:

```powershell
Set-Location examples\concourse-sdlc-lab\server-backed\server
npm ci
npm run typecheck
npm run seed
$env:PORT = '4173'
$env:CONCOURSE_ORIGIN = 'http://localhost:5173'
npm start
```

In a second window, also starting at the repository root:

```powershell
Set-Location examples\concourse-sdlc-lab\server-backed\web
npm ci
npm run dev -- --host localhost --port 5173 --strictPort
```

Open <http://localhost:5173> and choose one of the ten fictional demo users. Create a project/story, then follow the [walkthrough](DEMO_WALKTHROUGH.md). The server creates and migrates `server-backed\server\data\concourse.sqlite` automatically; seed is idempotent and does not reset existing data. For a fresh run use a new checkout or an explicit new `CONCOURSE_DB` file, rather than deleting another user's database. Stop each foreground process with Ctrl+C.

## Re-run the checks

From `examples\concourse-sdlc-lab\server-backed\server`:

```powershell
npm run typecheck
npm test
```

From `examples\concourse-sdlc-lab\server-backed\web`:

```powershell
npm run lint
npm run build
npm test
npm run test:quality
$env:CONCOURSE_SERVER_ROOT = (Resolve-Path '..\server').Path
npm run test:delivery
npx playwright install chromium
npm run test:browser
```

Playwright starts its own Vite server on 5182 and intercepts API requests with fixtures. Its 27 browser cases do not prove live server persistence. The 3 delivery tests and the quality suite's real-backend contract test use loopback HTTP and in-memory SQLite. The previously captured live multi-role journey and unchanged screenshots are separate historical evidence.

From the repository root:

```powershell
npm test
python -m unittest discover -s skills\brad\tests -v
python -m unittest discover -s tests -p test_repository_quality.py -v
python tools\check_repository.py
python tools\build_release.py
npm pack --dry-run --json
node --test examples\concourse-sdlc-lab\app\tests\domain.test.mjs
node examples\concourse-sdlc-lab\evaluation-tools\smoke-built.mjs
node examples\concourse-sdlc-lab\evaluation-tools\validate-run.mjs brad-v0.4.1-8ecc17ba
node examples\concourse-sdlc-lab\evaluation-tools\check-publication.mjs
git diff --check
```

The released BRAD Node baseline has two known Windows/npm 12 test-harness failures: directory symlink `EPERM` before BRAD runs and array-only npm-pack JSON parsing. Do not integrate the separate candidate fixes to turn this evaluation green. See [publication checks](reports/current/PUBLICATION.md) for exact rerun outcomes, including any additional failures.

The built-client smoke requires both package builds above. It serves the actual compiled client through the compiled API with an in-memory database and production demo enumeration disabled; it does not establish production authentication or deployment.

## Reports, hashes and historical scope

Open [`report/MASTER_REPORT.html`](report/MASTER_REPORT.html) locally in a browser. GitHub displays its source rather than serving the HTML as an application. Report links are local repository-relative links; the selected screenshots are embedded for offline viewing. The [versioned run](evaluations/brad-v0.4.1/brad-v0.4.1-8ecc17ba/README.md) contains scenario data, analytics and the event ledger.

`evaluation-tools\build-run.mjs` rebuilds derived reports from the captured run input; it does **not** rerun the experiments. It preserves the append-only existing ledger. Prefer validating the published artifacts without rebuilding them. If rebuilding before a new commit, regenerate the publication hash manifest afterward and rerun both validators.

From the repository root, regenerate hashes with `node examples\concourse-sdlc-lab\evaluation-tools\hash-publication.mjs`. The example-scoped `.gitattributes` disables Git line-ending conversion to preserve the exact captured bytes and hashes across Windows/POSIX checkouts; no repository-wide setting is changed.

[`reports/current/PUBLICATION_HASHES.json`](reports/current/PUBLICATION_HASHES.json) records SHA-256 for published example artifacts (excluding itself). The publication checker verifies these hashes and selected privacy/link constraints. Historical source and package hashes remain in the run input; a separately labeled publication fingerprint accounts for README/path sanitization. It is not substituted for the original tested source hash.

The earlier [prototype archive](reports/previous-partial-validation/README.md) and root legacy `evaluation/` and `telemetry/` records retain earlier observations. They include earlier local implementation contexts and local commit references, not independently verifiable remote Git history or proof of the later BRAD-routed stakeholder study. Their L4 `BLOCKED` labels are historical; the versioned run reports per-case L2–L5 `NOT_RUN` and a separately blocked TEA probe.

Native BMAD workflow invocation, all 85 behavioral routes, independent BRAD stakeholder collaboration, matched direct-BMAD comparisons, and BRAD's application-ticket-to-PR/CI lifecycle remain unverified/unperformed. Publishing this review PR does not execute those experiments. The current workspace is not a BMAD-installed demo fixture; reproduction does not require installing BMAD.

Historical setup commands and observations remain in the [archived reproduction guide](reports/previous-partial-validation/REPRODUCE.md) and [execution record](reports/current/EXECUTION.md). Local paths/private session IDs were replaced by documented aliases without changing outcomes.
