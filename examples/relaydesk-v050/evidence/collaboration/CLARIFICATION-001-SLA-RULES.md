# Clarification 001: SLA Breach Handling Rules

**From:** Elena Vance (Product Owner)  
**To:** Dev Team (Dev A, Dev B, Dev C), QA (Chloe Bennett)  
**Subject:** Clarification on SLA Expiry vs Blocker Flag

### Question
Does an `OVERDUE` SLA status automatically set `is_blocked = 1` on the service request?

### Clarification Decision
**NO.** An SLA breach indicates schedule slippage, not a functional or dependency impediment.
1. `is_blocked = 1` remains reserved exclusively for external dependencies, missing credentials, or technical impediments.
2. `OVERDUE` status displays a prominent amber/red indicator on the UI and reports in the readiness dashboard, but does NOT prevent engineers from continuing fulfillment or submitting for review.
3. If an engineer encounters an actual impediment that causes schedule slippage, they must separately use the "Flag Blocker" action with a specific reason.
