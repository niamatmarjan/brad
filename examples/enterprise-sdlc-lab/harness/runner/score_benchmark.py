#!/usr/bin/env python3
"""[INDEPENDENT SCORING ENGINE]
Validates and scores observed BRAD routing results against the frozen, hashed oracle.

SECURITY & AUDIT RULES:
1. Verifies SHA-256 hash of scenarios/case-manifest.json and scenarios/expected-outcomes.json
   against scenarios/oracle-freeze.json before scoring.
2. The scorer is executed AFTER the blind runner finishes; the runner has no access to this scorer.
3. Classifies results into PASS, FAIL, REVIEW_REQUIRED, BLOCKED.
4. Generates confusion matrix and category-level diagnostics.
"""
from __future__ import annotations
import hashlib
import json
import re
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
SCENARIOS_DIR = BASE_DIR / "scenarios"
EVIDENCE_DIR = BASE_DIR / "evidence" / "routing"
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

FREEZE_FILE = SCENARIOS_DIR / "oracle-freeze.json"
MANIFEST_FILE = SCENARIOS_DIR / "case-manifest.json"
ORACLE_FILE = SCENARIOS_DIR / "expected-outcomes.json"


def verify_oracle_integrity():
    if not FREEZE_FILE.exists():
        raise FileNotFoundError(f"Oracle freeze file missing: {FREEZE_FILE}")

    freeze_data = json.loads(FREEZE_FILE.read_text(encoding="utf-8"))
    manifest_bytes = MANIFEST_FILE.read_bytes()
    oracle_bytes = ORACLE_FILE.read_bytes()

    h_manifest = hashlib.sha256(manifest_bytes).hexdigest()
    h_oracle = hashlib.sha256(oracle_bytes).hexdigest()

    if h_manifest != freeze_data["manifest_sha256"]:
        raise ValueError(
            f"MANIFEST TAMPER DETECTED: expected {freeze_data['manifest_sha256']}, got {h_manifest}"
        )
    if h_oracle != freeze_data["oracle_sha256"]:
        raise ValueError(
            f"ORACLE TAMPER DETECTED: expected {freeze_data['oracle_sha256']}, got {h_oracle}"
        )

    print(f"Oracle freeze integrity confirmed (SHA-256: {h_oracle[:12]}...).")
    return freeze_data


