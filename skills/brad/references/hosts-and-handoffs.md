# Skills are instructions; agents/commands require a host execution path

## Supported UX surfaces

- VS Code GitHub Copilot: install project skill into `.agents/skills/brad`
  or `.github/skills/brad`; optional user-selectable coordinator agent
  under `.github/agents/brad.agent.md`. The skill may be named explicitly
  in chat or selected via supported UI/skill invocation if available.
  Nested subagent support and allowed tools vary by Copilot harness/settings.
- Claude Code: `.claude/skills/brad/SKILL.md`; use `/brad ...`
  when exposed by Claude's command UI.
- Codex: `.agents/skills/brad/SKILL.md`; use the skill name in the
  invocation style your Codex client supports (often `$bmad-auto`).
- Before announcing delegation, confirm host can actually invoke target skill,
  dispatch subagent, run commands, and access GitHub. An instruction to a
  single assistant to "be architect" does not create independent architect.

## Delegate without duplicating specialist logic

1. Read target installed `SKILL.md` and linked instructions. The router passes
   intent, exact ticket/PR target, known constraints, expected output, existing
   artifacts, user approvals and relevant repo policy.
2. Use host-native skill invocation or subagent dispatch **only if present**.
   Some hosts allow a coordinator to dispatch a specialist in its own context.
   If not, call native skill instructions inline in current context, faithfully
   report same-session execution, and avoid claiming independent review.
3. When a native workflow already performs implementation+review, do not
   separately rerun Dev or QA without a reason. Prefer fresh reviewers for
   high-risk changes when genuine independent subagents are available.
4. Collect actual structured outputs and exit codes. If a delegated worker
   returns BLOCKED or NEEDS HUMAN, relay that question faithfully; avoid an
   automatic yes that overrides domain approval.
5. If host session ends mid-run, the next invocation should resume from native
   BMAD spec/plan state, git branch/commit, PR/CI. Do not create duplicate PRs.

## Scope of automatic operations

A skill cannot guarantee background loops, watch CI forever, implement native
branch protection, or automatically call commands merely by mentioning them.
For deterministic unattended runs use configured bmad-loop (or another tested
engine), not instruction-only simulation. If the host rejects tool access, do
what's possible locally and report exact missing capability.

Never recommend an unsafe all-permissions bypass as the standard operating
mode. Use least privilege and host confirmations; isolate risky automation in
worktrees and test repos.

VS Code references:
https://code.visualstudio.com/docs/agent-customization/custom-agents
https://code.visualstudio.com/docs/agents/reference/ai-settings
