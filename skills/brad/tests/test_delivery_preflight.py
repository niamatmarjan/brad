import importlib.util
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "delivery_preflight.py"
sp = importlib.util.spec_from_file_location("delivery_preflight", SCRIPT)
mod = importlib.util.module_from_spec(sp)
sp.loader.exec_module(mod)


@unittest.skipUnless(shutil.which("git"), "git not installed")
class PreflightTests(unittest.TestCase):
    def test_empty_folder_has_no_git(self):
        with tempfile.TemporaryDirectory() as t:
            r = mod.inspect(Path(t))
            self.assertFalse(r["git_repo"])
            self.assertIsNone(r["dirty"])
            self.assertIn("windows_cmd_required",r)
            self.assertIn("npm_available",r)
            self.assertIn("npx_available",r)
            self.assertIn("npm_version", r)
            self.assertIn("npm_git_policy", r)
            self.assertIn("remediations", r)
            self.assertTrue(all("npm config set allow-git all" not in x for x in r["remediations"]))

    def test_repo_without_remote(self):
        with tempfile.TemporaryDirectory() as t:
            subprocess.run(["git", "init", "-q", t], check=True)
            r = mod.inspect(Path(t))
            self.assertTrue(r["git_repo"])
            self.assertFalse(r["remotes"])
            self.assertIsInstance(r["warnings"], list)
            self.assertTrue(any("remote" in x.lower() or "handoff" in x.lower() for x in r["warnings"] + r["remediations"]))

    def test_dirty_repo(self):
        with tempfile.TemporaryDirectory() as t:
            subprocess.run(["git", "init", "-q", t], check=True)
            (Path(t)/"untracked.txt").write_text("hello")
            self.assertTrue(mod.inspect(Path(t))["dirty"])

    def test_missing_root(self):
        with tempfile.TemporaryDirectory() as t:
            with self.assertRaises(ValueError):
                mod.inspect(Path(t)/"absent")


if __name__ == "__main__":
    unittest.main()
