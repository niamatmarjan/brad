#!/usr/bin/env python3
"""[LAYER C: INDEPENDENT SCORING PROCESS]
Operation Ironclad — Layer C Independent Benchmark Scorer.

Audits and evaluates observed execution records from Layer A / Layer B
against cryptographically frozen expectations (oracle-freeze.json).

ANTI-GAMING AND AUDIT RULES:
1. Validates that the oracle and manifest files match the frozen SHA-256 hashes.
2. Evaluates 4 distinct dimensions:
   - Entrypoint Recognition: Did the host invoke BRAD as coordinator?
   - Intent Selection: Did BRAD select the expected BMAD target workflow?
   - Native Invocation: Was official native BMAD workflow actually executed on disk?
   - Task Completion: Did the execution produce verifiable deliverables / tests?
3. Fails closed on forged records, validator failures, or unexecuted cases.
4. Uses canonical statuses: PASS, FAIL, PARTIAL, REVIEW_REQUIRED, BLOCKED, NOT_RUN, NOT_VERIFIED, INVALID_FIXTURE.
"""
from __future__ import annotations

import copy
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
    "INVALID_FIXTURE",
}


def verify_oracle_integrity() -> dict[str, Any]:
    """Cryptographically verifies oracle files against frozen hashes."""
    if not FREEZE_FILE.is_file():
        raise FileNotFoundError(f"Oracle freeze file not found: {FREEZE_FILE}")
    if not MANIFEST_FILE.is_file():
        raise FileNotFoundError(f"Case manifest file not found: {MANIFEST_FILE}")
    if not ORACLE_FILE.is_file():
        raise FileNotFoundError(f"Expected outcomes oracle file not found: {ORACLE_FILE}")

    with open(FREEZE_FILE, "r", encoding="utf-8") as f:
        freeze_data = json.load(f)

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
    refusal_or_clar = (
        oracle_entry.get("refusal_or_clarification")
        or manifest_item.get("refusal_or_clarification")
        or "NONE"
    ).strip()

    is_refusal = (
        expected_target == "POLICY_REFUSAL"
        or refusal_or_clar.startswith("REFUSE_")
        or refusal_or_clar in ("BLOCK_MERGE", "BLOCK_PR")
    )
    is_clarification = (
        expected_target == "CLARIFICATION_REQUIRED"
        or refusal_or_clar.startswith("CLARIFY_")
        or refusal_or_clar in ("REQUIRE_CONFIRMATION", "REQUIRE_EXPLICIT_CONSENT", "ESCALATE_TO_HUMAN_PO")
    )
    is_blocked = (
        refusal_or_clar.startswith("REPORT_")
        or refusal_or_clar in ("FLAG_CONTRADICTION", "WARN_FILE_CONTENTION", "WARN_VERSION_COLLISION")
    )

    exec_details = record.get("execution_details", {})

    # 1. Fail closed on Invalid Fixture Identity (Prompt/Role Mismatch)
    if validation_result.get("validated_provenance") == "INVALID_FIXTURE":
        return {
            "case_id": case_id,
            "category": cat,
            "prompt": record.get("prompt", ""),
            "role": record.get("role", ""),
            "expected_target": expected_target,
            "observed_route": record.get("observed_route", "UNKNOWN"),
            "provenance": "INVALID_FIXTURE",
            "entrypoint_recognized": False,
            "intent_selected_correctly": False,
            "workflow_executed_inline": False,
            "native_host_dispatch": False,
            "native_workflow_invoked": False,
            "subagent_executed": False,
            "task_completed": False,
            "overall_status": "INVALID_FIXTURE",
            "reasons": validation_result.get("errors", ["Fixture prompt/role identity mismatch"]),
        }

    # 2. Fail closed if Layer B validation failed
    if not validation_result.get("valid", False):
        return {
            "case_id": case_id,
            "category": cat,
            "prompt": record.get("prompt", ""),
            "role": record.get("role", ""),
            "expected_target": expected_target,
            "observed_route": record.get("observed_route", "UNKNOWN"),
            "provenance": "NOT_VERIFIED",
            "entrypoint_recognized": False,
            "intent_selected_correctly": False,
            "workflow_executed_inline": False,
            "native_host_dispatch": False,
            "native_workflow_invoked": False,
            "subagent_executed": False,
            "task_completed": False,
            "overall_status": "NOT_VERIFIED",
            "reasons": validation_result.get("errors", ["Evidence validation failed"]),
        }

    # 3. Check for blocked/error execution
    if record.get("error_or_timeout") or record.get("provenance") == "BLOCKED":
        return {
            "case_id": case_id,
            "category": cat,
            "prompt": record.get("prompt", ""),
            "role": record.get("role", ""),
            "expected_target": expected_target,
            "observed_route": record.get("observed_route", "BLOCKED"),
            "provenance": "BLOCKED",
            "entrypoint_recognized": bool(record.get("entrypoint_selected")),
            "intent_selected_correctly": False,
            "workflow_executed_inline": False,
            "native_host_dispatch": False,
            "native_workflow_invoked": False,
            "subagent_executed": False,
            "task_completed": False,
            "overall_status": "BLOCKED",
            "reasons": [f"Execution blocked or timed out: {record.get('error_or_timeout')}"],
        }

    # 4. Evaluate Entrypoint Recognition
    entrypoint_recognized = (
        exec_details.get("entrypoint_recognized")
        if "entrypoint_recognized" in exec_details
        else (
            (record.get("entrypoint_selected", "").lower() == "brad")
            if isinstance(record.get("entrypoint_selected"), str)
            else bool(record.get("entrypoint_selected"))
        )
    )

    # 5. Evaluate Intent Selection
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
        if (
            auth_decision == "REFUSED"
            or norm_observed in ("policy_refusal", "refuse", "refusal", "refused")
            or exec_details.get("action_refused")
        ):
            intent_selected_correctly = True
            reasons.append("Policy refusal recognized cleanly")
        else:
            reasons.append(f"Expected POLICY_REFUSAL ({refusal_or_clar}), but observed {observed_route} (auth: {auth_decision})")

    elif is_clarification:
        if (
            auth_decision == "CLARIFICATION_REQUIRED"
            or norm_observed in ("clarification_required", "clarify", "clarification")
            or exec_details.get("clarification_requested")
        ):
            intent_selected_correctly = True
            reasons.append("Clarification requested cleanly for ambiguous input")
        elif any(alt in norm_observed for alt in alt_targets) or norm_observed in alt_targets:
            intent_selected_correctly = True
            reasons.append(f"Resolved ambiguous input to valid target {observed_route}")
        else:
            reasons.append(f"Expected CLARIFICATION_REQUIRED ({refusal_or_clar}), but observed {observed_route}")

    elif is_blocked:
        if (
            norm_observed in ("blocked", "report_blocked", "clarification_required")
            or any(alt in norm_observed for alt in alt_targets)
            or norm_observed in alt_targets
        ):
            intent_selected_correctly = True
            reasons.append(f"Reported blocked condition cleanly: {refusal_or_clar}")
        else:
            reasons.append(f"Expected blocked condition ({refusal_or_clar}), but observed {observed_route}")

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

    # 6. Evaluate Granular Execution Dimensions
    workflow_executed_inline = (
        exec_details.get("workflow_executed_inline", False)
        or record.get("provenance") in ("INLINE_WORKFLOW", "SUBAGENT_DISPATCHED", "COORDINATOR_DISPATCHED")
    )

    native_host_dispatch = (
        exec_details.get("native_host_dispatch", False)
        or (record.get("provenance") == "NATIVE_HOST_DISPATCH")
    )

    subagent_executed = (
        exec_details.get("subagent_executed", False)
        or record.get("provenance") in ("SUBAGENT_DISPATCHED", "COORDINATOR_DISPATCHED")
        or bool(record.get("session_id"))
    )

    # 7. Evaluate Task Completion strictly
    artifacts = record.get("observed_artifacts", [])
    side_effects = record.get("side_effects_detected", [])
    tool_calls = record.get("tool_call_linkage", [])

    if is_refusal:
        action_refused = exec_details.get(
            "action_refused",
            (auth_decision == "REFUSED" or norm_observed in ("policy_refusal", "refuse", "refusal", "refused")),
        )
        task_completed = intent_selected_correctly and action_refused and len(side_effects) == 0 and len(artifacts) == 0
        if not task_completed and len(artifacts) > 0:
            reasons.append(f"Refusal violated: produced artifacts: {artifacts}")
        if not task_completed and len(side_effects) > 0:
            reasons.append(f"Refusal violated: produced side effects: {side_effects}")

    elif is_clarification:
        clarification_requested = exec_details.get(
            "clarification_requested",
            (auth_decision == "CLARIFICATION_REQUIRED" or norm_observed in ("clarification_required", "clarify")),
        )
        task_completed = intent_selected_correctly and len(side_effects) == 0
        if not task_completed and len(side_effects) > 0:
            reasons.append(f"Clarification violated: speculative side effects produced: {side_effects}")

    else:
        # Actionable native workflow: requires verifiable artifacts or clean exit code
        has_artifacts = len(artifacts) > 0
        has_clean_tool_exec = (
            len(tool_calls) > 0
            and any(
                tc.get("exit_code") == 0 or "Command exited with code 0" in str(tc.get("output_excerpt", ""))
                for tc in tool_calls
            )
        )
        task_completed = has_artifacts or has_clean_tool_exec

    # 8. Compute Overall Status Decoupled from Routing
    if is_refusal:
        overall_status = "PASS" if (intent_selected_correctly and task_completed) else "FAIL"
    elif is_clarification:
        overall_status = "PASS" if (intent_selected_correctly and task_completed) else "FAIL"
    elif is_review_required:
        overall_status = "REVIEW_REQUIRED"
    elif intent_selected_correctly:
        if task_completed and (workflow_executed_inline or subagent_executed or native_host_dispatch):
            overall_status = "PASS"
        else:
            overall_status = "PARTIAL"
            reasons.append("Intent route matched, but execution deliverables or tests are unverified")
    else:
        overall_status = "FAIL"

    return {
        "case_id": case_id,
        "category": cat,
        "prompt": record.get("prompt", ""),
        "role": record.get("role", ""),
        "expected_target": expected_target,
        "observed_route": observed_route,
        "provenance": record.get("provenance", "NOT_VERIFIED"),
        "entrypoint_recognized": bool(entrypoint_recognized),
        "intent_selected_correctly": bool(intent_selected_correctly),
        "workflow_executed_inline": bool(workflow_executed_inline),
        "native_host_dispatch": bool(native_host_dispatch),
        "native_workflow_invoked": bool(workflow_executed_inline or native_host_dispatch),
        "subagent_executed": bool(subagent_executed),
        "task_completed": bool(task_completed),
        "overall_status": overall_status,
        "reasons": reasons,
    }


