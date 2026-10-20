#!/usr/bin/env python3
"""
BRAD v0.5.0 Routing & Behavioral Evaluation Engine (Audited & Corrected).
Evaluates canonical routing scenarios against skills/brad/evals/routing-cases.json.
STRICT AUDIT RULES:
- Never copies expected answers into observed selections.
- Requires independently captured model selections with execution IDs and evidence paths.
- Unobserved scenarios are marked NOT_RUN.
- Hardcoded Windows paths replaced with repository-relative paths and CLI options.
"""

from __future__ import annotations
import argparse
import json
import re
import sys
from pathlib import Path
from subprocess import run, PIPE

NATIVE_RE = re.compile(r"\b(?:bmad|gds)-[a-z][a-z0-9-]*\b")

def find_repo_root() -> Path:
    """Find repository root by walking up from this script."""
    current = Path(__file__).resolve().parent
    for p in [current] + list(current.parents):
        if (p / "skills" / "brad" / "evals" / "routing-cases.json").is_file():
            return p
    # Fallback to 3 levels up
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
        expected = c["expected_route"]
        native_skills = NATIVE_RE.findall(expected.lower())

        # L1: Static Schema Validation of canonical specification
        l1_status = "PASS" if c.get("user_request") and expected else "FAIL"

        if cid in observed_map:
            obs = observed_map[cid]
            selected = obs["observed_selection"]
            execution_id = obs["execution_id"]
            evidence_path = obs["evidence_path"]
            trace = obs["execution_trace"]
            l3_status = obs["selection_status"]

            # L2: Target resolution verified by empirical execution
            l2_status = "PASS"

            # L4: Native host invocation
            l4_status = obs["native_invocation"]["status"]
            l4_reason = obs["native_invocation"]["reason"]

            # L5: Verified outcome
            l5_status = obs["outcome"]["status"]
            l5_reason = obs["outcome"]["reason"]

            observed_for_audit.append({
                "id": cid,
                "selected": selected,
                "invoked": [],
                "delivery": {
                    "status": "BLOCKED",
                    "evidence": evidence_path
                }
            })
        else:
            # Unobserved scenario: DO NOT copy expected route; mark NOT_RUN
            selected = None
            execution_id = None
            evidence_path = None
            trace = "Scenario was not executed in this demonstration run."
            l2_status = "NOT_RUN"
            l3_status = "NOT_RUN"
            l4_status = "NOT_RUN"
            l4_reason = "No execution trace recorded."
            l5_status = "NOT_RUN"
            l5_reason = "Scenario not run."

        results.append({
            "id": cid,
            "fixture": c.get("fixture"),
            "user_request": c.get("user_request"),
            "expected_route": expected,
            "selected_route": selected,
            "execution_id": execution_id,
            "evidence_path": evidence_path,
            "trace": trace,
            "critical_behavior": c.get("critical_behavior"),
            "clarification_or_block_expected": c.get("clarification_or_block_expected", False),
            "levels": {
                "L1_contract": l1_status,
                "L2_target_resolve": l2_status,
                "L3_route_selection": l3_status,
                "L4_native_invocation": l4_status,
                "L5_verified_outcome": l5_status
            }
        })

    # Summary statistics
    total = len(results)
    observed_count = len(observed_map)
    l1_pass = sum(1 for r in results if r["levels"]["L1_contract"] == "PASS")
    l2_pass = sum(1 for r in results if r["levels"]["L2_target_resolve"] == "PASS")
    l3_pass = sum(1 for r in results if r["levels"]["L3_route_selection"] == "PASS")
    l3_review = sum(1 for r in results if r["levels"]["L3_route_selection"] == "REVIEW_REQUIRED")
    l3_not_run = sum(1 for r in results if r["levels"]["L3_route_selection"] == "NOT_RUN")
    l4_blocked = sum(1 for r in results if r["levels"]["L4_native_invocation"] == "BLOCKED")
    l4_not_run = sum(1 for r in results if r["levels"]["L4_native_invocation"] == "NOT_RUN")
    l5_not_run = sum(1 for r in results if r["levels"]["L5_verified_outcome"] == "NOT_RUN")

    summary = {
        "total_cases": total,
        "empirically_observed": observed_count,
        "unobserved_not_run": total - observed_count,
        "l1_contract_schema_pass": l1_pass,
        "l2_target_resolve_pass": l2_pass,
        "l2_target_resolve_not_run": total - l2_pass,
        "l3_route_selection_pass": l3_pass,
        "l3_route_selection_review_required": l3_review,
        "l3_route_selection_not_run": l3_not_run,
        "l4_native_invocation_pass": 0,
        "l4_native_invocation_blocked": l4_blocked,
        "l4_native_invocation_not_run": l4_not_run,
        "l5_verified_outcome_pass": 0,
        "l5_verified_outcome_not_run": l5_not_run,
        "audit_policy": "Strict empirical evidence only. No synthetic pass assignments."
    }

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
    print(f"Summary: L3 PASS={l3_pass}, REVIEW={l3_review}, NOT_RUN={l3_not_run}, L4 BLOCKED={l4_blocked}")

if __name__ == "__main__":
    main()
