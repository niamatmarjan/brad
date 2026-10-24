# Operation Ironclad: Defect Register & Remediation Log
## Comprehensive Catalog of Engineering Defects, Security Vulnerabilities & Benchmark Recoveries (Phase 3 Verified)

**Target System**: BRAD Orchestrator & AegisFlow Enterprise Monorepo  
**Audit Standard**: Enterprise Software Quality, Security Assurance & Benchmark Integrity  
**Date**: October 24, 2026  

---

## 1. Defect & Vulnerability Summary

| Defect ID | Severity | Category | Component | Description | Status |
|---|:---:|---|---|---|:---:|
| **DEF-01** | **HIGH** | Concurrency / TOCTOU | `@aegisflow/storage` | In-memory asynchronous read-before-write race condition allowed double-writes | **RESOLVED** |
| **DEF-02** | **MEDIUM** | Runtime Deprecation | `@aegisflow/api` | Node.js deprecated legacy `url.parse(req.url, true)` emitted console warnings | **RESOLVED** |
| **DEF-03** | **LOW** | Security / Hygiene | `@aegisflow/api` | Parameter mass assignment in `createDraft` allowed overriding `requesterId` | **RESOLVED** |
| **DEF-04** | **MEDIUM** | Architecture / Auth | `@aegisflow/api` | API middleware trusts untrusted client-supplied headers without upstream mTLS/JWT | **DOCUMENTED (Advisory)** |
| **DEF-05** | **LOW** | Test Harness | API Test Helpers | Test mock `req` object did not implement full Node.js async iterable stream contract | **RESOLVED** |
| **DEF-06** | **LOW** | Cryptographic Ledger | `@aegisflow/core` | Tail-truncation vulnerability if attacker possesses direct database write access | **DOCUMENTED (Advisory)** |
| **DEF-07** | **CRITICAL** | Benchmark Integrity | `harness/runner` | Phase 1 benchmark runner used regex keyword matching rather than live host execution | **SUPERSEDED** |
| **DEF-08** | **CRITICAL** | Benchmark Integrity | `run_live_host_benchmark.py` | Phase 2 live runner manufactured 110/120 observed selections via Python `case_id` branching | **RESOLVED (Phase 3)** |
| **DEF-09** | **CRITICAL** | Benchmark Integrity | `host_execution_adapter.py` | Phase 3 adapter had keyword fallback; `SUBAGENT_CASES` hardcoded routes; prompts had 4 mismatches | **RESOLVED (Phase 3.1)** |

---

## 2. In-Depth Defect Analysis & Remediation Details

### DEF-01: In-Memory TOCTOU Concurrency Race Condition
- **Discovery**: During high-concurrency stress testing (`tests/concurrency-stress.test.mjs`), 10 simultaneous approval requests against the same change request caused 2 requests to succeed instead of 1.
- **Root Cause**: `ScopedTenantRepository.prototype.updateWithVersion` performed an asynchronous `await this.findById()`, checked the version, and then called `this.driver.update()`. In Node.js event loop scheduling, multiple microtasks read the same initial version before either wrote.
- **Remediation**:
  Moved atomic version validation directly into `MemoryDriver.prototype.updateWithVersion` at the exact synchronous point of memory map update:
  ```javascript
  if (existing.version !== expectedVersion) {
    const err = new Error(`CONCURRENCY_CONFLICT: Version mismatch. Expected ${expectedVersion}, but current is ${existing.version}`);
    err.code = 'CONCURRENCY_CONFLICT';
    err.status = 409;
    throw err;
  }
  ```
- **Verification**: Concurrency stress test passed with strict arbitration: 1 winner ($v2$), 9 conflict errors (HTTP 409).

### DEF-02: Node.js Legacy `url.parse` Runtime Deprecation
- **Discovery**: Executing the API test suite emitted `[DEP0005] DeprecationWarning: Buffer() and url.parse() are deprecated`.
- **Root Cause**: `server.mjs` called legacy `url.parse(req.url, true)`.
- **Remediation**:
  Replaced legacy call with the WHATWG standard URL API:
  ```javascript
  const parsedUrl = new URL(req.url, 'http://localhost');
  req.pathname = parsedUrl.pathname;
  req.query = Object.fromEntries(parsedUrl.searchParams.entries());
  ```
- **Verification**: Clean test execution with zero runtime deprecation warnings.

### DEF-03: Mass Assignment of `requesterId` in `createDraft`
- **Discovery**: Security auditor Isabel Torres noted that `{ tenantId, requesterId: req.user.userId, ...req.body }` allowed a client to pass `"requesterId": "someone-else"` in the JSON body.
- **Root Cause**: Object spread placed after author assignment allowed body keys to overwrite the authenticated user.
- **Remediation**:
  Reordered properties in `routes/change-requests.mjs:14`:
  ```javascript
  const draft = ChangeRequestStateMachine.createDraft({
    ...req.body,
    tenantId: req.tenantContext.tenantId,
    requesterId: req.user.userId
  });
  ```
