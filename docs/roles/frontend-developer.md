# Frontend developer

**Purpose:** Deliver understandable, responsive, accessible user interactions that implement approved product behavior and integrate with stable contracts.

**When to use BRAD:** Implement one accepted UI story, refine a defined interaction, or check a focused accessibility/responsive requirement.

**Example request:** “Use BRAD to route [ticket] to the installed native Build workflow. Follow the approved interaction and design constraints, implement keyboard and mobile behavior, test the described states, and report any unmet acceptance criteria.”

**Workflow and inputs:** Use installed `bmad-build`; consult native UX guidance if present, and native TEA for tests when appropriate. Inputs: journey, wireframe/tokens, acceptance cases, API shape, supported browsers, and accessibility level. Outputs: component/UI changes, semantic interaction, focused tests, and screenshots only when actually captured.

**Authority and review:** Own UI implementation, not authorization policy or product decisions. Use accessible labels, visible focus, responsive layout, and reduced-motion preferences; validate text and empty/error states with product/QA.

**Handoff checklist:** Story/criteria; responsive widths tested; keyboard/focus behavior; loading/empty/error states; API assumptions; tests and screenshots; review/commit.

**Failure recovery:** If the contract is missing, build no invented server behavior. Surface an interface boundary or ask the contract owner; keep incomplete work local and state what remains.

**Observed evidence:** The archived prototype had only a narrow browser smoke. The current app has three captured live-journey screenshots and 27 fixture-driven Playwright tests across desktop, tablet and mobile. These are app checks, not native Build workflow or independent BRAD frontend stakeholder evidence.
