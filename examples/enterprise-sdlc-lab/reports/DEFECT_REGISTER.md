# Operation Ironclad: Defect Register & Remediation Log
## Comprehensive Catalog of Engineering Defects, Security Vulnerabilities & Resolutions

**Target System**: BRAD Orchestrator & AegisFlow Enterprise Monorepo  
**Audit Standard**: Enterprise Software Quality & Security Assurance  
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
