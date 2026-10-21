# BRAD — BMAD Routing & Agent Delegation

> **One request. The appropriate installed BMAD workflow.** A supervised, thin router for coding agents.

[![CI](https://github.com/niamatmarjan/brad/actions/workflows/ci.yml/badge.svg)](https://github.com/niamatmarjan/brad/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/niamatmarjan/brad)](https://github.com/niamatmarjan/brad/releases)
[![MIT License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

BRAD routes requests to **official, project-installed [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) skills**. It helps resolve existing stories, choose Build, review and TEA specialists, resume unfinished work and coordinate authorized GitHub delivery. BMAD owns the implementation workflows and project state; BRAD does not replace BMAD or run an autonomous agent service.

**Current published release:** [v0.5.1](https://github.com/niamatmarjan/brad/releases/tag/v0.5.1). BRAD is an independent, MIT-licensed **supervised preview**, not endorsed by BMAD Method. The `main` branch contains changes **not yet in the tagged release**; see [Changelog](CHANGELOG.md).

## Quick start

In the **project where you want BRAD to work**, with Node.js 20+ and Git:

```powershell
# Windows PowerShell; on macOS/Linux replace npx.cmd with npx
npx.cmd --yes "github:niamatmarjan/brad#v0.5.1" setup --agent antigravity
npx.cmd --yes "github:niamatmarjan/brad#v0.5.1" doctor --agent antigravity --json
```

Substitute `claude`, `copilot` or `codex` for `antigravity` as appropriate, or omit `--agent` to detect explicit host conventions. The installer writes project-local BRAD skills only; it does **not** implicitly install BMAD. Use a compatible host that can discover Agent Skills, refresh that host after installation, and **verify its actual skill catalog**.

**Native BMAD prerequisites:** Install and configure the [official BMAD Method](https://docs.bmad-method.org/start/install-bmad/) separately when missing. If already installed, preserve that runtime, its modules and its project state. For stable BMAD the upstream installer is `npx.cmd --yes bmad-method@latest install` (Windows). Select BMM and, if needed, TEA in the official setup. Installer success and `brad doctor` establish local setup signals; **neither proves a native skill was invoked**.

### Opt-in BRAD → BMAD setup on `main` (unreleased)

Merged into BRAD `main` after v0.5.1: **explicit** `setup --with-bmad` support. Test before adopting; do **not** assume this flag exists in the released v0.5.1 tag.

```powershell
# Windows PowerShell (on macOS/Linux replace npx.cmd with npx):
# Interactive terminal:
npx.cmd --yes "github:niamatmarjan/brad#main" setup --agent antigravity --with-bmad

# Headless / non-TTY terminal (requires explicit modules and tools):
npx.cmd --yes "github:niamatmarjan/brad#main" setup --agent antigravity --with-bmad --bmad-modules bmm --bmad-tools antigravity

# Dry-run plan preview:
npx.cmd --yes "github:niamatmarjan/brad#main" setup --agent antigravity --with-bmad --dry-run --json
```

**Headless and terminal safety:**
- In an interactive terminal, `setup --with-bmad` invokes the official stable installer interactively.
- In a headless or non-TTY terminal (or with `--non-interactive`), unattended setup requires explicit `--bmad-modules` (e.g. `bmm` or `bmm,tea`) and `--bmad-tools` (e.g. `antigravity`, `claude-code`, `github-copilot`, `codex`). Missing configuration exits safely with code 1 instead of waiting indefinitely.
- Upstream installer execution is bounded by a timeout (default: 180,000 ms, configurable via `--bmad-timeout <ms>`) and process trees are cleaned up on timeout or cancellation.
- Existing BMAD runtime or skills are detected and skipped; BRAD never silently upgrades, overwrites, or migrates BMAD.
- `--bmad-channel preview` selects the v7 alpha Skills CLI, which requires an interactive terminal and native `bmad setup` in the coding host.
- Upstream installer completion and `brad doctor` establish local file presence only; **neither proves native skill invocation or host registration**.

See [AI-assisted setup](docs/getting-started/ai-setup.md) and [CLI reference](docs/getting-started/installation.md) for safe updates, Windows behavior and diagnostics.

## Use BRAD

Use the actual host-supported BRAD skill interface (slash commands are illustrative and not guaranteed in every host):

```text
/brad 1.2 --local              # resolve the existing Story 1.2, do not publish
/brad 1.2 --pr                 # request delivery and a PR when authorized
/brad resume 1.2 --local       # recover branch, native story state and unfinished edits
/brad review Story 1.2        # read-only specialist review
/brad qa Story 1.2            # choose installed QA/TEA skill, if available
/brad --plan 1.2              # read-only routing/preflight
```

BRAD's default delivery lane is **resolve → choose installed native workflow → implement → verify → review → authorized PR → inspect CI**. It never grants permission to merge, deploy, overwrite unrelated work, migrate BMAD, invent a specialist, or skip required human approvals. Explicit review-only and `--plan` requests must remain non-mutating.

## What has actually been verified?

- **Automated checks:** Cross-platform CLI and helper tests exercise installer safety, host discovery hints and routing contracts. The 85 canonical routing cases are **test scenarios**, not 85 confirmed live agent invocations.
- **Real Windows Antigravity lab:** The separate [brad-e2e-lab](https://github.com/niamatmarjan/brad-e2e-lab) completed [Story 1.1](https://github.com/niamatmarjan/brad-e2e-lab/pull/2) and a controlled two-conversation [Story 1.2 resume](https://github.com/niamatmarjan/brad-e2e-lab/pull/4). Both PRs were merged after successful real GitHub Actions: **18** and **29** passing tests respectively. Native Build/TEA workflows were **reported as followed inline**; a separate reviewer subagent was reported. These facts do **not** establish host-native BMAD dispatch, general crash recovery or performance gains.
- **Second-host readiness:** The Copilot CLI catalog reportedly recognized the BRAD skill in a disposable clone. Authenticated Copilot execution and native TEA in a second host **remain untested**.
- **Open release gates:** [Validation tracker](https://github.com/niamatmarjan/brad/issues/15), [setup/terminal fix](https://github.com/niamatmarjan/brad/issues/21), [second-host TEA](https://github.com/niamatmarjan/brad/issues/20), and [public evaluation history/privacy](https://github.com/niamatmarjan/brad/issues/16). **v0.5.2 has not been released**.

BRAD distinguishes five levels: **L1** installed skill contract; **L2** exact target resolution; **L3** selected installed skill; **L4** actual execution mode (host-native, inline, independent subagent, helper-only or unverified); **L5** observed outputs, real PR and CI. Do not turn a static check, `doctor` result or a QA score into a claim of host-native invocation.

## Repository guide

| Location | Purpose |
|---|---|
| [`skills/brad/`](skills/brad/SKILL.md) | BRAD skill contract, references, read-only helper scripts and routing test cases |
| [`cli/`](cli/brad.mjs) | Safe project installer, `doctor`, update and uninstall |
| [`docs/getting-started/`](docs/getting-started/README.md) | Installation and agent-assisted onboarding |
| [`docs/evaluation/`](docs/evaluation/README.md) | Evaluation methodology and honest evidence boundaries |
| [`docs/reference/`](docs/reference/README.md) | Architecture |
| [`docs/maintainers/`](docs/maintainers/README.md) | Release process |
| [`examples/`](examples/README.md) | Historical examples (**not** current performance certification) |

For maintainers, run:

```bash
npm test
python -m unittest discover -s skills/brad/tests -v
python tools/check_repository.py
python tools/build_release.py
npm pack --dry-run --json
```

**The Concourse v0.4.1 artifacts are historical partial results, not the current BRAD demonstration.** The bulky historical demo has been retired from the active source tree and remains preserved in Git history; see [examples](examples/README.md).

## License and attribution

[MIT License](LICENSE) · [Notices](NOTICE.md) · [Branding and non-endorsement](BRANDING.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Changelog](CHANGELOG.md).

BRAD began as an adaptation of the **BMAD Auto v3** prototype and draws inspiration from community BMAD tooling; see [NOTICE.md](NOTICE.md) for attribution. The project is independent of and not officially endorsed by BMAD Method.
