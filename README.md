# BRAD — BMAD Routing & Agent Delegation

> **Just ask BRAD.** One entry point for native BMAD workflows — from a story to a reviewed pull request.

[![CI](https://github.com/niamatmarjan/brad/actions/workflows/ci.yml/badge.svg)](https://github.com/niamatmarjan/brad/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/niamatmarjan/brad)](https://github.com/niamatmarjan/brad/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

BRAD is a **thin, user-invoked wrapper** for an existing [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) installation. It discovers the native workflows actually installed in your project, routes your request to the smallest appropriate skill or agent, preserves BMAD's lifecycle, and coordinates authorized delivery steps. It **does not replace** BMAD's PM, Architect, Build, QA, or Test Architect.

## Quick start — ask your AI coding assistant to install it

**Recommended:** Copy the instruction below into Antigravity, Claude Code, GitHub Copilot, or Codex while your project is open. Your agent should inspect the project, run the install, identify any missing official BMAD prerequisites, and verify the skill.

> Install BRAD in this project using the instructions in https://github.com/niamatmarjan/brad/blob/main/docs/AI_SETUP.md. Use the correct host and safe versioned release. Verify with `brad doctor --json`. If native BMAD Method is missing, ask me whether to use v6.12 stable or v7 preview before installing it. Preserve existing files and don't push or deploy.

See the [AI setup guide](docs/AI_SETUP.md) for the full agent protocol, including Windows, permissions, preflight, and smoke tests.

### Terminal alternative

**Node.js 20+** is required for the installer. From your project root:

```bash
npx --yes "github:niamatmarjan/brad#v0.4.0" setup
```

That uses the GitHub release tag and **does not require an npm registry publication**. It detects explicit project host conventions and installs the native BRAD skill in the supported location. An ordinary `.github/workflows` folder alone does not imply Copilot; an ambiguous project gets the shared portable `.agents/skills/brad` path. It never installs BMAD Method for you or silently replaces existing user-customized files.

Choose a host explicitly (useful in a fresh project):

```bash
npx --yes "github:niamatmarjan/brad#v0.4.0" setup --agent antigravity
npx --yes "github:niamatmarjan/brad#v0.4.0" setup --agent claude
npx --yes "github:niamatmarjan/brad#v0.4.0" setup --agent copilot
npx --yes "github:niamatmarjan/brad#v0.4.0" setup --agent codex
```

To generate an instruction tailored to this project for your AI assistant:

```bash
npx --yes "github:niamatmarjan/brad#v0.4.0" prompt
```

To verify your install:

```bash
npx --yes "github:niamatmarjan/brad#v0.4.0" doctor --json
```

The `doctor` command checks installed skill integrity, native BMAD **hints versus configured state**, prerequisites, and next actions; it does not prove native agent invocation. On Windows PowerShell, use `npx.cmd` in place of `npx` if the `.ps1` shim is blocked. Install/configure BMAD separately if needed:

```bash
npx bmad-method install
```

The BRAD CLI includes `setup`, `prompt`, `init`, `doctor`, `update`, `uninstall`, `--dry-run`, `--global`, and `--json`. Updates are safe: managed files are checked before replacement; modified/unmanaged installs require explicit `--force` and are backed up. See the [CLI installation guide](docs/installation.md).

**Prerequisites:** BMAD configured for your project before trying BRAD workflows; a coding host supporting Agent Skills; Git. Pushing PRs additionally requires an authorized remote and the host's GitHub integration/credentials.

**Note:** The package is currently **GitHub-backed**, not published to npm. The shorter `npx @niamatmarjan/brad` command is not available until npm publication is configured. The GitHub spec above is the supported installer.

## What happens when you ask BRAD?

```text
/brad 1.1                     # resolve native ticket, build, review, test; PR if authorized
/brad 1.1 --pr                # explicitly request push + PR (no automatic merge)
/brad 1.1 --local             # do not publish remotely
/brad --plan 1.1              # read-only routing and delivery preview
/brad resume 1.1              # resume existing branch/PR, don't duplicate
/brad epic 2                  # native epic flow / installed orchestrator
/brad qa authentication      # choose the relevant QA/TEA workflow
/brad architect review auth  # call the installed specialist, review-scoped
/brad release R1              # evidence-based readiness; does not deploy
```

For a development ticket, BRAD aims for **resolve → native Build → review → verify → commit → push → PR → CI evidence**, conditioned on installation capabilities and publishing authorization. Native BMAD execution owns the implementation, and human clarification/approval checkpoints remain in force. BRAD does **not** auto-merge, deploy, bypass CI, invent subagent execution, or claim that unrun tests passed.

## Validate routing with observed evidence

An external Antigravity lab reported 85/85 static target checks, but only 55/85
native selection/invocation outcomes and 10 full delivery outcomes. Several
reported selections differed from the expected native workflow (such as
epic planning routed to `bmad-prd`, or TEA test review routed to `bmad-help`).
These results are **report claims**, not imported agent execution logs.

BRAD now includes a read-only audit utility for captured observations:

```bash
python skills/brad/scripts/audit_routing_results.py --observed actual-observations.json --pretty
```

Read [routing evidence and specialist choice](skills/brad/references/routing-verification.md)
and [evaluation methodology](skills/brad/evals/HOW_TO_EVAL.md). Keep static,
selection, native invocation and delivered outcome metrics separate.

## Compatibility and current maturity

- **BMAD v6:** designed against the v6.11/v6.12 skill and sprint patterns.
- **BMAD v7:** preview-aware route discovery; compatibility depends on *installed* v7 interfaces and must be retested as they evolve.
- **TEA and optional modules:** used if installed and relevant, never faked.
- **Runtime:** skill instructions, references, read-only preflight tools, and evaluation cases; **not** a standalone autonomous daemon.
- **Maturity:** v0.4.0 is a **public preview / supervised pilot**. The included 85 routing cases are a test specification, not proof of live host behavior.

## Project layout

```text
cli/brad.mjs                # npx entry point (zero dependencies)
cli/core.mjs                # safe installer and diagnostic logic
package.json                # GitHub npm package manifest
skills/brad/SKILL.md         # thin dispatcher and safety contract
skills/brad/references/      # version, tickets, QA, clarifications, host handoffs
skills/brad/scripts/         # read-only BMAD and delivery preflight
skills/brad/evals/           # 85 behavioral routing evaluation cases
skills/brad/tests/           # structural and helper tests
.github/agents/brad.agent.md # optional Copilot coordinator agent
brad.policy.example.yaml     # optional, consented publication policy
```

Run tests without installing dependencies:

```bash
python -m unittest discover -s skills/brad/tests -v
python tools/build_release.py
```

Read [AI setup](docs/AI_SETUP.md), [validation boundaries](docs/validation-report-review.md), [architecture](docs/architecture.md), [testing limitations](docs/validation.md), [contributing](CONTRIBUTING.md), [security](SECURITY.md), and [changelog](CHANGELOG.md). Releases follow [SemVer](https://semver.org/); instructions are in [docs/releasing.md](docs/releasing.md).

## Attribution

The initial `v0.1.0` sources were adapted and rebranded from the **BMAD Auto v3** prototype, retaining its core behavior and scenario evaluation suite. Inspired by [BAD](https://github.com/stephenleo/bmad-autonomous-development), [auto-bmad](https://github.com/stefanoginella/auto-bmad), and [official bmad-loop](https://github.com/bmad-code-org/bmad-loop). These projects are references, not bundled dependencies. This is an independent community project and is **not affiliated with or officially endorsed by the BMAD Method maintainers**.

MIT licensed. Copyright © 2026 Niamat Marjan.
