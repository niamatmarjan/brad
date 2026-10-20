# Historical validation-lab findings and verification boundaries

This document summarizes the **user-provided** BMAD Auto v3 validation-lab reports dated 2026-10-19. They are valuable external evidence, not results independently reproduced by BRAD's CI. The source reports tested a precursor skill, not this exact CLI/release.

## Findings informing v0.3.0

- Windows PowerShell users encountered `.ps1` execution-policy errors; prefer `npx.cmd`/`npm.cmd` when necessary, without changing OS security settings.
- The lab reports BMAD Core/BMM v6.12.4 and TEA v1.27.2 under Windows, plus tests of three isolated worktrees and local Git delivery.
- The lab's candidate prototype added a unified ticket parser for v6 `sprint-status.yaml` and v7 `tickets.toml` and Windows command hints. **The actual candidate source code was not included with these report attachments**, so these changes are not falsely claimed to be merged into BRAD. Version-specific parsing must use native BMAD definitions and should be validated against live installs before inclusion.
- The lab reports 85/85 routing cases and 10/10 collaboration scenarios. Its routing evaluations used a constructed evaluator/fixtures: those pass counts do not establish that all cases succeed when real Claude, Copilot, Antigravity, or Codex independently chooses a specialist.
- Crucially, the lab states `gh` was **not installed**, so story-to-local-branch delivery was tested but remote GitHub PR creation and CI status observation were **not** end-to-end confirmed.
- v7 preview was evaluated using v7 fixtures/tickets rather than a separately verified real v7 deployment on a supported live coding host.
- The reported 85.7% reduction in interventions and 71.0% shorter cycle time reflect that lab's experimental comparison, not a universal performance guarantee.

## Required before production claim

1. Run repeatable clean-install tests across Windows PowerShell, macOS, Linux and each selected host.
2. Exercise real native BMAD specialist invocations, including TEA, in at least two genuinely distinct sessions.
3. Demonstrate an authenticated GitHub branch → PR → CI → review flow and test duplicate-PR resume behavior.
4. Validate v7 against a released/pre-release installed native runtime, not only fixtures; respect native schema evolution.
5. Publish redacted evidence, logs and known limitations. Keep agent orchestration opt-in and release operations under policy.

BRAD v0.3.0 therefore remains a **supervised preview**, even when local installer tests pass.
