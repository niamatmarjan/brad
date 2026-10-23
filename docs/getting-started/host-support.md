# BRAD across coding hosts, ChatGPT and other AI surfaces

BRAD's portable `SKILL.md` implements the Agent Skills instruction format. That **does not guarantee** every host can discover, invoke, delegate or run it. Host loaders, permissions, tooling and subagents differ; verify against the same workspace as the task.

**Candidate-stage note:** the `#v0.5.3` examples below are for the **unpublished release candidate** and will work only after that GitHub tag is created. For immediate use install the existing [v0.5.2 release](https://github.com/niamatmarjan/brad/releases/tag/v0.5.2). The only planned v0.5.3 code change is read-only Antigravity/Codex native skill inventory. Run BRAD's CLI **from the project where you need it**, with Node.js 20+ and Git. Replace `npx.cmd` with `npx` on macOS/Linux.

| Surface | BRAD `--agent` | Project installation | Actual invocation |
|---|---|---|---|
| **Claude Code** (terminal/IDE) | `claude` | `.claude/skills/brad/SKILL.md` | Ask for named `brad` skill; `/brad` only if supported by host |
| **OpenAI Codex** CLI/app/IDE | `codex` | `.agents/skills/brad/SKILL.md` | Request `brad` skill; some clients use `$brad` |
| **Google Antigravity** | `antigravity` | `.agents/skills/brad/SKILL.md` | Request BRAD, verify live catalog after workspace refresh |
| **GitHub Copilot** (VS Code/CLI) | `copilot` | `.agents/skills/brad/SKILL.md`; optional `.github/agents/brad.agent.md` | Skill chat or explicitly selected custom coordinator |
| **Other Agent Skills host** | `portable` | `.agents/skills/brad/SKILL.md` | Only if the host documents that path and skill execution |
| **Claude.ai web chat** | **none** | No local BRAD CLI host selector | Use prompts/files/connectors for advice, **not** proof native skills ran |
| **ChatGPT web / Work** | **no `--agent chatgpt` option** | Repository GitHub connector or eligible Work environment, where available | May inspect/act on connected repo with authorization, **not** automatically invoke local BMAD skills |

**ChatGPT is not Codex; Claude.ai chat is not Claude Code.** A GitHub connector can expose repository content and supported remote actions but does not automatically run installed project-local BMAD workflows. The supported OpenAI Agent Skills format does not by itself certify ChatGPT chat as an Agent Skills coding host.

## Install into one selected coding host

```powershell
# Choose one host matching your actual environment:
npx.cmd --yes "github:niamatmarjan/brad#v0.5.3" setup --agent claude
npx.cmd --yes "github:niamatmarjan/brad#v0.5.3" setup --agent codex
npx.cmd --yes "github:niamatmarjan/brad#v0.5.3" setup --agent antigravity
npx.cmd --yes "github:niamatmarjan/brad#v0.5.3" setup --agent copilot

# Example local diagnostics — file-level verification only:
npx.cmd --yes "github:niamatmarjan/brad#v0.5.3" doctor --agent codex --json
```

Install [official BMAD stable or preview](choose-bmad-version.md) separately or approve BRAD's official stable opt-in route. Do not install over another project's native runtime, and avoid running four setup commands merely because four hosts are listed here.

## Evidence ladder — do not skip steps

1. **BRAD installation:** expected project-local `SKILL.md` exists; `doctor` sees it. This proves only files.
2. **BMAD installation:** native version/config/modules and installed `bmad-*` or `bmad` skills exist. This still is not the IDE's catalog.
3. **Host discovery:** reload/reopen the **same root**; observe the host exposing BRAD and requested native skill.
4. **Native execution:** record real host skill invocation (or explicitly state that you followed installed instructions inline). A help suggestion alone is not execution.
5. **Independent specialist work:** a separate context/tool event is required. Same-chat self-review is not independent.
6. **Delivery:** cite the actual changes, test commands and exits, PR and CI links; never claim a push or deployment based on intent.

Use the provenance labels `HOST_NATIVE_INVOKED`, `NATIVE_WORKFLOW_INLINE`, `SEPARATE_SPECIALIST_INVOKED`, `HELPER_SCRIPTS_ONLY` and `NOT_VERIFIED` as defined in [host execution evidence](../../skills/brad/references/hosts-and-handoffs.md).

## Troubleshooting

- **No BRAD skill in host:** check root/path and refresh the session. If host doesn't support that skill path, report `NOT_VERIFIED`.
- **BRAD there, BMAD missing:** official BMAD is not bundled with BRAD; get project-owner approval and use the [version-specific setup](choose-bmad-version.md).
- **Missing `uv`:** BRAD Node CLI can run, but current official BMAD setup and some native Python workflows expect `uv`. Review the official prerequisites.
- **Slash command isn't found:** slash syntax varies by host; request the named skill in chat. Never execute `/bmad-*` as a shell command.
- **Need a PR:** `--pr` is not automatic permission to merge or deploy. Confirm policy, git status, exact native story and remote authorization.

The [compatibility matrix](../reference/compatibility-matrix.md) records what has actually been tested.