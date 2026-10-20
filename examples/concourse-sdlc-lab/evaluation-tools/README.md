# Evaluation tools

The evaluation package uses Node.js built-ins only; it adds no runtime dependencies.

- `schemas/` defines versioned JSON contracts for the run manifest, event, and 85-case result.
- `build-run.mjs` validates the canonical catalog against BRAD's source file, generates scenario results/CSVs and independent metrics, and builds the offline HTML reports from the run input.
- `record-event.mjs` appends one uniquely identified event to a run's JSONL ledger after confirming its evidence references.
- `validate-run.mjs` checks the run IDs, evidence files and hashes, required evidence references, duplicate IDs, 85 case records, exact metric calculations, report links/self-containment, and basic secret-token patterns.

For the current run:

```powershell
node evaluation-tools\build-run.mjs
node evaluation-tools\validate-run.mjs brad-v0.4.1-8ecc17ba
```

To append an observation during a future run, first add the evidence record to `evidence/evidence-index.json`, then call `record-event.mjs` with a unique event ID and the matching run ID. `timestampMeaning: "captured_at"` means the host did not expose the original operation time; do not present it as a measured execution timestamp. Unknown durations, model IDs, tokens and cost must remain `null`.

The report includes per-suite denominators and evidence links, a ten-role participation matrix, collaboration and QA lifecycle boundaries, a root-cause register, and proposed v1.0 gates. Those thresholds are future criteria, not current results. Durations use exact runner output when available; rounded duration text is labeled, and missing values remain unavailable.

The generator refuses to replace an existing event ledger. Reports and derived analytics can be rebuilt before finalization; once a run is finalized, archive it and create a new run ID rather than changing its original evidence.
