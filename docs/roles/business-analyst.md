# Business analyst

**Purpose:** Elicit, analyze, and trace business rules, user journeys, data definitions, and acceptance examples. The BA makes analysis explicit; BRAD routes to a native workflow but should not silently decide policy.

**When to use BRAD:** Clarify an approved product goal, map a workflow, identify edge cases, reconcile conflicting requirements, or trace acceptance criteria to stories.

**Example request:** “Use BRAD and the installed native analysis workflow to map the [journey]. Return actors, preconditions, business rules, exceptions, measurable acceptance examples, assumptions, and questions. Do not change the backlog.”

**Workflow and inputs:** Use the installed BMM Analyst/requirements flow when present; use the relevant native PO/story-refinement flow only for backlog changes. Inputs: approved product intent, current process, user terminology, policies, examples, and known constraints. Expected outputs: journey, rules, glossary, acceptance examples, trace links, and unresolved decisions.

**Authority and review:** The BA owns analysis quality, not product priority, architecture approval, or legal/compliance interpretation. Validate rules with the accountable business owner and preserve conflicting source statements rather than inventing a resolution.

**Handoff checklist:** Source and owner for each rule; accepted terminology; included/excluded cases; traceable acceptance examples; unanswered questions; exact next reviewer.

**Failure recovery:** Mark unsupported facts as assumptions, request the original source, and leave ambiguous backlog state unchanged. If an installed workflow is unavailable, report that rather than using a similarly named workflow as proof.

**Observed evidence:** No native BA/Analyst workflow ran in this rehearsal. `E-ROUTING-85` validates the canonical case metadata only; it does not verify BA routing. Concourse seed data is fictional.
