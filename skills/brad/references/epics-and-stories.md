# Native planning and multi-unit execution

## Planning vs implementation

- "Create epics/stories" -> planning owner (v6 epic/story writer, v7 PO /
  `bmad-ticket`), not Build. Keep the current PRD/spec, cite capability IDs,
  acceptance, dependencies, risks, and estimates only when grounded.
- "Refine 1.1" -> native ticket/story refinement in owning runtime; preserve
  ID, owner, scope and accepted decisions. Don't implement until asked.
- "Implement 1.1" -> single-ticket lane in ticket-to-pr.md.
- "Finish epic 2" -> verify epic's native done conditions, run ready stories
  respecting dependencies, integration checks, trace, retrospective; output
  one PR per story by default unless user/repo policy says one epic PR.
- "Finish sprint" -> explicit bounded scope and authorization; use an
  installed actual orchestrator if available, don't write your own loop.

## v6 and v7 state owners

v6: locate the correct `sprint-status.yaml`, story artifacts, approved epics and
readiness state. Don't guess status values: consult installed sprint-planning/
Build definitions. Do not mark done based solely on a worker claiming success.

v7 preview: locate initiative, epic and `tickets.toml` plan (or spec-derived
story registry if applicable), inspect `tickets.py` help and exact native
commands. `tickets.py next` may identify ready work; use only the installed
script's documented arguments. Preserve dependencies (`after`), stable IDs and
plan state. Don't directly rewrite structured TOML if native writer exists.

## Selecting multi-ticket engine

1. Existing project configured with official `bmad-loop`? Inspect `bmad-loop`
   CLI and project config, confirm version compatibility and select the native
   `--story`/`--epic`/bounded run interface if installed. Never claim it can
   dispatch a ticket tree source not supported in **that** installed version.
2. Explicitly configured `auto-bmad` or `BAD`? Check its supported BMAD
   version, host, state format, and runner; ask before using archived or stale
   compatibility contracts. Do not force a deprecated 7-step legacy pipeline.
3. No engine? In an interactive host, one coordinator session may dispatch
   native Build for ready work sequentially, read result and repeat while
   session limits permit; every Build owns one unit. No background promise.
4. Parallel execution only when dependency-independent, git-isolated worktrees,
   bounded concurrency, distinct ownership and collision/conflict policy exist.
   Default is sequential (max 1), even for broad sprints.

## Completion and proof

A complete epic needs all required stories verified, integration and regression
checks on the aggregated change, explicit deferred-work decision, QA gates
where appropriate, and native retrospective/acceptance. One passing story does
not mean epic PASS. No merge/deploy without separate authorization.
