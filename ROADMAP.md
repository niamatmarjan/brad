# BRAD roadmap — post-v0.5.2

BRAD is an independent **supervised preview**, currently published at [v0.5.2](https://github.com/niamatmarjan/brad/releases/tag/v0.5.2). This roadmap records **observed milestones and unsatisfied acceptance gates**, not promises or release dates. See [launch readiness](docs/maintainers/launch-readiness.md) and the [compatibility matrix](docs/reference/compatibility-matrix.md).

## Completed foundations and v0.5.2 release

- [x] GitHub-backed project-local Agent Skills installation, read-only `doctor`, safe opt-in official stable BMAD installation, cross-platform unit checks and GitHub ZIP/npm tarball packaging.
- [x] [#21](https://github.com/niamatmarjan/brad/issues/21) — Windows/Antigravity headless official BMAD installer contract, with approval, bounded execution and no silent upgrades; scope-limited lab evidence.
- [x] [#20](https://github.com/niamatmarjan/brad/issues/20) — one authenticated Claude Code native TEA execution with **v0.5.1**; *not* broad cross-host certification.
- [x] [#19](https://github.com/niamatmarjan/brad/issues/19) — bounded routing/refusal and interrupted-resume validation.
- [x] [#15](https://github.com/niamatmarjan/brad/issues/15) — observed ticket-to-PR pilot and final evidence-based v0.5.2 GO decision; [released v0.5.2](https://github.com/niamatmarjan/brad/releases/tag/v0.5.2) after passing CI.
- [x] [#28](https://github.com/niamatmarjan/brad/issues/28) and [#29](https://github.com/niamatmarjan/brad/issues/29) — bounded Windows rename retry and nested npm environment contamination fixes, tested and shipped.
- [x] [#16](https://github.com/niamatmarjan/brad/issues/16) — public-history audit and explicit risk-retention decision. Historical path/session metadata **remains reachable**; closing the review does not erase it.

## Pre-live experience and compatibility — still open

- [ ] [#32](https://github.com/niamatmarjan/brad/issues/32) — **genuine BMAD v7 preview** installation, host-native ticket/Build/review execution, mixed-state safety, and observed routing regression fixtures.
- [ ] [#33](https://github.com/niamatmarjan/brad/issues/33) — actual Claude Code, Codex, Antigravity and Copilot discovery/dispatch matrix for tagged v0.5.2; distinguish ChatGPT/Claude.ai chat from coding host execution.
- [ ] [#34](https://github.com/niamatmarjan/brad/issues/34) — align read-only Python native-skill inventory with Antigravity's `.agent/skills` and test v7 ticket hints.
- [ ] New-user onboarding and one representative task from each of PM, BA, Architect, Lead, Dev, QA and Delivery using the [stakeholder handbook](docs/roles/quick-reference.md).
- [ ] Security/operational rechecks before broader publicity: owner approvals, host permissions, sanitized logs, history privacy warning, immutable tags and real artifact checksums.

## Working principles

BRAD remains a **thin router**: no second BMAD state database, no invented native agent personas, no assumed v7 GA, no universal host support claim without actual Skill-tool evidence, and no automatic force-push/merge/deployment. Feature changes after v0.5.2 require a separate reviewed, versioned release; do not rewrite the existing tag.
