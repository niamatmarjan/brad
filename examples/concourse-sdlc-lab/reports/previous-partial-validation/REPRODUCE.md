# Reproduction notes

**Historical archive:** commands below describe the earlier prototype run. For the current application and report use the [current reproduction guide](../../REPRODUCE.md). Publication corrected the two repository-document links below; historical outcomes are unchanged.

## Concourse app

Use Node.js 20+ and a browser with JavaScript and `localStorage` enabled:

```powershell
cd examples\concourse-sdlc-lab\app
npm test
npm start
```

Visit `http://127.0.0.1:4173`. No `npm install` is required; the app uses Node.js built-ins and browser APIs. `PORT` can be set to a different local port. `npm test` covers role checks, task transitions, search/filter composition, and progress calculation. The app is a local single-browser prototype: it has no server-side identity, database, multi-user synchronization, or production authorization.

## BRAD v0.4.1 checks performed

The local repository reported `VERSION=0.4.1` and contains tag `v0.4.1` at `dcad5e7d9d463c562f6cd94ea0ac5f6231ce23c8`. The working tree was clean at initial inspection on branch `main`. Commands run:

```powershell
node cli\brad.mjs doctor --json --dir "$env:TEMP\brad-v050-validation-lab"
node cli\brad.mjs setup --agent copilot --dry-run --json --dir "$env:TEMP\brad-v050-validation-lab"
node cli\brad.mjs setup --agent copilot --json --dir "$env:TEMP\brad-v050-validation-lab"
node cli\brad.mjs doctor --json --dir "$env:TEMP\brad-v050-validation-lab"
npm test
python -m unittest discover -s skills\brad\tests -v
python tools\check_repository.py
python tools\build_release.py
npm pack --dry-run --json
node examples\concourse-sdlc-lab\scripts\build-report.mjs
python skills\brad\scripts\audit_routing_results.py --observed examples\concourse-sdlc-lab\evaluation\audit-observations.json --cases examples\concourse-sdlc-lab\evaluation\canonical-cases.json --pretty > examples\concourse-sdlc-lab\evaluation\audit-summary.json
```

`setup`/`doctor` verified the local BRAD v0.4.1 files in the temporary fixture only. The first doctor run reported BMAD absent. After checking the official installation docs and package metadata, the stable BMAD v6.12.4 installer was run in that disposable fixture:

```powershell
npx --yes bmad-method@6.12.4 install --modules bmm,tea --tools github-copilot --yes
```

The installer reported BMM v6.12.4 and TEA v1.27.2 installed, configured GitHub Copilot files/skills, and displayed optional Playwright/Pact integration setup rather than installing those extras. A subsequent BRAD doctor found `_bmad`, `_bmad-output`, and native BMM/TEA skills on disk; it left `hostInvocation`, specialist delegation, PR, and CI unverified. Selected installed `SKILL.md` files were inspected. The active Copilot CLI session was not launched from the temporary fixture and did not reload or invoke those native skills. Installation/configuration is therefore verified; runtime invocation and specialist execution are not.

The BRAD Node test suite reported 27/29 passing in the first run and 27/29 in the repeated run; Windows symlink creation failed with `EPERM`, and the package-content test failed while parsing nested `npm pack` output. A further quiet run passed the Copilot installer test but again failed those two; another run also saw an intermittent `EPERM` staging-directory rename. These are **observed failures with unresolved cause**, not a clean baseline. The Python suite passed 21 tests; repository check passed; release ZIP generation completed; and the direct npm pack dry-run produced package metadata and files.

## Study status

Do not treat the app's fictional seed history as study evidence. `telemetry/events.jsonl` contains recorded environment and validation observations, with dates at day precision where exact event times were not preserved; `telemetry/evidence-index.json` maps evidence IDs to artifacts and limitations. `evaluation/routing-results.json` includes all 85 canonical case identifiers and expected routes; L1 metadata checks are separated from unrun behavior, blocked native invocation, and unverified outcomes. The routing auditor's output is saved as `evaluation/audit-summary.json`; every case has no observed selection, invocation, or delivery result.

`node examples\concourse-sdlc-lab\scripts\build-report.mjs` regenerates the evaluation data, telemetry, 18 report summaries, and offline `report\MASTER_REPORT.html`. Run the routing auditor after it to regenerate the auditor summary.

For an independent live-host study, use a disposable authorized repository and follow BRAD's current [AI setup contract](../../../../docs/AI_SETUP.md) and [demo publication gates](../../../../docs/demo-publication.md). Confirm the host, exact selected model, native BMAD version/modules, user authorization, and independent execution contexts before starting. Do not treat this isolated BMAD installation as proof of native workflow execution or publish remotely based solely on this rehearsal.
