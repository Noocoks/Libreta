import unittest

from scripts.validate_catalog import CatalogParser


class CatalogParserTests(unittest.TestCase):
    def test_counts_cards_inside_real_library_category_sections(self):
        html = """
        <section class="library-category" id="library-category-1">
          <article data-app-card>
            <h3 class="library-card-title">Application One</h3>
            <a class="library-card-link" href="./one.html">Open</a>
          </article>
          <article data-app-card>
            <h3 class="library-card-title">Application Two</h3>
            <a class="library-card-link" href="./two.html">Open</a>
          </article>
        </section>
        <section class="library-category" id="library-category-2">
          <article data-app-card>
            <h3 class="library-card-title">Application Three</h3>
            <a class="library-card-link" href="./three.html">Open</a>
          </article>
        </section>
        """
        parser = CatalogParser()
        parser.feed(html)

        self.assertEqual(len(parser.cards), 3)
        self.assertEqual(parser.category_counts, {
            "library-category-1": 2,
            "library-category-2": 1,
        })
        self.assertEqual(
            [card["title"] for card in parser.cards],
            ["Application One", "Application Two", "Application Three"],
        )
        self.assertEqual(
            [card["category"] for card in parser.cards],
            ["library-category-1", "library-category-1", "library-category-2"],
        )

    def test_ignores_sections_that_are_not_library_categories(self):
        parser = CatalogParser()
        parser.feed("""
            <section id="unrelated">
              <article data-app-card><h3 class="library-card-title">Not categorized</h3></article>
            </section>
        """)
        self.assertEqual(parser.category_counts, {})
        self.assertEqual(parser.cards[0]["category"], "")


if __name__ == "__main__":
    unittest.main()
