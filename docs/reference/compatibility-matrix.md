# BRAD compatibility matrix: versions, hosts, and evidence

**Reviewed:** 2026-10-24. **BRAD release:** [v0.5.2](https://github.com/niamatmarjan/brad/releases/tag/v0.5.2).

Compatibility has distinct levels: **skill format**, **BRAD install**, **native BMAD files**, **current host discovery**, **actual invocation**, and **verified output**. A passing local check or written example does not prove the latter three.

## BMAD versions

| Native BMAD | BRAD behavior and evidence | Limit / recommendation |
|---|---|---|
| **v6.12 stable (observed v6.12.4)** | CLI official stable install and v6 skill detection; bounded Claude Code native Build/TEA evidence, Windows Antigravity packaged installer test | **Recommended for delivery teams**, with an actual host/workspace smoke test |
| **v6.11** | Version-aware routing and `bmad-build` intent; older deprecated aliases differ | No complete end-to-end v6.11 host matrix: **PARTIAL** |
| **Earlier v6** | Conservative file/skill detection only | **NOT_VERIFIED** per minor version; read the installed skills |
| **v7 preview alpha** | Can coexist with installed `bmad` hub and `bmad-ticket` hints; portable BRAD skill can be installed | **E2E NOT_RUN** for v0.5.2 in an actual v7 host. Do not claim full v7 compatibility |
| **Mixed v6/v7** | Detect conflicting state hints and pause | No automatic backlog migration; identify authoritative state before writes |

The [official installation page](https://docs.bmad-method.org/start/install-bmad/) still calls v7 **preview alpha** as of this review and lists stable v6.12. The v7 ETA visible there is historical and does **not** establish current GA status. Stable uses `npx bmad-method install`; preview uses `npx skills add bmad-code-org/BMAD-METHOD` and the installed `bmad` skill's `bmad setup` flow. Current upstream stable guidance lists Node.js 20.12+, Python 3.10+, and `uv`; BRAD's own Node CLI is a separate dependency.

## Host evidence for the released v0.5.2

| Surface | Installation support | Native workflow evidence | Claim |
|---|---|---|---|
| **Claude Code** | `.claude/skills/brad` path, CLI tests | Host-native Skill calls on **BRAD v0.5.1** with BMAD 6.12.4, not full v0.5.2 matrix | Host-specific prior evidence; **v0.5.2 E2E pending** |
| **Google Antigravity** | `.agents/skills/brad`; v0.5.2 Windows tarball invoked official v6 stable installer with 39 native skill folders | v0.5.2 fresh-workspace GUI host could not be reloaded | **Install observed; HOST_NATIVE_INVOKED NOT_VERIFIED** |
| **Codex** | `.agents/skills/brad` CLI-supported | No complete v0.5.2 Codex native route→Build/QA evidence | **E2E NOT_RUN** |
| **GitHub Copilot** | `.agents/skills/brad` and optional `.github/agents/brad.agent.md` | Prior limited catalog discovery; native TEA not executed | **E2E NOT_RUN** |
| **ChatGPT / ChatGPT Work** | GitHub-connected analysis and permitted actions may be possible | No implicit local `SKILL.md` or BMAD host-loader | **Native execution NOT_VERIFIED** |
| **Claude.ai web chat** | Prompt/file discussion; not Claude Code | No implicit local installed skills | **Native execution NOT_VERIFIED** |
| **Other skills-compatible hosts** | Portable shared skill path where supported | Not tested per host | **NOT_VERIFIED** |

## Route by actual installed skill, not marketing alias

- **Stable v6.12:** typical `bmad-help`, `bmad-build`, `bmad-code-review`, and optional installed TEA. The workflow and role names must be confirmed in that project's skill catalog.
- **v7 preview:** `bmad` hub for setup/status, `bmad-build` for implementation, and `bmad-ticket` for ticket work **only when the exact native skills exist**. Other names may change in alpha.
- **Deprecated v6 names:** `bmad-quick-dev`, `bmad-dev-story`, and older shims must not be assumed available.
- An installed skill, native config, inline walkthrough, distinct subagent, and remotely verified PR/CI are **different results**. Use the five [execution labels](../../skills/brad/references/hosts-and-handoffs.md).

## How to raise compatibility confidence

For each **specific host + host version + BMAD version/module combination**, test in a disposable workspace: install BRAD and upstream BMAD, restart and verify **that exact root's** live skill catalog, run a read-only native workflow, then perform an authorized bounded Build/TEA task. Record actual host call, source and code diff, real test exits, PR/CI when approved, and sanitation/cleanup state. Record BLOCKED or NOT_RUN honestly. No single run proves future versions of “all AI agents.”

See [host setup](../getting-started/host-support.md), [v6/v7 onboarding](../getting-started/choose-bmad-version.md), and [launch acceptance checklist](../maintainers/launch-readiness.md).
