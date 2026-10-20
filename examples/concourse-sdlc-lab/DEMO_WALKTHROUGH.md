# Demo walkthrough

This walkthrough covers the **server-backed local Concourse app**, not the full BRAD routing study or a production release. Follow the two-window start instructions in [`README.md`](README.md).

1. Sign in with a seeded development identity and select a project. The demo identities are fictional and the API derives role permissions from the session.
2. As PM, create a project and a story with a description, acceptance criteria, priority, and developer assignment.
3. Move the story through Requirements Review, record approval, and move it to Ready.
4. Sign in as the assigned developer, move it through In Development and Code Review. As TL, record code approval and move it to Ready for QA.
5. As QA, move it to In QA, record a failed test run, and file a blocking defect. Observe that release readiness is false and acceptance is unavailable.
6. As the developer, mark the defect fixed. As QA, record a failed retest and observe the defect reopen; fix it again and record a passing retest.
7. Record a fresh passing QA run, accept the item, then sign in as PM and complete it. Refresh the quality view to see `Ready for release`, the closed defect, QA/retest evidence, transition history, and append-only activity.
8. Review [`reports/current/EXECUTION.md`](reports/current/EXECUTION.md) for the exact tested journey and screenshots. The browser updates are manual-refresh; no real-time synchronization is claimed.

All projects, comments, dates, identities and test outcomes are fictional local demo data. The recorded journey is verification of the app behavior, not evidence that real stakeholders performed SDLC work.
