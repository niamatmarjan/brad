# Publication review — BRAD v0.4.1 Concourse

**Evaluation verdict: PARTIAL.** Publication is for external engineering review of the v0.4.1 baseline, not a v0.5.0 implementation or production-readiness claim. The existing evaluation branch is the publication target; no baseline installer/routing/version or separate candidate patch belongs in this change.

## Privacy and provenance review

- Replaced machine-specific absolute paths with role-based checkout aliases or equivalent relative PowerShell commands. Private Copilot session IDs were replaced by context aliases. The opaque historical run-directory name is retained for stable evidence links; it is not a full private session identifier.
- Redaction changes only identifying metadata and reproduction guidance. Historical PASS/FAIL/PARTIAL/BLOCKED/NOT_RUN outcomes, observed counts, timestamps and the original tested source hash are preserved. A distinct publication fingerprint accounts for edits to the three server-backed README files only.
- Historical local implementation branch/commit references are retained as provenance assertions, not as remotely verifiable GitHub evidence. Earlier app implementation contexts are not promoted into evidence of the later BRAD stakeholder collaboration experiment.
- Visually reviewed all three screenshots: fictional seeded identities, local demo tasks and application audit UUIDs only; no browser chrome, credentials, personal paths or customer data observed. Screenshot bytes and recorded SHA-256 values are unchanged.
- MIT notices are retained; template/dependency provenance is disclosed in `NOTICE.md`. Lockfiles use public npm package resolutions. No installed dependencies or generated bundles are published.
- Dependencies, caches, test outputs, database files, local env files, private skill/worktree directories and redundant binary release archives are excluded. The local release ZIP remains on disk, outside the published example.
- Example-scoped `.gitattributes` preserves captured file bytes without line-ending conversion on checkout; the historical source hash is not recomputed as if normalized bytes had been tested.
- This is an agent-performed hygiene review, not a comprehensive security audit or a claim of manual assistive-technology testing. Maintainer privacy, licensing and accuracy review remains required on the draft PR.

## Publication verification rerun

**BRAD v0.4.1 — Concourse SDLC Implementation & Evaluation**

Executed on Windows with Node v24.19.0, npm 12.0.2 and Python 3.13.14. These publication reruns do not replace historical evaluation observations or upgrade the **PARTIAL** verdict. Commands below are relative to the indicated working directory; `lab` means `examples\concourse-sdlc-lab`.

| Working directory | Exact command | Observed result |
| --- | --- | --- |
| `lab\server-backed\server` | `npm run typecheck` | PASS, exit 0 |
| `lab\server-backed\server` | `npm test` | PASS, 27/27, exit 0 |
| `lab\server-backed\web` | `npm run lint` | PASS, exit 0 |
| `lab\server-backed\web` | `npm run build` | PASS, TypeScript and Vite production build, exit 0 |
| `lab\server-backed\web` | `npm run test` | PASS, 15/15, exit 0 |
| `lab\server-backed\web` | `npm run test:quality` | PASS, 40/40 across 3 files, exit 0 |
| `lab\server-backed\web` | `$env:CONCOURSE_SERVER_ROOT=(Resolve-Path '..\server').Path; npm run test:delivery` | PASS, 3/3 real HTTP/SQLite integration tests, exit 0 |
| `lab\server-backed\web` | `npm run test:browser` | PASS, 27/27 desktop/tablet/mobile checks, exit 0; API-intercepted fixtures |
| Repository root | `npm test` | **FAIL**, 27/29 passed, 2 failed, exit 1; both baseline harness failures reproduced |
| Repository root | `python -m unittest discover -s skills\brad\tests -v` | PASS, 21/21, exit 0 |
| Repository root | `python -m unittest discover -s tests -p test_repository_quality.py -v` | PASS, 5/5, exit 0 |
| Repository root | `python tools\check_repository.py` | PASS, exit 0 |
| Repository root | `python tools\build_release.py` | PASS, 28 files, 45,376-byte local ZIP, exit 0; ZIP retained, not published |
| Repository root | `npm pack --dry-run --json` | PASS, `@niamatmarjan/brad` v0.4.1, 33 files, exit 0; npm 12 name-keyed JSON |
| Repository root | `node --test examples\concourse-sdlc-lab\app\tests\domain.test.mjs` | PASS, 5/5 legacy prototype tests, exit 0 |
| Repository root | `node examples\concourse-sdlc-lab\evaluation-tools\smoke-built.mjs` | PASS, compiled HTML, 2 compiled assets, API health and disabled production demo enumeration, exit 0 |
| Repository root | `node examples\concourse-sdlc-lab\evaluation-tools\build-run.mjs` | PASS, report regenerated with PARTIAL verdict, exit 0 |
| Repository root | `node examples\concourse-sdlc-lab\evaluation-tools\validate-run.mjs` | PASS, 85 scenarios, 20 evidence records, 16 events, 2 current reports; metadata/ledger/statistics/source-hash consistency, exit 0 |
| Repository root | `node examples\concourse-sdlc-lab\evaluation-tools\check-publication.mjs` | PASS, exact artifact SHA-256 set, local report/Markdown links and publication privacy/path constraints, exit 0 |
| Repository root | `git diff --check` and `git diff --cached --check` | PASS, exit 0 |

