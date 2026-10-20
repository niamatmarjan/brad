# Publishing validation demos and master reports

This repository includes a **sanitized BRAD v0.4.1 Concourse evaluation**, explicitly marked PARTIAL, under [`examples/concourse-sdlc-lab/` ](../../examples/concourse-sdlc-lab/README.md). It does not establish native BMAD workflow execution, independent multi-agent orchestration, or full production readiness. Further demos require the publication gates below.

## Publication gates

1. Obtain explicit authorization for a public demo repository and publishing the resulting data/code. Do not treat access to a local test workspace as permission to publish all contents.
2. Confirm that every apparent "developer" is a genuine independent model/agent context or clearly label the run as a sequential or single-context simulation. Record session IDs when the host exposes them; redact private identifiers before publishing.
3. Separate **expected routing**, **selected route**, **observed native invocation**, **artifact existence**, **test outcome**, **remote PR/CI**, and **complete delivery**. Never merge these into a single green badge.
4. Collect measured timestamps, command exit codes, tested OS and versions, run IDs, Git commit SHAs and actual PR URLs only when observed. Cost/token data must say `unavailable` if not recorded by the host.
5. Scrub API keys, `.env`, tokens, private Git logs, absolute home paths, private names, undisclosed prompt contents, proprietary code, raw unreviewed transcripts and personal data. Retain sanitized extracts with redaction disclosures.
6. Respect licenses for test-app code, screenshots, fixtures, screenshots/images, and copied templates. Note every material source in a demo-level notice.
7. Run automated checks for broken local report references, redaction flags, missing event IDs and status denominators; then perform a **human privacy and accuracy review** before any public PR.
8. Publish demos in a **separate example/demo repository first** when artifacts are large. Add curated summaries, links and small source packages to BRAD only after approval, not a massive dump of raw logs.

## Suggested future demo layout

```text
examples/
  README.md
  relayboard-2026-xx/
    README.md              # reproducible scope, consent, fixture identity
    LICENSE                # license for demo-specific code (if publishable)
    report/index.html      # self-contained navigable master report
    report/data/*.json     # redacted machine-readable evidence
    evidence/              # selected, non-sensitive compact artifacts
    reproduction.md        # commands, environment, reset procedure
```

## Master HTML report requirements

One **self-contained, responsive** `index.html` report should include executive verdict and limitations; timeline from empty project through native BMAD setup; installed versions; BMM/TEA routing matrix; agent/session topology and collaboration graph; each ticket's full lifecycle; reviewer and test decisions; real PR/CI links; failure injections and recovery; run-to-run comparison against direct native BMAD; stage-gated 85-case scenario table; security and privacy findings; release blockers; annotated screenshots/recordings where publishable; and prioritized v0.5.0 change proposals. Every metric must show numerator, denominator, source and evidence ID, and distinguish `PASS`, `FAIL`, `PARTIAL`, `BLOCKED`, `UNSUPPORTED`, `NOT_RUN`.

An attractive HTML report **is not independent verification**: link it to raw, sanitized machine-readable records. A report must never contain invented screenshots, statistics, or green badges.

The test kickoff prompt is at [testing/GPT61_SOL_MASTER_PROMPT.md](prompts/gpt-6-1-sol-master-validation.md).
