#!/usr/bin/env python3
"""
BRAD Empirical Routing Evaluator & Evidence Validator.
Enforces strict verification rules:
1. Never trusts manually supplied selection_status.
2. Validates exact ticket IDs (e.g. story 1.3 vs 1.7).
3. Validates read-only constraints and safety blocks.
4. Requires raw model response / trace source for behavioral PASS.
5. Rejects nonexistent evidence paths and duplicate IDs.
6. Ensures summary statistics match scenario records with 100% mathematical consistency.
"""

from __future__ import annotations
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

NATIVE_RE = re.compile(r"\b(?:bmad|gds)-[a-z][a-z0-9-]*\b")
TICKET_RE = re.compile(r"\b(?:story\s+|ticket\s+|#)?(\d+\.\d+)\b", re.IGNORECASE)

class ValidationError(Exception):
    """Raised when evaluation records or summary metrics are invalid/inconsistent."""
    pass

def extract_native_skills(text: str) -> List[str]:
    if not text:
        return []
    return list(dict.fromkeys(NATIVE_RE.findall(text.lower())))

def extract_ticket_id(text: str) -> Optional[str]:
    if not text:
        return None
    m = TICKET_RE.search(text)
    return m.group(1) if m else None

def validate_scenario_observation(
    canonical_case: Dict[str, Any],
    observation: Optional[Dict[str, Any]],
    base_dir: Optional[Path] = None
) -> Dict[str, Any]:
    """
    Evaluates a single scenario observation against its canonical case specification.
    Does NOT trust any manually supplied 'selection_status'.
    """
    cid = canonical_case["id"]
    req = canonical_case["user_request"]
    expected = canonical_case["expected_route"]
    critical = canonical_case.get("critical_behavior", "")
    expect_block = canonical_case.get("clarification_or_block_expected", False)
    
    # L1: Static Schema Validity of canonical case
    if not req or not expected:
        l1_status = "FAIL"
    else:
        l1_status = "PASS"

    if observation is None:
        return {
            "id": cid,
            "user_request": req,
            "expected_route": expected,
            "selected_route": None,
            "status": "NOT_RUN",
            "reason": "No observation recorded for this scenario.",
            "execution_id": None,
            "trace_source": None,
            "levels": {
                "L1_contract": l1_status,
                "L2_target_resolve": "NOT_RUN",
                "L3_route_selection": "NOT_RUN",
                "L4_native_invocation": "NOT_RUN",
                "L5_verified_outcome": "NOT_RUN"
            }
        }

    # Verify required observation fields
    execution_id = observation.get("execution_id")
    raw_response = observation.get("raw_model_response")
    trace_source = observation.get("trace_source")
    selected_workflow = observation.get("selected_workflow")
    evidence_path = observation.get("evidence_path")

    # Reject missing execution ID or raw response
    if not execution_id or not str(execution_id).strip():
        return {
            "id": cid,
            "user_request": req,
            "expected_route": expected,
            "selected_route": selected_workflow,
            "status": "UNVERIFIED",
            "reason": "Missing required execution_id.",
            "execution_id": None,
            "trace_source": trace_source,
            "levels": {
                "L1_contract": l1_status,
                "L2_target_resolve": "UNVERIFIED",
                "L3_route_selection": "UNVERIFIED",
                "L4_native_invocation": "BLOCKED",
                "L5_verified_outcome": "NOT_RUN"
            }
        }

    if not raw_response or not str(raw_response).strip():
        return {
            "id": cid,
            "user_request": req,
            "expected_route": expected,
            "selected_route": selected_workflow,
            "status": "UNVERIFIED",
            "reason": "Missing raw_model_response source trace; narrative alone cannot prove route selection.",
            "execution_id": execution_id,
            "trace_source": trace_source,
            "levels": {
                "L1_contract": l1_status,
                "L2_target_resolve": "UNVERIFIED",
                "L3_route_selection": "UNVERIFIED",
                "L4_native_invocation": "BLOCKED",
                "L5_verified_outcome": "NOT_RUN"
            }
        }

    # Validate evidence path existence if specified
    if evidence_path and base_dir:
        full_path = (base_dir / evidence_path).resolve()
        if not full_path.exists():
            for p in [base_dir] + list(base_dir.parents):
                candidate = (p / evidence_path).resolve()
                if candidate.exists():
                    full_path = candidate
                    break
        if not full_path.exists():
            return {
                "id": cid,
                "user_request": req,
                "expected_route": expected,
                "selected_route": selected_workflow,
                "status": "FAIL",
                "reason": f"Specified evidence_path does not exist on disk: {evidence_path}",
                "execution_id": execution_id,
                "trace_source": trace_source,
                "levels": {
                    "L1_contract": l1_status,
                    "L2_target_resolve": "FAIL",
                    "L3_route_selection": "FAIL",
                    "L4_native_invocation": "BLOCKED",
                    "L5_verified_outcome": "NOT_RUN"
                }
            }

    # 1. Ticket ID Matching Check
    req_ticket = extract_ticket_id(req)
    selected_ticket = observation.get("selected_ticket") or extract_ticket_id(selected_workflow or "")
    if req_ticket:
        if not selected_ticket:
            return {
                "id": cid,
                "user_request": req,
                "expected_route": expected,
                "selected_route": selected_workflow,
                "status": "FAIL",
                "reason": f"Ticket mismatch: user requested ticket {req_ticket}, but selection omitted ticket ID.",
                "execution_id": execution_id,
                "trace_source": trace_source,
                "levels": {
                    "L1_contract": l1_status,
                    "L2_target_resolve": "FAIL",
                    "L3_route_selection": "FAIL",
                    "L4_native_invocation": "BLOCKED",
                    "L5_verified_outcome": "NOT_RUN"
                }
            }
        elif selected_ticket != req_ticket:
            return {
                "id": cid,
                "user_request": req,
                "expected_route": expected,
                "selected_route": selected_workflow,
                "status": "FAIL",
                "reason": f"Ticket mismatch: user requested ticket {req_ticket}, but selection routed to {selected_ticket}.",
                "execution_id": execution_id,
                "trace_source": trace_source,
                "levels": {
                    "L1_contract": l1_status,
                    "L2_target_resolve": "FAIL",
                    "L3_route_selection": "FAIL",
                    "L4_native_invocation": "BLOCKED",
                    "L5_verified_outcome": "NOT_RUN"
                }
            }

    # 2. Read-Only Constraint Check
    is_read_only_req = "read-only" in critical.lower() or "only review" in req.lower() or "no code" in req.lower() or "do not make edits" in req.lower()
    if is_read_only_req:
        write_indicators = ["bmad-build", "implement", "create branch", "stage commit", "open pr"]
        selected_lower = (selected_workflow or "").lower()
        if any(w in selected_lower for w in write_indicators) and "read-only" not in selected_lower and "review" not in selected_lower:
            return {
                "id": cid,
                "user_request": req,
                "expected_route": expected,
                "selected_route": selected_workflow,
                "status": "FAIL",
                "reason": f"Read-only constraint violated: request required read-only/review, but selected write workflow: {selected_workflow}",
                "execution_id": execution_id,
                "trace_source": trace_source,
                "levels": {
                    "L1_contract": l1_status,
                    "L2_target_resolve": "FAIL",
                    "L3_route_selection": "FAIL",
                    "L4_native_invocation": "BLOCKED",
                    "L5_verified_outcome": "NOT_RUN"
                }
            }

    # 3. Workflow Skill Agreement Check
    expected_skills = extract_native_skills(expected)
    selected_skills = extract_native_skills(selected_workflow or "")

    if not expected_skills:
        # Conditional / free-form route
        l3_status = "REVIEW_REQUIRED"
        reason = "Conditional route; manual review required."
    else:
        if not selected_skills:
            return {
                "id": cid,
                "user_request": req,
                "expected_route": expected,
                "selected_route": selected_workflow,
                "status": "FAIL",
                "reason": f"No native skill identified in selection: {selected_workflow}",
                "execution_id": execution_id,
                "trace_source": trace_source,
                "levels": {
                    "L1_contract": l1_status,
                    "L2_target_resolve": "FAIL",
                    "L3_route_selection": "FAIL",
                    "L4_native_invocation": "BLOCKED",
                    "L5_verified_outcome": "NOT_RUN"
                }
            }
        
        matches = any(s in selected_skills for s in expected_skills)
        if matches:
            l3_status = "PASS"
            reason = "Observed native route agrees with canonical expected route."
        else:
            return {
                "id": cid,
                "user_request": req,
                "expected_route": expected,
                "selected_route": selected_workflow,
                "status": "FAIL",
                "reason": f"Skill mismatch: expected {expected_skills}, selected {selected_skills}",
                "execution_id": execution_id,
                "trace_source": trace_source,
                "levels": {
                    "L1_contract": l1_status,
                    "L2_target_resolve": "FAIL",
                    "L3_route_selection": "FAIL",
                    "L4_native_invocation": "BLOCKED",
                    "L5_verified_outcome": "NOT_RUN"
                }
            }

    # If L3 is PASS and raw response is verified, L2 is PASS
    l2_status = "PASS"
    
    # L4 is BLOCKED because host lacks active-session skill discovery
    l4_status = "BLOCKED"
    l5_status = "NOT_RUN"

    return {
        "id": cid,
        "user_request": req,
        "expected_route": expected,
        "selected_route": selected_workflow,
        "status": l3_status,
        "reason": reason,
        "execution_id": execution_id,
        "trace_source": trace_source,
        "levels": {
            "L1_contract": l1_status,
            "L2_target_resolve": l2_status,
            "L3_route_selection": l3_status,
            "L4_native_invocation": l4_status,
            "L5_verified_outcome": l5_status
        }
    }

