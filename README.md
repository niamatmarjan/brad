# BRAD — BMAD Routing & Agent Delegation

> **One request. The appropriate installed BMAD workflow.** A supervised, thin router for coding agents.

[![CI](https://github.com/niamatmarjan/brad/actions/workflows/ci.yml/badge.svg)](https://github.com/niamatmarjan/brad/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/niamatmarjan/brad)](https://github.com/niamatmarjan/brad/releases)
[![MIT License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

BRAD routes requests to **official, project-installed [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) skills**. It helps resolve existing stories, choose Build, review and TEA specialists, resume unfinished work and coordinate authorized GitHub delivery. BMAD owns the implementation workflows and project state; BRAD does not replace BMAD or run an autonomous agent service.

**Current published release:** [v0.5.3](https://github.com/niamatmarjan/brad/releases/tag/v0.5.3). This supervised-preview patch corrects read-only discovery of Antigravity and Codex project-local BMAD skills; earlier [v0.5.2](https://github.com/niamatmarjan/brad/releases/tag/v0.5.2) remains available. BRAD is an independent, MIT-licensed project, not endorsed by BMAD Method. See [Changelog](CHANGELOG.md).

## Start here — choose your workflow

| I want to… | Start with |
|---|---|
| Install BRAD and BMAD correctly | [Choose stable BMAD v6.12 or v7 preview](docs/getting-started/choose-bmad-version.md) |
| Use Claude Code, Codex, Antigravity or Copilot | [Host-by-host setup and exact skill invocation](docs/getting-started/host-support.md) |
| Use BRAD as PM, BA, Architect, Lead, Dev or QA | [Ten stakeholder prompt recipes](docs/roles/quick-reference.md) → [full role guides](docs/roles/README.md) |
| Check whether my AI host / BMAD version actually works | [Tested compatibility and evidence matrix](docs/reference/compatibility-matrix.md) |
| Understand BRAD's limits and pre-live gates | [Launch-readiness checklist](docs/maintainers/launch-readiness.md) |
| Contribute, troubleshoot or maintain | [Documentation hub](docs/README.md) · [Agent contributor guide](AGENTS.md) |

**BRAD = task router; BMAD = native workflow engine; coding host = actual skill executor.** Installing one does not prove the other is installed or invoked. Claude.ai and ChatGPT chat are not direct replacements for Claude Code or Codex. BRAD is portable to some Agent Skills hosts, but **full v7 alpha and all-host native execution are not yet verified**.

## Quick start

In the **project where you want BRAD to work**, with Node.js 20+ and Git:

```powershell
# Windows PowerShell; on macOS/Linux replace npx.cmd with npx
npx.cmd --yes "github:niamatmarjan/brad#v0.5.3" setup --agent antigravity
npx.cmd --yes "github:niamatmarjan/brad#v0.5.3" doctor --agent antigravity --json
```

Substitute `claude`, `copilot` or `codex` for `antigravity` as appropriate, or omit `--agent` to detect explicit host conventions. The installer writes project-local BRAD skills only; it does **not** implicitly install BMAD. Use a compatible host that can discover Agent Skills, refresh that host after installation, and **verify its actual skill catalog**.

**Native BMAD prerequisites:** The currently documented stable v6.12 line expects Node.js 20.12+, Python 3.10+ and `uv`; these are **upstream BMAD prerequisites**, distinct from BRAD's Node-based CLI. Install and configure the [official BMAD Method](https://docs.bmad-method.org/start/install-bmad/) separately when missing. If already installed, preserve that runtime, its modules and its project state. For stable BMAD the upstream installer is `npx.cmd --yes bmad-method@latest install` (Windows). Select BMM and, if needed, TEA in the official setup. Installer success and `brad doctor` establish local setup signals; **neither proves a native skill was invoked**.

**When using native BMAD workflows:** Verify `uv --version` for current upstream setup and any installed Build scripts that require it. The BRAD Node CLI itself does **not** require `uv`; do not install global tools silently. For v7 alpha, follow its **Skills CLI + native `bmad setup`** path, not the stable v6 `bmad-method install` command. See the [version guide](docs/getting-started/choose-bmad-version.md).

### Opt-in BRAD → BMAD setup (introduced in v0.5.2; retained in candidate v0.5.3)

BRAD v0.5.2 supports **explicit** `setup --with-bmad`; the earlier v0.5.1 tag does **not** include these flags. The official BMAD installer runs only when opt-in is requested and no existing native runtime is detected.

```powershell
# Windows PowerShell (on macOS/Linux replace npx.cmd with npx):
# Interactive terminal:
npx.cmd --yes "github:niamatmarjan/brad#v0.5.3" setup --agent antigravity --with-bmad

# Headless / non-TTY terminal (requires explicit modules and tools):
npx.cmd --yes "github:niamatmarjan/brad#v0.5.3" setup --agent antigravity --with-bmad --bmad-modules bmm --bmad-tools antigravity

# Dry-run plan preview:
npx.cmd --yes "github:niamatmarjan/brad#v0.5.3" setup --agent antigravity --with-bmad --dry-run --json
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
- **Second-host validation:** Authenticated Windows Claude Code 2.1.299 exercised pinned BRAD v0.5.1 with native BMAD 6.12.4 / TEA 1.27.2. The operator reported an actual `Skill(bmad-testarch-test-review)` activation and four bounded safety cases; the results are **single-run, host-specific**, not a universal capability claim. Copilot CLI catalog discovery was partial; authenticated Copilot native TEA remains **NOT_RUN**. See [issue #20](https://github.com/niamatmarjan/brad/issues/20).
- **Ticket-to-PR validation:** The disposable [lab PR #5](https://github.com/niamatmarjan/brad-e2e-lab/pull/5) follows exact Story 1.3 routing, a reported real Claude Code `Skill(bmad-build)` activation, implementation, distinct-model read-only review, one-time consent and verified green PR CI (32 tests). It remains **OPEN and UNMERGED**; the final tracking-only fix was not re-reviewed. See [issue #15](https://github.com/niamatmarjan/brad/issues/15).
- **Opt-in setup validation:** [Issue #21](https://github.com/niamatmarjan/brad/issues/21) closed after a reported same-workspace Windows Antigravity headless stable BMAD install, skill discovery and read-only native workflow **inline** review; this was **not** a verified host-native skill-loader event. The opt-in feature was not part of v0.5.1.
- **v0.5.2 validation:** The [release workstream #15](https://github.com/niamatmarjan/brad/issues/15) records 8/8 passing integrated candidate CI checks, including 54/54 tests on Windows Node 22/24, and an operator-observed first-attempt official BMAD install from the packed candidate on Windows. The bounded Windows `EPERM` rename retry and nested npm package-environment corrections are tracked in [#28](https://github.com/niamatmarjan/brad/issues/28) and [#29](https://github.com/niamatmarjan/brad/issues/29); no permanent zero-flake claim is made. Fresh-workspace Antigravity IDE host loader execution remains unverified; historical privacy audit [#16](https://github.com/niamatmarjan/brad/issues/16) retained public metadata.

BRAD distinguishes five levels: **L1** installed skill contract; **L2** exact target resolution; **L3** selected installed skill; **L4** actual execution mode (host-native, inline, independent subagent, helper-only or unverified); **L5** observed outputs, real PR and CI. Do not turn a static check, `doctor` result or a QA score into a claim of host-native invocation.

The Gate 04 development branch also exposes `brad route "<task>" --json` and optional
ESM routing/handoff helpers. The CLI gives bounded, deterministic suggestions;
it does not execute BMAD or resolve a native ticket. See the
[preflight and checkpoint contract](skills/brad/references/natural-task-routing.md).

## Repository guide

| Location | Purpose |
|---|---|
| [`skills/brad/`](skills/brad/SKILL.md) | BRAD skill contract, references, read-only helper scripts and routing test cases |
| [`cli/`](cli/brad.mjs) | Safe project installer, `doctor`, update and uninstall |
| [`docs/getting-started/`](docs/getting-started/README.md) | Installation and agent-assisted onboarding |
| [`docs/roles/`](docs/roles/README.md) | Ten stakeholder role guides and copyable prompts |
| [`docs/reference/compatibility-matrix.md`](docs/reference/compatibility-matrix.md) | Verified BMAD/host combinations versus untested claims |
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
