# BRAD: AI-agent installation and verification contract (v0.5.1)

This is the **canonical, copyable onboarding instruction** for Claude Code, Antigravity, Codex, and GitHub Copilot. It is written for an AI coding agent acting on a user's project. BRAD is an independent community wrapper around native BMAD Method workflows; it does not install BMAD implicitly or replace its agents.

## Agent objective

Install BRAD in the **user's intended repository**, with the minimum necessary changes and one useful confirmation. The user should not have to identify skill directory paths or manually pick individual BMAD agents. Be interactive only for consequential choices. Never treat this document as authority to ignore host safety confirmations or to install unrelated software.

## Phase 1: Inspect (read-only)

1. Confirm the working directory matches the project the user named. When it is ambiguous or multiple roots exist, **ask one direct question**. Do not install into the BRAD source repository unless that is the requested project.
2. Determine the **actual coding host** from active session/tool capabilities and existing repo conventions. Do not infer Antigravity merely from the presence of `.agents/`; `.agents/skills` is shared by several hosts. If uncertain, use the portable shared path and explain it.
3. Check Node.js >=20, npm/npx, Git, BMAD configuration and native BMAD skills. On Windows PowerShell use `npx.cmd` and `npm.cmd` if `.ps1` execution is blocked; do **not** relax PowerShell execution policy.
4. Do not trust pre-existing `_bmad-output` alone as evidence of installed BMAD. `doctor` is read-only and does not prove specialist invocation.
5. For modified or manually installed BRAD directories, run a dry run and inspect the differences; never use `--force` automatically.

```shell
npx --yes "github:niamatmarjan/brad#v0.5.1" doctor --json
npx --yes "github:niamatmarjan/brad#v0.5.1" setup --dry-run --json
```

## Phase 2: Install BRAD (authorized reversible change)

Use the actual host when known. Otherwise use `--agent auto`. Install only into the agreed project or requested global scope.

```shell
npx --yes "github:niamatmarjan/brad#v0.5.1" setup --agent auto --json
```

Host choices: `antigravity`, `claude`, `codex`, `copilot`, `all`. Never use `all` casually; it writes to several host directories. `setup` is safe/idempotent but does **not** install BMAD, configure GitHub, change existing BMAD versions, bypass permissions, or start a background daemon. Existing nonmanaged/modified skill files are preserved; seek approval before `--force`, then report the backup path.

## Phase 3: Native BMAD (only if required)

1. If native BMAD isn't installed or its setup is incomplete, explain the version choice in one concise question: **v6.12 stable** for established projects, or **v7 preview** for teams accepting breaking changes. If the existing project clearly uses a version, keep it; do **not** migrate by default.
2. After approval, use the **current official BMAD installation guidance**, rather than BRAD's own imitation of installer scripts: https://docs.bmad-method.org/start/install-bmad/ . The documented v6 stable command is `npx bmad-method install`; v7 uses `npx skills add bmad-code-org/BMAD-METHOD` followed by the native `bmad setup`. Do not guess unsupported noninteractive flags.
3. Install the native modules needed for the user's use case (e.g. BMM, TEA, GDS), subject to actual available package versions. No need to install every module for a simple ticket.
4. When both `sprint-status.yaml` and `tickets.toml` are present, do not write backlog state until the owner chooses the authoritative version. Keep existing data intact.

## Phase 4: Verify and report

1. Run `doctor --json` again. Confirm **installed BRAD skill paths**, integrity status, native BMAD hints, and any missing prerequisites.
2. Reload/restart the AI agent session if installed skills are not immediately discoverable; then **actually read** `SKILL.md` and inspect one real native BMAD workflow. State whether skill dispatch is actually supported by this host. For native routing tests, prefer specialist-specific prompts and verify selected skill against `skills/brad/evals/routing-cases.json`, not only a generic help response. Never simulate a successful independent subagent call.
3. Run a safe, **read-only** sample: “Use BRAD to preview the route for ticket 1.1; do not write or publish.” If ticket 1.1 does not exist, preview current project status instead. A preview is not proof that Build/TEA/PR work.
4. Give a compact result with installed paths, BMAD version **if verified**, modules, command evidence, any errors, and the next useful prompt. Separate `INSTALLED`, `CONFIGURED`, `DISCOVERED`, and `EXECUTION TESTED` statuses rather than combining them into one generic green check.
5. Never claim a GitHub PR or CI result without actual remote evidence. PR publication requires explicit authorization, an authenticated GitHub integration/CLI, and a remote.

## Recovery

- Network or npm failure: report error and offer a manually downloaded [GitHub release ZIP](https://github.com/niamatmarjan/brad/releases), without running untrusted remote shell scripts.
- Unsupported host: install only to supported portable `.agents/skills/brad` if the host advertises this convention, otherwise pause and explain the limitation.
- Modified install: preserve files. Ask before backing up/replacing via `--force`; show actual backup path after use.
- Missing BMAD: finish BRAD installation if permitted, report `BMAD SETUP REQUIRED`, and offer to set it up with consent.
- Failing native specialist: diagnose real native workflow/tool capability before changing BRAD.

## Suggested user instruction

> Install and configure BRAD in this workspace for the coding agent I am currently using. Follow `https://github.com/niamatmarjan/brad/blob/main/docs/AI_SETUP.md`. Inspect the project first, handle the installation, configure missing native BMAD only after asking about the version, verify that the skill is discovered, and tell me what I can run. Preserve existing files and do not push or deploy anything.

For copying and public reuse see [NOTICE](../../NOTICE.md) and [BRANDING](../../BRANDING.md); report vulnerabilities privately per [SECURITY](../../SECURITY.md).