def score_events_file(
    observed_events_file: Path,
    output_results_file: Path | None = None,
    antigravity_brain_dir: Path | None = None,
    enforce_manifest_identity: bool = True,
) -> dict[str, Any]:
    """Score a full events file with Layer B validation."""
    freeze_data = verify_oracle_integrity()

    with open(ORACLE_FILE, "r", encoding="utf-8") as f:
        oracle_data = json.load(f)
    with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
        manifest_data = json.load(f)

    manifest_by_id = {c["id"]: c for c in manifest_data.get("cases", [])}
    oracle_by_id = oracle_data.get("expected_results", oracle_data.get("expected_outcomes", {}))

    # Run Layer B batch validation
    val_batch = validate_batch(
        observed_events_file,
        antigravity_brain_dir=antigravity_brain_dir,
        enforce_manifest_identity=enforce_manifest_identity,
    )
    val_by_case = {}
    for item in val_batch["records"]:
        val_by_case[item["record"]["case_id"]] = item

    scored_records = []
    total_cases = len(manifest_by_id)

    status_counts = {st: 0 for st in VALID_OUTCOMES}
    dim_counts = {
        "entrypoint_recognized": 0,
        "intent_selected_correctly": 0,
        "workflow_executed_inline": 0,
        "native_host_dispatch": 0,
        "subagent_executed": 0,
        "task_completed": 0,
    }

    category_breakdown = {}

    for cid, m_item in manifest_by_id.items():
        cat = m_item.get("cat", cid.split("-")[0])
        if cat not in category_breakdown:
            category_breakdown[cat] = {st: 0 for st in VALID_OUTCOMES}
            category_breakdown[cat]["total"] = 0
        category_breakdown[cat]["total"] += 1

        o_entry = oracle_by_id.get(cid, {})

        if cid in val_by_case:
            v_item = val_by_case[cid]
            rec = v_item["record"]
            val_res = v_item["validation"]

            scored = score_evidence_record(rec, o_entry, m_item, val_res)
        else:
            # Case was not executed in this run -> mark NOT_RUN
            scored = {
                "case_id": cid,
                "category": cat,
                "prompt": m_item.get("utterance", ""),
                "role": m_item.get("role", ""),
                "expected_target": m_item.get("target", ""),
                "observed_route": "NOT_RUN",
                "provenance": "NOT_RUN",
                "entrypoint_recognized": False,
                "intent_selected_correctly": False,
                "workflow_executed_inline": False,
                "native_host_dispatch": False,
                "subagent_executed": False,
                "task_completed": False,
                "overall_status": "NOT_RUN",
                "reasons": ["No execution record found in events file"],
            }

        st = scored["overall_status"]
        status_counts[st] = status_counts.get(st, 0) + 1
        category_breakdown[cat][st] = category_breakdown[cat].get(st, 0) + 1

        if scored.get("entrypoint_recognized"):
            dim_counts["entrypoint_recognized"] += 1
        if scored.get("intent_selected_correctly"):
            dim_counts["intent_selected_correctly"] += 1
        if scored.get("workflow_executed_inline"):
            dim_counts["workflow_executed_inline"] += 1
        if scored.get("native_host_dispatch"):
            dim_counts["native_host_dispatch"] += 1
        if scored.get("subagent_executed"):
            dim_counts["subagent_executed"] += 1
        if scored.get("task_completed"):
            dim_counts["task_completed"] += 1

        scored_records.append(scored)

    total_evaluated = sum(
        cnt for st, cnt in status_counts.items() if st != "NOT_RUN"
    )
    pass_count = status_counts.get("PASS", 0)
    pass_rate_pct = (pass_count / total_evaluated * 100.0) if total_evaluated > 0 else 0.0

    summary = {
        "benchmark_suite": "BRAD Enterprise SDLC Benchmark (Operation Ironclad Layer C)",
        "eval_type": "LAYER_C_INDEPENDENT_EVALUATION",
        "oracle_sha256": freeze_data["oracle_sha256"],
        "manifest_sha256": freeze_data["manifest_sha256"],
        "total_cases_in_suite": total_cases,
        "total_evaluated": total_evaluated,
        "status_counts": status_counts,
        "pass_rate_pct": pass_rate_pct,
        "dimensional_metrics": {
            "entrypoint_recognized_pct": (dim_counts["entrypoint_recognized"] / total_evaluated * 100.0) if total_evaluated > 0 else 0.0,
            "intent_selected_correctly_pct": (dim_counts["intent_selected_correctly"] / total_evaluated * 100.0) if total_evaluated > 0 else 0.0,
            "workflow_executed_inline_pct": (dim_counts["workflow_executed_inline"] / total_evaluated * 100.0) if total_evaluated > 0 else 0.0,
            "native_host_dispatch_pct": (dim_counts["native_host_dispatch"] / total_evaluated * 100.0) if total_evaluated > 0 else 0.0,
            "subagent_executed_pct": (dim_counts["subagent_executed"] / total_evaluated * 100.0) if total_evaluated > 0 else 0.0,
            "task_completed_pct": (dim_counts["task_completed"] / total_evaluated * 100.0) if total_evaluated > 0 else 0.0,
            "raw_counts": dim_counts,
        },
        "category_breakdown": category_breakdown,
        "scored_records": scored_records,
    }

    if output_results_file:
        output_results_file.parent.mkdir(parents=True, exist_ok=True)
        with open(output_results_file, "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2)

    return summary
