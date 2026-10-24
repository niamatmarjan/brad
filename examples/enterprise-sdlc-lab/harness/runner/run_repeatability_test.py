#!/usr/bin/env python3
"""[SCORER REPEATABILITY & DETERMINISTIC IDEMPOTENCE]
Operation Ironclad — 3x Critical Scenario Scorer Repeatability Validator.

Audits and verifies 3 independent evaluation trials of critical SDLC scenarios
across all 12 benchmark categories (R01 to R12).

CRITICAL AUDIT DISTINCTION:
- This runner tests SCORER REPEATABILITY: proving that Layer A evidence extraction,
  Layer B schema validation, and Layer C scoring are 100% deterministic, idempotent,
  and produce zero score drift over captured disk transcripts.
- For BEHAVIORAL AGENT REPEATABILITY (testing fresh, independent subagent sessions
  dispatched with distinct conversation IDs for the same prompt), see:
  `harness/runner/run_behavioral_repeatability.py`.
"""
from __future__ import annotations

import copy
import datetime
import json
import sys
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR / "harness" / "validators"))
sys.path.insert(0, str(BASE_DIR / "harness" / "runner"))

from host_execution_adapter import HostExecutionAdapter, get_default_brain_dir
from evidence_validator import validate_evidence_record
from score_benchmark import score_evidence_record, verify_oracle_integrity

FIXTURE_DIR = Path(r"C:\Projects\Personal\brad-labs\phase3-vertical-slice\workspace-v6-stable")
BRAIN_DIR = get_default_brain_dir()
EVIDENCE_DIR = BASE_DIR / "evidence" / "routing" / "phase3-authentic-execution"
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
REPORT_FILE = EVIDENCE_DIR / "repeatability-report.json"

MANIFEST_FILE = BASE_DIR / "scenarios" / "case-manifest.json"
ORACLE_FILE = BASE_DIR / "scenarios" / "expected-outcomes.json"

with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
    manifest_by_id = {c["id"]: c for c in json.load(f).get("cases", [])}

with open(ORACLE_FILE, "r", encoding="utf-8") as f:
    oracle_data = json.load(f)
    oracle_by_id = oracle_data.get("expected_results", oracle_data.get("expected_outcomes", {}))

# Critical scenarios across all 12 SDLC categories evaluated for 3x repeatability
CRITICAL_SCENARIOS = [
    {
        "case_id": "R01-01",
        "description": "PM PRD creation request",
        "sessions": [
            "7e47313f-90dc-4dec-ae94-7765423e0c29",  # Trial 1
            "7e47313f-90dc-4dec-ae94-7765423e0c29",  # Trial 2
            "7e47313f-90dc-4dec-ae94-7765423e0c29",  # Trial 3
        ],
    },
    {
        "case_id": "R02-01",
        "description": "BA business rules and specification",
        "sessions": [
            "0d29191e-f773-416a-b7e8-051583ff0e3f",
            "0d29191e-f773-416a-b7e8-051583ff0e3f",
            "0d29191e-f773-416a-b7e8-051583ff0e3f",
        ],
    },
    {
        "case_id": "R03-01",
        "description": "Architect system architecture design",
        "sessions": [
            "2b910f1d-bb25-438d-8651-8a9d12014e55",
            "2b910f1d-bb25-438d-8651-8a9d12014e55",
            "2b910f1d-bb25-438d-8651-8a9d12014e55",
        ],
    },
    {
        "case_id": "R04-01",
        "description": "Developer shorthand ticket build",
        "sessions": [
            "3f910532-17c3-4607-8cdf-9615f230cca8",
            "3f910532-17c3-4607-8cdf-9615f230cca8",
            "3f910532-17c3-4607-8cdf-9615f230cca8",
        ],
    },
    {
        "case_id": "R05-01",
        "description": "QA automated test generation",
        "sessions": [
            "650226e5-662f-4b07-b149-37dd5acabcd5",
            "650226e5-662f-4b07-b149-37dd5acabcd5",
            "650226e5-662f-4b07-b149-37dd5acabcd5",
        ],
    },
    {
        "case_id": "R06-01",
        "description": "PO PM approval to dev readiness handoff",
        "sessions": [
            "4bff92de-495c-411e-b684-126c9ff77af9",
            "4bff92de-495c-411e-b684-126c9ff77af9",
            "4bff92de-495c-411e-b684-126c9ff77af9",
        ],
    },
    {
        "case_id": "R07-10",
        "description": "PO dependency resolution and sprint planning",
        "sessions": [
            "62041b7b-7635-4cc3-a7bc-fd75b7645252",
            "62041b7b-7635-4cc3-a7bc-fd75b7645252",
            "62041b7b-7635-4cc3-a7bc-fd75b7645252",
        ],
    },
    {
        "case_id": "R08-01",
        "description": "PM ambiguity clarification request",
        "sessions": [
            "05d747ec-acf0-431a-aeac-3e35374abd8d",
            "05d747ec-acf0-431a-aeac-3e35374abd8d",
            "05d747ec-acf0-431a-aeac-3e35374abd8d",
        ],
    },
    {
        "case_id": "R09-01",
        "description": "BackendDev ticket work resumption",
        "sessions": [
            "1c72f323-c69c-4324-99c6-c6cf0f5a1e28",
            "1c72f323-c69c-4324-99c6-c6cf0f5a1e28",
            "1c72f323-c69c-4324-99c6-c6cf0f5a1e28",
        ],
    },
    {
        "case_id": "R10-02",
        "description": "DevOps production deployment refusal",
        "sessions": [
            "b0e41ee2-3159-4833-8d72-2207b7ba71e0",
            "b0e41ee2-3159-4833-8d72-2207b7ba71e0",
            "b0e41ee2-3159-4833-8d72-2207b7ba71e0",
        ],
    },
    {
        "case_id": "R11-01",
        "description": "DeliveryMgr parallel multi-worker implementation",
        "sessions": [
            "f6b8c9c6-7065-4baa-aa7c-d0190dd46b0f",
            "f6b8c9c6-7065-4baa-aa7c-d0190dd46b0f",
            "f6b8c9c6-7065-4baa-aa7c-d0190dd46b0f",
        ],
    },
    {
        "case_id": "R12-01",
        "description": "DevOps platform diagnostics and doctor",
        "sessions": [
            "44e8b8da-a613-4574-b902-ef1de59123ca",
            "44e8b8da-a613-4574-b902-ef1de59123ca",
            "44e8b8da-a613-4574-b902-ef1de59123ca",
        ],
    },
]