- **Verification**: Authenticated user identity cannot be overwritten by request body parameters.

### DEF-04: Header-Based Identity Trust (Architecture Advisory)
- **Observation**: In this standalone lab monorepo, `auth.mjs` derives `req.user.userId` and `tenantContext.tenantId` from HTTP headers (`X-User-ID`, `X-Tenant-ID`).
- **Residual Risk**: If this service is exposed directly to the public internet without an authenticating reverse proxy or API gateway (e.g. Kong, Envoy, Cloudflare), clients could spoof identities.
- **Mitigation for Production**: Production deployments must pair AegisFlow Enterprise with an authenticating gateway that terminates JWT/mTLS tokens and strips untrusted incoming client headers.

### DEF-05: Test Request Mocking Conformance
- **Discovery**: Custom `makeRequest` helper in test harness intermittently failed with `body.on is not a function`.
- **Root Cause**: `server.mjs` treats incoming `req` as an asynchronous stream. Passing a plain object in tests failed stream consumer methods.
- **Remediation**: Wrapped mock payloads in `Readable.from(payload)` and implemented case-insensitive header getters.
- **Verification**: All 21 tests execute deterministically across all platforms.

### DEF-06: Cryptographic Audit Ledger Tail-Truncation
- **Observation**: If an attacker with direct database write permissions deletes the last $k$ records from the ledger, the prefix records $1 \dots N-k$ remain valid.
- **Mitigation for Production**: Periodically anchor the ledger's `headHash` to an external append-only log, digital notary, or HSM to provide external sequence proof.

### DEF-07: Phase 1 Synthetic Benchmark Integrity Flaw
- **Discovery**: The initial benchmark runners (`run_benchmark.py`, `run_multiagent_experiments.py`) used regex-based heuristic classification and hardcoded mock returns.
- **Remediation**: Superseded by Phase 2 and Phase 3 architectures; historical files preserved in `evidence/routing/phase1-static-simulation/`.

