# Examples and historical evidence

## Current live validation: external disposable lab

The independent [BRAD E2E lab](https://github.com/niamatmarjan/brad-e2e-lab) contains the actual Story 1.1 [implementation PR](https://github.com/niamatmarjan/brad-e2e-lab/pull/2) and controlled Story 1.2 [resume PR](https://github.com/niamatmarjan/brad-e2e-lab/pull/4). Both PRs were merged with passing GitHub CI (18/18 and 29/29 tests). Native BMAD Build/TEA was reported as executed **inline**, not independently verified host-native dispatch.

## Historical: Concourse v0.4.1 (PARTIAL)

The historical Concourse v0.4.1 partial demonstration and evaluation trail has been retired from the active source tree to maintain repository hygiene and eliminate duplicated files.

Its full historical evidence, offline reports, and sanitized evaluation trail remain preserved immutably in Git history at commit [`52acd28762`](https://github.com/niamatmarjan/brad/tree/52acd287624d888257e9b5d86dcddbadca19cc56/examples/concourse-sdlc-lab) (originally introduced in commit [`edeb76d`](https://github.com/niamatmarjan/brad/commit/edeb76d0eb2ad7aff53e07a81e480d6475e7bd51)). It is **not** a production-ready reference, a current routing-performance benchmark, or evidence of universal native agent invocation.

**Retention and privacy audit:** Completed under [issue #16](https://github.com/niamatmarjan/brad/issues/16). Reachable `main` history was verified clean of active secrets and developer paths; no Git history rewrite was required.

New lightweight examples should live in dedicated disposable repositories; add a small summary here only after source/privacy and evidence review.
