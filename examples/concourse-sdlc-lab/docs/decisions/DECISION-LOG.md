# Decision log

| ID | Decision | Status | Evidence / boundary |
|---|---|---|---|
| D-01 | Preserve BRAD v0.4.1 and do not edit its runtime for this showcase. | Applied | Local `VERSION` and tag inspected; no BRAD core changes made. |
| D-02 | Use a disposable temporary fixture for BRAD setup checks. | Applied | Setup and doctor output verified in that fixture only. |
| D-03 | Use the stable official BMAD version in the isolated validation fixture. | Applied | Official v6.12.4 installer configured BMM v6.12.4 and TEA v1.27.2 in a temporary directory. No project-global or repository-local install. |
| D-04 | Keep Concourse demo local, dependency-free, and browser-persisted. | Applied for demo | [ADR-001](../architecture/ADR-001-local-demo-runtime.md); not a production design. |
| D-05 | Mark ten-role execution, 85 model routes, PR/CI, and benchmarks as incomplete. | Applied | Report and machine-readable status records; no result fabricated. |
| D-06 | Leave publication, push, merge, deployment, and release to maintainer approval. | Applied | No external repository or remote operation performed. |
