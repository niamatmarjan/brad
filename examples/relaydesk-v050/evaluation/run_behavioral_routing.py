#!/usr/bin/env python3
"""
Behavioral routing evaluation runner for 25 high-priority canonical BRAD scenarios (Audited & Evaluator-Backed).
Evaluates intent classification, boundary checks, and L1-L5 levels based on empirical evidence.
STRICT AUDIT RULES:
- Never copies expected answers into observed selections.
- Evaluates model selections through evaluator.py (validating ticket ID, read-only constraints, raw model trace).
- Never trusts manually supplied selection_status.
- Unobserved scenarios are strictly marked NOT_RUN.
- Hardcoded Windows paths replaced with repository-relative paths and CLI options.
- Enforces 100% mathematical consistency between case records and summary statistics.
"""

from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path

# Add script directory to sys.path to import evaluator
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from evaluator import validate_scenario_observation, validate_suite_consistency, ValidationError

HIGH_PRIORITY_IDS = [
    "V6-01", "V6-02", "V6-03", "V6-06", "V6-08", "V6-09", "V6-10",
    "V7-02", "V7-03", "V7-09", "V7-10",
    "QA-01", "QA-02", "QA-04", "QA-08", "QA-09", "QA-10", "QA-12",
    "PLAN-01", "PLAN-02",
    "EDGE-01", "EDGE-02", "EDGE-05", "EDGE-06", "EDGE-08"
]

def find_repo_root() -> Path:
    current = Path(__file__).resolve().parent
    for p in [current] + list(current.parents):
        if (p / "skills" / "brad" / "evals" / "routing-cases.json").is_file():
            return p
    return current.parents[2]

def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    repo_default = find_repo_root()
    parser.add_argument("--brad-root", type=Path, default=repo_default,
                        help=f"BRAD repository root (default: {repo_default})")
    parser.add_argument("--cases-file", type=Path, default=None,
                        help="Path to canonical routing-cases.json")
    parser.add_argument("--evidence-file", type=Path, default=None,
                        help="Path to observed-routing-evidence.json")
    parser.add_argument("--out-file", type=Path, default=None,
                        help="Output path for behavioral-routing-25.json")
    return parser.parse_args()

def main():
    args = parse_args()
    repo_root = args.brad_root
    cases_file = args.cases_file or (repo_root / "skills" / "brad" / "evals" / "routing-cases.json")
    script_dir = Path(__file__).resolve().parent
    evidence_file = args.evidence_file or (script_dir / "observed-routing-evidence.json")
    out_file = args.out_file or (script_dir / "behavioral-routing-25.json")

    if not cases_file.is_file():
        print(f"ERROR: Cannot find cases file at {cases_file}", file=sys.stderr)
        sys.exit(1)

    if not evidence_file.is_file():
        print(f"ERROR: Cannot find evidence file at {evidence_file}", file=sys.stderr)
        sys.exit(1)

    with open(cases_file, "r", encoding="utf-8") as f:
        cases_data = json.load(f)
    case_map = {c["id"]: c for c in cases_data.get("cases", [])}

    with open(evidence_file, "r", encoding="utf-8") as f:
        evidence_data = json.load(f)
    observed_map = {item["id"]: item for item in evidence_data.get("observed_cases", [])}

    results = []
    for cid in HIGH_PRIORITY_IDS:
        if cid not in case_map:
            continue
        c = case_map[cid]
        obs = observed_map.get(cid)
        eval_result = validate_scenario_observation(c, obs, base_dir=repo_root)

        execution_id = eval_result["execution_id"]
        trace = obs.get("execution_trace", "Scenario was not executed in this demonstration run.") if obs else "Scenario was not executed in this demonstration run."
        status_l3 = eval_result["levels"]["L3_route_selection"]
        note = f"Observed via {execution_id}: {trace}" if execution_id else "No independent model observation recorded."
        l4_blocker = obs.get("native_invocation", {}).get("reason", "No execution attempted.") if obs else "No execution attempted."
        l5_status = obs.get("outcome", {}).get("reason", "No execution trace recorded.") if obs else "No execution trace recorded."

        results.append({
            "id": cid,
            "fixture": c.get("fixture"),
            "user_request": c.get("user_request"),
            "expected_route": c.get("expected_route"),
            "selected_route": eval_result["selected_route"],
            "execution_id": execution_id,
            "trace_source": eval_result["trace_source"],
            "evidence_path": obs.get("evidence_path") if obs else None,
            "critical_behavior": c.get("critical_behavior"),
            "clarification_or_block_expected": c.get("clarification_or_block_expected", False),
            "l3_status": status_l3,
            "l3_note": note,
            "levels": eval_result["levels"],
            "evidence": {
                "host_bmad_detected": False,
                "l4_blocker": l4_blocker,
                "l5_status": l5_status
            }
        })

    total = len(results)
    observed_count = sum(1 for r in results if r["execution_id"] is not None)
    l1_pass = sum(1 for r in results if r["levels"]["L1_contract"] == "PASS")
    l2_pass = sum(1 for r in results if r["levels"]["L2_target_resolve"] == "PASS")
    l2_not_run = sum(1 for r in results if r["levels"]["L2_target_resolve"] == "NOT_RUN")
    l3_pass = sum(1 for r in results if r["levels"]["L3_route_selection"] == "PASS")
    l3_fail = sum(1 for r in results if r["levels"]["L3_route_selection"] == "FAIL")
    l3_review = sum(1 for r in results if r["levels"]["L3_route_selection"] == "REVIEW_REQUIRED")
    l3_not_run = sum(1 for r in results if r["levels"]["L3_route_selection"] == "NOT_RUN")
    l3_unverified = sum(1 for r in results if r["levels"]["L3_route_selection"] == "UNVERIFIED")
    l4_blocked = sum(1 for r in results if r["levels"]["L4_native_invocation"] == "BLOCKED")
    l4_not_run = sum(1 for r in results if r["levels"]["L4_native_invocation"] == "NOT_RUN")
    l5_not_run = sum(1 for r in results if r["levels"]["L5_verified_outcome"] == "NOT_RUN")

    summary = {
        "total_cases": total,
        "empirically_observed": observed_count,
        "unobserved_not_run": total - observed_count,
        "l1_contract_schema_pass": l1_pass,
        "l2_target_resolve_pass": l2_pass,
        "l2_target_resolve_not_run": l2_not_run,
        "l3_route_selection_pass": l3_pass,
        "l3_route_selection_fail": l3_fail,
        "l3_route_selection_review_required": l3_review,
        "l3_route_selection_not_run": l3_not_run,
        "l3_route_selection_unverified": l3_unverified,
        "l4_native_invocation_pass": 0,
        "l4_native_invocation_blocked": l4_blocked,
        "l4_native_invocation_not_run": l4_not_run,
        "l5_verified_outcome_pass": 0,
        "l5_verified_outcome_not_run": l5_not_run,
        "audit_policy": "Strict empirical evidence only. Backed by evaluator.py validation rules."
    }

    validate_suite_consistency(results, summary)

    output = {
        "suite": "BRAD 25 High-Priority Behavioral Routing Scenarios (Audited)",
        "brad_baseline_version": "0.5.0",
        "summary": summary,
        "cases": results
    }

    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print(f"Evaluated {len(results)} high-priority scenarios: Observed={summary['empirically_observed']}, L3 PASS={l3_pass}, NOT_RUN={summary['unobserved_not_run']}")

if __name__ == "__main__":
    main()
