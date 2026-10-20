#!/usr/bin/env python3
"""
Unit tests for the RelayDesk Behavioral Routing Evaluator.
Verifies all negative security, ticket-mismatch, and evidence-integrity checks.
"""

import unittest
from pathlib import Path
from evaluator import validate_scenario_observation, validate_suite_consistency, ValidationError

class EvaluatorIntegrityTests(unittest.TestCase):

    def setUp(self):
        self.base_dir = Path(__file__).resolve().parent

    def test_negative_story_13_routed_to_story_17_must_fail(self):
        """CRITICAL: Story 1.3 request routed to story 1.7 MUST FAIL."""
        case = {
            "id": "V6-03",
            "user_request": "Implement story 1.3 fully and verify.",
            "expected_route": "bmad-build story 1.3",
            "critical_behavior": "one ticket, not full epic",
            "clarification_or_block_expected": False
        }
        # Observation routes to 1.7 instead of 1.3
        obs = {
            "execution_id": "EXEC-TEST-001",
            "raw_model_response": "Routing to bmad-build story 1.7 for execution.",
            "trace_source": "test_session_1",
            "selected_workflow": "bmad-build story 1.7",
            "selected_ticket": "1.7",
            "evidence_path": None
        }
        res = validate_scenario_observation(case, obs, base_dir=self.base_dir)
        self.assertEqual(res["status"], "FAIL")
        self.assertEqual(res["levels"]["L3_route_selection"], "FAIL")
        self.assertIn("Ticket mismatch", res["reason"])
        self.assertIn("requested ticket 1.3", res["reason"])
        self.assertIn("routed to 1.7", res["reason"])

    def test_negative_manual_pass_status_is_ignored_if_workflow_mismatched(self):
        """Manually supplying selection_status: PASS does NOT grant a pass."""
        case = {
            "id": "PLAN-01",
            "user_request": "Create PRD from my new product brief.",
            "expected_route": "bmad-prd create",
            "critical_behavior": "PRD generation",
            "clarification_or_block_expected": False
        }
        obs = {
            "execution_id": "EXEC-TEST-002",
            "selection_status": "PASS",  # Attempted manual pass override
            "raw_model_response": "I am selecting bmad-agent-architect instead.",
            "trace_source": "test_session_2",
            "selected_workflow": "bmad-agent-architect",
            "evidence_path": None
        }
        res = validate_scenario_observation(case, obs, base_dir=self.base_dir)
        self.assertEqual(res["status"], "FAIL")
        self.assertEqual(res["levels"]["L3_route_selection"], "FAIL")
        self.assertIn("Skill mismatch", res["reason"])

    def test_negative_read_only_request_routed_to_write_must_fail(self):
        """Read-only request routed to write/build workflow MUST FAIL."""
        case = {
            "id": "V6-10",
            "user_request": "Review the current PR but DO NOT make edits.",
            "expected_route": "bmad-code-review read-only",
            "critical_behavior": "read-only; no code edits",
            "clarification_or_block_expected": False
        }
        obs = {
            "execution_id": "EXEC-TEST-003",
            "raw_model_response": "I will run bmad-build to fix and verify.",
            "trace_source": "test_session_3",
            "selected_workflow": "bmad-build",
            "evidence_path": None
        }
        res = validate_scenario_observation(case, obs, base_dir=self.base_dir)
        self.assertEqual(res["status"], "FAIL")
        self.assertEqual(res["levels"]["L3_route_selection"], "FAIL")
        self.assertIn("Read-only constraint violated", res["reason"])

    def test_negative_missing_raw_model_trace_is_unverified(self):
        """A narrative trace without raw_model_response CANNOT pass."""
        case = {
            "id": "V6-01",
            "user_request": "Create epics and stories from the approved PRD; no code.",
            "expected_route": "bmad-create-epics-and-stories",
            "critical_behavior": "planning-only",
            "clarification_or_block_expected": False
        }
        obs = {
            "execution_id": "EXEC-TEST-004",
            "raw_model_response": None,  # Missing raw response
            "trace_source": "session_log",
            "selected_workflow": "bmad-create-epics-and-stories",
            "evidence_path": None
        }
        res = validate_scenario_observation(case, obs, base_dir=self.base_dir)
        self.assertEqual(res["status"], "UNVERIFIED")
        self.assertEqual(res["levels"]["L3_route_selection"], "UNVERIFIED")
        self.assertIn("Missing raw_model_response", res["reason"])

    def test_negative_nonexistent_evidence_path_must_fail(self):
        """Specifying an evidence path that does not exist on disk MUST FAIL."""
        case = {
            "id": "V6-01",
            "user_request": "Create epics and stories from the approved PRD; no code.",
            "expected_route": "bmad-create-epics-and-stories",
            "critical_behavior": "planning-only",
            "clarification_or_block_expected": False
        }
        obs = {
            "execution_id": "EXEC-TEST-005",
            "raw_model_response": "Selecting bmad-create-epics-and-stories.",
            "trace_source": "session_5",
            "selected_workflow": "bmad-create-epics-and-stories",
            "evidence_path": "nonexistent/fake/file.md"
        }
        res = validate_scenario_observation(case, obs, base_dir=self.base_dir)
        self.assertEqual(res["status"], "FAIL")
        self.assertIn("does not exist on disk", res["reason"])

    def test_positive_authentic_observation_with_valid_trace_passes(self):
        """Authentic observation with matching skill, matching ticket, and raw trace PASSES."""
        case = {
            "id": "V6-03",
            "user_request": "Implement story 1.3 fully and verify.",
            "expected_route": "bmad-build story 1.3",
            "critical_behavior": "one ticket, not full epic",
            "clarification_or_block_expected": False
        }
        obs = {
            "execution_id": "EXEC-TEST-006",
            "raw_model_response": "Selected workflow: bmad-build for story 1.3.",
            "trace_source": "test_session_6",
            "selected_workflow": "bmad-build story 1.3",
            "selected_ticket": "1.3",
            "evidence_path": None
        }
        res = validate_scenario_observation(case, obs, base_dir=self.base_dir)
        self.assertEqual(res["status"], "PASS")
        self.assertEqual(res["levels"]["L1_contract"], "PASS")
        self.assertEqual(res["levels"]["L2_target_resolve"], "PASS")
        self.assertEqual(res["levels"]["L3_route_selection"], "PASS")
        self.assertEqual(res["levels"]["L4_native_invocation"], "BLOCKED")
        self.assertEqual(res["levels"]["L5_verified_outcome"], "NOT_RUN")

    def test_suite_consistency_fails_on_contradiction(self):
        """Summary metrics contradicting actual scenario cases MUST raise ValidationError."""
        cases = [
            {"levels": {"L3_route_selection": "PASS"}},
            {"levels": {"L3_route_selection": "NOT_RUN"}}
        ]
        summary = {
            "total_cases": 2,
            "l3_route_selection_pass": 2,  # Contradicts actual pass count (1)
            "l3_route_selection_not_run": 1
        }
        with self.assertRaises(ValidationError):
            validate_suite_consistency(cases, summary)

if __name__ == "__main__":
    unittest.main()
