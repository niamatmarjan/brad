# Evaluation run brad-v0.4.1-8ecc17ba

BRAD 0.4.1 baseline evaluation of the Concourse demo. Status is **PARTIAL**; this package records successful, failed, blocked, unsupported and unrun work without turning missing measurements into passes.

- `manifest.json`: baseline identity, host, toolchain, run status and app fingerprint.
- `run-input.json`: captured inputs, exact commands, current observations and findings used by the generator.
- `telemetry/events.jsonl`: append-only event observations; missing operation timestamps/durations remain null.
- `evidence/evidence-index.json`: evidence IDs, outcomes, repo paths and hashes.
- `evaluation/`: 85 L1-L5 results, acceptance results, per-case observations, handoffs and regression specifications.
- `analytics/`: metrics, definitions, CSV, stakeholder, routing, workflow, collaboration, QA, performance, benchmark, reliability and finding outputs.
- `reports/`: 14 AI-readable summaries, engineering handoff and next demo plan.
- `MASTER_REPORT.html`: self-contained offline report.
- `benchmarks/`: direct-BMAD comparison status; no matched run was performed.

Produce outputs with `node evaluation-tools/build-run.mjs`; validate with `node evaluation-tools/validate-run.mjs`. Results are generated from this run input and the canonical scenario file. Safe to share: the run contains fictional demo content and sanitized paths; the private recovery snapshot remains outside the repository. Review screenshots and all content before external publication.
