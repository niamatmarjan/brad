# Installation and first run

Install [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) in the *target project* first. Choose relevant native modules such as BMM and optional TEA. BRAD does **not** install or upgrade BMAD automatically.

Download the [latest BRAD release](https://github.com/niamatmarjan/brad/releases), and unpack the ZIP. It contains `brad/` plus optional Copilot agent and policy examples.

- **Claude Code:** copy `brad/` to `<project>/.claude/skills/brad/`, then request `/brad --plan 1.1`.
- **Codex:** copy `brad/` to `<project>/.agents/skills/brad/`, then use the host-supported skill invocation.
- **VS Code Copilot:** copy `brad/` to `<project>/.agents/skills/brad/`. Optionally copy `copilot/brad.agent.md` into `<project>/.github/agents/brad.agent.md`. Choose BRAD in the agent picker or mention the skill according to the client.

From this source repo, the skill is stored under `skills/brad`. Copy **that directory** rather than the whole repository into a target project.

For a first run, ask `brad --plan 1.1`: BRAD should resolve the project, check installed BMAD and Git, and preview the target workflow with zero changes. Optional read-only diagnostics:

```bash
python .agents/skills/brad/scripts/inspect_bmad.py --root . --pretty
python .agents/skills/brad/scripts/delivery_preflight.py --root . --pretty
```

For publishing, BRAD requires an authenticated GitHub tool/CLI and an authorized policy or explicit `--pr`. You can copy the example file into `.brad/policy.yaml`, edit it, and review before first use; the skill must still obey the repository's authorization and branch policy.

If another version of BRAD or `bmad-auto` is installed in a competing skill location, remove or disable the obsolete entry to avoid discovery conflicts. No shell command named `/brad` is implied by the SKILL.md alone.
