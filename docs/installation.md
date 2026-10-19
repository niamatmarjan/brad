# Install BRAD v0.2.0

## Quick install (Node.js 20+)

In a project that already uses BMAD Method:

```bash
npx --yes github:niamatmarjan/brad#v0.2.0 init
```

This command installs BRAD's **native agent skill**, not BMAD Method itself. You can run `npx bmad-method install` to install/configure BMAD separately. The CLI requires `git` and network access on first npx invocation because npm retrieves the GitHub package. It has no third-party runtime dependencies.

## Pick a host

```bash
# Google Antigravity (workspace skill .agents/skills/brad)
npx --yes github:niamatmarjan/brad#v0.2.0 init --agent antigravity

# Claude Code (.claude/skills/brad)
npx --yes github:niamatmarjan/brad#v0.2.0 init --agent claude

# Codex (.agents/skills/brad)
npx --yes github:niamatmarjan/brad#v0.2.0 init --agent codex

# GitHub Copilot (.agents/skills/brad + optional custom agent in .github/agents/)
npx --yes github:niamatmarjan/brad#v0.2.0 init --agent copilot

# Multiple hosts
npx --yes github:niamatmarjan/brad#v0.2.0 init --agent claude,antigravity,copilot
```

Without `--agent`, BRAD detects `.claude`, `.github`, `.agents`, `.gemini`, and `.codex` hints. In a new project with none of these, it defaults to the shared `.agents/skills/brad` location. This is supported by Antigravity, Codex, and VS Code/Copilot. Claude Code requires explicit `--agent claude` if no Claude project directory exists.

## Diagnosing and updating

```bash
npx --yes github:niamatmarjan/brad#v0.2.0 doctor
npx --yes github:niamatmarjan/brad#v0.2.0 doctor --json
npx --yes github:niamatmarjan/brad#v0.2.0 init --dry-run --agent all
npx --yes github:niamatmarjan/brad#v0.2.0 update --agent copilot
npx --yes github:niamatmarjan/brad#v0.2.0 uninstall --agent copilot
```

`update` checks only selected installed destinations. `init` is safe to rerun. Neither command silently discards modified files. If a previous **manual ZIP install** exists, the CLI treats it as unmanaged and refuses to overwrite by default. Pass `--force` only after inspection; that explicitly moves existing files to a nearby `.brad-backup-*` directory before replacing them. Avoid using `--force` without reviewing the path.

Use `--dir PATH` when installing into another checked-out project, or `--global` to install into supported user-level skill locations. The CLI supports `--json` for CI/automation. Commands do not write outside selected destinations (except deliberate local backups beside them).

## Verify in your coding host

Restart your coding agent if required and confirm it detects the skill. For Antigravity and compatible tools, `/brad 1.1` should load the skill. Claude Code supports `/brad`, Codex commonly uses `$brad`. Slash-command behavior differs by host. The CLI does **not** guarantee that native BMAD subagents are enabled or that your GitHub credentials work; `doctor` checks only local hints and skill-file integrity.

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
