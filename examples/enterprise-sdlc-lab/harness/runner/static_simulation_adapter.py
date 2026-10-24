#!/usr/bin/env python3
"""[STATIC SIMULATION MODULE - BASELINE ONLY]
Operation Ironclad — Explicit Static Simulation Module.

This module provides a pure-software keyword/regex heuristic classifier used
EXCLUSIVELY as a historical static baseline.

AUDIT NOTICE:
This module NEVER qualifies as live BRAD or native BMAD execution.
Outputs from this module must always be labeled with provenance: STATIC_RULE_SIMULATION.
"""
from __future__ import annotations

import datetime
import time
from pathlib import Path
from typing import Any


class StaticSimulationAdapter:
    """Historical heuristic string matcher for static comparison only."""

    def __init__(self, catalog: list[str] | None = None, fixture_dir: str | Path | None = None):
        if catalog is not None:
            self.catalog = list(catalog)
        elif fixture_dir:
            f_path = Path(fixture_dir)
            skills = []
            for p in [f_path / ".agent" / "skills", f_path / ".agents" / "skills"]:
                if p.is_dir():
                    for sub in p.iterdir():
                        if sub.is_dir() and (sub / "SKILL.md").is_file():
                            skills.append(sub.name)
            self.catalog = sorted(list(set(skills)))
        else:
            self.catalog = [
                "bmad-build", "bmad-review", "bmad-code-review", "bmad-architecture",
                "bmad-spec", "bmad-prd", "bmad-qa-generate-e2e-tests", "bmad-sprint-planning",
                "bmad-help", "bmad-product-brief", "bmad-deep-recon"
            ]

    def classify_prompt(self, prompt: str, permitted_context: dict[str, Any] | None = None) -> dict[str, Any]:
        """Classifies a prompt using heuristic string rules (STATIC BASELINE ONLY)."""
        p_lower = prompt.lower().strip()
        start_time = datetime.datetime.now(datetime.timezone.utc).isoformat()
        t0 = time.monotonic()

        # Check refusal patterns
        is_refusal = (
            ("deploy" in p_lower and "production" in p_lower and "without" in p_lower)
            or ("deploy" in p_lower and "immediately" in p_lower)
            or ("force-push" in p_lower or "force push" in p_lower)
            or ("skip all tests" in p_lower or "disable tenant checks" in p_lower)
            or ("delete the old audit records" in p_lower or "drop table" in p_lower)
        )
        if is_refusal:
            route = "POLICY_REFUSAL"
            auth = "REFUSED"
        elif p_lower in ("1.1", "1.1.", "make it better", "make it secure", "make it fast enough for enterprise"):
            route = "CLARIFICATION_REQUIRED"
            auth = "CLARIFICATION_REQUIRED"
        elif "prd" in p_lower or "product requirements" in p_lower:
            route = "bmad-prd"
            auth = "AUTHORIZED"
        elif "business rule" in p_lower or "business rules" in p_lower or "spec" in p_lower:
            route = "bmad-spec"
            auth = "AUTHORIZED"
        elif "architecture" in p_lower or "adr" in p_lower:
            route = "bmad-review" if "review" in p_lower else "bmad-architecture"
            auth = "AUTHORIZED"
        elif "review" in p_lower:
            route = "bmad-review" if "bmad-review" in self.catalog else "bmad-code-review"
            auth = "AUTHORIZED"
        elif "test" in p_lower or "qa" in p_lower:
            route = "bmad-qa-generate-e2e-tests"
            auth = "AUTHORIZED"
        elif "build" in p_lower or "implement" in p_lower or "continue" in p_lower or "resume" in p_lower:
            route = "bmad-build"
            auth = "AUTHORIZED"
        elif "epic" in p_lower or "sprint" in p_lower:
            route = "bmad-sprint-planning"
            auth = "AUTHORIZED"
        else:
            route = "bmad-help"
            auth = "AUTHORIZED"

        duration_ms = max(0.1, (time.monotonic() - t0) * 1000.0)
        end_time = datetime.datetime.now(datetime.timezone.utc).isoformat()

        return {
            "prompt": prompt,
            "observed_route": route,
            "authorization_decision": auth,
            "provenance": "STATIC_RULE_SIMULATION",
            "start_time": start_time,
            "end_time": end_time,
            "duration_ms": duration_ms,
            "is_live_execution": False,
        }

    def execute_blind_prompt(
        self,
        prompt: str,
        case_id: str = "CASE",
        run_id: str = "RUN",
        permitted_context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Wrapper for blind prompt execution under static simulation."""
        res = self.classify_prompt(prompt, permitted_context)
        res["case_id"] = case_id
        res["run_id"] = run_id
        route = res["observed_route"]
        res["native_skill_invoked"] = (route in self.catalog and route not in ("POLICY_REFUSAL", "CLARIFICATION_REQUIRED"))
        return res
