# Contributing to BRAD

Thanks for helping make native BMAD routing easier and more reliable.

1. Open an issue describing the BMAD version, host, steps to reproduce, expected behavior and observed output (redact credentials).
2. Create a branch from `main` and make the smallest change. Keep BRAD a **wrapper**; use installed native workflows for specialist work.
3. Add or update a scenario in `skills/brad/evals/routing-cases.json` and executable tests for changed scripts/contracts.
4. Run `python -m unittest discover -s skills/brad/tests -v` and `python tools/build_release.py`.
5. Submit a pull request with evidence, compatibility impact and any user-facing behavior changes. PRs are reviewed before merging.

Do not submit test or subagent outcomes as passed without actual execution evidence. Avoid new heavy runtime dependencies and secrets in fixtures. For security reports, see [SECURITY.md](SECURITY.md).
