import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class WorkflowSecurityContractTests(unittest.TestCase):
    def test_project_stats_workflow_has_no_global_permissions(self):
        workflow = (ROOT / ".github/workflows/project-stats.yml").read_text(encoding="utf-8")
        self.assertIn("permissions: {}", workflow)
        self.assertIn("persist-credentials: false", workflow)
        self.assertIn("contents: write", workflow)
        self.assertIn("pull-requests: write", workflow)
        self.assertIn("actions: write", workflow)
        self.assertNotRegex(workflow, r"(?m)^\s*git\s+push\b")

    def test_project_stats_workflow_uses_pinned_actions_and_pull_request_flow(self):
        workflow = (ROOT / ".github/workflows/project-stats.yml").read_text(encoding="utf-8")
        action_refs = re.findall(r"(?m)^\s+uses:\s+[^\s@]+@([^\s#]+)", workflow)
        self.assertTrue(action_refs)
        self.assertTrue(all(re.fullmatch(r"[0-9a-f]{40}", ref) for ref in action_refs))
        self.assertIn("peter-evans/create-pull-request@", workflow)
        self.assertIn("gh workflow run quality-checks.yml", workflow)
        self.assertIn("gh workflow run e2e-tests.yml", workflow)
        self.assertIn("gh workflow run codeql.yml", workflow)

    def test_stats_update_only_targets_master(self):
        workflow = (ROOT / ".github/workflows/project-stats.yml").read_text(encoding="utf-8")
        self.assertIn("if: github.ref == 'refs/heads/master'", workflow)
        self.assertIn("base: master", workflow)


if __name__ == "__main__":
    unittest.main()
