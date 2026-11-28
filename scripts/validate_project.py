#!/usr/bin/env python3
"""Validaciones de integridad para el árbol y las referencias locales de Libreta."""

from __future__ import annotations

import json
import posixpath
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent.parent
TREE_FILE = ROOT / "res/json/tree.json"
ERRORS: list[str] = []
MAX_TREE_BYTES = 256 * 1024
MAX_TREE_NODES = 500
MAX_TREE_DEPTH = 12
MAX_CHILDREN = 100
MAX_TAGS = 20
NODE_KEYS = {"name", "path", "cat", "tags", "children"}
PATH_SEGMENT = re.compile(r"^[A-Za-z0-9._-]+$")


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
    """Compatibilidad para consumidores existentes; el validador usa validación estricta."""
    paths: set[str] = set()
    for node in nodes:
        path = node.get("path")
        if isinstance(path, str):
            paths.add(path)
        children = node.get("children", [])
        if isinstance(children, list):
            paths.update(iter_tree_paths(children))
    return paths


def validate_tree_data(data: object, root: Path | None = None) -> tuple[set[str], list[str]]:
    """Valida estructura, límites, unicidad y confinamiento de rutas del árbol."""
    errors: list[str] = []
    paths: set[str] = set()
    seen_paths: set[str] = set()
    node_count = 0
    root_path = (root or ROOT).resolve()

    if not isinstance(data, dict):
        return paths, ["tree.json debe contener un objeto JSON."]
    if set(data) != {"title", "sections"}:
        errors.append("tree.json solo puede contener las claves 'title' y 'sections'.")
    title = data.get("title")
    if not isinstance(title, str) or not title.strip() or len(title) > 100:
        errors.append("title debe ser texto no vacío de hasta 100 caracteres.")

    sections = data.get("sections")
    if not isinstance(sections, list) or not sections or len(sections) > 50:
        return paths, errors + ["sections debe ser una lista de entre 1 y 50 elementos."]

    def visit(nodes: list, depth: int, parent: str) -> None:
        nonlocal node_count
        if depth > MAX_TREE_DEPTH:
            errors.append(f"Profundidad máxima del árbol superada en {parent or 'sections'}.")
            return
        if len(nodes) > MAX_CHILDREN:
            errors.append(f"Demasiados nodos hijos en {parent or 'sections'}.")
            return

        for index, node in enumerate(nodes):
            location = f"{parent}[{index}]"
            node_count += 1
            if node_count > MAX_TREE_NODES:
                errors.append(f"El árbol supera el máximo de {MAX_TREE_NODES} nodos.")
                return
            if not isinstance(node, dict):
                errors.append(f"{location} debe ser un objeto.")
                continue

            unknown = set(node) - NODE_KEYS
            if unknown:
                errors.append(f"{location} contiene claves no permitidas: {sorted(unknown)}.")

            name = node.get("name")
            if (not isinstance(name, str) or not name.strip() or len(name) > 120
                    or any(ord(char) < 32 or ord(char) == 127 for char in name)):
                errors.append(f"{location}.name debe ser texto válido de hasta 120 caracteres.")

            path = node.get("path")
            if not isinstance(path, str) or not path or len(path) > 200:
                errors.append(f"{location}.path debe ser una ruta relativa válida.")
            else:
                segments = path.split("/")
                if (path.startswith("/") or "\\" in path or "%" in path or
                        "?" in path or "#" in path or "//" in path or
                        any(part in {"", ".", ".."} for part in segments) or
                        any(not PATH_SEGMENT.fullmatch(part) for part in segments) or
                        not path.startswith("subpags/") or not path.endswith(".html")):
                    errors.append(f"{location}.path no es una ruta canónica permitida: {path!r}.")
                elif path in seen_paths:
                    errors.append(f"Ruta duplicada en tree.json: {path}.")
                else:
                    seen_paths.add(path)
                    paths.add(path)
                    target = (root_path / path).resolve()
                    try:
                        target.relative_to(root_path)
                    except ValueError:
                        errors.append(f"{location}.path escapa del directorio del proyecto.")
                    else:
                        if not target.is_file():
                            errors.append(f"Ruta declarada en tree.json inexistente: {path}.")

            category = node.get("cat")
            if category is not None and (
                not isinstance(category, str) or
                not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,49}", category)
            ):
                errors.append(f"{location}.cat debe ser un identificador simple en minúsculas.")

            tags = node.get("tags", [])
            if not isinstance(tags, list) or len(tags) > MAX_TAGS:
                errors.append(f"{location}.tags debe ser una lista de hasta {MAX_TAGS} etiquetas.")
            else:
                normalized_tags: set[str] = set()
                for tag in tags:
                    if (not isinstance(tag, str) or not tag.strip() or len(tag) > 60
                            or any(ord(char) < 32 or ord(char) == 127 for char in tag)):
                        errors.append(f"{location}.tags contiene una etiqueta no válida.")
                        continue
                    normalized = tag.casefold()
                    if normalized in normalized_tags:
                        errors.append(f"{location}.tags contiene etiquetas duplicadas.")
                    normalized_tags.add(normalized)

            children = node.get("children", [])
            if not isinstance(children, list):
                errors.append(f"{location}.children debe ser una lista.")
            elif children:
                visit(children, depth + 1, location + ".children")

    visit(sections, 1, "sections")
    return paths, errors


