# Community and native automation patterns (reviewed 2026-10-19)

Sources:
- BAD: https://github.com/stephenleo/bradnomous-development
- auto-bmad: https://github.com/stefanoginella/auto-bmad (archived 2026-10-01)
- official bmad-loop: https://github.com/bmad-code-org/bmad-loop
- official Build: https://github.com/bmad-code-org/BMAD-METHOD/blob/main/docs/build/build-a-change.md
- official Auto: https://github.com/bmad-code-org/BMAD-METHOD/blob/main/docs/build/autonomous-development-loops.md

## Adopt, without cloning orchestration engines

- BAD: dependency graph + per-story worktrees + sequential quality/PR lanes,
  model isolation, CI recheck. **Do not** copy legacy create-story -> dev-story
  in modern BMAD; v6.11 deprecated it. Default concurrency=1. Parallel only
  when independent, isolated, host supports it, and user opted in. No auto-merge.
- auto-bmad: native build-auto worker, optional risk-based TEA, first-run
  preferences, resumable native artifacts, follow-up review on different model,
  draft PR for caveats, checkpoints. It's archived, and README compatibility
  targets an older v6.11 contract; do not rely on it to support current v7.
- bmad-loop: deterministic engine, fresh context workers, explicit bounded
  retries, post-run verification, native planning sources, durable recovery.
  **Prefer delegating to configured bmad-loop** for unattended multi-story work.
  It is early beta: check host support and version compatibility first.

## Do not do these

- Install orchestrators automatically, clone their scripts/structure verbatim,
  wrap several orchestration engines around the same story, or bypass safety
  gates to keep an arbitrary loop running.
- Write an independent BMAD ticket registry, emulate a specialist persona as
  proof of a subagent, force a fixed 7-step pipeline on a one-line bugfix, or
  claim unattended continuity when host lacks a persistent runner.
- Use old guide version numbers as proof of today's installed capabilities.
