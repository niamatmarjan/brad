# Examples and historical evidence

## Current live validation: external disposable lab

The independent [BRAD E2E lab](https://github.com/niamatmarjan/brad-e2e-lab) contains the actual Story 1.1 [implementation PR](https://github.com/niamatmarjan/brad-e2e-lab/pull/2) and controlled Story 1.2 [resume PR](https://github.com/niamatmarjan/brad-e2e-lab/pull/4). Both PRs were merged with passing GitHub CI (18/18 and 29/29 tests). Native BMAD Build/TEA was reported as executed **inline**, not independently verified host-native dispatch.

## Historical: Concourse v0.4.1 (PARTIAL)

The historical Concourse v0.4.1 partial demonstration and evaluation trail has been retired from the active source tree to maintain repository hygiene and eliminate duplicated files.

Its full historical evidence, offline reports, and sanitized evaluation trail remain preserved immutably in Git history at commit [`52acd28762`](https://github.com/niamatmarjan/brad/tree/52acd287624d888257e9b5d86dcddbadca19cc56/examples/concourse-sdlc-lab) (originally introduced in commit [`edeb76d`](https://github.com/niamatmarjan/brad/commit/edeb76d0eb2ad7aff53e07a81e480d6475e7bd51)). It is **not** a production-ready reference, a current routing-performance benchmark, or evidence of universal native agent invocation.

**Retention and privacy:** The historic repository audit under [issue #16](https://github.com/niamatmarjan/brad/issues/16) was **closed with explicit residual risk**. It did not confirm active secrets in the examined evidence, but old workstation-path and session metadata remain reachable in public Git history, and the isolated legacy branch was not rewritten. Closing the issue is **not** a zero-risk privacy clearance, and deleting current files does not erase reachable Git objects.

New lightweight examples should live in dedicated disposable repositories; add a small summary here only after source/privacy and evidence review.

## Enterprise Reference: Operation Ironclad (`examples/enterprise-sdlc-lab/`)

Operation Ironclad is a full-lifecycle enterprise reference implementation and adversarial battle-hardening benchmark for BRAD v0.5.3 under native BMAD v6.12:

- **Reference Product**: **AegisFlow Enterprise** (`examples/enterprise-sdlc-lab/project/`), a modular TypeScript/ESM multi-tenant change management platform featuring strict row-level isolation, dynamic multi-stage approvals, self-approval prevention (Rule BR-001), SHA-256 hash-chained audit ledgers, business-hours SLA calculations, and an accessible WCAG 2.1 AA dashboard. 21/21 automated tests passing.
- **Frozen Adversarial Suite**: 120 pre-frozen enterprise scenarios across 12 diagnostic categories (`scenarios/case-manifest.json` and `scenarios/expected-outcomes.json`) with automated Python evaluation harness (`harness/runner/run_benchmark.py`).
- **Multi-Agent Coordination**: 8 automated multi-agent chaos experiments (`harness/runner/run_multiagent_experiments.py`) and independent subagent audit sessions for functional QA and security penetration.
- **Privacy & Hygiene**: 100% synthetic data, zero real-world PII, zero production credentials, and scrubbed paths.
- **Reports & Artifacts**: Complete suite of 9 comprehensive evaluation reports in `examples/enterprise-sdlc-lab/reports/` and interactive offline HTML5 dashboard in `analytics/index.html`.
- **Verdict**: **CONDITIONAL GO — Supervised Enterprise Production Pilot**. See [FINAL_GO_NO_GO.md](file:///c:/Projects/Personal/brad/examples/enterprise-sdlc-lab/reports/FINAL_GO_NO_GO.md) for pilot prerequisites and governance gates.