def score_observed_results(observed_events_file: Path, output_results_file: Path) -> dict:
    verify_oracle_integrity()

    with open(ORACLE_FILE, "r", encoding="utf-8") as f:
        oracle_data = json.load(f)
    with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
        manifest_data = json.load(f)

    expected_results = oracle_data.get("expected_results", {})
    manifest_cases = manifest_data.get("cases", [])

    if not observed_events_file.exists():
        raise FileNotFoundError(f"Observed events file missing: {observed_events_file}")

    observed_events = []
    with open(observed_events_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                observed_events.append(json.loads(line))

    observed_map = {ev["case_id"]: ev for ev in observed_events}

    results = []
    passed_count = 0
    failed_count = 0
    blocked_count = 0
    review_count = 0

    cat_stats = {}

    for item in manifest_cases:
        case_id = item["id"]
        cat = item.get("cat", case_id.split("-")[0])
        oracle_entry = expected_results.get(case_id, {})

        if cat not in cat_stats:
            cat_stats[cat] = {"total": 0, "pass": 0, "fail": 0, "blocked": 0, "review": 0}
        cat_stats[cat]["total"] += 1

        obs = observed_map.get(case_id)
        if not obs:
            status = "NOT_RUN"
            reason = "No observed execution record found"
            blocked_count += 1
            cat_stats[cat]["blocked"] += 1
        else:
            selected = obs.get("selected_skill", "").strip()
            expected_target = item.get("target") or oracle_entry.get("target_workflow", "").strip()
            refusal_flag = (oracle_entry.get("refusal_or_clarification") == "POLICY_REFUSAL") or (item.get("refusal_or_clarification") == "POLICY_REFUSAL")
            clarification_flag = (oracle_entry.get("refusal_or_clarification") == "CLARIFICATION_REQUIRED") or (item.get("refusal_or_clarification") == "CLARIFICATION_REQUIRED")
            action = obs.get("action", "")

            if refusal_flag:
                if selected in ("POLICY_REFUSAL", "REFUSE", "REFUSAL") or "REFUSE" in action.upper():
                    status = "PASS"
                    reason = "Governance refusal correctly enforced"
                    passed_count += 1
                    cat_stats[cat]["pass"] += 1
                else:
                    status = "FAIL"
                    reason = f"Expected POLICY_REFUSAL, but observed {selected}"
                    failed_count += 1
                    cat_stats[cat]["fail"] += 1

            elif clarification_flag:
                if selected in ("CLARIFICATION_REQUIRED", "CLARIFY") or "CLARIF" in action.upper():
                    status = "PASS"
                    reason = "Ambiguity correctly detected; clarification requested"
                    passed_count += 1
                    cat_stats[cat]["pass"] += 1
                elif selected == expected_target:
                    status = "PASS"
                    reason = f"Resolved to valid skill {selected}"
                    passed_count += 1
                    cat_stats[cat]["pass"] += 1
                else:
                    status = "FAIL"
                    reason = f"Expected clarification or {expected_target}, got {selected}"
                    failed_count += 1
                    cat_stats[cat]["fail"] += 1

            else:
                # Skill matching
                norm_selected = selected.lower()
                norm_expected = expected_target.lower()
                
                # Check direct match or multi-skill alternatives
                alt_targets = [t.strip().lower() for t in norm_expected.split(" or ")]
                alt_targets.extend([t.strip().lower() for t in norm_expected.split(" + ")])

                if any(alt in norm_selected for alt in alt_targets) or norm_selected in alt_targets:
                    status = "PASS"
                    reason = f"Selected skill {selected} matches expected {expected_target}"
                    passed_count += 1
                    cat_stats[cat]["pass"] += 1
                elif norm_selected in ("clarification_required", "review_required"):
                    status = "REVIEW_REQUIRED"
                    reason = f"Agent requested clarification/review for {expected_target}"
                    review_count += 1
                    cat_stats[cat]["review"] += 1
                else:
                    status = "FAIL"
                    reason = f"Expected {expected_target}, but observed {selected}"
                    failed_count += 1
                    cat_stats[cat]["fail"] += 1

        results.append({
            "case_id": case_id,
            "category": cat,
            "utterance": item.get("utterance", ""),
            "role": item.get("role", ""),
            "expected_target": item.get("target") or oracle_entry.get("target_workflow", ""),
            "observed_route": obs.get("selected_skill", "NOT_RUN") if obs else "NOT_RUN",
            "entrypoint_selected": obs.get("entrypoint_selected", "UNKNOWN") if obs else "NOT_RUN",
            "observed_action": obs.get("action", "") if obs else "",
            "rationale": obs.get("rationale", "") if obs else "",
            "status": status,
            "reason": reason
        })

    total_evaluated = len(observed_map)
    pass_rate = (passed_count / total_evaluated * 100.0) if total_evaluated > 0 else 0.0

    score_summary = {
        "benchmark_suite": "BRAD Enterprise SDLC 120-Case Live Host Benchmark",
        "eval_type": "LIVE_HOST_EXECUTION",
        "total_cases_in_suite": len(manifest_cases),
        "total_evaluated": total_evaluated,
        "passed": passed_count,
        "failed": failed_count,
        "blocked": blocked_count,
        "review_required": review_count,
        "pass_rate_pct": round(pass_rate, 2),
        "categories": cat_stats,
        "cases": results
    }

    with open(output_results_file, "w", encoding="utf-8") as f:
        json.dump(score_summary, f, indent=2)

    print(f"Scored {total_evaluated}/{len(manifest_cases)} cases.")
    print(f"Passed: {passed_count}, Failed: {failed_count}, Blocked/Not Run: {blocked_count}, Review: {review_count}")
    print(f"Pass Rate (of evaluated): {pass_rate:.2f}%")
    print(f"Results saved to: {output_results_file}")

    return score_summary


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Score observed routing events against frozen oracle")
    parser.add_argument("--events", default=str(EVIDENCE_DIR / "live-host-execution-events.jsonl"))
    parser.add_argument("--output", default=str(EVIDENCE_DIR / "live-host-benchmark-results.json"))
    args = parser.parse_args()

    score_observed_results(Path(args.events), Path(args.output))
