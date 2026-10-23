# Install BRAD v0.5.2

## Quick install (Node.js 20+)

**Preferred:** Have your coding agent follow [AI setup](ai-setup.md) and install BRAD for you. This guide remains for direct CLI users.

Use the tagged [v0.5.2 release](https://github.com/niamatmarjan/brad/releases/tag/v0.5.2) for the commands below. The earlier [v0.5.1 tag](https://github.com/niamatmarjan/brad/releases/tag/v0.5.1) lacks the opt-in official BMAD setup flags.

In a project that already uses BMAD Method:

```bash
npx --yes "github:niamatmarjan/brad#v0.5.2" setup
```

This command installs BRAD's **native agent skill**, not BMAD Method itself. You can run `npx bmad-method install` to install/configure BMAD separately. The CLI requires `git` and network access on first npx invocation because npm retrieves the GitHub package. It has no third-party runtime dependencies.

## Optional native BMAD initialization (v0.5.2)

v0.5.2 includes an opt-in feature allowing users to explicitly authorize the **official**
BMAD installer as part of one BRAD command:

```sh
# Latest official stable BMAD (interactive terminal)
brad setup --agent antigravity --with-bmad

# Headless / non-TTY terminal (requires explicit modules and tools)
brad setup --agent antigravity --with-bmad --bmad-modules bmm --bmad-tools antigravity

# Newer breaking-change-prone v7 alpha preview (interactive terminal only)
brad setup --agent antigravity --with-bmad --bmad-channel preview

# Dry-run: preview both BRAD and BMAD plan without writes
brad setup --agent antigravity --with-bmad --dry-run --json
```

**These flags are NOT available in v0.5.1.** If not using BRAD's opt-in setup, you can instead use the official native installer directly: stable
`npx bmad-method install`, or preview
`npx skills add bmad-code-org/BMAD-METHOD` followed by the installed
`bmad` skill's `bmad setup` workflow.

### Headless BMAD installer reliability

In headless, background agent, or non-TTY environments (or when `--non-interactive` is passed):
- Unattended installation requires explicit `--bmad-modules` (e.g. `bmm` or `bmm,tea`) and `--bmad-tools` (e.g. `antigravity`, `claude-code`, `github-copilot`, `codex`).
- If headless configuration is missing, the installer safely aborts with exit code 1 instead of waiting indefinitely on prompts.
- Installer execution is bounded by a timeout (default: 180,000 ms, configurable via `--bmad-timeout <ms>`). On timeout, the child process tree is forcefully terminated.
- Existing BMAD runtimes (`_bmad`) or native skills are detected and skipped; BRAD never upgrades, overwrites, or migrates BMAD.
- For preview v7 (`--bmad-channel preview`), an interactive terminal is required; headless preview attempts are blocked with clear instructions.
- An upstream exit code of 0 confirms local file installation only; it does not prove host skill discovery or native agent execution. See the [official BMAD guide](https://docs.bmad-method.org/start/install-bmad/).

**Native BMAD Build dependency note:** In an observed Windows Claude Code pilot, the installed `bmad-build` workflow used `uv` to render its instructions. Verify `uv --version` if the **selected official native workflow** requires it. A missing `uv` should be reported as a native workflow prerequisite, not misdiagnosed as a failed BRAD CLI installation; never change global tooling without approval.

## Pick a host

```bash
# Google Antigravity (workspace skill .agents/skills/brad)
npx --yes "github:niamatmarjan/brad#v0.5.2" setup --agent antigravity

# Claude Code (.claude/skills/brad)
npx --yes "github:niamatmarjan/brad#v0.5.2" setup --agent claude

# Codex (.agents/skills/brad)
npx --yes "github:niamatmarjan/brad#v0.5.2" setup --agent codex

# GitHub Copilot (.agents/skills/brad + optional custom agent in .github/agents/)
npx --yes "github:niamatmarjan/brad#v0.5.2" setup --agent copilot

# Multiple hosts
npx --yes "github:niamatmarjan/brad#v0.5.2" setup --agent claude,antigravity,copilot
```

Without `--agent`, BRAD uses explicit host conventions (`.claude`, `.codex`, `.gemini`, or Copilot-specific files under `.github`). Generic `.github/workflows` and `.agents` are not reliable host identifiers. In ambiguous projects it selects **portable**, the shared `.agents/skills/brad` location. For global installation, select an explicit host. This is supported by Antigravity, Codex, and VS Code/Copilot. Claude Code requires explicit `--agent claude` if no Claude project directory exists.

## Diagnosing and updating

```bash
npx --yes "github:niamatmarjan/brad#v0.5.2" doctor
npx --yes "github:niamatmarjan/brad#v0.5.2" doctor --json
npx --yes "github:niamatmarjan/brad#v0.5.2" setup --dry-run --agent all
npx --yes "github:niamatmarjan/brad#v0.5.2" update --agent copilot
npx --yes "github:niamatmarjan/brad#v0.5.2" uninstall --agent copilot
```

`update` checks only selected installed destinations. `init` is safe to rerun. Neither command silently discards modified files. If a previous **manual ZIP install** exists, the CLI treats it as unmanaged and refuses to overwrite by default. Pass `--force` only after inspection; that explicitly moves existing files to a nearby `.brad-backup-*` directory before replacing them. Avoid using `--force` without reviewing the path.

Use `--dir PATH` when installing into another checked-out project, or `--global` to install into supported user-level skill locations. The CLI supports `--json` for CI/automation. Commands do not write outside selected destinations (except deliberate local backups beside them).

## Verify in your coding host

Restart your coding agent if required and confirm it detects the skill. Tell your coding agent **"Use BRAD to preview ticket 1.1"**. If your host exposes a slash command, `/brad 1.1` may work; Claude Code supports skill slash invocation, while Codex may use `$brad`. Do not assume every host registers a slash command. **Terminal `brad setup` installs the skill; agent-chat `/brad setup` configures workflow preferences.** The CLI does **not** guarantee that native BMAD subagents are enabled or that your GitHub credentials work; `doctor` checks only local hints, basic prerequisites, and skill-file integrity — not actual native agent execution.

## Security boundaries

- Read-only `doctor` does not modify the project.
- `--dry-run` never writes files.
- Symlinked installation destinations are rejected.
- Existing modified or unowned skill directories are protected from automatic overwrite.
- `uninstall` only removes unchanged managed skill content by default.
- No arbitrary network calls, background jobs, shell execution of downloaded scripts, BMAD install, or automatic Git push occur in `brad init`.
- No npm registry publication exists yet. The documented command runs the GitHub repository package directly.

## Manual alternative

Download the latest [release](https://github.com/niamatmarjan/brad/releases), extract `brad/` under the target host's skill folder, and (for Copilot only, optionally) copy `copilot/brad.agent.md` to `.github/agents/brad.agent.md`.
