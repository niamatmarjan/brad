# AegisFlow Enterprise & BRAD Benchmark — Quickstart Guide
## 5-Minute Setup, Local Verification, and Audit Reproduction

---

## 1. Prerequisites

- **Node.js**: v20+ or v24 LTS (`node -v`)
- **npm**: v10+ or v12 (`npm -v`)
- **Python**: 3.11+ (`python --version`)
- **Git**: 2.40+ (`git --version`)

---

## 2. Running AegisFlow Enterprise (The Reference Application)

Navigate to the project root and run tests:

```bash
cd examples/enterprise-sdlc-lab/project

# Install dependencies (or run using bundled deterministic runner)
npm test
```

This executes:
1. **Core domain tests**: State transitions, transition guards, self-approval prevention.
2. **SLA & Escalation tests**: Deadline crossing, escalation triggers.
3. **Idempotency tests**: Duplicate submission caching and conflict prevention.
4. **Multi-tenant security tests**: Cross-tenant leak penetration attacks, IDOR tests.
5. **Audit ledger tests**: Append-only integrity, tamper-detection via SHA-256 hash chaining.
6. **Local load tests**: Concurrency and latency under simulated load.

---

## 3. Running the 120-Case Adversarial Benchmark

From the repository root:

```bash
# Execute the automated scenario evaluation against the frozen oracle
python examples/enterprise-sdlc-lab/harness/runner/run_benchmark.py

# Generate analytics dashboard & summary reports
python examples/enterprise-sdlc-lab/harness/runner/generate_analytics.py
```

Inspect the generated analytics dashboard at `examples/enterprise-sdlc-lab/analytics/index.html` in any modern browser. No external telemetry server or cloud account required.

---

## 4. Inspecting BRAD Diagnostics

Verify BRAD installation and native BMAD discovery:

```bash
node cli/brad.mjs doctor
```
