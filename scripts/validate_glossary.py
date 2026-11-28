#!/usr/bin/env python3
"""Validación estructural y documental del diccionario técnico de Libreta."""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GLOSSARY = ROOT / "res/json/glossary.json"
ID_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
ALLOWED_KEYS = {"id", "term", "aliases", "definition", "category", "level", "path", "related"}


def normalize(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", value.casefold())
    return "".join(char for char in decomposed if not unicodedata.combining(char))


def validate(data: object, root: Path = ROOT) -> list[str]:
    errors: list[str] = []
    if not isinstance(data, dict) or set(data) != {"version", "updated", "concepts"}:
        return ["El glosario debe contener exactamente version, updated y concepts."]
    if data.get("version") != 1:
        errors.append("La versión del glosario debe ser 1.")
    if not isinstance(data.get("updated"), str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", data["updated"]):
        errors.append("updated debe usar el formato YYYY-MM-DD.")
    concepts = data.get("concepts")
    if not isinstance(concepts, list) or not concepts:
        return errors + ["concepts debe ser una lista no vacía."]
    ids: set[str] = set()
    terms: dict[str, str] = {}
    paths: set[str] = set()
    related_by_id: dict[str, list[str]] = {}
    for index, item in enumerate(concepts):
        where = f"concepts[{index}]"
        if not isinstance(item, dict):
            errors.append(f"{where} debe ser un objeto.")
            continue
        unknown = set(item) - ALLOWED_KEYS
        if unknown:
            errors.append(f"{where} contiene claves desconocidas: {sorted(unknown)}.")
        identifier = item.get("id")
        if not isinstance(identifier, str) or not ID_PATTERN.fullmatch(identifier):
            errors.append(f"{where}.id no es un identificador válido.")
        elif identifier in ids:
            errors.append(f"ID de concepto duplicado: {identifier}.")
        else:
            ids.add(identifier)
        term = item.get("term")
        if not isinstance(term, str) or not term.strip() or len(term) > 100:
            errors.append(f"{where}.term debe ser texto no vacío de hasta 100 caracteres.")
            term = ""
        aliases = item.get("aliases")
        if not isinstance(aliases, list) or len(aliases) > 20:
            errors.append(f"{where}.aliases debe ser una lista de hasta 20 alias.")
            aliases = []
        values = [term] + aliases
        for value in values:
            if not isinstance(value, str) or not value.strip() or len(value) > 120:
                errors.append(f"{where} contiene un término o alias no válido.")
                continue
            key = normalize(value.strip())
            previous = terms.get(key)
            if previous and previous != identifier:
                errors.append(f"Término o alias ambiguo {value!r}: colisiona con {previous} y {identifier}.")
            else:
                terms[key] = identifier
        definition = item.get("definition")
        if not isinstance(definition, str) or not definition.strip() or len(definition) > 1200:
            errors.append(f"{where}.definition debe ser una definición no vacía de hasta 1200 caracteres.")
        category = item.get("category")
        if not isinstance(category, str) or not category.strip() or len(category) > 60:
            errors.append(f"{where}.category debe ser texto no vacío.")
        level = item.get("level")
        if not isinstance(level, int) or isinstance(level, bool) or level not in (1, 2, 3):
            errors.append(f"{where}.level debe ser 1, 2 o 3.")
        related = item.get("related", [])
        if not isinstance(related, list) or len(related) > 20 or not all(isinstance(value, str) for value in related):
            errors.append(f"{where}.related debe ser una lista de hasta 20 identificadores.")
        elif len(set(related)) != len(related) or identifier in related:
            errors.append(f"{where}.related contiene duplicados o una autorreferencia.")
        elif isinstance(identifier, str):
            related_by_id[identifier] = related
        path = item.get("path")
        if level in (2, 3) and not path:
            errors.append(f"{where}: los niveles 2 y 3 necesitan artículo propio.")
        if path is not None:
            if (not isinstance(path, str) or not path.startswith("subpags/diccionario/") or
                    not path.endswith("/index.html") or "\\" in path or "%" in path or
                    any(part in {"", ".", ".."} for part in path.split("/"))):
                errors.append(f"{where}.path no es una ruta de artículo permitida.")
            elif path in paths:
                errors.append(f"Ruta de artículo duplicada: {path}.")
            else:
                paths.add(path)
                target = (root / path).resolve()
                try:
                    target.relative_to(root.resolve())
                except ValueError:
                    errors.append(f"{where}.path escapa de la raíz del proyecto.")
                else:
                    if not target.is_file():
                        errors.append(f"Artículo de diccionario inexistente: {path}.")
    for identifier, related in related_by_id.items():
        for target in related:
            if target not in ids:
                errors.append(f"Relación no resuelta: {identifier} -> {target}.")
    return errors


def main() -> int:
    try:
        data = json.loads(GLOSSARY.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        print(f"ERROR: no se pudo leer glossary.json: {error}", file=sys.stderr)
        return 1
    errors = validate(data)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print(f"OK: {len(data['concepts'])} conceptos y artículos del diccionario validados.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
