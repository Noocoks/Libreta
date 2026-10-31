#!/usr/bin/env python3
"""Validaciones ligeras de integridad para Libreta (sin dependencias externas)."""

from __future__ import annotations

import json
import posixpath
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent.parent
TREE_FILE = ROOT / "res/json/tree.json"
ERRORS: list[str] = []


class LocalReferenceParser(HTMLParser):
    """Extrae referencias locales de href y src de un documento HTML."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.references: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        for name, value in attrs:
            if name in {"href", "src"} and value:
                self.references.append(value.strip())

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)


def iter_tree_paths(nodes: list[dict]) -> set[str]:
    paths: set[str] = set()

    for node in nodes:
        path = node.get("path")
        if isinstance(path, str):
            paths.add(path.lstrip("/"))

        children = node.get("children", [])
        if isinstance(children, list):
            paths.update(iter_tree_paths(children))

    return paths


def resolve_local_reference(html_file: Path, reference: str) -> Path | None:
    parsed = urlsplit(reference)

    if parsed.scheme or parsed.netloc or not parsed.path:
        return None

    raw_path = parsed.path

    if raw_path.startswith("/Libreta/"):
        relative = raw_path[len("/Libreta/"):]
    elif raw_path.startswith("/"):
        relative = raw_path.lstrip("/")
    else:
        relative = posixpath.join(html_file.parent.relative_to(ROOT).as_posix(), raw_path)

    normalized = posixpath.normpath(relative)

    if normalized in {"", "."}:
        normalized = "index.html"

    if normalized == ".." or normalized.startswith("../"):
        return ROOT / "__invalid_reference__"

    target = ROOT / normalized

    if target.is_dir():
        target = target / "index.html"

    if not target.suffix and not target.exists():
        target = target / "index.html"

    return target


def check_json() -> dict:
    try:
        data = json.loads(TREE_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        ERRORS.append(f"tree.json no es válido: {error}")
        return {}

    if not isinstance(data.get("sections"), list):
        ERRORS.append("tree.json debe contener una lista 'sections'.")
        return {}

    return data


def check_tree(data: dict) -> set[str]:
    tree_paths = iter_tree_paths(data.get("sections", []))

    for relative in sorted(tree_paths):
        if not (ROOT / relative).is_file():
            ERRORS.append(f"Ruta declarada en tree.json inexistente: {relative}")

    content_pages = {
        path.relative_to(ROOT).as_posix()
        for path in (ROOT / "subpags").rglob("*.html")
    }

    for relative in sorted(content_pages - tree_paths):
        ERRORS.append(f"Página HTML no incluida en tree.json: {relative}")

    return tree_paths


def check_local_references() -> int:
    checked = 0

    for html_file in ROOT.rglob("*.html"):
        if any(part in {".git", "node_modules"} for part in html_file.parts):
            continue

        parser = LocalReferenceParser()

        try:
            parser.feed(html_file.read_text(encoding="utf-8"))
            parser.close()
        except (OSError, UnicodeDecodeError) as error:
            ERRORS.append(f"No se pudo leer {html_file.relative_to(ROOT)}: {error}")
            continue

        for reference in parser.references:
            target = resolve_local_reference(html_file, reference)

            if target is None:
                continue

            checked += 1

            if not target.is_file():
                source = html_file.relative_to(ROOT).as_posix()
                ERRORS.append(f"Referencia local rota en {source}: {reference}")

    return checked


def check_python_syntax() -> int:
    checked = 0

    for source in ROOT.rglob("*.py"):
        if any(part in {".git", "node_modules", "__pycache__"} for part in source.parts):
            continue

        try:
            compile(source.read_text(encoding="utf-8"), str(source), "exec")
            checked += 1
        except (OSError, UnicodeDecodeError, SyntaxError) as error:
            ERRORS.append(f"Error de sintaxis Python en {source.relative_to(ROOT)}: {error}")

    return checked


def main() -> int:
    data = check_json()
    tree_paths = check_tree(data) if data else set()
    references = check_local_references()
    python_files = check_python_syntax()

    print(f"Rutas declaradas en tree.json: {len(tree_paths)}")
    print(f"Referencias locales HTML comprobadas: {references}")
    print(f"Archivos Python compilados: {python_files}")

    if ERRORS:
        print(f"\nSe encontraron {len(ERRORS)} problema(s):")
        for error in ERRORS:
            print(f" - {error}")
        return 1

    print("\nValidación del proyecto completada correctamente.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
