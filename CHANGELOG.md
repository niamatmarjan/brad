# Changelog

All notable changes will be documented here. Versions follow [Semantic Versioning](https://semver.org/); releases before 1.0 are preview.

## [0.5.2] - 2026-10-23

### Added and changed
- Allow explicitly opt-in, project-local installation of **official** BMAD through `brad setup --with-bmad`, without changing BRAD-only setup defaults.
- Support unattended stable BMAD installation with explicit `--bmad-modules` and `--bmad-tools`; fail promptly without a TTY when required configuration is missing.
- Bound upstream installer runtime and clean up child processes; skip existing native runtimes and protect user-managed BMAD installation state.
- Improve Windows PowerShell/headless diagnostics and Antigravity native-skill inventory detection, without claiming that installed files prove live host-native execution.
- Fix an inherited `npm_config_package` environment hint causing nested official BMAD installation to fail when BRAD runs through `npm exec --package <tarball>`.
- Retry only transient Windows staging-directory rename errors (`EPERM`, `EACCES`, `EBUSY`) with bounded backoff, while preserving failures and rollback safeguards.

### Validation / known limitations
- Pre-merge and post-merge CI passed on supported Node/Python combinations; a disposable Windows Antigravity real-installer test and a bounded Claude Code native-skill-to-PR pilot were reported and separately documented in [issue #21](https://github.com/niamatmarjan/brad/issues/21) and [issue #15](https://github.com/niamatmarjan/brad/issues/15).
- An observed Claude Code v0.5.1 `bmad-build` used Python `uv` for workflow rendering; this is a **native workflow dependency in that configuration**, not a new BRAD CLI requirement.
- The Windows failure was reproduced as an `EPERM` staging rename in `brad init --json`. After the bounded retry fix, Windows operator tests reported five consecutive 54/54 passing default-parallel suites and a 100-iteration JSON CLI stress run without failure. The final integrated candidate CI passed Windows Node 22/24 (54/54 each); this does **not** establish guaranteed immunity to file locks.
- Authenticated Copilot native TEA, BMAD v7 preview workflows and universal host-native Build dispatch remain unverified.
- Public evaluation history retains historical metadata under the documented [audit decision](https://github.com/niamatmarjan/brad/issues/16); no history rewrite or zero-risk guarantee was made.

**Validation scope:** The release is a supervised preview. The actual host skill-loader was not observed in the fresh disposable Antigravity workspace; operator-reported installer success and local skill files alone are not proof of host-native invocation. Release asset checksums are supplied alongside the GitHub release assets.

## [0.5.1] - 2026-10-20

### Changed
- Make `brad doctor --json` recovery advice actionable, approval-gated, and read-only while separating local skill installation from actual host discovery.
- Clarify incremental PRD refinement, preservation of approvals and IDs, and strictly non-mutating review-only routing.
- Distinguish host-native skill dispatch, inline execution of installed BMAD workflows, independent subagents, and helper-script-only activities with explicit evidence rules.
- Organize topic documentation while preserving legacy compatibility paths, and update pinned installer examples.

### Testing and evidence
- Add doctor-recovery and routing/host handoff regression contracts; retain Linux/Windows Node.js and Python CI matrices.
- Release remains a supervised preview: no 85-case live routing certification, general host-native execution guarantee, or autonomous PR-delivery certification. RelayDesk remains an independently reviewed, non-release evaluation.

## [0.5.0] - 2026-10-20

### Changed
- Normalize the distribution test across npm pack JSON output formats without accepting malformed packages.
- Exercise linked-target and linked-parent safety checks on Windows without requiring symlink elevation (directory junctions); retain POSIX symlink coverage.
- Make project-local native skill inventory separate from host discovery and native invocation claims.
- Expand GitHub CI to Node 24 on Linux and Windows, while keeping Node 20/22 coverage.

### Validation boundaries
- v0.5.0 does not certify native BMM/TEA execution, independent multi-agent collaboration, 85-case behavioral routing, or remote ticket-to-PR orchestration.
- The v0.4.1 Concourse evaluation is PARTIAL, not a production certification.

## [0.4.1] - 2026-10-19

### Added
- Full open-source project policies: license/attribution notices, branding guidance, code of conduct, contributor provenance, security disclosure, support, governance and roadmap.
- Maintainer CODEOWNERS, GitHub action dependency updates, polished issues/PR templates, `.editorconfig`, `.gitattributes`, and repository quality checks.
- Future demo publication policy, examples index (no fabricated test results), and GPT-6.1 Sol v0.5.0 multi-agent validation master prompt.
- Release checksums and Windows/PowerShell installer smoke testing.

### Changed
- Preserve the original MIT LICENSE; package official copyright and third-party notices in distributed artifacts.
- Normalize changelog ordering, documentation links and release instructions. Remove accidental generated artifacts from packaging.

### Boundaries
- This patch improves repository quality and onboarding only; it does **not** certify native BMAD routing, true subagent concurrency, or unattended remote GitHub delivery.

## [0.4.0] - 2026-10-19

### Added
- Read-only routing result auditor and regression fixtures for incorrect native BMAD skill selections reported by a third-party validation lab. Distinguishes selection, evidence declaration, and actual delivery.
- Native specialist routing verification guide, including explicit high-risk misroutes for BMM/PO and TEA.
- Read-only npm/Git/GitHub delivery preflight diagnostics with actionable, scoped remediation suggestions.
- Machine-readable installer readiness stages, separating skill-file integrity from native execution, PR access and CI.

### Changed
- Hardened `doctor` output to avoid the unproven `aiReady: true` claim.
- Windows `.cmd` guidance and npm Git-source policy checks remain **read-only**; BRAD never changes global npm security settings.
- Documentation distinguishes lab-reported 85 static tests, 55 selection/invocation outcomes, and 10 full delivery passes, and does not advertise uncertified production readiness.

### Compatibility and boundaries
- Native BMAD v6/v7 interface changes still require live host testing. The auditor does **not** perform agent calls; evidence pointers are not independently validated.

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
