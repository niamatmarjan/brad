import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "inspect_bmad.py"
_spec = importlib.util.spec_from_file_location("inspect_bmad", SCRIPT)
_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_module)
inspect = _module.inspect


def skill(root, name, parent=".agents/skills"):
    path = Path(root) / parent / name / "SKILL.md"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"---\nname: {name}\ndescription: test\n---\n", encoding="utf-8")


class InspectorTests(unittest.TestCase):
    def test_empty_not_claiming_bmad(self):
        with tempfile.TemporaryDirectory() as tmp:
            data = inspect(Path(tmp))
            self.assertEqual(data["version_hint_not_proof"], "unknown")
            self.assertFalse(data["bmad_runtime_present"])
            self.assertEqual(data["installed_project_skill_definitions"], {})

    def test_v6(self):
        with tempfile.TemporaryDirectory() as tmp:
            skill(tmp, "bmad-help")
            skill(tmp, "bmad-sprint-planning")
            (Path(tmp) / "_bmad-output" / "implementation-artifacts").mkdir(parents=True)
            (Path(tmp) / "_bmad-output" / "implementation-artifacts" / "sprint-status.yaml").touch()
            data = inspect(Path(tmp))
            self.assertEqual(data["version_hint_not_proof"], "v6_likely")
            self.assertEqual(len(data["sprint_status_files_sample"]), 1)

    def test_v7(self):
        with tempfile.TemporaryDirectory() as tmp:
            skill(tmp, "bmad")
            skill(tmp, "bmad-agent-po")
            runtime = Path(tmp) / "_bmad" / "method" / "scripts" / "tickets.py"
            runtime.parent.mkdir(parents=True)
            runtime.touch()
            data = inspect(Path(tmp))
            self.assertEqual(data["version_hint_not_proof"], "v7_likely")

    def test_mixed_and_collision(self):
        with tempfile.TemporaryDirectory() as tmp:
            skill(tmp, "bmad-help")
            skill(tmp, "bmad")
            skill(tmp, "bmad-build", ".agents/skills")
            skill(tmp, "bmad-build", ".github/skills")
            data = inspect(Path(tmp))
            self.assertEqual(data["version_hint_not_proof"], "mixed_or_migrating")
            self.assertIn("bmad-build", data["duplicate_skill_names"])

    def test_tea_module_detection(self):
        with tempfile.TemporaryDirectory() as tmp:
            skill(tmp, "bmad-testarch-trace")
            data = inspect(Path(tmp))
            self.assertTrue(data["optional_module_hints"]["tea"])

    def test_cli_json(self):
        with tempfile.TemporaryDirectory() as tmp:
            completed = subprocess.run(
                [sys.executable, str(SCRIPT), "--root", tmp],
                text=True, capture_output=True, check=True,
            )
            self.assertEqual(json.loads(completed.stdout)["version_hint_not_proof"], "unknown")

    def test_skill_links_exist(self):
        root = Path(__file__).resolve().parents[1]
        md = (root / "SKILL.md").read_text(encoding="utf-8")
        self.assertIn("name: brad", md)
        for ref in ("version-routing.md", "quality-and-release.md",
                    "clarification-and-risk.md", "hosts-and-handoffs.md",
                    "epics-and-stories.md"):
            self.assertTrue((root / "references" / ref).is_file())
            self.assertIn(ref, md)
        scenarios = json.loads((root / "evals" / "routing-cases.json").read_text())
        self.assertGreaterEqual(len(scenarios["cases"]), 30)
        self.assertEqual(len({x["id"] for x in scenarios["cases"]}), len(scenarios["cases"]))


if __name__ == "__main__":
    unittest.main()
