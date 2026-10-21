"""Regression tests for the stdlib repository audit."""
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from check_repository import audit  # noqa: E402


class RepositoryAuditTest(unittest.TestCase):
    def test_current_repository(self):
        self.assertEqual(audit(ROOT), [])

    def _copy(self, temp):
        target = Path(temp) / 'repo'
        shutil.copytree(
            ROOT,
            target,
            ignore=shutil.ignore_patterns(
                '__pycache__', 'dist', '.git', '*.pyc', '*.pyo',
                'node_modules', '.venv', 'venv', 'test-results',
                'playwright-report', '.cache', '.turbo', '.next', '.pytest_cache'
            )
        )
        return target

    def test_missing_notice_is_reported(self):
        with tempfile.TemporaryDirectory() as d:
            r = self._copy(d)
            (r / 'NOTICE.md').unlink()
            self.assertTrue(any('NOTICE.md' in x for x in audit(r)))

    def test_wrong_version_is_reported(self):
        with tempfile.TemporaryDirectory() as d:
            r = self._copy(d)
            data = json.loads((r / 'package.json').read_text())
            data['version'] = '0.0.1'
            (r / 'package.json').write_text(json.dumps(data))
            self.assertTrue(any('VERSION differs' in x for x in audit(r)))

    def test_broken_local_link_is_reported(self):
        with tempfile.TemporaryDirectory() as d:
            r = self._copy(d)
            with (r / 'README.md').open('a') as f:
                f.write('\n[bad](docs/does-not-exist.md)\n')
            self.assertTrue(any('broken relative link' in x for x in audit(r)))

    def test_bytecode_is_reported(self):
        with tempfile.TemporaryDirectory() as d:
            r = self._copy(d)
            (r / 'unexpected.pyc').write_bytes(b'junk')
            self.assertTrue(any('bytecode' in x for x in audit(r)))


if __name__ == '__main__':
    unittest.main()
