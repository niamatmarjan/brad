# Choose BMAD v6.12 stable or v7 preview

The examples below use the published [BRAD v0.5.3](https://github.com/niamatmarjan/brad/releases/tag/v0.5.3). BMAD stable v6.12 and preview v7 follow separate upstream setup paths; do not migrate an existing project without approval.

BRAD is the **router**; official BMAD is the **workflow engine**. The installations and their permissions are separate. Select the native runtime already used by the project; BRAD never silently migrates `_bmad` state.

**Upstream status, checked 2026-10-24:** [official BMAD installation](https://docs.bmad-method.org/start/install-bmad/) still calls **v6.12 stable** and **v7 preview alpha**. Its historical v7 ETA is not evidence of general availability; always check current upstream documentation before upgrading.

| Situation | Route | Caution |
|---|---|---|
| Team or existing v6 project | **v6.12 stable** | Keep native `sprint-status.yaml` / existing artifacts; no v7 migration |
| New exploratory/disposable project | **v7 preview** | Breaking installer/skill/state changes possible |
| Existing v7 project | Preserve installed version | Use actual `bmad` hub, initiative and ticket store |
| Mixed v6/v7 clues | Read-only diagnosis | Stop before state writes; ask which native system owns the task |

## A. Stable BMAD v6.12 + BRAD

For **official BMAD v6.12** current docs specify Node.js 20.12+, Python 3.10+, and `uv`. BRAD's Node CLI needs Node.js 20+ and Git; `uv` belongs to BMAD setup / native Python workflows. Check prerequisites first.

```powershell
# Windows PowerShell. Use npx on macOS/Linux.
node --version
python --version
uv --version
git --version

# Official upstream BMAD install, after project-owner approval:
npx.cmd bmad-method install

# Separately install BRAD into this same project:
npx.cmd --yes "github:niamatmarjan/brad#v0.5.3" setup --agent antigravity

# Verify BRAD local state (not host skill registration):
npx.cmd --yes "github:niamatmarjan/brad#v0.5.3" doctor --agent antigravity --json
```

**Alternative to the separate official-install command** for a *new project with no BMAD*: after explicit approval, BRAD v0.5.2 may invoke the official stable installer:

```powershell
npx.cmd --yes "github:niamatmarjan/brad#v0.5.3" setup --agent antigravity --with-bmad --bmad-modules bmm,tea --bmad-tools antigravity --non-interactive
```

Choose **one upstream-install route**, not both. Existing BMAD is preserved and skipped, not silently upgraded. Restart the coding host **in the same project** to refresh skills. A safe native starting point in v6.12 is installed `bmad-help`; an authorized build usually uses installed `bmad-build`.

## B. Preview BMAD v7 + BRAD

Use a **disposable workspace** until the preview passes the acceptance tests for your exact host/version. The official v7 instructions differ from v6's npm installer:

```powershell
# Install official v7 skills through the Skills CLI, choosing the actual coding host:
npx.cmd skills add bmad-code-org/BMAD-METHOD

# Install BRAD as a separate skill in the same project:
npx.cmd --yes "github:niamatmarjan/brad#v0.5.3" setup --agent antigravity
```

Select the `bmad` hub and necessary native module records/skills in the upstream flow. Open the host at the project root and **ask the installed `bmad` skill to run `bmad setup`**. Then inspect `bmad status`, selected initiative, native ticket store and host skill catalog. These are **skill-chat instructions**, not shell commands to run blindly.

BRAD's own `--bmad-channel preview` option is interactive and requires subsequent native setup. **It does not prove end-to-end v7 routing or migration safety.**

## Separate installation from execution proof

1. Verify actual project root, existing BMAD version/modules, `git status`, and native ticket ownership.
2. Run BRAD `doctor` to inspect local integrity; file inventory is **not** active host skill registration.
3. In a **fresh coding-host session**, observe BRAD and a requested native BMAD skill in the *current* catalog.
4. Ask: “Use BRAD to plan the route for this exact existing ticket, **read-only**, listing the installed native skill; do not edit, push or merge.”
5. For implementation, grant explicit scope and observe actual native invocation, test execution, diff and outputs. Call inline execution **inline**, not a separate agent.

Continue with [host-by-host setup](host-support.md), [role examples](../roles/quick-reference.md) and the [compatibility evidence matrix](../reference/compatibility-matrix.md).
