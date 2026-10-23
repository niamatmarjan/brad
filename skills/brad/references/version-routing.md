# Detect the installed BMAD version before choosing any workflow

This map is illustrative, not an alias registry. Read the actual `SKILL.md`,
linked runtime/config and target-specific instructions before invoking. Skill
names and plans change across pre-releases. Avoid fixed substring-only routing.

**Evidence as of 2026-10-24:** [upstream stable v6.12](https://docs.bmad-method.org/start/install-bmad/) and **v7 preview alpha** have different installer/state contracts. BRAD v0.5.2 has bounded v6 live host evidence; full end-to-end v7 host interoperability is **NOT_VERIFIED**. This table is for candidate routing, not a proof every listed skill exists. See [compatibility evidence](../../../docs/reference/compatibility-matrix.md).

## Runtime identification (read-only)

1. Read project root, `AGENTS.md`, `_bmad` config/version/manifest, installed
   skills under all host-supported locations, and active initiative.
2. v6 clues: `bmad-help`, `bmad-sprint-planning`, approved epic/story docs,
   `sprint-status.yaml`, legacy BMM module config.
3. v7-preview clues: hub `bmad`, Product Owner `bmad-agent-po`, `bmad-ticket`,
   initiative folders, `tickets.toml`, `tickets.py`, updated `bmad-spec`.
4. Both? Treat as **mixed/migrating**, select the runtime already owning the
   requested item, ask before any status mutation if uncertain. Do NOT migrate.
5. Installed skills and actual BMAD agent menus outrank this document.
   Optional TEA, GDS and CIS may not be installed. Never invent their names.
6. `bmad-help` (v6) and `bmad` hub (v7) are advisers/status tools, not complete
   implementation or release pipeline substitutes.

## Intent -> native owner

| Intent | v6.11–6.12 stable branch | v7-preview install (verify!) |
|---|---|---|
| Where am I / help | `bmad-help` | `bmad` |
| Brainstorm/research | installed Analyst/core brainstorm/deep-recon | `bmad-agent-analyst` or specific installed skill |
| PRD write/update/validate | installed PM/PRD workflow | `bmad-prd` / PM |
| High-level spec | installed BMM spec workflow | `bmad-spec` |
| Epic/story planning | `bmad-create-epics-and-stories` | `bmad-ticket`, Product Owner |
| Sprint planning/status | `bmad-sprint-planning` | `bmad-ticket` status / ticket script |
| Architecture | installed architecture/Architect | `bmad-architecture` |
| UX | installed UX/UX Designer | `bmad-ux` |
| Implement one work unit | `bmad-build` | `bmad-build` |
| Unattended single unit | `bmad-build-auto` when supported | `bmad-build-auto` when supported |
| Code review | installed `bmad-code-review` | read the actual installed v7 review skill; **do not assume the v6 ID** |
| E2E tests | installed TEA / `bmad-qa-generate-e2e-tests` if present | select an installed native test skill; **not necessarily the v6 alias** |
| Multi-ticket unattended | configured bmad-loop/other runtime | installed orchestrator or tickets dispatch |
| Correction | `bmad-correct-course` if installed | `bmad-ticket`/PO replanning, as installed |
| Epic closure | `bmad-retrospective` | `bmad-retrospective` |

Legacy `bmad-create-story`, `bmad-dev-story`, `bmad-quick-dev`, `bmad-dev-auto`
may be absent or forwarding shims. v6.11 deprecated their use as the default
implementation path. v6.12 opt-in shims should never be assumed.

## Genuine agents vs workflow skills

A user can explicitly request Analyst, PM, PO, Architect, UX Designer, Scrum
Master, Dev, TEA, GDS agent or another installed module. The router should
identify actual installed persona/skill and its menu entries, not simulate it.
One persona session is not independent subagent delegation. A task mentioning
'QA' does not necessarily require `bmad-agent-tea`; it might mean generating E2E
or auditing a PR. Honor request's action+output over the literal role label.

## Source links (checked 2026-10-24)

- https://docs.bmad-method.org/start/install-bmad/
- https://github.com/bmad-code-org/BMAD-METHOD/tree/V6.12

- https://github.com/bmad-code-org/BMAD-METHOD/releases
- https://github.com/bmad-code-org/BMAD-METHOD/blob/main/docs/reference/skills-and-agents.md
- https://github.com/bmad-code-org/BMAD-METHOD/blob/main/docs/build/build-a-change.md
- https://github.com/bmad-code-org/BMAD-METHOD/blob/main/docs/plan/break-work-into-stories-and-track-it.md
