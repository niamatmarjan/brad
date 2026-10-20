# BRAD documentation

BRAD is a thin dispatcher to **installed native BMAD workflows**. Installation, host availability, actual invocation, and verified outcome are distinct levels of evidence. BRAD v0.5.0 remains a **supervised preview**.

## Get started

- [AI-led setup (Antigravity, Claude, Copilot, Codex)](getting-started/ai-setup.md)
- [Installation and CLI guide](getting-started/installation.md)

## Use BRAD in the software development lifecycle

- [Cross-functional SDLC playbook](sdlc/sdlc-playbook.md)
- [Definition of Ready](sdlc/definition-of-ready.md) · [Definition of Done](sdlc/definition-of-done.md)
- [RACI matrix](sdlc/raci-matrix.md) · [Stakeholder workflow map](sdlc/stakeholder-workflow-map.md)
- [Handoff protocol](sdlc/team-handoff-protocol.md)
- [Ten stakeholder-role guides](roles/README.md)

## Architecture and evaluation

- [Architecture and responsibility boundaries](reference/architecture.md)
- [Validation policy and limitations](evaluation/validation.md)
- [Historical validation lab findings](evaluation/validation-report-review.md)
- [Demo publication and privacy policy](evaluation/demo-publication.md)
- [GPT-6.1 Sol master validation prompt](evaluation/prompts/gpt-6-1-sol-master-validation.md) — protocol only, not observed execution
- [Concourse evaluation (BRAD v0.4.1, PARTIAL)](../examples/concourse-sdlc-lab/README.md)

## Maintainers and releases

- [Maintainer release checklist](maintainers/releasing.md)
- [Versioned release notes](releases/v0.5.0.md) · [Changelog](../CHANGELOG.md)
- [Contributing](../CONTRIBUTING.md) · [Security](../SECURITY.md) · [Governance](../GOVERNANCE.md)

## Naming and preservation policy

New maintained guides use **lowercase kebab-case Markdown filenames** and live in their subject directory. Repository-level standard files such as `README.md`, `LICENSE`, `SECURITY.md`, and `AGENTS.md` retain their conventional names.

A few old `docs/*.md` and `docs/testing/*` URLs remain as short **compatibility redirects**, so release-tagged instructions and historical report links do not break. Do not add new documentation to those redirect paths. Do not move or rewrite immutable `docs/releases/` or `examples/concourse-sdlc-lab/evaluations/brad-v0.4.1/` evidence when reorganizing docs.
