# BRAD compatibility matrix: versions, hosts, and evidence

**Reviewed:** 2026-10-24. **Current BRAD release:** [v0.5.3](https://github.com/niamatmarjan/brad/releases/tag/v0.5.3). The read-only Antigravity/Codex native skill inventory correction was accepted in [PR #37](https://github.com/niamatmarjan/brad/pull/37) using 0.5.3-stamped CI and an actual unpacked candidate tarball.

Compatibility has distinct levels: **skill format**, **BRAD install**, **native BMAD files**, **current host discovery**, **actual invocation**, and **verified output**. A passing local check or written example does not prove the latter three.

## BMAD versions

| Native BMAD | BRAD behavior and evidence | Limit / recommendation |
|---|---|---|
| **v6.12 stable (observed v6.12.4)** | CLI official stable installer; in a Windows Antigravity fixture BRAD doctor discovered 39 native skills in singular `.agent/skills`, while released v0.5.2 Python inspector missed them; v0.5.3 corrects that helper (39/39) | **PARTIAL but recommended over v7 for stable teams**; verify actual coding-host invocation separately |
| **v6.11** | Version-aware routing and `bmad-build` intent; older deprecated aliases differ | No complete end-to-end v6.11 host matrix: **PARTIAL** |
| **Earlier v6** | Conservative file/skill detection only | **NOT_VERIFIED** per minor version; read the installed skills |
| **v7 preview alpha (observed 6.13.0-next)** | Antigravity Skills CLI installed 30 v7 skills in a separate workspace. Native `bmad-build` instructions were rendered with `uv`; coordinator implemented synthetic `ping` example and passed **3/3 tests**, then dispatched a separate review subagent which reported PASS | **PARTIAL**: real `NATIVE_WORKFLOW_INLINE` + `SEPARATE_SPECIALIST_INVOKED` evidence; no verified full native **v7 ticket lifecycle and TEA Skill-tool dispatch**. Upstream `bmad-retrospective` YAML parse defect and transient setup `WinError 5` persist. See [#32](https://github.com/niamatmarjan/brad/issues/32) |
| **Mixed v6/v7** | Detect conflicting state hints and pause | No automatic backlog migration; identify authoritative state before writes |

The [official installation page](https://docs.bmad-method.org/start/install-bmad/) still calls v7 **preview alpha** as of this review and lists stable v6.12. The v7 ETA visible there is historical and does **not** establish current GA status. Stable uses `npx bmad-method install`; preview uses `npx skills add bmad-code-org/BMAD-METHOD` and the installed `bmad` skill's `bmad setup` flow. Current upstream stable guidance lists Node.js 20.12+, Python 3.10+, and `uv`; BRAD's own Node CLI is a separate dependency.

## Host evidence in Windows acceptance (v0.5.2 stable baseline; v0.5.3 inspector patch)

| Surface | Installation support | Native workflow evidence | Claim |
|---|---|---|---|
| **Claude Code** | `.claude/skills/brad` path, CLI tests | Prior v0.5.1 native Skill-tool evidence; operator's v0.5.2 CLI doctor saw install but live prompt returned **Not logged in** | **v0.5.2 execution BLOCKED / NOT_RUN** in this new environment |
| **Google Antigravity 1.1.12** | Native catalog exposed `.agents/skills/brad` and official v6 `.agent/skills/bmad-*`; separate v7 fixture exposed skills under `.agents/skills` | Synthetic **v6 `/health` 2/2** and **v7 `ping` 3/3** tests PASS following native instructions **inline**; real separate code-review **subagent dispatch** observed for v7. `render_skill.py` is a local helper, not proof of host Skill-tool dispatch | **CATALOG OBSERVED; NATIVE_WORKFLOW_INLINE; SEPARATE_SPECIALIST_INVOKED** (reviewer). Full native host-dispatch/TEA parity NOT VERIFIED |
| **Codex** | `.agents/skills/brad` CLI-supported; `.codex/skills` recognized by candidate inspector helper | CLI not installed in tested Windows shell | **E2E NOT_RUN** |
| **GitHub Copilot CLI 1.0.99-2** | `.agents/skills/brad` and optional `.github/agents/brad.agent.md` | Operator's `copilot skill list` reported BRAD and 31 v7 skill entries under `.agents/skills`; CLI didn't inspect singular `.agent/skills` | **CATALOG DISCOVERY VERIFIED; native QA/Build NOT_RUN** |
| **ChatGPT / ChatGPT Work** | GitHub-connected analysis and permitted actions may be possible | No implicit local `SKILL.md` or BMAD host-loader | **Native execution NOT_VERIFIED** |
| **Claude.ai web chat** | Prompt/file discussion; not Claude Code | No implicit local installed skills | **Native execution NOT_VERIFIED** |
| **Other skills-compatible hosts** | Portable shared skill path where supported | Not tested per host | **NOT_VERIFIED** |

**Provenance clarification:** The operator's second report classified invoking `uv ... render_skill.py` plus seeing the host catalog as `HOST_NATIVE_INVOKED`. That proves **real installed native instruction rendering**, not necessarily a separate coding-host-native **Skill-tool** call. The v7 **implementation was inline**; a distinct Antigravity `invoke_subagent` event is credible **separate reviewer context**, not automatically an official BMAD TEA skill call. Those proof levels are deliberately separated here; inspect the sanitized host transcript before making a stronger dispatch claim.

**Actual 0.5.3 package evidence:** The Windows operator unpacked `niamatmarjan-brad-0.5.3.tgz` built from the pre-release candidate commit `0b36954542974178f4d3ce6a3558de48125869f4`, ran its **packaged** inspector against 39 native v6.12.4 skills in `.agent/skills`, and observed 39 BMAD + one BRAD directory, `tea:true`, `v6_likely` and required version-hint warnings. [RC CI 40010815323](https://github.com/niamatmarjan/brad/actions/runs/40010815323) also passed 8/8 jobs. This tests the *inspector package*, not v7 host-wide compatibility.

## Route by actual installed skill, not marketing alias

- **Stable v6.12:** typical `bmad-help`, `bmad-build`, `bmad-code-review`, and optional installed TEA. The workflow and role names must be confirmed in that project's skill catalog.
- **v7 preview:** `bmad` hub for setup/status, `bmad-build` for implementation, and `bmad-ticket` for ticket work **only when the exact native skills exist**. Other names may change in alpha.
- **Deprecated v6 names:** `bmad-quick-dev`, `bmad-dev-story`, and older shims must not be assumed available.
- An installed skill, native config, inline walkthrough, distinct subagent, and remotely verified PR/CI are **different results**. Use the five [execution labels](../../skills/brad/references/hosts-and-handoffs.md).

## How to raise compatibility confidence

For each **specific host + host version + BMAD version/module combination**, test in a disposable workspace: install BRAD and upstream BMAD, restart and verify **that exact root's** live skill catalog, run a read-only native workflow, then perform an authorized bounded Build/TEA task. Record actual host call, source and code diff, real test exits, PR/CI when approved, and sanitation/cleanup state. Record BLOCKED or NOT_RUN honestly. No single run proves future versions of “all AI agents.”

See [host setup](../getting-started/host-support.md), [v6/v7 onboarding](../getting-started/choose-bmad-version.md), and [launch acceptance checklist](../maintainers/launch-readiness.md).
