import tempfile
import unittest
from pathlib import Path

from scripts.validate_project import strict_json_loads, validate_tree_data


class TreeValidationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        page = self.root / "subpags" / "example" / "index.html"
        page.parent.mkdir(parents=True)
        page.write_text("<h1>Example</h1>", encoding="utf-8")
        self.valid = {
            "title": "Libreta",
            "sections": [{
                "name": "Example",
                "path": "subpags/example/index.html",
                "cat": "example",
                "tags": ["test"],
                "children": []
            }]
        }

    def tearDown(self):
        self.temp.cleanup()

    def test_accepts_valid_tree(self):
        paths, errors = validate_tree_data(self.valid, self.root)
        self.assertEqual(paths, {"subpags/example/index.html"})
        self.assertEqual(errors, [])

    def test_rejects_traversal_and_absolute_paths(self):
        for path in ("../outside.html", "/etc/passwd", "subpags/../outside.html",
                     "subpags/%2e%2e/outside.html", "subpags\\outside.html"):
            data = {**self.valid, "sections": [{**self.valid["sections"][0], "path": path}]}
            _, errors = validate_tree_data(data, self.root)
            self.assertTrue(any("ruta canónica" in error for error in errors), path)

    def test_rejects_duplicate_paths(self):
        node = self.valid["sections"][0]
        data = {**self.valid, "sections": [node, {**node, "name": "Duplicate"}]}
        _, errors = validate_tree_data(data, self.root)
        self.assertTrue(any("Ruta duplicada" in error for error in errors))

    def test_rejects_unknown_fields_and_bad_tags(self):
        node = {**self.valid["sections"][0], "unexpected": True, "tags": ["", " " * 61]}
        _, errors = validate_tree_data({**self.valid, "sections": [node]}, self.root)
        self.assertTrue(any("claves no permitidas" in error for error in errors))
        self.assertTrue(any("etiqueta no válida" in error for error in errors))

    def test_rejects_excessive_depth(self):
        node = self.valid["sections"][0]
        for index in range(13):
            node = {"name": f"level-{index}", "path": "subpags/example/index.html", "children": [node]}
        _, errors = validate_tree_data({**self.valid, "sections": [node]}, self.root)
        self.assertTrue(any("Profundidad máxima" in error for error in errors))

    def test_rejects_invalid_tree_shapes(self):
        _, errors = validate_tree_data({"title": "x", "sections": [{}]}, self.root)
        self.assertTrue(any(".name" in error for error in errors))
        _, errors = validate_tree_data({"title": "x", "sections": "bad"}, self.root)
        self.assertTrue(any("sections debe ser una lista" in error for error in errors))

    def test_strict_json_rejects_duplicate_object_keys(self):
        with self.assertRaisesRegex(ValueError, "clave JSON duplicada"):
            strict_json_loads('{"title":"first","title":"second","sections":[]}')

    def test_strict_json_rejects_non_standard_numeric_constants(self):
        for constant in ("NaN", "Infinity", "-Infinity"):
            with self.subTest(constant=constant):
                with self.assertRaisesRegex(ValueError, "constante JSON no estándar"):
                    strict_json_loads('{"title":"Libreta","sections":[],"value":' + constant + '}')

    def test_strict_json_accepts_standard_json(self):
        self.assertEqual(
            strict_json_loads('{"title":"Libreta","sections":[]}'),
            {"title": "Libreta", "sections": []},
        )



if __name__ == "__main__":
    unittest.main()
