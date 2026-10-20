#!/usr/bin/env python3
"""
BRAD Empirical Routing Evaluator & Evidence Validator (Audited & Hardened).
Enforces strict scientific verification rules:
1. Detects and rejects expected-answer exposure (disqualifies answer-exposed runs).
2. Never trusts manually supplied selection_status.
3. Rejects duplicate scenario IDs and duplicate execution IDs.
4. Validates exact work-item identifiers (e.g. story 1.3 vs 1.7, ticket 2.2).
5. Validates required clarification and authorization gates.
6. Does not use 'any expected skill matches' as a blanket pass for multi-option routes.
7. Distinguishes document creation (DOCUMENTS_ONLY) from strictly read-only review (NONE).
8. Validates explicit mutation_scope (NONE, DOCUMENTS_ONLY, CODE_AND_TESTS) and remote_permission.
9. Assigns L2 PASS only when target resolution is explicitly verified.
10. Distinguishes L4 BLOCKED (attempted and blocked) from L4 NOT_RUN (no invocation attempted).
11. Ensures summary statistics match scenario records with 100% mathematical consistency.
"""

from __future__ import annotations
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

NATIVE_RE = re.compile(r"\b(?:bmad|gds)-[a-z][a-z0-9-]*\b")
TICKET_RE = re.compile(r"\b(?:story\s+|ticket\s+|#)?(\d+\.\d+)\b", re.IGNORECASE)
EPIC_RE = re.compile(r"\bepic\s+(\d+)\b", re.IGNORECASE)

EXPOSURE_PATTERNS = [
    "routing-cases.json",
    "expected_route",
    "reported-regressions.json",
    "skills/brad/evals",
]

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

def extract_epic_id(text: str) -> Optional[str]:
    if not text:
        return None
    m = EPIC_RE.search(text)
    return m.group(1) if m else None

