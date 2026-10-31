#!/usr/bin/env python3
"""Comprueba referencias de recursos CSS y fragmentos HTML locales."""

from __future__ import annotations

import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent.parent
ERRORS: list[str] = []
URL_PATTERN = re.compile(r"url\(\s*(['\"]?)(.*?)\1\s*\)", re.IGNORECASE)
IMPORT_PATTERN = re.compile(r"@import\s+(['\"])(.*?)\1", re.IGNORECASE)


class HtmlDocument(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: set[str] = set()
        self.duplicates: set[str] = set()
        self.fragments: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        element_id = values.get("id")
        if element_id:
            if element_id in self.ids:
                self.duplicates.add(element_id)
            self.ids.add(element_id)

        if tag == "a" and values.get("href"):
            self.fragments.append(values["href"])


def local_target(source: Path, raw_url: str) -> tuple[Path, str] | None:
    parsed = urlsplit(raw_url.strip())
    if parsed.scheme or parsed.netloc or raw_url.strip().startswith("//"):
        return None
    if parsed.path.startswith("data:") or parsed.path.startswith("blob:"):
        return None

    raw_path = unquote(parsed.path)
    if raw_path.startswith("/Libreta/"):
        target = (ROOT / raw_path[len("/Libreta/"):]).resolve()
    elif raw_path.startswith("/"):
        target = (ROOT / raw_path.lstrip("/")).resolve()
    elif raw_path:
        target = (source.parent / raw_path).resolve()
    else:
        target = source.resolve()

    try:
        target.relative_to(ROOT)
    except ValueError:
        return None

    if target.is_dir():
        target = target / "index.html"
    return target, unquote(parsed.fragment)


def check_css_resources() -> int:
    checked = 0
    for css_file in sorted((ROOT / "res").rglob("*.css")):
        try:
            source = css_file.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError) as error:
            ERRORS.append(f"No se pudo leer {css_file.relative_to(ROOT)}: {error}")
            continue

        references = [match.group(2).strip() for match in URL_PATTERN.finditer(source)]
        references.extend(match.group(2).strip() for match in IMPORT_PATTERN.finditer(source))

        for reference in references:
            if not reference or reference.startswith("#"):
                continue
            resolved = local_target(css_file, reference)
            if resolved is None:
                continue
            target, _ = resolved
            checked += 1
            if not target.is_file():
                ERRORS.append(
                    f"Recurso CSS inexistente en {css_file.relative_to(ROOT)}: {reference}"
                )
    return checked


def check_html_fragments() -> tuple[int, int]:
    documents: dict[Path, HtmlDocument] = {}
    for html_file in sorted(ROOT.rglob("*.html")):
        if any(part in {".git", "node_modules"} for part in html_file.parts):
            continue
        parser = HtmlDocument()
        try:
            parser.feed(html_file.read_text(encoding="utf-8"))
            parser.close()
        except (OSError, UnicodeDecodeError) as error:
            ERRORS.append(f"No se pudo leer {html_file.relative_to(ROOT)}: {error}")
            continue
        documents[html_file.resolve()] = parser
        for duplicate in sorted(parser.duplicates):
            ERRORS.append(
                f"ID HTML duplicado en {html_file.relative_to(ROOT)}: #{duplicate}"
            )

    checked = 0
    for html_file, parser in documents.items():
        for reference in parser.fragments:
            parsed = urlsplit(reference)
            if not parsed.fragment:
                continue
            resolved = local_target(html_file, reference)
            if resolved is None:
                continue
            target, fragment = resolved
            if not fragment:
                continue
            checked += 1
            target_doc = documents.get(target)
            if target_doc is None:
                # Las referencias de archivo se comprueban en validate_project.py.
                continue
            if fragment not in target_doc.ids:
                ERRORS.append(
                    f"Fragmento HTML inexistente en {html_file.relative_to(ROOT)}: {reference}"
                )
    return len(documents), checked


def main() -> int:
    css_resources = check_css_resources()
    html_documents, fragments = check_html_fragments()
    print(f"Recursos CSS locales comprobados: {css_resources}")
    print(f"Documentos HTML inspeccionados: {html_documents}")
    print(f"Fragmentos HTML comprobados: {fragments}")

    if ERRORS:
        print(f"\nSe encontraron {len(ERRORS)} problema(s):")
        for error in ERRORS:
            print(f" - {error}")
        return 1

    print("\nValidación de recursos y fragmentos completada correctamente.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
