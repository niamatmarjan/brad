# Validation and limitations

BRAD includes **85 canonical routing evaluation scenarios**, adapted from the BMAD Auto v3 prototype. The automated test-suite size changes between releases: run the current Node/Python suites and report observed totals, rather than relying on an old fixed count. Run the tests and report current results rather than assuming they pass everywhere.

```bash
python -m unittest discover -s skills/brad/tests -v
python tools/build_release.py
```

The automated tests cover file/contract consistency, state inspector fixture behavior, and read-only delivery preflight. The 85 cases are a **behavioral test plan**, not 85 proven real-world agent passes.

Before labeling BRAD production-ready, evaluate real routing and native workflow invocation on the host you plan to use, including v6/v7 detection, TEA selection, ambiguous IDs, interrupted runs, Git PR/CI delivery and human checkpoints. See `skills/brad/evals/HOW_TO_EVAL.md`.

Known risk: model-selected workflows can be wrong, hosts may not support nested subagents, and public BMAD interfaces change. Treat current releases as preview/attended unless the relevant environment has been validated end to end.

Repository policies, evidence criteria and future report publication are in [../CONTRIBUTING.md](../../CONTRIBUTING.md) and [demo-publication.md](demo-publication.md). Refer to [BRAD's validation workstream](https://github.com/niamatmarjan/brad/issues/15) for observed, current pilot evidence.
