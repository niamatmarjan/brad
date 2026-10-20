# Contributing to BRAD

Thank you for helping make native BMAD coordination easier and more trustworthy. BRAD is an independent, MIT-licensed community project.

## Before you start

- For install/use questions, read [SUPPORT.md](SUPPORT.md).
- For suspected vulnerabilities, **report privately** using [SECURITY.md](SECURITY.md), not an issue.
- Check open issues/PRs before duplicating work. For sizeable changes, propose the design first.
- Read [AGENTS.md](AGENTS.md), [architecture](docs/reference/architecture.md), and [validation limits](docs/evaluation/validation.md).

## Contribution flow

1. Fork the repository, create a topic branch from the current `main`, and keep changes focused. Never rewrite published tags.
2. Preserve the **thin wrapper** contract: discover and delegate to installed native BMAD workflows. Do not add fake specialists or a parallel BMAD state database.
3. Add regression tests for success, failure, interrupted, and security-sensitive behavior. If changing routing, update the canonical scenarios and, where available, attach **real native invocation** traces.
4. Run all applicable checks (Node.js 20+ and Python 3.11+):

   ```sh
   npm test
   python -m unittest discover -s skills/brad/tests -v
   python tools/check_repository.py
   python tools/build_release.py
   npm pack --dry-run --json
   ```

5. Update relevant documentation and `CHANGELOG.md` for user-facing changes. Do **not** bump `VERSION` for every community PR; coordinate release changes with maintainers.
6. Submit a PR describing what changed, compatibility impact, safety implications, test results, and **limits of what was actually tested**. Do not mark unrun checks as passed.

## Copyright, licensing, and AI contributions

By submitting a contribution, you represent that you have the rights to license it under BRAD's MIT License, including any employer or upstream permissions needed. No Contributor License Agreement is currently required; contributions remain attributed to their authors under the repository license.

Do not paste third-party proprietary or restricted-license code, stolen credentials, or confidential customer material. For copied MIT/Apache/BSD code or assets, disclose origin, copyright notices, license text and relevant conditions before inclusion; compatibility must be reviewed. **AI-assisted code is welcome**, but a human contributor is responsible for provenance, correctness, testing, and the legal right to submit it. Do not claim that AI-generated work has no provenance risks.

## Coding standards and conduct

Prefer standard libraries and narrowly scoped dependencies; keep installation deterministic, idempotent, cross-platform, and safe on Windows. Never add hidden network actions, silent native BMAD upgrades, destructive force flags, or unsanctioned remote pushes. Preserve native v6/v7 separation and verify the exact installed skill before invoking it. Follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Documentation organization

New guides belong under `docs/getting-started/`, `docs/sdlc/`, `docs/roles/`, `docs/reference/`, `docs/evaluation/`, or `docs/maintainers/`. Use lowercase kebab-case filenames, update the relevant index, and verify relative links. `docs/releases/` is immutable per published release. Existing `docs/*.md` compatibility paths must stay small and direct readers to the maintained canonical pages.

## Demo submissions

Demos require repeatable **redacted evidence**, permission to publish, and a disclosed validation scope. See [docs/evaluation/demo-publication.md](docs/evaluation/demo-publication.md). Do not commit gigabytes of raw telemetry or full private transcripts into the source repository.

## npm pack and Windows regression matrix

The pack contract accepts both legacy array JSON and npm 12 package-name-keyed output, while rejecting malformed/wrong-package responses. Windows linked-path regression tests use directory junctions so they can exercise safety checks without elevated symlink privileges. Fixture setup errors must never be reported as passing safety tests.

Before a new release, run `npm test` and `npm run pack:check` across supported Node/npm versions, including Windows Node 24. `brad doctor` does not prove a BMAD skill was registered by the host or actually executed.
