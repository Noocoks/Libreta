import unittest

from scripts.validate_assets import EXPECTED_CSP, validate_csp_policy


def policy_from(sources):
    return "; ".join(f"{name} {' '.join(values)}" for name, values in sources.items())


class ContentSecurityPolicyTests(unittest.TestCase):
    def test_accepts_strict_repository_policy(self):
        self.assertEqual(validate_csp_policy(policy_from(EXPECTED_CSP)), [])

    def test_rejects_unsafe_inline_scripts_and_styles(self):
        for directive in ("script-src", "style-src"):
            sources = {key: list(value) for key, value in EXPECTED_CSP.items()}
            sources[directive].append("'unsafe-inline'")
            self.assertTrue(any(directive in error for error in validate_csp_policy(policy_from(sources))))

    def test_rejects_unexpected_origins_and_wildcards(self):
        for directive, source in (("script-src", "https://attacker.invalid"), ("img-src", "*")):
            sources = {key: list(value) for key, value in EXPECTED_CSP.items()}
            sources[directive].append(source)
            self.assertTrue(any(directive in error for error in validate_csp_policy(policy_from(sources))))

    def test_rejects_unexpected_directives(self):
        self.assertTrue(validate_csp_policy(policy_from(EXPECTED_CSP) + "; report-uri /csp-report"))

    def test_rejects_missing_and_duplicate_directives(self):
        sources = {key: list(value) for key, value in EXPECTED_CSP.items() if key != "object-src"}
        policy = policy_from(sources) + "; default-src 'self'"
        errors = validate_csp_policy(policy)
        self.assertTrue(any("falta directiva: object-src" in error for error in errors))
        self.assertTrue(any("directiva duplicada: default-src" in error for error in errors))

    def test_rejects_style_src_attr_override(self):
        policy = policy_from(EXPECTED_CSP) + "; style-src-attr 'unsafe-inline'"
        self.assertTrue(validate_csp_policy(policy))


if __name__ == "__main__":
    unittest.main()
