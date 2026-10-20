# Historical Evaluation Records (Audit Trail)

These artifacts are preserved as immutable historical evidence from prior iterations of the RelayDesk v0.5.0 evaluation, documenting the evolution toward rigorous empirical validation:

1. **`routing-results-simulated-baseline.json` (Run 0 — Synthetic Default):**
   - Initial evaluation where `selected_route = expected` was mechanically assigned across all 85 scenarios without model execution traces.
   - Disqualified: Synthetic pass assignments.

2. **`behavioral-routing-25-simulated.json` (Run 0 — 25-Case Default):**
   - Initial 25-case sample where selected routes were defaulted to expected specification strings.
   - Disqualified: Synthetic pass assignments.

3. **`matched-comparison-anecdotal.json` (Run 0 — Proxy Benchmark):**
   - Initial proxy benchmark containing manual/anecdotal prompt counts and durations without independent machine timestamp traces.
   - Reclassified: `UNVERIFIED_ANECDOTAL_ESTIMATE`.

4. **`observed-routing-evidence-retrospective.json` (Run 1 — Retrospective Code Mapping):**
   - 10 scenarios mapped retrospectively from RelayDesk application implementation files and git commits.
   - Disqualified from blind routing: In `V6-03`, request was story 1.3 while implementation was story 1.7 (`MISMATCH_TICKET`). The remaining 9 records proved development activity, not blind routing.

5. **`observed-routing-evidence-run1-exposed.json` (Run 2 — Answer-Exposed Run):**
   - 7 scenarios executed via an autonomous subagent.
   - Classification: `ANSWER_EXPOSED — INVALID_FOR_BLIND_ACCURACY`.
   - Disqualified from blind accuracy: Subagent executed repository search commands that read `skills/brad/evals/routing-cases.json` (which contains canonical `expected_route` values) prior to emitting selections. Preserved as historical evidence of tool-assisted routing only.
