import unittest
from pathlib import Path
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[3]

class ReleaseContractTests(unittest.TestCase):
    def test_version_and_identity(self):
        self.assertEqual((ROOT / 'VERSION').read_text().strip(), '0.2.0')
        skill=(ROOT/'skills/brad/SKILL.md').read_text()
        self.assertIn('name: brad',skill)
        self.assertIn('/brad 1.1',skill)

    def test_release_zip_is_installable(self):
        run=subprocess.run([sys.executable,str(ROOT/'tools/build_release.py')],capture_output=True,text=True,check=True)
        archive=ROOT/'dist/brad-v0.2.0.zip'
        self.assertTrue(archive.exists(), run.stdout)
        with zipfile.ZipFile(archive) as z:
            self.assertIn('brad/SKILL.md',z.namelist())
            self.assertIn('brad/evals/routing-cases.json',z.namelist())
            self.assertIn('copilot/brad.agent.md',z.namelist())
