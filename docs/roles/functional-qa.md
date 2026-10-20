# Functional QA

**Purpose:** Independently verify user-visible behavior against accepted requirements, explore risks, report reproducible defects, and confirm fixes.

**When to use BRAD:** Review a testable story, create risk-based scenarios, explore a changed journey, or retest a documented defect.

**Example request:** “Use BRAD to route the approved acceptance criteria to the installed native functional QA/TEA workflow. Produce a risk-based test matrix with setup, actions, expected results, and evidence. Do not modify implementation.”

**Workflow and inputs:** Use installed native TEA or functional QA workflow as appropriate; route implementation changes to Build only after an owner accepts a defect. Inputs: story criteria, environment/build, seeded accounts/data, dependencies, and known risks. Outputs: executed test cases, reproducible findings, severity/risk, evidence, and retest state.

**Authority and review:** QA owns test design and findings; product owns acceptance and scope; engineering owns fixes. A generated test is not an executed test. Report exact environment, commands, outputs, and limitations.

**Handoff checklist:** Build/version; tested criteria; setup/data; steps and expected/actual; evidence IDs; severity; reproducibility; owner; retest result.

**Failure recovery:** Keep blocked cases separate from failures; if the build or data is unavailable, report `BLOCKED`/`NOT_RUN`, not pass. Protect real customer data and secrets in evidence.

**Observed evidence:** No native TEA or functional QA workflow ran, and no independent exploratory test was performed in a browser. App domain tests are not a substitute for full functional acceptance.
