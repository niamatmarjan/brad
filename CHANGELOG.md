# Changelog

All notable changes will be documented here. Version numbers follow [Semantic Versioning](https://semver.org/).

## [0.3.0] - 2026-10-19

### Added
- AI-first setup (`brad setup`), AI handoff generator (`brad prompt`), and canonical installation contract `docs/AI_SETUP.md`.
- Agent-oriented contributor guide `AGENTS.md` and test-lab limitations summary.
- Improved read-only `doctor` diagnostics for native BMAD configuration, installed skills, prerequisites, and honest next steps.

### Changed
- Host-specific onboarding now calls out Windows `npx.cmd`/`npm.cmd` and refuses to equate leftover `_bmad-output` with a working BMAD runtime.
- Expanded installer verification and doc tests; previous v0.2.0 install and policy conventions remain supported.

## [0.2.0] - 2026-10-19

### Added
- Zero-dependency Node.js CLI (`brad init`, `doctor`, `update`, `uninstall`) runnable with `npx github:niamatmarjan/brad#v0.2.0`.
- Cross-host project and global skill installation targeting Antigravity, Claude Code, Codex, and Copilot.
- Install-marker integrity checks, safe replacement backups, dry run, and JSON diagnostics.
- Node.js 20/22 CLI test matrix and npm tarball smoke test alongside the original Python suite.
- Installation instructions and release assets for GitHub-backed npm execution.

### Notes
- npm registry publication is not yet enabled. Use the pinned GitHub npx command.
- Runtime BMAD v6/v7 agent-delegation validation remains ongoing; CLI tests do not certify the BMAD skill's autonomous behavior.

## [0.1.0] - 2026-10-19

### Added
- Initial public **BRAD** skill, adapted from the internal BMAD Auto v3 prototype.
- Version-aware routing for BMAD v6 and emerging v7 workflows.
- Native ticket-to-PR delivery contract with optional publication policy and CI checks.
- QA/TEA, architecture, research, epic/sprint, and specialist routing guides.
- Read-only installation and Git delivery preflight scripts.
- 85 routing scenarios and 14 baseline automated structural/helper tests.
- Optional GitHub Copilot coordinator, example policy, contributor/security docs, and release automation.

### Known limitations
- Live agent-routing accuracy, nested delegation, PR delivery, and v7 preview compatibility are **not certified** by the included automated tests.
- Hosts differ in skill invocation and independent-agent support; use a supervised pilot.

