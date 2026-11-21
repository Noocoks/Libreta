import unittest

from scripts.validate_assets import EXPECTED_CSP, validate_csp_policy


def policy_from(sources):
    return "; ".join(f"{name} {' '.join(values)}" for name, values in sources.items())


class ContentSecurityPolicyTests(unittest.TestCase):
    def test_accepts_repository_policy(self):
        self.assertEqual(validate_csp_policy(policy_from(EXPECTED_CSP)), [])

    def test_rejects_unexpected_script_origin(self):
        sources = {key: list(value) for key, value in EXPECTED_CSP.items()}
        sources["script-src"].append("https://attacker.invalid")
        self.assertTrue(any("script-src" in error for error in validate_csp_policy(policy_from(sources))))

    def test_rejects_unsafe_inline_scripts(self):
        sources = {key: list(value) for key, value in EXPECTED_CSP.items()}
        sources["script-src"].append("'unsafe-inline'")
        self.assertTrue(any("script-src" in error for error in validate_csp_policy(policy_from(sources))))

    def test_rejects_wildcards_and_unexpected_directives(self):
        sources = {key: list(value) for key, value in EXPECTED_CSP.items()}
        sources["img-src"] = ["*"]
        sources["report-uri"] = ["/csp-report"]
        errors = validate_csp_policy(policy_from(sources))
        self.assertTrue(any("img-src" in error for error in errors))
        self.assertTrue(any("report-uri" in error for error in errors))

    def test_rejects_missing_and_duplicate_directives(self):
        sources = {key: list(value) for key, value in EXPECTED_CSP.items() if key != "object-src"}
        policy = policy_from(sources) + "; default-src 'self'"
        errors = validate_csp_policy(policy)
        self.assertTrue(any("falta directiva: object-src" in error for error in errors))
        self.assertTrue(any("directiva duplicada: default-src" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
