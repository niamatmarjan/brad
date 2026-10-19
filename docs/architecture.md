# Architecture: deliberately thin

```text
User intent (/brad 1.1 / epic / qa / architect)
                 |
                 v
 BRAD: resolve target, version, state, capabilities
                 |
          choose smallest native flow
                 |
                 v
 Installed BMAD skill / agent (BMM, Build, TEA, GDS...)
                 |
                 v
 Observed artifacts, tests, checks, review and blockers
                 |
          authorized delivery boundary
                 v
 Git branch / PR / CI report OR native planning/QA output
```

BRAD is not a code-writing replacement for native BMAD. It should not spawn agents for their own sake, implement a second story database, or duplicate reviews already performed by the delegated workflow. `bmad-build-auto` is one unit of work, not an entire sprint orchestration engine; use an actually installed runner such as `bmad-loop` when appropriate.

### Boundaries

- **Native BMAD:** PRDs, architecture, specs, story state, actual implementation, code review and TEA.
- **BRAD:** task intent, workflow discovery/delegation, user questions, authorized Git/PR handoff, state-resume checks and truthful report.
- **Host:** independent agent spawning, file/shell/network operations, authentication and capabilities.
- **Human:** consequential choices, permissions, irreversible effects, merge/deployment approval.

Only the actual installed BMAD version and workflows determine what can be invoked. `SKILL.md` is not an executable daemon.
