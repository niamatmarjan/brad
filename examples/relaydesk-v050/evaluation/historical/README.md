# Historical Evaluation Records (Pre-Audit)

These artifacts are preserved as historical evidence from the initial RelayDesk v0.5.0 evaluation run before independent audit by ChatGPT:

- `routing-results-simulated-baseline.json`: Initial synthetic evaluation where `selected_route = expected` was assigned without model execution traces.
- `behavioral-routing-25-simulated.json`: Initial 25-case sample where selected routes were defaulted to expected specification strings.
- `matched-comparison-anecdotal.json`: Initial proxy benchmark containing manual/anecdotal prompt counts and durations without machine timestamp traces.

### Audit Action Taken
As part of the evaluation correction, these synthetic assignments were discarded from active reporting. The active evaluation in `../routing-results.json` strictly requires independently observed model outputs with execution IDs, marking unrun cases as `NOT_RUN` / `UNVERIFIED`.
