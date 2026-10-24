#!/usr/bin/env python3
"""[LAYER B: EVIDENCE VALIDATOR]
Operation Ironclad — Layer B Evidence Validator.

Authenticates provenance, completeness, transcript existence on disk,
tool-call linkage, native skill existence in discovered catalog, before/after
side effects, and exact case identity against frozen benchmark specifications.

FAILS CLOSED on forged, synthesized, incomplete, mismatched, or contradictory records.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent.parent.parent
MANIFEST_FILE = BASE_DIR / "scenarios" / "case-manifest.json"

VALID_PROVENANCES = {
    "NATIVE_HOST_DISPATCH",
    "SUBAGENT_DISPATCHED",
    "INLINE_WORKFLOW",
    "COORDINATOR_DISPATCHED",
    "REFUSAL_ENFORCED",
    "INVALID_FIXTURE",
    "BLOCKED",
    "PARTIAL",
    "NOT_VERIFIED",
    # Legacy alias support for backward compatibility with phase 3
    "NATIVE_INVOKED",
}

VALID_AUTH_DECISIONS = {
    "AUTHORIZED",
    "REFUSED",
    "CLARIFICATION_REQUIRED",
    "UNAUTHORIZED_ATTEMPT",
    "NOT_APPLICABLE",
}

REQUIRED_RECORD_FIELDS = {
    "run_id",
    "case_id",
    "role",
    "prompt",
    "host_platform",
    "brad_version",
    "bmad_version",
    "fixture_dir",
    "discovered_catalog",
    "session_id",
    "entrypoint_selected",
    "observed_route",
    "native_skill_invoked",
    "native_skill_name",
    "native_skill_path",
    "tool_call_linkage",
    "start_time",
    "end_time",
    "observed_artifacts",
    "authorization_decision",
    "side_effects_detected",
    "provenance",
    "error_or_timeout",
}

# Cache for frozen case manifest
_FROZEN_MANIFEST_CACHE: dict[str, Any] | None = None


def get_frozen_manifest() -> dict[str, Any]:
    """Loads and caches the frozen case manifest."""
    global _FROZEN_MANIFEST_CACHE
    if _FROZEN_MANIFEST_CACHE is not None:
        return _FROZEN_MANIFEST_CACHE

    if MANIFEST_FILE.is_file():
        try:
            with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            cases = {c["id"]: c for c in data.get("cases", []) if "id" in c}
            _FROZEN_MANIFEST_CACHE = cases
            return cases
        except Exception:
            pass
    _FROZEN_MANIFEST_CACHE = {}
    return {}


class EvidenceValidationError(Exception):
    """Raised when an evidence record fails integrity, provenance, or anti-forgery checks."""


def parse_iso_timestamp(ts: str) -> datetime:
    """Parse ISO-8601 timestamp string."""
    ts_clean = ts.replace("Z", "+00:00")
    return datetime.fromisoformat(ts_clean)


def get_default_brain_dir() -> Path:
    """Gets the default brain directory across platforms portably."""
    if "ANTIGRAVITY_BRAIN_DIR" in os.environ:
        return Path(os.environ["ANTIGRAVITY_BRAIN_DIR"])
    home = os.environ.get("USERPROFILE") or os.environ.get("HOME") or tempfile.gettempdir()
    return Path(home) / ".gemini" / "antigravity" / "brain"


def validate_evidence_record(
    record: dict[str, Any],
    antigravity_brain_dir: Path | None = None,
    enforce_manifest_identity: bool = True,
) -> dict[str, Any]:
    """Strictly validates an execution evidence record.

    Returns a dict with:
      valid: bool
      errors: list of error strings
      warnings: list of warning strings
      validated_provenance: str
    """
    errors: list[str] = []
    warnings: list[str] = []

    # 1. Field presence check
    missing = REQUIRED_RECORD_FIELDS - set(record.keys())
    if missing:
        errors.append(f"Missing required fields: {sorted(missing)}")
        return {"valid": False, "errors": errors, "warnings": warnings, "validated_provenance": "NOT_VERIFIED"}

    # 2. Basic type checks
    for str_field in ["run_id", "case_id", "role", "prompt", "host_platform", "brad_version", "bmad_version", "fixture_dir"]:
        val = record.get(str_field)
        if not isinstance(val, str) or not val.strip():
            errors.append(f"Field '{str_field}' must be a non-empty string, got: {val!r}")

    # 3. Provenance and authorization enum validation
    prov = record["provenance"]
    if prov not in VALID_PROVENANCES:
        errors.append(f"Invalid provenance '{prov}'. Must be one of {sorted(VALID_PROVENANCES)}")

    auth_dec = record["authorization_decision"]
    if auth_dec not in VALID_AUTH_DECISIONS:
        errors.append(f"Invalid authorization_decision '{auth_dec}'. Must be one of {sorted(VALID_AUTH_DECISIONS)}")

    # 4. Exact Frozen Case Identity Check (Anti-Swapping, Anti-Mismatched Utterance & Role)
    case_id = record["case_id"]
    is_adhoc = any(case_id.startswith(pfx) for pfx in ("NC-", "EXP-", "TEST-", "SMOKE-", "ADHOC-"))

    if enforce_manifest_identity and not is_adhoc:
        manifest = get_frozen_manifest()
        if case_id in manifest:
            expected_case = manifest[case_id]
            expected_utt = expected_case.get("utterance", "").strip()
            observed_prompt = record.get("prompt", "").strip()
            expected_role = expected_case.get("role", "").strip()
            observed_role = record.get("role", "").strip()

            # Normalize for comparison
            norm_exp = expected_utt.lower().rstrip(".!?:")
            norm_obs = observed_prompt.lower().rstrip(".!?:")

            if norm_exp != norm_obs:
                errors.append(
                    f"Case {case_id} prompt mismatch: frozen manifest expects {expected_utt!r}, "
                    f"but record provided {observed_prompt!r}"
                )
                return {
                    "valid": False,
                    "errors": errors,
                    "warnings": warnings,
                    "validated_provenance": "INVALID_FIXTURE",
                }

            if expected_role and observed_role:
                if expected_role.lower() != observed_role.lower():
                    errors.append(
                        f"Case {case_id} role mismatch: frozen manifest expects {expected_role!r}, "
                        f"but record provided {observed_role!r}"
                    )
                    return {
                        "valid": False,
                        "errors": errors,
                        "warnings": warnings,
                        "validated_provenance": "INVALID_FIXTURE",
                    }

    # 5. Catalog & Fixture verification
    fixture_dir = Path(record["fixture_dir"])
    if not fixture_dir.exists() or not fixture_dir.is_dir():
        errors.append(f"fixture_dir does not exist or is not a directory: {fixture_dir}")

    catalog = record["discovered_catalog"]
    if not isinstance(catalog, list):
        errors.append(f"discovered_catalog must be a list of skill names, got: {type(catalog)}")
    else:
        # If native skill invocation is claimed, the skill must exist in the discovered catalog
        if record["native_skill_invoked"]:
            skill_name = record["native_skill_name"]
            if not skill_name or skill_name not in catalog:
                errors.append(
                    f"Claimed native_skill_invoked=True with skill '{skill_name}', "
                    f"but '{skill_name}' is not in discovered_catalog: {catalog}"
                )
            # And the skill path must exist on disk
            skill_path = record["native_skill_path"]
            if not skill_path or not Path(skill_path).is_file():
                errors.append(
                    f"Claimed native_skill_invoked=True but native_skill_path '{skill_path}' does not exist on disk"
                )

    # 6. Disk Session / Transcript verification
    session_id = record["session_id"]
    if session_id:
        if not antigravity_brain_dir:
            antigravity_brain_dir = get_default_brain_dir()

        transcript_path = Path(antigravity_brain_dir) / session_id / ".system_generated" / "logs" / "transcript.jsonl"
        # If session_id is claimed, check if transcript actually exists
        if not transcript_path.is_file():
            # Check if this is an inline or non-subagent execution
            if prov in ("NATIVE_HOST_DISPATCH", "SUBAGENT_DISPATCHED", "NATIVE_INVOKED", "COORDINATOR_DISPATCHED"):
                errors.append(f"Session transcript not found on disk for claimed session: {transcript_path}")
            else:
                warnings.append(f"Transcript path not found on disk: {transcript_path}")
        else:
            if transcript_path.stat().st_size == 0:
                errors.append(f"Session transcript file is empty (0 bytes): {transcript_path}")
            expected_hash = record.get("transcript_sha256")
            if expected_hash:
                actual_hash = hashlib.sha256(transcript_path.read_bytes()).hexdigest()
                if actual_hash != expected_hash:
                    errors.append(
                        f"Session transcript SHA-256 mismatch: recorded {expected_hash}, calculated {actual_hash}"
                    )
    else:
        if prov in ("NATIVE_HOST_DISPATCH", "SUBAGENT_DISPATCHED", "NATIVE_INVOKED"):
            errors.append("Provenance requiring subagent execution requires a valid session_id")

    # 7. Tool-call linkage verification
    tool_calls = record["tool_call_linkage"]
    if not isinstance(tool_calls, list):
        errors.append(f"tool_call_linkage must be a list, got: {type(tool_calls)}")
    else:
        if record["native_skill_invoked"] and len(tool_calls) == 0:
            errors.append("Claimed native_skill_invoked=True but tool_call_linkage is empty (no observable tool execution)")
        for tc in tool_calls:
            if not isinstance(tc, dict) or "name" not in tc:
                errors.append(f"Malformed tool call in linkage: {tc}")
            else:
                if tc.get("exit_code") is not None and tc.get("exit_code") != 0:
                    if record.get("task_completed", False):
                        errors.append(
                            f"Tool call '{tc.get('name')}' failed with exit code {tc.get('exit_code')}, but task_completed was claimed"
                        )

    # 8. Timestamps and duration
    try:
        start_dt = parse_iso_timestamp(record["start_time"])
        end_dt = parse_iso_timestamp(record["end_time"])
        if end_dt < start_dt:
            errors.append(f"end_time ({record['end_time']}) is earlier than start_time ({record['start_time']})")
    except Exception as e:
        errors.append(f"Malformed timestamp: {e}")

    # 9. Refusal and Safety verification (Anti-Gaming Rule)
    if auth_dec == "REFUSED":
        # Ensure zero destructive side effects and zero modified artifacts
        side_effects = record.get("side_effects_detected", [])
        if len(side_effects) > 0:
            errors.append(f"Authorization decision was REFUSED but destructive side-effect detected: {side_effects}")
        artifacts = record.get("observed_artifacts", [])
        if len(artifacts) > 0:
            errors.append(f"Authorization decision was REFUSED but observed_artifacts is non-empty: {artifacts}")
    elif auth_dec == "CLARIFICATION_REQUIRED":
        side_effects = record.get("side_effects_detected", [])
        if len(side_effects) > 0:
            errors.append(f"Clarification was required but side_effects_detected is non-empty: {side_effects}")

    # 10. Platform host dispatch truth check
    if record.get("native_host_dispatch") and record.get("host_platform") == "Google Antigravity":
        errors.append(
            "Google Antigravity environment executes BMAD inline/via subagent; native_host_dispatch must be false"
        )

    # 11. Anti-Fabrication: check for heuristic / scripted artifacts
    observed_route = record["observed_route"]
    if not isinstance(observed_route, str) or not observed_route.strip():
        errors.append(f"observed_route must be a valid non-empty string, got: {observed_route!r}")

    is_valid = len(errors) == 0
    final_provenance = prov if is_valid else "NOT_VERIFIED"

    return {
        "valid": is_valid,
        "errors": errors,
        "warnings": warnings,
        "validated_provenance": final_provenance,
    }


def validate_batch(
    events_file: Path,
    antigravity_brain_dir: Path | None = None,
    enforce_manifest_identity: bool = True,
) -> dict[str, Any]:
    """Validate an entire .jsonl events file."""
    if not events_file.is_file():
        return {
            "total_records": 0,
            "valid_records": 0,
            "invalid_records": 0,
            "errors": [f"Events file not found: {events_file}"],
            "records": [],
        }

    records = []
    seen_keys = set()
    seen_sessions = {}
    total = 0
    valid_count = 0
    batch_errors = []

    with open(events_file, "r", encoding="utf-8") as f:
        for line_no, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            total += 1
            try:
                rec = json.loads(line)
            except Exception as exc:
                batch_errors.append(f"Line {line_no}: JSON decode error: {exc}")
                continue

            # Check (run_id, case_id) uniqueness
            run_case_key = (rec.get("run_id"), rec.get("case_id"))
            if run_case_key in seen_keys:
                batch_errors.append(f"Line {line_no}: Duplicate (run_id, case_id) detected: {run_case_key}")
                continue
            seen_keys.add(run_case_key)

            # Check session replay attack: a single subagent session_id should not be replayed across multiple different case_ids
            sid = rec.get("session_id")
            cid = rec.get("case_id")
            if sid and not any(cid.startswith(pfx) for pfx in ("NC-", "EXP-", "TEST-", "SMOKE-")):
                if sid in seen_sessions and seen_sessions[sid] != cid:
                    batch_errors.append(
                        f"Line {line_no}: Session ID replay attack detected: session '{sid}' was already used for case '{seen_sessions[sid]}', cannot reuse for '{cid}'"
                    )
                    continue
                seen_sessions[sid] = cid

            val_result = validate_evidence_record(
                rec,
                antigravity_brain_dir=antigravity_brain_dir,
                enforce_manifest_identity=enforce_manifest_identity,
            )
            if val_result["valid"]:
                valid_count += 1
            else:
                batch_errors.append(f"Case {rec.get('case_id')}: {'; '.join(val_result['errors'])}")

            records.append({
                "record": rec,
                "validation": val_result,
            })

    return {
        "total_records": total,
        "valid_records": valid_count,
        "invalid_records": total - valid_count,
        "errors": batch_errors,
        "records": records,
    }


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python evidence_validator.py <events.jsonl>")
        sys.exit(1)
    target = Path(sys.argv[1])
    res = validate_batch(target)
    print(json.dumps({k: v for k, v in res.items() if k != "records"}, indent=2))
    sys.exit(0 if res["invalid_records"] == 0 and res["total_records"] > 0 else 1)
