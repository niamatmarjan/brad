# Cross-functional SDLC RACI

This is a **recommended** starting point. Adapt it to the organization's authority model. R = responsible for the work; A = accountable for the decision/outcome; C = consulted; I = informed. BRAD is not an accountable role.

| Activity / decision | PM/PO | BA | Delivery | Architect | Tech lead | Developers | Functional QA | Automation QA |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Product problem and success measures | A | R | I | C | C | I | C | C |
| Business rules and journey analysis | A | R | C | C | C | I | C | C |
| Scope and priority | A/R | C | C | I | C | I | C | I |
| Architecture/ADR | C | C | I | A/R | R | C | C | C |
| Sprint facilitation and dependencies | C | C | A/R | C | R | C | C | C |
| Story implementation | I | C | I | C | A | R | C | C |
| Functional acceptance evidence | A | C | I | C | C | C | R | C |
| Automated regression evidence | C | C | I | C | C | C | C | A/R |
| Product acceptance | A/R | C | C | I | C | I | C | C |
| Release recommendation | A | C | R | C | R | C | R | R |
| Merge/deploy/publication approval | A per policy | I | C | C | R | C | C | C |

**Boundary:** Native BMAD workflows can assist named stakeholders, but workflow selection does not transfer the stakeholder's decision authority. BRAD does not create or own these responsibilities. This matrix was not validated with real users during the local rehearsal.
