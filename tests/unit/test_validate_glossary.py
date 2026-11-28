import tempfile
import unittest
from pathlib import Path

from scripts.validate_glossary import validate


class GlossaryValidationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        article = self.root / "subpags" / "diccionario" / "kernel" / "index.html"
        article.parent.mkdir(parents=True)
        article.write_text("<h1>Kernel</h1>", encoding="utf-8")
        self.valid = {
            "version": 1,
            "updated": "2026-11-28",
            "concepts": [{
                "id": "kernel",
                "term": "Kernel",
                "aliases": ["núcleo del sistema"],
                "definition": "Núcleo central del sistema operativo.",
                "category": "Sistemas",
                "level": 2,
                "path": "subpags/diccionario/kernel/index.html"
            }]
        }

    def tearDown(self):
        self.temp.cleanup()

    def test_accepts_valid_concept_and_article(self):
        self.assertEqual(validate(self.valid, self.root), [])

    def test_rejects_duplicate_ids(self):
        second = dict(self.valid["concepts"][0], term="Núcleo", path=None, level=1)
        errors = validate(dict(self.valid, concepts=self.valid["concepts"] + [second]), self.root)
        self.assertTrue(any("ID de concepto duplicado" in error for error in errors))

    def test_rejects_alias_collisions_case_and_accent_insensitive(self):
        second = {
            "id": "core", "term": "CORE", "aliases": ["KERNEL"],
            "definition": "Definición.", "category": "Sistemas", "level": 1
        }
        errors = validate(dict(self.valid, concepts=self.valid["concepts"] + [second]), self.root)
        self.assertTrue(any("ambiguo" in error for error in errors))

    def test_rejects_missing_articles_for_developed_concepts(self):
        item = dict(self.valid["concepts"][0], path=None)
        errors = validate(dict(self.valid, concepts=[item]), self.root)
        self.assertTrue(any("necesitan artículo propio" in error for error in errors))

    def test_rejects_traversal_and_missing_article_paths(self):
        for path in ("subpags/diccionario/../outside/index.html",
                     "subpags/diccionario/missing/index.html"):
            item = dict(self.valid["concepts"][0], path=path)
            errors = validate(dict(self.valid, concepts=[item]), self.root)
            self.assertTrue(any("ruta de artículo" in error or "inexistente" in error for error in errors))

    def test_rejects_empty_definitions_and_invalid_levels(self):
        item = dict(self.valid["concepts"][0], definition=" ", level=4)
        errors = validate(dict(self.valid, concepts=[item]), self.root)
        self.assertTrue(any("definition" in error for error in errors))
        self.assertTrue(any("level" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
