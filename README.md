# BRAD — BMAD Routing & Agent Delegation

> **Just ask BRAD.** One entry point for native BMAD workflows — from a story to a reviewed pull request.

[![CI](https://github.com/niamatmarjan/brad/actions/workflows/ci.yml/badge.svg)](https://github.com/niamatmarjan/brad/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/niamatmarjan/brad)](https://github.com/niamatmarjan/brad/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

BRAD is a **thin, user-invoked wrapper** for an existing [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) installation. It discovers the native workflows actually installed in your project, routes your request to the smallest appropriate skill or agent, preserves BMAD's lifecycle, and coordinates authorized delivery steps. It **does not replace** BMAD's PM, Architect, Build, QA, or Test Architect.

## Quick start

**Prerequisites:** A configured BMAD project, a coding host that supports skills (such as Claude Code, Codex, or compatible GitHub Copilot), and Git. For push/PR delivery, the host also needs a configured remote and GitHub credentials/capability.

Download [**v0.1.0**](https://github.com/niamatmarjan/brad/releases) and extract the `brad/` folder from its ZIP into your host's skill directory:

| Host | Project skill location | Invocation |
| --- | --- | --- |
| Claude Code | `.claude/skills/brad/` | `/brad 1.1` |
| Codex | `.agents/skills/brad/` | Supported skill syntax, e.g. `$brad 1.1` |
| VS Code / GitHub Copilot | `.agents/skills/brad/` | Select/mention `brad`, depending on client |

Or clone this repository and copy `skills/brad/` into the target location. For Copilot you can *optionally* copy `.github/agents/brad.agent.md` into the project's `.github/agents/` directory and select that agent. **Skill discovery and slash-command behavior vary by host.** See [installation guide](docs/installation.md).

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

## Compatibility and current maturity

- **BMAD v6:** designed against the v6.11/v6.12 skill and sprint patterns.
- **BMAD v7:** preview-aware route discovery; compatibility depends on *installed* v7 interfaces and must be retested as they evolve.
- **TEA and optional modules:** used if installed and relevant, never faked.
- **Runtime:** skill instructions, references, read-only preflight tools, and evaluation cases; **not** a standalone autonomous daemon.
- **Maturity:** v0.1.0 is a **public preview / supervised pilot**. The included 85 routing cases are a test specification, not proof of live host behavior.

## Project layout

```text
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

Read [architecture](docs/architecture.md), [testing limitations](docs/validation.md), [contributing](CONTRIBUTING.md), [security](SECURITY.md), and [changelog](CHANGELOG.md). Releases follow [SemVer](https://semver.org/); instructions are in [docs/releasing.md](docs/releasing.md).

## Attribution

The initial `v0.1.0` sources were adapted and rebranded from the **BMAD Auto v3** prototype, retaining its core behavior and scenario evaluation suite. Inspired by [BAD](https://github.com/stephenleo/bmad-autonomous-development), [auto-bmad](https://github.com/stefanoginella/auto-bmad), and [official bmad-loop](https://github.com/bmad-code-org/bmad-loop). These projects are references, not bundled dependencies. This is an independent community project and is **not affiliated with or officially endorsed by the BMAD Method maintainers**.

MIT licensed. Copyright © 2026 Niamat Marjan.