The two BRAD Node failures remain unresolved in this publication:

- `symlinked targets are rejected without touching targets`: directory `symlinkSync(..., 'dir')` throws `EPERM` during test setup, before the BRAD executable is invoked.
- `distribution contains files required by the npm CLI`: `JSON.parse(stdout)[0]` is undefined for the observed npm 12 package-name-keyed object, causing `Cannot read properties of undefined (reading 'files')`.

These are observed test portability/host assumptions, not demonstrated installer runtime defects. No baseline tests, installer logic, routing instructions, version or separate candidate patches were changed to make them pass. The candidate branch's reported 32/32 result is not substituted here.

The publication checker also detected broken links in the relocated historical archive. Link prefixes were repaired in the archived report, its generator and reproduction guide; no archived verdict or outcome was rewritten. Current generated HTML presents web unit (15) and quality (40) checks separately rather than implying one 55-test runner.

### Clean-path reproduction

Copied only publishable server-backed source/lockfiles and the smoke script to an empty directory outside the checkout, without dependencies, builds, database files, environment files or Git worktree internals. Initial `npm run typecheck` / `npm run build` failed with missing `tsc`, as expected before restoring dependencies. Then:

- Server: `npm ci` PASS (0 audit vulnerabilities reported), `npm run typecheck` PASS, `npm test` PASS 27/27.
- Web: `npm ci` PASS (0 audit vulnerabilities reported), `npm run build` PASS.
- Clean-copy repository root: `node examples\concourse-sdlc-lab\evaluation-tools\smoke-built.mjs` PASS against an ephemeral loopback port and in-memory SQLite; actual compiled HTML, both assets and health endpoint served.
- A separate `git checkout-index` export of the staged files passed the report validator (85 scenarios / 20 evidence / 16 events / 2 reports) and all 244 artifact SHA-256 comparisons. This verifies the bytes that Git will publish, not only the original working-copy files.

This verifies a dependency-restored, clean-path reproduction on the same Windows host, not another machine, OS, Node/npm version, deployment or comprehensive dependency/security audit. Playwright's browser installation is a separate prerequisite documented in `REPRODUCE.md`. The clean-path smoke is not a live-browser authentication/acceptance test.

## Reproduction and evidence

Use `REPRODUCE.md` from a fresh clone and the committed npm lockfiles. The server creates its schema and fictional identities without a copied database. The browser E2E suite uses API interception; real HTTP/SQLite coverage is separately labeled.

The versioned ledger and analytics retain their original experiment scope. GitHub CI triggered by this documentation/example PR, if any, is repository CI only; it is **not** BRAD's unperformed application-ticket-to-PR experiment. No merge, release, deployment or v0.5.0 implementation is authorized by this publication.

Publication hashes are generated in `PUBLICATION_HASHES.json` after all final example files are prepared. The checker verifies artifact hashes and publication constraints; there is no self-referential hash for the hash manifest itself.
