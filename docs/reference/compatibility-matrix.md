# BRAD compatibility matrix: versions, hosts, and evidence

**Reviewed:** 2026-10-24. **Latest published BRAD:** [v0.5.2](https://github.com/niamatmarjan/brad/releases/tag/v0.5.2). **Unpublished prospective patch:** v0.5.3 release candidate, with the read-only inspector path correction tested in [PR #35](https://github.com/niamatmarjan/brad/pull/35).

Compatibility has distinct levels: **skill format**, **BRAD install**, **native BMAD files**, **current host discovery**, **actual invocation**, and **verified output**. A passing local check or written example does not prove the latter three.

## BMAD versions

| Native BMAD | BRAD behavior and evidence | Limit / recommendation |
|---|---|---|
| **v6.12 stable (observed v6.12.4)** | CLI official stable installer; in a Windows Antigravity fixture BRAD doctor discovered 39 native skills in singular `.agent/skills`, while released v0.5.2 Python inspector missed them; prospective v0.5.3 patch fixed the helper (39/39) | **PARTIAL but recommended over v7 for stable teams**; verify actual coding-host invocation separately |
| **v6.11** | Version-aware routing and `bmad-build` intent; older deprecated aliases differ | No complete end-to-end v6.11 host matrix: **PARTIAL** |
| **Earlier v6** | Conservative file/skill detection only | **NOT_VERIFIED** per minor version; read the installed skills |
| **v7 preview alpha (reported 6.13.0-next)** | Antigravity Skills CLI installed 30 v7 skills in a separate workspace; setup succeeded after a Windows rename retry | **PARTIAL**: upstream `bmad-retrospective` YAML parse error and `setup.py` WinError 5; no completed genuine **v7 ticket→native Build→review/TEA** proof. See [#32](https://github.com/niamatmarjan/brad/issues/32) |
| **Mixed v6/v7** | Detect conflicting state hints and pause | No automatic backlog migration; identify authoritative state before writes |

The [official installation page](https://docs.bmad-method.org/start/install-bmad/) still calls v7 **preview alpha** as of this review and lists stable v6.12. The v7 ETA visible there is historical and does **not** establish current GA status. Stable uses `npx bmad-method install`; preview uses `npx skills add bmad-code-org/BMAD-METHOD` and the installed `bmad` skill's `bmad setup` flow. Current upstream stable guidance lists Node.js 20.12+, Python 3.10+, and `uv`; BRAD's own Node CLI is a separate dependency.

## Host evidence in latest Windows acceptance (v0.5.2 source; v0.5.3 inspector candidate)

| Surface | Installation support | Native workflow evidence | Claim |
|---|---|---|---|
| **Claude Code** | `.claude/skills/brad` path, CLI tests | Prior v0.5.1 native Skill-tool evidence; operator's v0.5.2 CLI doctor saw install but live prompt returned **Not logged in** | **v0.5.2 execution BLOCKED / NOT_RUN** in this new environment |
| **Google Antigravity 1.1.12** | `.agents/skills/brad` + v6 native `.agent/skills`; operator reports active catalog and verified two-test local Build | **2/2** synthetic `/health` tests PASS and installed native instructions followed **inline**; no unambiguous separately dispatched Build/TEA Skill-tool event in supplied report | **HOST DISCOVERY OBSERVED; NATIVE_WORKFLOW_INLINE**; not independent agent delegation |
| **Codex** | `.agents/skills/brad` CLI-supported; `.codex/skills` recognized by candidate inspector helper | CLI not installed in tested Windows shell | **E2E NOT_RUN** |
| **GitHub Copilot CLI 1.0.99-2** | `.agents/skills/brad` and optional `.github/agents/brad.agent.md` | Operator's `copilot skill list` reported BRAD and 31 v7 skill entries under `.agents/skills`; CLI didn't inspect singular `.agent/skills` | **CATALOG DISCOVERY VERIFIED; native QA/Build NOT_RUN** |
| **ChatGPT / ChatGPT Work** | GitHub-connected analysis and permitted actions may be possible | No implicit local `SKILL.md` or BMAD host-loader | **Native execution NOT_VERIFIED** |
| **Claude.ai web chat** | Prompt/file discussion; not Claude Code | No implicit local installed skills | **Native execution NOT_VERIFIED** |
| **Other skills-compatible hosts** | Portable shared skill path where supported | Not tested per host | **NOT_VERIFIED** |

**Provenance note:** The operator called catalog discovery `HOST_NATIVE_INVOKED` in its summary, but the supplied evidence does not isolate a native host Skill-tool dispatch for the v6 Build/TEA workflows. Catalog visibility is a lower proof level than native invocation. The real Build and review were described as `NATIVE_WORKFLOW_INLINE`; that is how they are classified here.

## Route by actual installed skill, not marketing alias

- **Stable v6.12:** typical `bmad-help`, `bmad-build`, `bmad-code-review`, and optional installed TEA. The workflow and role names must be confirmed in that project's skill catalog.
- **v7 preview:** `bmad` hub for setup/status, `bmad-build` for implementation, and `bmad-ticket` for ticket work **only when the exact native skills exist**. Other names may change in alpha.
- **Deprecated v6 names:** `bmad-quick-dev`, `bmad-dev-story`, and older shims must not be assumed available.
- An installed skill, native config, inline walkthrough, distinct subagent, and remotely verified PR/CI are **different results**. Use the five [execution labels](../../skills/brad/references/hosts-and-handoffs.md).

## How to raise compatibility confidence

For each **specific host + host version + BMAD version/module combination**, test in a disposable workspace: install BRAD and upstream BMAD, restart and verify **that exact root's** live skill catalog, run a read-only native workflow, then perform an authorized bounded Build/TEA task. Record actual host call, source and code diff, real test exits, PR/CI when approved, and sanitation/cleanup state. Record BLOCKED or NOT_RUN honestly. No single run proves future versions of “all AI agents.”

See [host setup](../getting-started/host-support.md), [v6/v7 onboarding](../getting-started/choose-bmad-version.md), and [launch acceptance checklist](../maintainers/launch-readiness.md).