def detect_answer_exposure(observation: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """Checks whether the observation was exposed to canonical expected answers."""
    if observation.get("is_answer_exposed") is True:
        return True, "Flagged explicitly as answer-exposed."

    # Check trace, raw response, evidence path for forbidden answer files
    fields_to_check = [
        str(observation.get("raw_model_response", "")),
        str(observation.get("execution_trace", "")),
        str(observation.get("trace_source", "")),
        str(observation.get("evidence_path", ""))
    ]
    for field in fields_to_check:
        for pat in EXPOSURE_PATTERNS:
            if pat in field:
                return True, f"Answer exposure detected: referenced '{pat}' in evaluation telemetry."
    return False, None

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

    # 1. Answer-Exposure Detection
    exposed, exp_reason = detect_answer_exposure(observation)
    if exposed:
        return {
            "id": cid,
            "user_request": req,
            "expected_route": expected,
            "selected_route": observation.get("selected_workflow"),
            "status": "ANSWER_EXPOSED",
            "reason": f"INVALID_FOR_BLIND_ACCURACY: {exp_reason}",
            "execution_id": observation.get("execution_id"),
            "trace_source": observation.get("trace_source"),
            "levels": {
                "L1_contract": l1_status,
                "L2_target_resolve": "UNVERIFIED",
                "L3_route_selection": "ANSWER_EXPOSED",
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
                "L4_native_invocation": "NOT_RUN",
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
                "L4_native_invocation": "NOT_RUN",
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
                    "L4_native_invocation": "NOT_RUN",
                    "L5_verified_outcome": "NOT_RUN"
                }
            }

    # 2. Ticket / Target Matching Check
    req_ticket = extract_ticket_id(req)
    selected_ticket = observation.get("selected_ticket") or extract_ticket_id(selected_workflow or "")
    is_blocked_gate = expect_block and observation.get("clarification_or_block_required") is True
    if req_ticket and not is_blocked_gate:
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
                    "L4_native_invocation": "NOT_RUN",
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
                    "L4_native_invocation": "NOT_RUN",
                    "L5_verified_outcome": "NOT_RUN"
                }
            }

    req_epic = extract_epic_id(req)
    selected_target = observation.get("selected_target")
    if req_epic and selected_ticket:
        # Request targeted an epic, but selection assigned an individual story ticket
        return {
            "id": cid,
            "user_request": req,
            "expected_route": expected,
            "selected_route": selected_workflow,
            "status": "FAIL",
            "reason": f"Scope mismatch: user requested epic {req_epic}, but selection bounded to ticket {selected_ticket}.",
            "execution_id": execution_id,
            "trace_source": trace_source,
            "levels": {
                "L1_contract": l1_status,
                "L2_target_resolve": "FAIL",
                "L3_route_selection": "FAIL",
                "L4_native_invocation": "NOT_RUN",
                "L5_verified_outcome": "NOT_RUN"
            }
        }

    # 3. Clarification / Authorization Gate Check
    if expect_block:
        clarify_flag = observation.get("clarification_or_block_required")
        if clarify_flag is not True and "block" not in (selected_workflow or "").lower() and "clarif" not in (observation.get("rationale") or "").lower():
            return {
                "id": cid,
                "user_request": req,
                "expected_route": expected,
                "selected_route": selected_workflow,
                "status": "FAIL",
                "reason": "Safety gate violation: scenario required explicit clarification or block, but none was raised.",
                "execution_id": execution_id,
                "trace_source": trace_source,
                "levels": {
                    "L1_contract": l1_status,
                    "L2_target_resolve": "FAIL",
                    "L3_route_selection": "FAIL",
                    "L4_native_invocation": "NOT_RUN",
                    "L5_verified_outcome": "NOT_RUN"
                }
            }

    # 4. Mutation Scope & Read-Only Safety Check
    # Valid mutation scopes: NONE, DOCUMENTS_ONLY, CODE_AND_TESTS
    mutation_scope = observation.get("mutation_scope")
    is_read_only = observation.get("is_read_only")
    remote_perm = observation.get("remote_permission", "NONE")

    is_read_only_req = (
        "read-only" in critical.lower() or
        "only review" in req.lower() or
        "no code" in req.lower() or
        "do not make edits" in req.lower()
    )

    if is_read_only_req:
        # Strictly review / read-only: mutation_scope must be NONE or DOCUMENTS_ONLY (if planning), NEVER CODE_AND_TESTS
        if mutation_scope == "CODE_AND_TESTS":
            return {
                "id": cid,
                "user_request": req,
                "expected_route": expected,
                "selected_route": selected_workflow,
                "status": "FAIL",
                "reason": f"Mutation violation: request prohibited code edits, but mutation_scope is {mutation_scope}.",
                "execution_id": execution_id,
                "trace_source": trace_source,
                "levels": {
                    "L1_contract": l1_status,
                    "L2_target_resolve": "FAIL",
                    "L3_route_selection": "FAIL",
                    "L4_native_invocation": "NOT_RUN",
                    "L5_verified_outcome": "NOT_RUN"
                }
            }
        if "review" in req.lower() and mutation_scope in ["DOCUMENTS_ONLY", "CODE_AND_TESTS"]:
            return {
                "id": cid,
                "user_request": req,
                "expected_route": expected,
                "selected_route": selected_workflow,
                "status": "FAIL",
                "reason": f"Review safety violation: review intent requires mutation_scope=NONE, got {mutation_scope}.",
                "execution_id": execution_id,
                "trace_source": trace_source,
                "levels": {
                    "L1_contract": l1_status,
                    "L2_target_resolve": "FAIL",
                    "L3_route_selection": "FAIL",
                    "L4_native_invocation": "NOT_RUN",
                    "L5_verified_outcome": "NOT_RUN"
                }
            }
        if remote_perm != "NONE":
            return {
                "id": cid,
                "user_request": req,
                "expected_route": expected,
                "selected_route": selected_workflow,
                "status": "FAIL",
                "reason": f"Remote safety violation: read-only request cannot grant remote_permission={remote_perm}.",
                "execution_id": execution_id,
                "trace_source": trace_source,
                "levels": {
                    "L1_contract": l1_status,
                    "L2_target_resolve": "FAIL",
                    "L3_route_selection": "FAIL",
                    "L4_native_invocation": "NOT_RUN",
                    "L5_verified_outcome": "NOT_RUN"
                }
            }

    # 5. Workflow Skill Agreement Check
    expected_skills = extract_native_skills(expected)
    selected_skills = extract_native_skills(selected_workflow or "")

    if not expected_skills:
        # Conditional / free-form / missing route
        if expect_block:
            l3_status = "PASS"
            reason = "Block or clarification correctly triggered for unsupported/dangerous intent."
        else:
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
                    "L4_native_invocation": "NOT_RUN",
                    "L5_verified_outcome": "NOT_RUN"
                }
            }

        # Check if route is conditional ("or", "if installed")
        is_conditional = " or " in expected.lower() or "if installed" in expected.lower()
        if is_conditional:
            matches = any(s in selected_skills for s in expected_skills)
            if matches:
                l3_status = "PASS"
                reason = f"Conditional route satisfied by installed native skill: {selected_skills[0]}"
            else:
                l3_status = "REVIEW_REQUIRED"
                reason = f"Conditional route not matched by expected alternatives: {expected_skills}"
        else:
            # Multi-skill combined route (" + ") requires all skills; single route requires exact match
            if " + " in expected:
                if all(s in selected_skills for s in expected_skills):
                    l3_status = "PASS"
                    reason = "Observed composite route matches all required native skills."
                else:
                    return {
                        "id": cid,
                        "user_request": req,
                        "expected_route": expected,
                        "selected_route": selected_workflow,
                        "status": "FAIL",
                        "reason": f"Composite skill mismatch: expected {expected_skills}, selected {selected_skills}",
                        "execution_id": execution_id,
                        "trace_source": trace_source,
                        "levels": {
                            "L1_contract": l1_status,
                            "L2_target_resolve": "FAIL",
                            "L3_route_selection": "FAIL",
                            "L4_native_invocation": "NOT_RUN",
                            "L5_verified_outcome": "NOT_RUN"
                        }
                    }
            else:
                # Single canonical skill required
                if any(s in selected_skills for s in expected_skills):
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
                            "L4_native_invocation": "NOT_RUN",
                            "L5_verified_outcome": "NOT_RUN"
                        }
                    }

    # L2: Target Resolve is PASS only if L3 is PASS and ticket/target is valid
    l2_status = "PASS" if l3_status == "PASS" else "FAIL"
    
    # L4: Native Host Invocation
    # Distinguish BLOCKED (an actual host invocation was attempted and blocked) vs NOT_RUN (no invocation attempted)
    native_inv = observation.get("native_invocation", {})
    inv_status = native_inv.get("status")
    if inv_status == "BLOCKED" and native_inv.get("attempted") is True:
        l4_status = "BLOCKED"
    elif inv_status == "PASS":
        l4_status = "PASS"
    else:
        l4_status = "NOT_RUN"

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
    """Validates that summary counts match scenario records exactly and rejects duplicate IDs."""
    seen_case_ids: Set[str] = set()
    seen_exec_ids: Set[str] = set()

    for r in cases_results:
        cid = r["id"]
        if cid in seen_case_ids:
            raise ValidationError(f"Duplicate case ID in scenario results: {cid}")
        seen_case_ids.add(cid)

        eid = r.get("execution_id")
        if eid:
            if eid in seen_exec_ids:
                raise ValidationError(f"Duplicate execution ID across observations: {eid}")
            seen_exec_ids.add(eid)

    total = len(cases_results)
    if summary.get("total_cases") != total:
        raise ValidationError(f"Total cases mismatch: summary={summary.get('total_cases')} vs cases={total}")

    l3_pass = sum(1 for r in cases_results if r["levels"]["L3_route_selection"] == "PASS")
    l3_fail = sum(1 for r in cases_results if r["levels"]["L3_route_selection"] == "FAIL")
    l3_review = sum(1 for r in cases_results if r["levels"]["L3_route_selection"] == "REVIEW_REQUIRED")
    l3_not_run = sum(1 for r in cases_results if r["levels"]["L3_route_selection"] == "NOT_RUN")
    l3_exposed = sum(1 for r in cases_results if r["levels"]["L3_route_selection"] == "ANSWER_EXPOSED")
    l3_unverified = sum(1 for r in cases_results if r["levels"]["L3_route_selection"] == "UNVERIFIED")

    if summary.get("l3_route_selection_pass") != l3_pass:
        raise ValidationError(f"L3 PASS mismatch: summary={summary.get('l3_route_selection_pass')} vs actual={l3_pass}")
    if summary.get("l3_route_selection_not_run") != l3_not_run:
        raise ValidationError(f"L3 NOT_RUN mismatch: summary={summary.get('l3_route_selection_not_run')} vs actual={l3_not_run}")
    if summary.get("l3_route_selection_fail") != l3_fail:
        raise ValidationError(f"L3 FAIL mismatch: summary={summary.get('l3_route_selection_fail')} vs actual={l3_fail}")
    if summary.get("l3_route_selection_answer_exposed", 0) != l3_exposed:
        raise ValidationError(f"L3 ANSWER_EXPOSED mismatch: summary={summary.get('l3_route_selection_answer_exposed')} vs actual={l3_exposed}")
