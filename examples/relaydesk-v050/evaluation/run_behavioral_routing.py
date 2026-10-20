#!/usr/bin/env python3
"""
Behavioral routing evaluation runner for 25 high-priority canonical BRAD scenarios (Audited).
Evaluates intent classification, boundary checks, and L1-L5 levels based on empirical evidence.
STRICT AUDIT RULES:
- Never copies expected answers into observed selections.
- Requires independently captured model selections with execution IDs and evidence paths.
- Unobserved scenarios are marked NOT_RUN.
- Hardcoded Windows paths replaced with repository-relative paths and CLI options.
"""

from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path

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
        expected = c["expected_route"]
        req = c["user_request"]
        critical = c["critical_behavior"]
        expect_block = c.get("clarification_or_block_expected", False)

        # L1: Specification schema validity
        l1 = "PASS" if req and expected else "FAIL"

        if cid in observed_map:
            obs = observed_map[cid]
            selected = obs["observed_selection"]
            execution_id = obs["execution_id"]
            evidence_path = obs["evidence_path"]
            trace = obs["execution_trace"]
            status_l3 = obs["selection_status"]
            note = f"Observed via {execution_id}: {trace}"
            l2 = "PASS"
            l4 = obs["native_invocation"]["status"]
            l5 = obs["outcome"]["status"]
            l4_blocker = obs["native_invocation"]["reason"]
            l5_status = obs["outcome"]["reason"]
        else:
            # Unobserved case: strictly NOT_RUN
            selected = None
            execution_id = None
            evidence_path = None
            trace = "Scenario was not executed in this demonstration run."
            status_l3 = "NOT_RUN"
            note = "No independent model observation recorded."
            l2 = "NOT_RUN"
            l4 = "NOT_RUN"
            l5 = "NOT_RUN"
            l4_blocker = "No execution attempted."
            l5_status = "No execution trace recorded."

        results.append({
            "id": cid,
            "fixture": c.get("fixture"),
            "user_request": req,
            "expected_route": expected,
            "selected_route": selected,
            "execution_id": execution_id,
            "evidence_path": evidence_path,
            "critical_behavior": critical,
            "clarification_or_block_expected": expect_block,
            "l3_status": status_l3,
            "l3_note": note,
            "levels": {
                "L1_contract": l1,
                "L2_target_resolve": l2,
                "L3_route_selection": status_l3,
                "L4_native_invocation": l4,
                "L5_verified_outcome": l5
            },
            "evidence": {
                "host_bmad_detected": False,
                "l4_blocker": l4_blocker,
                "l5_status": l5_status
            }
        })

    summary = {
        "total_evaluated": len(results),
        "empirically_observed": sum(1 for r in results if r["execution_id"] is not None),
        "unobserved_not_run": sum(1 for r in results if r["execution_id"] is None),
        "l1_contract_pass": sum(1 for r in results if r["levels"]["L1_contract"] == "PASS"),
        "l2_target_resolve_pass": sum(1 for r in results if r["levels"]["L2_target_resolve"] == "PASS"),
        "l3_route_selection_pass": sum(1 for r in results if r["levels"]["L3_route_selection"] == "PASS"),
        "l3_route_selection_review_required": sum(1 for r in results if r["levels"]["L3_route_selection"] == "REVIEW_REQUIRED"),
        "l3_route_selection_not_run": sum(1 for r in results if r["levels"]["L3_route_selection"] == "NOT_RUN"),
        "l4_native_invocation_blocked": sum(1 for r in results if r["levels"]["L4_native_invocation"] == "BLOCKED"),
        "l4_native_invocation_not_run": sum(1 for r in results if r["levels"]["L4_native_invocation"] == "NOT_RUN"),
        "l5_verified_not_run": sum(1 for r in results if r["levels"]["L5_verified_outcome"] == "NOT_RUN")
    }

    output = {
        "suite": "BRAD 25 High-Priority Behavioral Routing Scenarios (Audited)",
        "brad_baseline_version": "0.5.0",
        "summary": summary,
        "cases": results
    }

    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print(f"Evaluated {len(results)} high-priority scenarios: Observed={summary['empirically_observed']}, NOT_RUN={summary['unobserved_not_run']}")

if __name__ == "__main__":
    main()