def resolve_local_reference(
    html_file: Path, reference: str, root: Path | None = None
) -> Path | None:
    project_root = (root or ROOT).resolve()
    invalid_reference = project_root / "__invalid_reference__"
    try:
        parsed = urlsplit(reference.strip())
    except ValueError:
        return invalid_reference

    if parsed.scheme or parsed.netloc or not parsed.path or reference.strip().startswith("//"):
        return None
    decoded = unquote(parsed.path)
    if ("\\" in decoded
            or any(ord(char) < 32 or ord(char) == 127 for char in decoded)
            or re.search(r"%(?![0-9A-Fa-f]{2})", parsed.path)):
        return invalid_reference

    if decoded.startswith("/Libreta/"):
        relative = decoded[len("/Libreta/"):]
    elif decoded.startswith("/"):
        relative = decoded.lstrip("/")
    else:
        try:
            source_parent = html_file.resolve().parent.relative_to(project_root).as_posix()
        except ValueError:
            return invalid_reference
        relative = posixpath.join(source_parent, decoded)

    normalized = posixpath.normpath(relative)
    if normalized in {"", "."}:
        normalized = "index.html"
    if normalized == ".." or normalized.startswith("../"):
        return invalid_reference

    target = (project_root / normalized).resolve()
    try:
        target.relative_to(project_root)
    except ValueError:
        return invalid_reference
    if target.is_dir():
        target = target / "index.html"
    if not target.suffix and not target.exists():
        target = target / "index.html"
    return target


def reject_duplicate_json_keys(pairs: list[tuple[str, object]]) -> dict:
    """Rechaza claves repetidas para evitar interpretaciones JSON ambiguas."""
    result: dict = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"clave JSON duplicada: {key!r}")
        result[key] = value
    return result


def reject_json_constant(value: str) -> None:
    """JSON estándar no admite NaN ni Infinity."""
    raise ValueError(f"constante JSON no estándar: {value}")


def strict_json_loads(source: str) -> object:
    """Carga JSON rechazando claves duplicadas y constantes no estándar."""
    return json.loads(
        source,
        object_pairs_hook=reject_duplicate_json_keys,
        parse_constant=reject_json_constant,
    )


def check_json() -> dict:
    try:
        raw = TREE_FILE.read_bytes()
        if len(raw) > MAX_TREE_BYTES:
            ERRORS.append(f"tree.json supera el límite de {MAX_TREE_BYTES} bytes.")
            return {}
        data = strict_json_loads(raw.decode("utf-8"))
    except (OSError, UnicodeDecodeError, ValueError, RecursionError) as error:
        ERRORS.append(f"tree.json no es válido: {error}")
        return {}
    if not isinstance(data, dict):
        ERRORS.append("tree.json debe contener un objeto JSON.")
        return {}
    return data


def dictionary_page_paths(root: Path = ROOT) -> set[str]:
    """Rutas documentales del diccionario: páginas consultables, no nodos del árbol."""
    paths = {"subpags/diccionario/index.html"}
    glossary_file = root / "res/json/glossary.json"
    try:
        data = json.loads(glossary_file.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        return paths
    concepts = data.get("concepts", []) if isinstance(data, dict) else []
    if not isinstance(concepts, list):
        return paths
    for concept in concepts:
        if not isinstance(concept, dict):
            continue
        path = concept.get("path")
        if not isinstance(path, str) or not path.startswith("subpags/diccionario/") or not path.endswith("/index.html"):
            continue
        parts = path.split("/")
        if "\\" not in path and all(part not in {"", ".", ".."} for part in parts):
            paths.add(path)
    return paths


def check_tree(data: dict) -> set[str]:
    tree_paths, validation_errors = validate_tree_data(data)
    ERRORS.extend(validation_errors)
    content_pages = {
        path.relative_to(ROOT).as_posix()
        for path in (ROOT / "subpags").rglob("*.html")
    }
    for relative in sorted(content_pages - tree_paths - dictionary_page_paths()):
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
