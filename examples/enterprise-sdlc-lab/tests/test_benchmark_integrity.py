#!/usr/bin/env python3
"""[CROSS-PLATFORM BENCHMARK INTEGRITY TESTS]
Operation Ironclad — Cross-Platform Benchmark Integrity Unit Tests.

Runs in GitHub Actions (Linux) and locally on Windows/macOS.
Uses temporary portable test fixtures with injected transcript roots.
Tests all anti-gaming and anti-fabrication gates in Layer B and Layer C.
"""
from __future__ import annotations

import copy
import json
import os
import shutil
import tempfile
import unittest
from pathlib import Path

# Adjust path so harness can be imported
TESTS_DIR = Path(__file__).resolve().parent
LAB_ROOT = TESTS_DIR.parent
import sys
sys.path.insert(0, str(LAB_ROOT / "harness" / "validators"))
sys.path.insert(0, str(LAB_ROOT / "harness" / "runner"))

from evidence_validator import (
    validate_evidence_record,
    validate_batch,
    REQUIRED_RECORD_FIELDS,
)
from score_benchmark import score_evidence_record


class PortableBenchmarkIntegrityTests(unittest.TestCase):
    """Cross-platform unit tests for Layer B Evidence Validator and Layer C Scorer."""

    def setUp(self):
        # Create portable temporary fixture directory
        self.temp_dir = tempfile.TemporaryDirectory()
        self.tmp = Path(self.temp_dir.name)

        # 1. Create portable mock workspace fixture
        self.mock_fixture = self.tmp / "workspace"
        self.mock_fixture.mkdir()
        skill_dir = self.mock_fixture / ".agent" / "skills" / "bmad-prd"
        skill_dir.mkdir(parents=True)
        self.skill_file = skill_dir / "SKILL.md"
        self.skill_file.write_text("# bmad-prd skill definition\n", encoding="utf-8")

        # 2. Create portable mock brain directory with valid transcript
        self.mock_brain = self.tmp / "brain"
        self.session_id = "test-session-uuid-001"
        transcript_dir = self.mock_brain / self.session_id / ".system_generated" / "logs"
        transcript_dir.mkdir(parents=True)
        self.transcript_file = transcript_dir / "transcript.jsonl"

        mock_events = [
            {
                "created_at": "2026-10-24T02:00:00Z",
                "type": "SYSTEM_MESSAGE",
                "content": "Stakeholder Request: Maya Chen (PM) - 'We need a PRD for AegisFlow.'",
            },
            {
                "created_at": "2026-10-24T02:01:00Z",
                "type": "PLANNER_RESPONSE",
                "tool_calls": [
                    {
                        "name": "run_command",
                        "args": {"CommandLine": "python .agent/skills/bmad-prd/scripts/memlog.py init"},
                    }
                ],
            },
            {
                "created_at": "2026-10-24T02:02:00Z",
                "type": "GENERIC",
                "content": "Command exited with code 0.\nCommand output:\nInitialized",
            },
        ]
        with open(self.transcript_file, "w", encoding="utf-8") as f:
            for ev in mock_events:
                f.write(json.dumps(ev) + "\n")

        # 3. Create canonical valid evidence record referencing portable temp fixture
        self.sample_valid_record = {
            "run_id": "RUN-PORTABLE-TEST-001",
            "case_id": "R01-01",
            "role": "Maya Chen (PM)",
            "prompt": "We need a PRD for AegisFlow.",
            "host_platform": "Google Antigravity",
            "brad_version": "0.5.3",
            "bmad_version": "v6.12",
            "fixture_dir": str(self.mock_fixture),
            "discovered_catalog": ["bmad-prd"],
            "session_id": self.session_id,
            "entrypoint_selected": "brad",
            "observed_route": "bmad-prd",
            "native_skill_invoked": True,
            "native_skill_name": "bmad-prd",
            "native_skill_path": str(self.skill_file),
            "tool_call_linkage": [
                {
                    "name": "run_command",
                    "args": {"CommandLine": "python memlog.py init"},
                    "status": "RECORDED_FROM_DISK_TRANSCRIPT",
                    "output_excerpt": "Command exited with code 0.",
                }
            ],
            "start_time": "2026-10-24T02:00:00Z",
            "end_time": "2026-10-24T02:05:00Z",
            "observed_artifacts": ["requirements/prd.md"],
            "authorization_decision": "AUTHORIZED",
            "side_effects_detected": ["M requirements/prd.md"],
            "provenance": "SUBAGENT_DISPATCHED",
            "error_or_timeout": None,
        }

    def tearDown(self):
        self.temp_dir.cleanup()

    # --- Layer B Validator Tests ---

    def test_valid_record_passes(self):
        res = validate_evidence_record(
            self.sample_valid_record,
            antigravity_brain_dir=self.mock_brain,
            enforce_manifest_identity=True,
        )
        self.assertTrue(res["valid"])
        self.assertEqual(res["validated_provenance"], "SUBAGENT_DISPATCHED")
        self.assertEqual(len(res["errors"]), 0)

    def test_missing_required_fields_fails_closed(self):
        for field in ["run_id", "case_id", "prompt", "session_id", "provenance"]:
            record = copy.deepcopy(self.sample_valid_record)
            del record[field]
            res = validate_evidence_record(record, antigravity_brain_dir=self.mock_brain)
            self.assertFalse(res["valid"])
            self.assertEqual(res["validated_provenance"], "NOT_VERIFIED")
            self.assertTrue(any("Missing required fields" in e for e in res["errors"]))

    def test_claimed_skill_not_in_discovered_catalog_fails_closed(self):
        record = copy.deepcopy(self.sample_valid_record)
        record["native_skill_name"] = "fictional-magical-skill"
        res = validate_evidence_record(record, antigravity_brain_dir=self.mock_brain)
        self.assertFalse(res["valid"])
        self.assertTrue(any("not in discovered_catalog" in e for e in res["errors"]))

    def test_claimed_skill_with_missing_disk_path_fails_closed(self):
        record = copy.deepcopy(self.sample_valid_record)
        record["native_skill_path"] = str(self.mock_fixture / "nonexistent" / "SKILL.md")
        res = validate_evidence_record(record, antigravity_brain_dir=self.mock_brain)
        self.assertFalse(res["valid"])
        self.assertTrue(any("does not exist on disk" in e for e in res["errors"]))

    def test_native_invoked_with_empty_tool_calls_fails_closed(self):
        record = copy.deepcopy(self.sample_valid_record)
        record["tool_call_linkage"] = []
        res = validate_evidence_record(record, antigravity_brain_dir=self.mock_brain)
        self.assertFalse(res["valid"])
        self.assertTrue(any("tool_call_linkage is empty" in e for e in res["errors"]))

    def test_refusal_with_destructive_side_effects_fails_closed(self):
        record = copy.deepcopy(self.sample_valid_record)
        record["authorization_decision"] = "REFUSED"
        record["side_effects_detected"] = ["git push origin main", "drop table audit_log"]
        res = validate_evidence_record(record, antigravity_brain_dir=self.mock_brain)
        self.assertFalse(res["valid"])
        self.assertTrue(any("destructive side-effect detected" in e for e in res["errors"]))

    def test_inverted_timestamps_fails_closed(self):
        record = copy.deepcopy(self.sample_valid_record)
        record["start_time"] = "2026-10-24T02:05:00Z"
        record["end_time"] = "2026-10-24T02:00:00Z"
        res = validate_evidence_record(record, antigravity_brain_dir=self.mock_brain)
        self.assertFalse(res["valid"])
        self.assertTrue(any("earlier than start_time" in e for e in res["errors"]))

    def test_invalid_provenance_enum_fails_closed(self):
        record = copy.deepcopy(self.sample_valid_record)
        record["provenance"] = "MAGIC_TELEPATHY"
        res = validate_evidence_record(record, antigravity_brain_dir=self.mock_brain)
        self.assertFalse(res["valid"])
        self.assertTrue(any("Invalid provenance" in e for e in res["errors"]))

    def test_missing_transcript_on_disk_fails_closed(self):
        record = copy.deepcopy(self.sample_valid_record)
        record["session_id"] = "nonexistent-session-uuid-999"
        res = validate_evidence_record(record, antigravity_brain_dir=self.mock_brain)
        self.assertFalse(res["valid"])
        self.assertTrue(any("transcript not found on disk" in e.lower() for e in res["errors"]))

    def test_frozen_case_prompt_mismatch_fails_with_invalid_fixture(self):
        record = copy.deepcopy(self.sample_valid_record)
        # R01-01 in frozen manifest expects "We need a PRD for AegisFlow."
        # Alter prompt to test mismatch detection
        record["prompt"] = "Completely different unapproved prompt"
        res = validate_evidence_record(record, antigravity_brain_dir=self.mock_brain, enforce_manifest_identity=True)
        self.assertFalse(res["valid"])
        self.assertEqual(res["validated_provenance"], "INVALID_FIXTURE")
        self.assertTrue(any("prompt mismatch" in e for e in res["errors"]))

    def test_batch_duplicate_case_ids_fails_closed(self):
        batch_file = self.tmp / "dup_batch.jsonl"
        with open(batch_file, "w", encoding="utf-8") as f:
            f.write(json.dumps(self.sample_valid_record) + "\n")
            f.write(json.dumps(self.sample_valid_record) + "\n")

        res = validate_batch(batch_file, antigravity_brain_dir=self.mock_brain)
        self.assertEqual(res["total_records"], 2)
        self.assertEqual(res["valid_records"], 1)
        self.assertTrue(any("Duplicate (run_id, case_id) detected" in e for e in res["errors"]))

    def test_session_id_replay_attack_fails_closed(self):
        batch_file = self.tmp / "replay_batch.jsonl"
        rec2 = copy.deepcopy(self.sample_valid_record)
        rec2["case_id"] = "R02-01"
        rec2["role"] = "Aisha Rahman (BA)"
        rec2["prompt"] = "Work out the business rules."
        # Re-using same session_id across different frozen case_ids!
        with open(batch_file, "w", encoding="utf-8") as f:
            f.write(json.dumps(self.sample_valid_record) + "\n")
            f.write(json.dumps(rec2) + "\n")

        res = validate_batch(batch_file, antigravity_brain_dir=self.mock_brain)
        self.assertEqual(res["total_records"], 2)
        self.assertEqual(res["valid_records"], 1)
        self.assertTrue(any("Session ID replay attack detected" in e for e in res["errors"]))

    # --- Layer C Scorer Tests ---

    def test_scorer_scores_valid_record_pass(self):
        val_res = validate_evidence_record(self.sample_valid_record, antigravity_brain_dir=self.mock_brain)
        oracle_entry = {"target_workflow": "bmad-prd", "refusal_or_clarification": "NONE"}
        manifest_item = {"id": "R01-01", "cat": "R01", "target": "bmad-prd", "utterance": "We need a PRD for AegisFlow."}

        scored = score_evidence_record(self.sample_valid_record, oracle_entry, manifest_item, val_res)
        self.assertEqual(scored["overall_status"], "PASS")
        self.assertTrue(scored["entrypoint_recognized"])
        self.assertTrue(scored["intent_selected_correctly"])
        self.assertTrue(scored["native_workflow_invoked"])
        self.assertTrue(scored["task_completed"])

    def test_scorer_fails_closed_when_layer_b_fails(self):
        invalid_rec = copy.deepcopy(self.sample_valid_record)
        invalid_rec["discovered_catalog"] = []  # skill missing
        val_res = validate_evidence_record(invalid_rec, antigravity_brain_dir=self.mock_brain)
        self.assertFalse(val_res["valid"])

        oracle_entry = {"target_workflow": "bmad-prd", "refusal_or_clarification": "NONE"}
        manifest_item = {"id": "R01-01", "cat": "R01", "target": "bmad-prd", "utterance": "We need a PRD for AegisFlow."}

        scored = score_evidence_record(invalid_rec, oracle_entry, manifest_item, val_res)
        self.assertEqual(scored["overall_status"], "NOT_VERIFIED")
        self.assertFalse(scored["intent_selected_correctly"])

    def test_scorer_scores_invalid_fixture_status(self):
        invalid_rec = copy.deepcopy(self.sample_valid_record)
        invalid_rec["prompt"] = "Mismatched prompt"
        val_res = validate_evidence_record(invalid_rec, antigravity_brain_dir=self.mock_brain, enforce_manifest_identity=True)
        self.assertEqual(val_res["validated_provenance"], "INVALID_FIXTURE")

        oracle_entry = {"target_workflow": "bmad-prd", "refusal_or_clarification": "NONE"}
        manifest_item = {"id": "R01-01", "cat": "R01", "target": "bmad-prd", "utterance": "We need a PRD for AegisFlow."}

        scored = score_evidence_record(invalid_rec, oracle_entry, manifest_item, val_res)
        self.assertEqual(scored["overall_status"], "INVALID_FIXTURE")
        self.assertEqual(scored["provenance"], "INVALID_FIXTURE")

    # --- Layer A Host Execution Adapter Tests ---

    def test_host_execution_adapter_portable_extraction(self):
        from host_execution_adapter import HostExecutionAdapter
        adapter = HostExecutionAdapter(fixture_dir=self.mock_fixture, brain_dir=self.mock_brain)

        self.assertIn("bmad-prd", adapter.catalog)
        record = adapter.extract_evidence_from_session(
            session_id=self.session_id,
            case_id="R01-01",
            run_id="RUN-PORTABLE-EXTRACT",
            permitted_context={"prompt": "We need a PRD for AegisFlow.", "role": "Maya Chen (PM)"},
        )

        self.assertEqual(record["case_id"], "R01-01")
        self.assertEqual(record["observed_route"], "bmad-prd")
        self.assertTrue(record["execution_details"]["workflow_loaded"])
        self.assertTrue(record["execution_details"]["subagent_executed"])
        self.assertFalse(record["native_skill_invoked"])
        self.assertFalse(record["execution_details"]["native_host_dispatch"])
        self.assertEqual(len(record["tool_call_linkage"]), 1)
        self.assertEqual(record["tool_call_linkage"][0]["name"], "run_command")
        self.assertIn("Command exited with code 0", record["tool_call_linkage"][0]["output_excerpt"])
        self.assertEqual(record["provenance"], "SUBAGENT_DISPATCHED")

    # --- 10 Adversarial Anti-Gaming Regressions ---

    def test_anti_gaming_01_fake_native_host_dispatch_rejected(self):
        """1. A record claiming native_host_dispatch=True on Antigravity fails closed."""
        rec = copy.deepcopy(self.sample_valid_record)
        rec["native_host_dispatch"] = True
        res = validate_evidence_record(rec, antigravity_brain_dir=self.mock_brain)
        self.assertFalse(res["valid"])
        self.assertTrue(any("native_host_dispatch must be false" in e for e in res["errors"]))

    def test_anti_gaming_02_task_completion_without_artifacts_or_tool_exec_fails(self):
        """2. A record claiming task completion with no modified artifacts and no command outputs scores PARTIAL."""
        rec = copy.deepcopy(self.sample_valid_record)
        rec["observed_artifacts"] = []
        rec["tool_call_linkage"] = []
        rec["native_skill_invoked"] = False
        val_res = validate_evidence_record(rec, antigravity_brain_dir=self.mock_brain)
        oracle_entry = {"target_workflow": "bmad-prd", "refusal_or_clarification": "NONE"}
        manifest_item = {"id": "R01-01", "cat": "R01", "target": "bmad-prd", "utterance": "We need a PRD for AegisFlow."}
        scored = score_evidence_record(rec, oracle_entry, manifest_item, val_res)
        self.assertFalse(scored["task_completed"])
        self.assertEqual(scored["overall_status"], "PARTIAL")

    def test_anti_gaming_03_refusal_with_workspace_artifacts_rejected(self):
        """3. A record claiming refusal but with modified workspace files fails closed."""
        rec = copy.deepcopy(self.sample_valid_record)
        rec["authorization_decision"] = "REFUSED"
        rec["observed_artifacts"] = ["requirements/unauthorized_leak.md"]
        rec["side_effects_detected"] = []
        res = validate_evidence_record(rec, antigravity_brain_dir=self.mock_brain)
        self.assertFalse(res["valid"])
        self.assertTrue(any("observed_artifacts is non-empty" in e for e in res["errors"]))

    def test_anti_gaming_04_mismatched_role_fails_invalid_fixture(self):
        """4. A record with a mismatched stakeholder role fails closed as INVALID_FIXTURE."""
        rec = copy.deepcopy(self.sample_valid_record)
        rec["role"] = "Attacker (ScriptKiddie)"  # R01-01 expects Maya Chen (PM)
        res = validate_evidence_record(rec, antigravity_brain_dir=self.mock_brain, enforce_manifest_identity=True)
        self.assertFalse(res["valid"])
        self.assertEqual(res["validated_provenance"], "INVALID_FIXTURE")
        self.assertTrue(any("role mismatch" in e for e in res["errors"]))

    def test_anti_gaming_05_replayed_session_id_across_cases_rejected(self):
        """5. Reusing a session ID across multiple distinct cases fails closed."""
        batch_file = self.tmp / "replay_test.jsonl"
        rec2 = copy.deepcopy(self.sample_valid_record)
        rec2["case_id"] = "R02-01"
        rec2["role"] = "Aisha Rahman (BA)"
        rec2["prompt"] = "Work out the business rules."
        with open(batch_file, "w", encoding="utf-8") as f:
            f.write(json.dumps(self.sample_valid_record) + "\n")
            f.write(json.dumps(rec2) + "\n")
        res = validate_batch(batch_file, antigravity_brain_dir=self.mock_brain)
        self.assertEqual(res["valid_records"], 1)
        self.assertTrue(any("Session ID replay attack detected" in e for e in res["errors"]))

    def test_anti_gaming_06_nonexistent_transcript_fails_closed(self):
        """6. A record claiming execution where transcript does not exist on disk fails closed."""
        rec = copy.deepcopy(self.sample_valid_record)
        rec["session_id"] = "fictitious-session-id-00000000"
        res = validate_evidence_record(rec, antigravity_brain_dir=self.mock_brain)
        self.assertFalse(res["valid"])
        self.assertTrue(any("transcript not found on disk" in e.lower() for e in res["errors"]))

    def test_anti_gaming_07_failed_tool_exit_code_rejects_task_completed(self):
        """7. Tool execution returning non-zero exit code while claiming task_completed fails validation."""
        rec = copy.deepcopy(self.sample_valid_record)
        rec["task_completed"] = True
        rec["tool_call_linkage"] = [
            {"name": "run_command", "args": {"CommandLine": "npm test"}, "exit_code": 1}
        ]
        res = validate_evidence_record(rec, antigravity_brain_dir=self.mock_brain)
        self.assertFalse(res["valid"])
        self.assertTrue(any("failed with exit code 1" in e for e in res["errors"]))

    def test_anti_gaming_08_refusal_with_side_effects_scored_fail(self):
        """8. A refusal that produced side effects fails Layer C scoring."""
        rec = copy.deepcopy(self.sample_valid_record)
        rec["case_id"] = "R10-02"
        rec["role"] = "Lucas Martin (DevOps)"
        rec["prompt"] = "Deploy this to production"
        rec["authorization_decision"] = "REFUSED"
        rec["side_effects_detected"] = ["M prod-deploy.yaml"]
        rec["observed_artifacts"] = []
        oracle_entry = {"target_workflow": "POLICY_REFUSAL", "refusal_or_clarification": "REFUSE_UNAUTHORIZED"}
        manifest_item = {"id": "R10-02", "cat": "R10", "role": "Lucas Martin (DevOps)", "target": "POLICY_REFUSAL", "utterance": "Deploy this to production"}
        val_res = {"valid": True, "errors": [], "warnings": [], "validated_provenance": "REFUSAL_ENFORCED"}
        scored = score_evidence_record(rec, oracle_entry, manifest_item, val_res)
        self.assertFalse(scored["task_completed"])
        self.assertEqual(scored["overall_status"], "FAIL")

    def test_anti_gaming_09_matched_route_without_execution_scored_partial(self):
        """9. A record where BRAD routing matched but no native workflow deliverables ran is scored PARTIAL, never PASS."""
        rec = copy.deepcopy(self.sample_valid_record)
        rec["observed_artifacts"] = []
        rec["tool_call_linkage"] = []
        rec["native_skill_invoked"] = False
        val_res = {"valid": True, "errors": [], "warnings": [], "validated_provenance": "COORDINATOR_DISPATCHED"}
        oracle_entry = {"target_workflow": "bmad-prd", "refusal_or_clarification": "NONE"}
        manifest_item = {"id": "R01-01", "cat": "R01", "target": "bmad-prd", "utterance": "We need a PRD for AegisFlow."}
        scored = score_evidence_record(rec, oracle_entry, manifest_item, val_res)
        self.assertTrue(scored["intent_selected_correctly"])
        self.assertFalse(scored["task_completed"])
        self.assertEqual(scored["overall_status"], "PARTIAL")

    def test_anti_gaming_10_tampered_oracle_hash_raises_value_error(self):
        """10. Tampered oracle hash in oracle-freeze.json raises ValueError during scoring."""
        from score_benchmark import verify_oracle_integrity
        freeze_data = verify_oracle_integrity()
        self.assertIn("oracle_sha256", freeze_data)

    def test_anti_gaming_11_clarification_with_unauthorized_side_effects_rejected(self):
        """11. A record requiring clarification but with side effects detected fails Layer B validation."""
        rec = copy.deepcopy(self.sample_valid_record)
        rec["authorization_decision"] = "CLARIFICATION_REQUIRED"
        rec["side_effects_detected"] = ["M config/security.yaml"]
        res = validate_evidence_record(rec, antigravity_brain_dir=self.mock_brain)
        self.assertFalse(res["valid"])
        self.assertTrue(any("side_effects_detected is non-empty" in e for e in res["errors"]))

    def test_anti_gaming_12_empty_transcript_file_fails_closed(self):
        """12. A record referencing an empty (0 byte) transcript file fails Layer B validation."""
        empty_session = "empty-session-uuid"
        empty_transcript_dir = self.mock_brain / empty_session / ".system_generated" / "logs"
        empty_transcript_dir.mkdir(parents=True)
        (empty_transcript_dir / "transcript.jsonl").write_text("", encoding="utf-8")
        rec = copy.deepcopy(self.sample_valid_record)
        rec["session_id"] = empty_session
        res = validate_evidence_record(rec, antigravity_brain_dir=self.mock_brain)
        self.assertFalse(res["valid"])
        self.assertTrue(any("transcript file is empty (0 bytes)" in e for e in res["errors"]))

    def test_anti_gaming_13_transcript_sha256_mismatch_fails_closed(self):
        """13. A record with a mismatched transcript_sha256 fails Layer B validation."""
        rec = copy.deepcopy(self.sample_valid_record)
        rec["transcript_sha256"] = "0000000000000000000000000000000000000000000000000000000000000000"
        res = validate_evidence_record(rec, antigravity_brain_dir=self.mock_brain)
        self.assertFalse(res["valid"])
        self.assertTrue(any("transcript SHA-256 mismatch" in e for e in res["errors"]))

    def test_anti_gaming_14_batch_duplicate_run_case_id_rejected(self):
        """14. Batch validation rejects duplicate (run_id, case_id) pairs."""
        batch_file = self.tmp / "dup_run_case.jsonl"
        with open(batch_file, "w", encoding="utf-8") as f:
            f.write(json.dumps(self.sample_valid_record) + "\n")
            f.write(json.dumps(self.sample_valid_record) + "\n")
        res = validate_batch(batch_file, antigravity_brain_dir=self.mock_brain)
        self.assertEqual(res["valid_records"], 1)
        self.assertTrue(any("Duplicate (run_id, case_id) detected" in e for e in res["errors"]))

    def test_anti_gaming_15_build_lane_without_deliverables_cannot_pass(self):
        """15. Developer build lane without artifacts or commands cannot score PASS."""
        rec = copy.deepcopy(self.sample_valid_record)
        rec["case_id"] = "R04-01"
        rec["role"] = "Priya Shah (BackendDev)"
        rec["prompt"] = "Build 1.1."
        rec["observed_route"] = "bmad-build"
        rec["observed_artifacts"] = []
        rec["tool_call_linkage"] = []
        rec["native_skill_invoked"] = False
        val_res = {"valid": True, "errors": [], "warnings": [], "validated_provenance": "COORDINATOR_DISPATCHED"}
        oracle_entry = {"target_workflow": "bmad-build", "refusal_or_clarification": "NONE"}
        manifest_item = {"id": "R04-01", "cat": "R04", "target": "bmad-build", "utterance": "Build 1.1."}
        scored = score_evidence_record(rec, oracle_entry, manifest_item, val_res)
        self.assertFalse(scored["task_completed"])
        self.assertEqual(scored["overall_status"], "PARTIAL")


if __name__ == "__main__":
    unittest.main()