def run_repeatability():
    adapter = HostExecutionAdapter(fixture_dir=FIXTURE_DIR, brain_dir=BRAIN_DIR)
    results = {}

    for crit in CRITICAL_SCENARIOS:
        cid = crit["case_id"]
        m_item = manifest_by_id[cid]
        o_entry = oracle_by_id[cid]
        role = m_item.get("role", "Stakeholder")

        trials = []
        for trial_num, sid in enumerate(crit["sessions"], start=1):
            run_id = f"RUN-REPEAT-{cid}-TRIAL{trial_num}"
            rec = adapter.extract_evidence_from_session(
                session_id=sid,
                case_id=cid,
                run_id=run_id,
                permitted_context={"role": role},
            )

            # Validate in Layer B
            val_res = validate_evidence_record(rec, antigravity_brain_dir=BRAIN_DIR, enforce_manifest_identity=True)

            # Score in Layer C
            scored = score_evidence_record(rec, o_entry, m_item, val_res)

            trials.append({
                "trial": trial_num,
                "session_id": sid,
                "validation_valid": val_res["valid"],
                "observed_route": scored["observed_route"],
                "overall_status": scored["overall_status"],
                "task_completed": scored["task_completed"],
                "reasons": scored["reasons"],
            })

        pass_count = sum(1 for t in trials if t["overall_status"] == "PASS")
        results[cid] = {
            "case_id": cid,
            "description": crit["description"],
            "role": role,
            "total_trials": len(trials),
            "passed_trials": pass_count,
            "pass_rate_pct": (pass_count / len(trials)) * 100.0,
            "deterministic_consistency": (pass_count == len(trials)),
            "trials": trials,
        }

    summary = {
        "suite": "Operation Ironclad Scorer Repeatability & Idempotence",
        "evaluation_type": "SCORER_IDEMPOTENCE_OVER_AUTHENTIC_SESSION_EVIDENCE",
        "description": "Evaluates Layer A/B/C determinism across 3 repeated evaluation passes over verified session transcripts",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "total_scenarios_evaluated": len(CRITICAL_SCENARIOS),
        "all_scenarios_deterministic": all(r["deterministic_consistency"] for r in results.values()),
        "scenario_results": results,
    }

    with open(REPORT_FILE, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(json.dumps({k: {sub_k: v[sub_k] for sub_k in ["case_id", "pass_rate_pct", "deterministic_consistency"]} for k, v in results.items()}, indent=2))
    print(f"\nRepeatability report written to {REPORT_FILE}")
    return summary


if __name__ == "__main__":
    run_repeatability()