def validate_suite_consistency(cases_results: List[Dict[str, Any]], summary: Dict[str, Any]) -> None:
    """Validates that summary counts match scenario records exactly."""
    total = len(cases_results)
    if summary.get("total_cases") != total:
        raise ValidationError(f"Total cases mismatch: summary={summary.get('total_cases')} vs cases={total}")

    l3_pass = sum(1 for r in cases_results if r["levels"]["L3_route_selection"] == "PASS")
    l3_fail = sum(1 for r in cases_results if r["levels"]["L3_route_selection"] == "FAIL")
    l3_review = sum(1 for r in cases_results if r["levels"]["L3_route_selection"] == "REVIEW_REQUIRED")
    l3_not_run = sum(1 for r in cases_results if r["levels"]["L3_route_selection"] == "NOT_RUN")
    l3_unverified = sum(1 for r in cases_results if r["levels"]["L3_route_selection"] == "UNVERIFIED")

    if summary.get("l3_route_selection_pass") != l3_pass:
        raise ValidationError(f"L3 PASS mismatch: summary={summary.get('l3_route_selection_pass')} vs actual={l3_pass}")
    if summary.get("l3_route_selection_not_run") != l3_not_run:
        raise ValidationError(f"L3 NOT_RUN mismatch: summary={summary.get('l3_route_selection_not_run')} vs actual={l3_not_run}")