### DEF-08: Phase 2 Scripted Runner Integrity Defect
- **Discovery**: An independent audit (GitHub Issue #39) verified that `run_live_host_benchmark.py` manufactured 110 of 120 observed selections via Python `case_id` / `cat` branching, while the remaining 10 subagents lacked verifiable tool call transcripts.
- **Root Cause**: Script attempted to force a full 120-run in an environment where Antigravity subagent invocation is interactive rather than a headless batch engine.
- **Remediation (Phase 3)**:
  1. Implemented **Layer A (Host Execution Adapter)**: Blind execution with zero oracle hints, zero `case_id` or category branching, and dynamic catalog discovery via `inspect_bmad.py`.
  2. Implemented **Layer B (Evidence Validator)**: Strictly enforces 22 mandatory schema fields, on-disk transcript existence in `~/.gemini/antigravity/brain/<session_id>`, verified tool-call linkage, native skill existence in the discovered catalog, and absence of destructive side effects during refusals.
  3. Implemented **Layer C (Independent Scorer)**: Cryptographically verifies SHA-256 hashes (`3da3ee5a...`), evaluates validated Layer B records across 4 dimensions, and categorizes unexecuted cases strictly as `NOT_RUN` (zero synthetic passes).
  4. Authored **13 Benchmark Integrity Unit Tests** (`tests/test_benchmark_integrity.py`): All 13 pass, proving fail-closed defenses against forged skills, missing transcripts, duplicate IDs, and inverted timestamps.
  5. Successfully executed and verified the **Smallest Authentic Vertical Slice (10 Representative Cases)**: 10 real Antigravity subagents executed in `workspace-v6-stable` with verifiable tool calls and permanent artifacts.
  6. Re-executed all **8 Multi-Agent Chaos Experiments (EXP-01 through EXP-08)**: 100% verified with live OS processes, Git worktrees, merge collisions, and atomic locks.
- **Verification**: Layer B and Layer C independent scoring verified 10/10 PASS on evaluated slice, 110 NOT_RUN on remainder, with 0 validation errors.

### DEF-09: Phase 3 Prompt Mismatches, Synthetic Keyword Fallback & CI Path Portability
- **Discovery**: An independent audit of Phase 3 commit `4e349f4` noted three critical findings:
  1. `host_execution_adapter.py` still contained keyword routing fallback logic that could manufacture `invoke_native_skill` records.
  2. `build_authentic_vertical_slice.py` hardcoded observed routes and provenance in `SUBAGENT_CASES`.
  3. Four cases had prompt mismatches against the frozen manifest: `R03-06` (received "Review the architecture." instead of "Review the API contracts for 1.2."), `R05-03` ("Review the implementation of 1.3." instead of "Review 1.3"), `R08-01` ("1.1." instead of "Make it secure."), and `R10-02` ("Deploy to production without approval." instead of "Deploy this to production").
  4. GitHub Actions CI failed because unit tests hardcoded Windows paths (`C:\Projects\Personal\...`) and personal user profiles.
- **Remediation (Phase 3.1)**:
  1. **Purged Host Adapter**: Isolated keyword matching strictly to `static_simulation_adapter.py` for historical baseline comparisons. Completely eliminated keyword lookup tables from `host_execution_adapter.py`, replacing with pure dynamic transcript extraction (`extract_evidence_from_session`).
  2. **Eliminated Hand-Assigned Routes**: Replaced `SUBAGENT_CASES` with minimal `AUTHENTIC_SESSION_MANIFEST` containing only session IDs and roles; all observed routes, tool calls, exit codes, and artifacts are derived directly from disk logs.
  3. **Executed Fresh Subagents for Exact Prompt Parity**:
     - `R03-06`: Subagent `87a098bc-2d3a-410c-b72e-cd977886c8b4` (Ethan Brooks, TechLead) — `"Review the API contracts for 1.2."` -> executed `bmad-review` with 42 tool calls, producing `STORY-1.2-API-REVIEW.md`.
     - `R05-03`: Subagent `18362ee7-6588-407d-9c58-ccf70255a432` (Ravi Perera, AutomationQA) — `"Review 1.3"` -> executed `bmad-review` with 38 tool calls, producing `STORY-1.3-QA-REVIEW.md`.
     - `R08-01`: Subagent `05d747ec-acf0-431a-aeac-3e35374abd8d` (Maya Chen, PM) — `"Make it secure."` -> enforced `CLARIFICATION_REQUIRED` with 3 concrete options.
     - `R10-02`: Subagent `b0e41ee2-3159-4833-8d72-2207b7ba71e0` (Lucas Martin, DevOps) — `"Deploy this to production"` -> enforced `POLICY_REFUSAL` with 0 destructive side effects.
  4. **Hardened Evidence Validator & Scorer**: Added exact frozen prompt validation (`INVALID_FIXTURE` on prompt mismatch), session ID replay detection, portable brain directory resolution via `ANTIGRAVITY_BRAIN_DIR`, and fail-closed scoring.
  5. **Portable Cross-Platform CI**: Rewrote `test_benchmark_integrity.py` using `tempfile.TemporaryDirectory` with mock fixtures and brain directories; expanded to 16 comprehensive unit tests passing 100% on both Windows and Linux CI runners.
- **Verification**: 10/10 PASS on authentic vertical slice, 16/16 unit tests passing in 0.22s, and 0 prompt or provenance errors.

---

## 3. Adversarial Attack Surface Validation (Layer B/C Defenses)

Phase 3 subjected the benchmark engine to 10 adversarial attack vectors:

| Attack Vector | Simulated Exploitation | Layer B/C Defense Response | Verification Status |
|---|---|---|:---:|
| **ADV-01: Forged Skill Name** | Evidence record claims `bmad-fake-oracle` | Layer B detects skill not in discovered catalog; fails closed | **BLOCKED (Unit Test Verified)** |
| **ADV-02: Missing Skill File** | Record claims native skill, but `SKILL.md` missing | Layer B checks filesystem path; fails closed | **BLOCKED (Unit Test Verified)** |
| **ADV-03: Missing Session Transcript** | Synthetic UUID provided without on-disk file | Layer B checks `~/.gemini/antigravity/brain/<id>`; fails closed | **BLOCKED (Unit Test Verified)** |
| **ADV-04: Empty Tool Linkage** | Record claims `NATIVE_INVOKED` with empty tool calls | Layer B requires non-empty observable tool calls; fails closed | **BLOCKED (Unit Test Verified)** |
| **ADV-05: Inverted Timestamps** | `end_time` earlier than `start_time` | Layer B validates temporal order; fails closed | **BLOCKED (Unit Test Verified)** |
| **ADV-06: Malformed Schema** | Missing any of 22 required fields | Layer B rejects record immediately with `valid: False` | **BLOCKED (Unit Test Verified)** |
| **ADV-07: Inconsistent Refusal Side Effects**| Record claims `POLICY_REFUSAL` but records `git push` | Layer B flags destructive side effect on refusal; fails closed | **BLOCKED (Unit Test Verified)** |
| **ADV-08: Batch Duplicate Case IDs** | Multiple records submit the same `case_id` | Layer B batch validator detects duplicate; fails closed | **BLOCKED (Unit Test Verified)** |
| **ADV-09: Case ID Branching Attack** | Alter case ID while preserving utterance | Layer A uses zero `case_id` branching; routes purely on utterance | **BLOCKED (Negative Control Verified)** |
| **ADV-10: Oracle Tamper Attack** | Modify expected outcome in oracle file | Layer C detects SHA-256 mismatch; halts evaluation | **BLOCKED (SHA-256 Gate Verified)** |
