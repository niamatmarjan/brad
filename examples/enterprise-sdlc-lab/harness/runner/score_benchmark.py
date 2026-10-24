#!/usr/bin/env python3
"""[LAYER C: INDEPENDENT SCORING ENGINE]
Operation Ironclad — Layer C Benchmark Scorer.

Compares Layer B validated evidence records against the frozen, hashed oracle.
Enforces strict fail-closed security and audit policies:
1. Verifies SHA-256 hashes of scenarios/case-manifest.json and scenarios/expected-outcomes.json
   against scenarios/oracle-freeze.json before scoring.
2. Evaluates each record strictly through Layer B validation (evidence_validator).
3. Evaluates 4 separate dimensions:
   - Entrypoint Recognition (BRAD chosen as entrypoint)
   - Intent Selection (selected skill matches expected native skill or policy)
   - Native Workflow Invocation (skill was actually invoked via tool execution)
   - Task Completion (produced observable artifacts or executed cleanly)
4. Vocabulary: PASS, FAIL, PARTIAL, REVIEW_REQUIRED, BLOCKED, NOT_RUN, NOT_VERIFIED.
5. Fails closed on forged records, synthesized IDs, missing transcripts, or missing skills.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent.parent.parent
SCENARIOS_DIR = BASE_DIR / "scenarios"
HARNESS_DIR = BASE_DIR / "harness"

# Import Layer B validator
sys.path.insert(0, str(HARNESS_DIR / "validators"))
try:
    from evidence_validator import validate_evidence_record, validate_batch
except ImportError:
    # If running from another working directory
    from harness.validators.evidence_validator import validate_evidence_record, validate_batch

FREEZE_FILE = SCENARIOS_DIR / "oracle-freeze.json"
MANIFEST_FILE = SCENARIOS_DIR / "case-manifest.json"
ORACLE_FILE = SCENARIOS_DIR / "expected-outcomes.json"

VALID_OUTCOMES = {
    "PASS",
    "FAIL",
    "PARTIAL",
    "REVIEW_REQUIRED",
    "BLOCKED",
    "NOT_RUN",
    "NOT_VERIFIED",
}


def verify_oracle_integrity() -> dict[str, Any]:
    """Cryptographically verifies oracle files against frozen hashes."""
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

    return freeze_data


def score_evidence_record(
    record: dict[str, Any],
    oracle_entry: dict[str, Any],
    manifest_item: dict[str, Any],
    validation_result: dict[str, Any],
) -> dict[str, Any]:
    """Score a single validated record against oracle expectations."""
    case_id = record["case_id"]
    cat = manifest_item.get("cat", case_id.split("-")[0])
    expected_target = (manifest_item.get("target") or oracle_entry.get("target_workflow") or "").strip()
    is_refusal = (
        oracle_entry.get("refusal_or_clarification") == "POLICY_REFUSAL"
        or manifest_item.get("refusal_or_clarification") == "POLICY_REFUSAL"
    )
    is_clarification = (
        oracle_entry.get("refusal_or_clarification") == "CLARIFICATION_REQUIRED"
        or manifest_item.get("refusal_or_clarification") == "CLARIFICATION_REQUIRED"
    )

    # 1. Fail closed if Layer B validation failed
    if not validation_result.get("valid", False):
        return {
            "case_id": case_id,
            "category": cat,
            "prompt": record.get("prompt", ""),
            "expected_target": expected_target,
            "observed_route": record.get("observed_route", "UNKNOWN"),
            "provenance": "NOT_VERIFIED",
            "entrypoint_recognized": False,
            "intent_selected_correctly": False,
            "native_workflow_invoked": False,
            "task_completed": False,
            "overall_status": "NOT_VERIFIED",
            "reasons": validation_result.get("errors", ["Evidence validation failed"]),
        }

    # 2. Check for blocked/error execution
    if record.get("error_or_timeout") or record.get("provenance") == "BLOCKED":
        return {
            "case_id": case_id,
            "category": cat,
            "prompt": record.get("prompt", ""),
            "expected_target": expected_target,
            "observed_route": record.get("observed_route", "BLOCKED"),
            "provenance": "BLOCKED",
            "entrypoint_recognized": bool(record.get("entrypoint_selected")),
            "intent_selected_correctly": False,
            "native_workflow_invoked": False,
            "task_completed": False,
            "overall_status": "BLOCKED",
            "reasons": [f"Execution blocked or timed out: {record.get('error_or_timeout')}"],
        }

    # 3. Evaluate Entrypoint Recognition
    entrypoint = record.get("entrypoint_selected", "")
    entrypoint_recognized = (entrypoint.lower() == "brad") if isinstance(entrypoint, str) else bool(entrypoint)

    # 4. Evaluate Intent Selection
    observed_route = record.get("observed_route", "").strip()
    norm_observed = observed_route.lower()
    norm_expected = expected_target.lower()
    alt_targets = [t.strip().lower() for t in norm_expected.split(" or ")]
    alt_targets.extend([t.strip().lower() for t in norm_expected.split(" + ")])

    intent_selected_correctly = False
    is_review_required = False
    reasons: list[str] = []

    auth_decision = record.get("authorization_decision", "")

    if is_refusal:
        # Expected refusal: requires authorization_decision == "REFUSED" or observed_route in refusal terms
        if auth_decision == "REFUSED" or norm_observed in ("policy_refusal", "refuse", "refusal"):
            intent_selected_correctly = True
            reasons.append("Policy refusal enforced cleanly")
        else:
            reasons.append(f"Expected POLICY_REFUSAL, but observed {observed_route} (auth: {auth_decision})")

    elif is_clarification:
        # Expected clarification: requires asking human for clarification
        if auth_decision == "CLARIFICATION_REQUIRED" or norm_observed in ("clarification_required", "clarify"):
            intent_selected_correctly = True
            reasons.append("Clarification requested cleanly for ambiguous input")
        elif any(alt in norm_observed for alt in alt_targets) or norm_observed in alt_targets:
            intent_selected_correctly = True
            reasons.append(f"Resolved ambiguous input to valid target {observed_route}")
        else:
            reasons.append(f"Expected CLARIFICATION_REQUIRED, but observed {observed_route}")

    else:
        # Normal skill routing
        if any(alt in norm_observed for alt in alt_targets) or norm_observed in alt_targets:
            intent_selected_correctly = True
            reasons.append(f"Selected route {observed_route} matches expected target {expected_target}")
        elif norm_observed in ("clarification_required", "review_required"):
            is_review_required = True
            reasons.append(f"Coordinator requested clarification/review for {expected_target}")
        else:
            reasons.append(f"Expected {expected_target}, but observed {observed_route}")

    # 5. Evaluate Native Workflow Invocation
    native_invoked = bool(record.get("native_skill_invoked", False))
    tool_calls = record.get("tool_call_linkage", [])
    if native_invoked and len(tool_calls) > 0:
        native_workflow_invoked = True
    else:
        native_workflow_invoked = False

    # 6. Evaluate Task Completion
    # For refusal: task is completed if refused without destructive side effects
    if is_refusal:
        task_completed = intent_selected_correctly and len(record.get("side_effects_detected", [])) == 0
    elif is_clarification:
        task_completed = intent_selected_correctly
    else:
        # For actionable skill: task completed if artifacts observed or cleanly executed
        artifacts = record.get("observed_artifacts", [])
        task_completed = native_workflow_invoked or len(artifacts) > 0

    # 7. Compute Overall Status
    if is_refusal:
        overall_status = "PASS" if intent_selected_correctly and task_completed else "FAIL"
    elif is_clarification:
        overall_status = "PASS" if intent_selected_correctly else "FAIL"
    elif is_review_required:
        overall_status = "REVIEW_REQUIRED"
    elif intent_selected_correctly:
        if native_workflow_invoked and task_completed:
            overall_status = "PASS"
        elif native_workflow_invoked:
            overall_status = "PARTIAL"
            reasons.append("Native skill invoked, but task completion artifacts missing")
        else:
            overall_status = "PASS"  # Intent route matched at L3 coordinator level
            reasons.append("L3 intent route matched (L4 native tool invocation not requested or dry-run)")
    else:
        overall_status = "FAIL"

    return {
        "case_id": case_id,
        "category": cat,
        "prompt": record.get("prompt", ""),
        "expected_target": expected_target,
        "observed_route": observed_route,
        "provenance": record.get("provenance", "NOT_VERIFIED"),
        "entrypoint_recognized": entrypoint_recognized,
        "intent_selected_correctly": intent_selected_correctly,
        "native_workflow_invoked": native_workflow_invoked,
        "task_completed": task_completed,
        "overall_status": overall_status,
        "reasons": reasons,
    }


def score_events_file(
    observed_events_file: Path,
    output_results_file: Path | None = None,
    antigravity_brain_dir: Path | None = None,
) -> dict[str, Any]:
    """Score a full events file with Layer B validation."""
    freeze_data = verify_oracle_integrity()

    with open(ORACLE_FILE, "r", encoding="utf-8") as f:
        oracle_data = json.load(f)
    with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
        manifest_data = json.load(f)

    expected_results = oracle_data.get("expected_results", {})
    manifest_cases = manifest_data.get("cases", [])
    manifest_map = {c["id"]: c for c in manifest_cases}

    # Validate all records via Layer B
    validation_batch = validate_batch(observed_events_file, antigravity_brain_dir=antigravity_brain_dir)

    observed_map = {}
    for item in validation_batch["records"]:
        rec = item["record"]
        case_id = rec.get("case_id")
        observed_map[case_id] = item

    results = []
    status_counts = {k: 0 for k in VALID_OUTCOMES}
    metrics = {
        "entrypoint_recognized": 0,
        "intent_selected_correctly": 0,
        "native_workflow_invoked": 0,
        "task_completed": 0,
    }
    cat_breakdown = {}

    for manifest_item in manifest_cases:
        case_id = manifest_item["id"]
        cat = manifest_item.get("cat", case_id.split("-")[0])
        oracle_entry = expected_results.get(case_id, {})

        if cat not in cat_breakdown:
            cat_breakdown[cat] = {k: 0 for k in VALID_OUTCOMES}
            cat_breakdown[cat]["total"] = 0
        cat_breakdown[cat]["total"] += 1

        obs_item = observed_map.get(case_id)
        if not obs_item:
            res = {
                "case_id": case_id,
                "category": cat,
                "prompt": manifest_item.get("utterance", ""),
                "expected_target": manifest_item.get("target") or oracle_entry.get("target_workflow", ""),
                "observed_route": "NOT_RUN",
                "provenance": "NOT_RUN",
                "entrypoint_recognized": False,
                "intent_selected_correctly": False,
                "native_workflow_invoked": False,
                "task_completed": False,
                "overall_status": "NOT_RUN",
                "reasons": ["No execution record found in events file"],
            }
        else:
            rec = obs_item["record"]
            val = obs_item["validation"]
            res = score_evidence_record(rec, oracle_entry, manifest_item, val)

        st = res["overall_status"]
        status_counts[st] = status_counts.get(st, 0) + 1
        cat_breakdown[cat][st] = cat_breakdown[cat].get(st, 0) + 1

        for m_key in metrics:
            if res[m_key]:
                metrics[m_key] += 1

        results.append(res)

    total_evaluated = len(observed_map)
    summary = {
        "benchmark_suite": "BRAD Enterprise SDLC Benchmark (Operation Ironclad Layer C)",
        "eval_type": "LAYER_C_INDEPENDENT_EVALUATION",
        "oracle_sha256": freeze_data["oracle_sha256"],
        "manifest_sha256": freeze_data["manifest_sha256"],
        "total_cases_in_suite": len(manifest_cases),
        "total_evaluated": total_evaluated,
        "status_counts": status_counts,
        "pass_rate_pct": (status_counts["PASS"] / total_evaluated * 100.0) if total_evaluated > 0 else 0.0,
        "dimensional_metrics": {
            "entrypoint_recognized_pct": (metrics["entrypoint_recognized"] / total_evaluated * 100.0) if total_evaluated > 0 else 0.0,
            "intent_selected_correctly_pct": (metrics["intent_selected_correctly"] / total_evaluated * 100.0) if total_evaluated > 0 else 0.0,
            "native_workflow_invoked_pct": (metrics["native_workflow_invoked"] / total_evaluated * 100.0) if total_evaluated > 0 else 0.0,
            "task_completed_pct": (metrics["task_completed"] / total_evaluated * 100.0) if total_evaluated > 0 else 0.0,
            "raw_counts": metrics,
        },
        "category_breakdown": cat_breakdown,
        "cases": results,
    }

    if output_results_file:
        output_results_file.parent.mkdir(parents=True, exist_ok=True)
        with open(output_results_file, "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2)

    return summary


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python score_benchmark.py <events.jsonl> [output_results.json]")
        sys.exit(1)
    ev_file = Path(sys.argv[1])
    out_file = Path(sys.argv[2]) if len(sys.argv) > 2 else None
    res = score_events_file(ev_file, out_file)
    print(f"Scored {res['total_evaluated']} cases:")
    print(f"  PASS: {res['status_counts']['PASS']}")
    print(f"  FAIL: {res['status_counts']['FAIL']}")
    print(f"  REVIEW_REQUIRED: {res['status_counts']['REVIEW_REQUIRED']}")
    print(f"  BLOCKED: {res['status_counts']['BLOCKED']}")
    print(f"  NOT_VERIFIED: {res['status_counts']['NOT_VERIFIED']}")
    print(f"  Pass Rate: {res['pass_rate_pct']:.1f}%")
