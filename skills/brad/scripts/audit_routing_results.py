#!/usr/bin/env python3
"""Audit independently observed routing against BRAD's 85-case specification.

This is an *evaluation tool*, never a workflow executor or an AI routing engine.
Input observations must be captured by the host/evaluator. Missing evidence is
NOT_RUN, not a passing case. Does not read/modify project state or access network.

Usage: python audit_routing_results.py --observed results.json [--cases ...] [--pretty]
Observation list entries:
 {"id":"V6-01", "selected":"bmad-create-epics-and-stories",
  "invoked":[{"skill":"bmad-create-epics-and-stories","evidence":"logs/1.txt"}],
  "delivery":{"status":"PASS","evidence":"reports/1.md"}}
"""
from __future__ import annotations
import argparse
import json
import re
from pathlib import Path

NATIVE = re.compile(r"\b(?:bmad|gds)-[a-z][a-z0-9-]*\b")
DELIVERY = {"PASS", "FAIL", "PARTIAL", "BLOCKED", "UNSUPPORTED", "NOT_RUN"}


def required_skills(route: str) -> list[str]:
    """Get exact native skill IDs only; free-form alternatives need human review."""
    return list(dict.fromkeys(NATIVE.findall(route.lower())))


def summarize(cases: list[dict], observed: list[dict]) -> dict:
    canonical = {case["id"]: case for case in cases}
    if len(canonical) != len(cases):
        raise ValueError("Duplicate canonical case ID")
    records = {}
    for o in observed:
        key = o.get("id")
        if key not in canonical:
            raise ValueError(f"Unknown scenario ID: {key}")
        if key in records:
            raise ValueError(f"Duplicate observed scenario: {key}")
        records[key] = o
    output = []
    for case in cases:
        key = case["id"]
        obs = records.get(key)
        expected = case["expected_route"]
        native = required_skills(expected)
        selection = "NOT_RUN"
        invocation = "NOT_RUN"
        delivery = "NOT_RUN"
        reason = "No observed run provided"
        if obs is not None:
            selected = obs.get("selected")
            if not isinstance(selected, str) or not selected.strip():
                selection, reason = "NOT_RUN", "No selected route recorded"
            elif not native:
                selection, reason = "REVIEW_REQUIRED", "Expected route is conditional/free-form; manual contract review required"
            else:
                actual = required_skills(selected)
                if not actual:
                    selection, reason = "FAIL", f"No native skill in selection: {selected}"
                elif (all(x in actual for x in native) if " + " in expected else any(x in actual for x in native)):
                    selection, reason = "PASS", "Native route agrees with expected skill identifier"
                else:
                    selection, reason = "FAIL", f"Expected one of {native}; selected {actual}"
            invocations = obs.get("invoked", [])
            if not isinstance(invocations, list):
                raise ValueError(f"{key}.invoked must be an array")
            attested = [x.get("skill") for x in invocations if isinstance(x, dict) and isinstance(x.get("evidence"), str) and x["evidence"].strip()]
            # An L3 route match is never enough to prove L4 invocation.
            if attested:
                if selection == "PASS" and (all(n in attested for n in native) if " + " in expected else any(n in attested for n in native)):
                    invocation = "EVIDENCE_REPORTED"
                else:
                    invocation = "REVIEW_REQUIRED"
            result = obs.get("delivery", {})
            if result:
                if not isinstance(result, dict) or result.get("status") not in DELIVERY:
                    raise ValueError(f"Invalid delivery result for {key}")
                st = result["status"]
                # A claimed PASS without a trace is unverified, even if text says pass.
                delivery = st if st != "PASS" or (isinstance(result.get("evidence"), str) and result["evidence"].strip()) else "UNVERIFIED"
        output.append({"id": key, "expected": expected, "selected": obs.get("selected") if obs else None,
                       "selection": selection, "invocation": invocation, "delivery": delivery,
                       "reason": reason})
    def counts(field: str) -> dict[str, int]:
        out = {}
        for o in output:
            v = o[field]
            out[v] = out.get(v, 0) + 1
        return out
    return {"total": len(cases), "observed": len(records), "selection": counts("selection"),
            "invocation": counts("invocation"), "delivery": counts("delivery"),
            "notes": ["This audit does not independently validate existence or content of evidence files.",
                      "EVIDENCE_REPORTED is not proven independent specialist invocation.",
                      "Comparing labels is not a model-in-the-loop benchmark; assess artifacts separately."],
            "cases": output}


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--observed", type=Path, required=True)
    p.add_argument("--cases", type=Path, default=Path(__file__).resolve().parents[1] / "evals" / "routing-cases.json")
    p.add_argument("--pretty", action="store_true")
    a = p.parse_args()
    raw = json.loads(a.cases.read_text(encoding="utf-8"))
    observed = json.loads(a.observed.read_text(encoding="utf-8"))
    if not isinstance(observed, list):
        p.error("observations must be a JSON array")
    print(json.dumps(summarize(raw["cases"], observed), indent=2 if a.pretty else None))


if __name__ == "__main__":
    main()
