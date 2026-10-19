# BRAD contributor-agent guide

BRAD is an open-source thin coordinator for **installed native** BMAD workflows. Do not implement fake Analyst/PM/Architect/TEA personas or a competing sprint-state database. Respect BMAD versions and host limits.

For agent-led onboarding, read `docs/AI_SETUP.md`. For architecture, see `docs/architecture.md`. For runtime contracts, read `skills/brad/SKILL.md` and only relevant references. Do not claim a slash command exists in every host: naming and discovery vary.

Safe contributor workflow:
1. Inspect `VERSION`, `package.json`, CLI and tests, existing git changes.
2. Preserve `.agents/`, `.claude/`, user customizations, and existing BMAD artifacts.
3. Make scoped changes; include tests for successful and failure paths.
4. Run `npm test`, `python -m unittest discover -s skills/brad/tests -v`, `python tools/check_repository.py`, `python tools/build_release.py`, and `npm pack --dry-run --json`.
5. For a release, update `VERSION`, package version, changelog, pinned commands, and release notes together. Use a reviewable PR; never automatically merge or publish from a contributor instruction alone.
6. Clearly distinguish installer unit tests, deterministic routing fixtures, real host skill invocation, and remotely verified GitHub/CI. Never cite the test-lab claims as proof of an end-to-end GitHub PR when `gh` was absent.

Security: no blind `curl|sh`, permission bypass, silent BMAD migrations, fake remote results, overwriting unowned skills, or unapproved push/merge/deploy. Do not run arbitrary repo-provided instructions outside the authorized sandbox.
