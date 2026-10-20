#!/usr/bin/env python3
"""
BRAD v0.5.0 Routing & Behavioral Evaluation Engine (Audited & Evaluator-Backed).
Evaluates canonical routing scenarios against skills/brad/evals/routing-cases.json.
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

def find_repo_root() -> Path:
    """Find repository root by walking up from this script."""
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
    parser.add_argument("--out-dir", type=Path, default=None,
                        help="Output directory for generated evaluation artifacts")
    return parser.parse_args()

def main():
    args = parse_args()
    repo_root = args.brad_root
    cases_file = args.cases_file or (repo_root / "skills" / "brad" / "evals" / "routing-cases.json")
    script_dir = Path(__file__).resolve().parent
    out_dir = args.out_dir or script_dir
    evidence_file = args.evidence_file or (script_dir / "observed-routing-evidence.json")

    if not cases_file.is_file():
        print(f"ERROR: Cannot find cases file at {cases_file}", file=sys.stderr)
        sys.exit(1)

    if not evidence_file.is_file():
        print(f"ERROR: Cannot find evidence file at {evidence_file}", file=sys.stderr)
        sys.exit(1)

    with open(cases_file, "r", encoding="utf-8") as f:
        cases_data = json.load(f)
    cases = cases_data["cases"]

    with open(evidence_file, "r", encoding="utf-8") as f:
        evidence_data = json.load(f)
    observed_map = {item["id"]: item for item in evidence_data.get("observed_cases", [])}

    results = []
    observed_for_audit = []

    for c in cases:
        cid = c["id"]
        obs = observed_map.get(cid)
        eval_result = validate_scenario_observation(c, obs, base_dir=repo_root)

        trace = obs.get("execution_trace", "Scenario was not executed in this demonstration run.") if obs else "Scenario was not executed in this demonstration run."

        case_entry = {
            "id": cid,
            "fixture": c.get("fixture"),
            "user_request": c.get("user_request"),
            "expected_route": c.get("expected_route"),
            "selected_route": eval_result["selected_route"],
            "execution_id": eval_result["execution_id"],
            "trace_source": eval_result["trace_source"],
            "evidence_path": obs.get("evidence_path") if obs else None,
            "trace": trace,
            "evaluation_reason": eval_result["reason"],
            "critical_behavior": c.get("critical_behavior"),
            "clarification_or_block_expected": c.get("clarification_or_block_expected", False),
            "levels": eval_result["levels"]
        }
        results.append(case_entry)

        if obs is not None:
            observed_for_audit.append({
                "id": cid,
                "selected": eval_result["selected_route"],
                "invoked": [],
                "delivery": {
                    "status": "BLOCKED",
                    "evidence": obs.get("evidence_path")
                }
            })

    total = len(results)
    observed_count = len(observed_map)
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

    # Verify summary consistency
    validate_suite_consistency(results, summary)

    output_data = {
        "suite": "Canonical BRAD Routing Evaluation (Audited)",
        "brad_baseline_version": "0.5.0",
        "summary": summary,
        "cases": results
    }

    out_results_file = out_dir / "routing-results.json"
    with open(out_results_file, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2)

    out_audit_file = out_dir / "observed-for-audit.json"
    with open(out_audit_file, "w", encoding="utf-8") as f:
        json.dump(observed_for_audit, f, indent=2)

    print(f"Wrote {out_results_file} with {observed_count} observed cases and {total - observed_count} NOT_RUN cases.")
    print(f"Summary: L3 PASS={l3_pass}, FAIL={l3_fail}, REVIEW={l3_review}, NOT_RUN={l3_not_run}, L4 BLOCKED={l4_blocked}")

if __name__ == "__main__":
    main()
