# Concourse example artifact map

**Evaluation baseline: BRAD v0.4.1 · Verdict: PARTIAL.** The example is a runnable local SDLC fixture, not proof of production-ready native BMAD orchestration.

| Location | Purpose | Status |
|---|---|---|
| [server-backed/](server-backed/README.md) | Current React/Vite + SQLite server-backed Concourse application | Runnable demo; acceptance gaps documented |
| [reports/current/](reports/current/EXECUTION.md) | Current app test commands, screenshots and acceptance closure | Observed local test results |
| [docs/qa/](docs/qa/ACCEPTANCE.md) | Functional acceptance and automation criteria | Includes BLOCKED and PARTIAL |
| [evaluations/brad-v0.4.1/](evaluations/brad-v0.4.1/) | Versioned run data, telemetry, analytics and immutable master report | L1 metadata checked; L2–L5 NOT_RUN |
| [report/MASTER_REPORT.html](report/MASTER_REPORT.html) | Convenient top-level pointer/copy of the latest offline master report | PARTIAL evaluation |
| [reports/previous-partial-validation/](reports/previous-partial-validation/README.md) | Preserved first prototype and earlier partial report | Historical; do not treat as current app |
| [app/](app/package.json) | Legacy browser-local prototype retained for comparison | Not the current server-backed application |
| [evaluation-tools/](evaluation-tools/README.md) | Evidence, metrics and report-generation utilities | Reproducibility support |
| [reports/BRAD_V0.5.0_ENGINEERING_HANDOFF.md](reports/BRAD_V0.5.0_ENGINEERING_HANDOFF.md) | Prioritized follow-up work for BRAD | Candidate proposals; do not claim shipped v0.5 fixes from this run |

## Preservation and publication rules

- The experiment is specifically a **v0.4.1** baseline even though the surrounding BRAD repository now has a newer release.
- The versioned run report, event ledger, and hash manifest are evidence artifacts; keep them immutable.
- The root `report/MASTER_REPORT.html` is a convenient report copy, not a second independent run.
- Never treat fictional in-app users as independent AI participants or metadata-only routing cases as observed skill invocations.
- Keep the large archives and previous evidence until a separately reviewed deduplication plan is approved; do not silently discard them during documentation housekeeping.
- For maintained BRAD docs, use the [documentation index](../../docs/README.md).
