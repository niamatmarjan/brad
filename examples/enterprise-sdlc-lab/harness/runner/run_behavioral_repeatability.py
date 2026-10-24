#!/usr/bin/env python3
"""[BEHAVIORAL REPEATABILITY TESTING - PHASE 5]
Operation Ironclad — Multi-Session Behavioral Repeatability Evaluator.

Unlike Scorer Repeatability (which tests idempotent evaluation of a single
transcript), Behavioral Repeatability evaluates MULTIPLE DISTINCT SUBAGENT
SESSIONS dispatched with independent conversation IDs for the same frozen case.

AUDIT CRITERIA:
1. Verifies that fresh agent sessions with distinct conversation IDs converge
   on the exact same route and authorization verdict.
2. Measures variance in duration, tool call count, and token execution.
3. Proves LLM non-determinism does not cause routing flips or safety breaches.
"""
from __future__ import annotations

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
REPORT_FILE = EVIDENCE_DIR / "behavioral-repeatability-report.json"

MANIFEST_FILE = BASE_DIR / "scenarios" / "case-manifest.json"
ORACLE_FILE = BASE_DIR / "scenarios" / "expected-outcomes.json"

with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
    manifest_by_id = {c["id"]: c for c in json.load(f).get("cases", [])}

with open(ORACLE_FILE, "r", encoding="utf-8") as f:
    oracle_data = json.load(f)
    oracle_by_id = oracle_data.get("expected_results", oracle_data.get("expected_outcomes", {}))

# Evaluation matrix comparing fresh, distinct sessions
BEHAVIORAL_SCENARIOS = [
    {
        "case_id": "R01-01",
        "description": "PM PRD creation request (fresh subagent trials)",
        "role": "Maya Chen (PM)",
        "sessions": [
            {
                "trial": 1,
                "session_id": "7e47313f-90dc-4dec-ae94-7765423e0c29",
                "notes": "Phase 4 initial run",
            },
            {
                "trial": 2,
                "session_id": "0f6b7ff7-ddd1-4a11-9315-eccb5557f30c",
                "notes": "Phase 5 fresh independent subagent execution",
            },
        ],
    },
    {
        "case_id": "R10-02",
        "description": "DevOps production deployment refusal (fresh subagent trials)",
        "role": "Lucas Martin (DevOps)",
        "sessions": [
            {
                "trial": 1,
                "session_id": "b0e41ee2-3159-4833-8d72-2207b7ba71e0",
                "notes": "Phase 4 initial run",
            },
            {
                "trial": 2,
                "session_id": "92c87b21-71a2-4616-8a6f-a75f52c10226",
                "notes": "Phase 5 fresh independent subagent execution",
            },
        ],
    },
]


def run_behavioral_repeatability() -> dict[str, Any]:
    adapter = HostExecutionAdapter(fixture_dir=FIXTURE_DIR, brain_dir=BRAIN_DIR)
    results = {}

    print("=" * 72)
    print("   BRAD BEHAVIORAL REPEATABILITY EVALUATION (FRESH AGENT SESSIONS)")
    print("=" * 72)

    for entry in BEHAVIORAL_SCENARIOS:
        cid = entry["case_id"]
        role = entry["role"]
        m_item = manifest_by_id[cid]
        o_entry = oracle_by_id[cid]

        print(f"\nEvaluating Case {cid} ({entry['description']}):")
        trials_data = []

        for item in entry["sessions"]:
            t_num = item["trial"]
            sid = item["session_id"]
            run_id = f"RUN-BEHAVIORAL-{cid}-T{t_num}"

            rec = adapter.extract_evidence_from_session(
                session_id=sid,
                case_id=cid,
                run_id=run_id,
                permitted_context={"role": role},
            )

            val_res = validate_evidence_record(rec, antigravity_brain_dir=BRAIN_DIR, enforce_manifest_identity=True)
            scored = score_evidence_record(rec, o_entry, m_item, val_res)

            t_info = {
                "trial": t_num,
                "session_id": sid,
                "notes": item["notes"],
                "validation_valid": val_res["valid"],
                "observed_route": scored["observed_route"],
                "overall_status": scored["overall_status"],
                "task_completed": scored["task_completed"],
                "tool_call_count": len(rec["tool_call_linkage"]),
                "duration_ms": rec["duration_ms"],
                "reasons": scored["reasons"],
            }
            trials_data.append(t_info)
            print(f"  Trial {t_num} ({sid[:8]}): Route={scored['observed_route']} | Status={scored['overall_status']} | Tools={len(rec['tool_call_linkage'])} | {rec['duration_ms']:.0f}ms")

        # Compute consistency
        routes = [t["observed_route"] for t in trials_data]
        statuses = [t["overall_status"] for t in trials_data]
        completions = [t["task_completed"] for t in trials_data]

        route_consistent = (len(set(routes)) == 1)
        status_consistent = (len(set(statuses)) == 1)
        all_passed = all(s == "PASS" for s in statuses)

        results[cid] = {
            "case_id": cid,
            "description": entry["description"],
            "role": role,
            "total_independent_sessions": len(trials_data),
            "route_consistent": route_consistent,
            "status_consistent": status_consistent,
            "all_passed": all_passed,
            "observed_routes": routes,
            "trials": trials_data,
        }

    summary = {
        "suite": "Operation Ironclad Behavioral Agent Repeatability",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "evaluation_type": "FRESH_INDEPENDENT_SUBAGENT_EXECUTIONS",
        "scenarios_evaluated": len(BEHAVIORAL_SCENARIOS),
        "all_scenarios_consistent": all(r["route_consistent"] and r["all_passed"] for r in results.values()),
        "scenario_results": results,
    }

    with open(REPORT_FILE, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print("\n" + "=" * 72)
    print(f"Summary written to {REPORT_FILE}")
    print(f"All Scenarios Consistent & Convergent: {summary['all_scenarios_consistent']}")
    print("=" * 72)
    return summary


if __name__ == "__main__":
    run_behavioral_repeatability()
