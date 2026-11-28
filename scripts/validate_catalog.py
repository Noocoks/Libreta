#!/usr/bin/env python3
"""Audita integridad del catálogo, rutas de fichas y logotipos SVG locales."""
from __future__ import annotations

import json
import re
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATALOG = "subpags/software/apps/index.html"
ICON_MAP = re.compile(r'var icons\s*=\s*\{([^}]+)\}', re.S)
ICON_ENTRY = re.compile(r'"([a-z0-9-]+)"\s*:\s*"([a-z0-9-]+)"')


class CatalogParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.cards: list[dict[str, str]] = []
        self.current: dict[str, str] | None = None
        self.in_title = False
        self.in_category = False
        self.category_counts: dict[str, int] = {}
        self.current_category: str | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        classes = set((values.get("class") or "").split())
        if tag == "section" and "library-category" in classes:
            category_id = values.get("id")
            if not category_id or not category_id.startswith("library-category-"):
                return
            self.current_category = category_id
            self.category_counts[category_id] = 0
        if tag == "article" and "data-app-card" in values:
            self.current = {"href": "", "title": "", "category": self.current_category or ""}
        if self.current is not None and tag == "a" and "library-card-link" in (values.get("class") or ""):
            self.current["href"] = values.get("href") or ""
        if self.current is not None and tag == "h3" and "library-card-title" in (values.get("class") or ""):
            self.in_title = True

    def handle_endtag(self, tag: str) -> None:
        if tag == "h3":
            self.in_title = False
        if tag == "article" and self.current is not None:
            self.cards.append(self.current)
            if self.current_category is not None:
                self.category_counts[self.current_category] = self.category_counts.get(self.current_category, 0) + 1
            self.current = None
        if tag == "section" and self.current_category is not None:
            self.current_category = None

    def handle_data(self, data: str) -> None:
        if self.current is not None and self.in_title:
            self.current["title"] += data


def validate_catalog(root: Path = ROOT) -> list[str]:
    errors: list[str] = []
    try:
        tree = json.loads((root / "res/json/tree.json").read_text(encoding="utf-8"))
        catalog_text = (root / CATALOG).read_text(encoding="utf-8")
        library_js = (root / "res/js/application-library.js").read_text(encoding="utf-8")
        icon_readme = (root / "images/apps/README.md").read_text(encoding="utf-8")
        audit = json.loads((root / "res/json/application-audit.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        return [f"No se pudo cargar el catálogo o sus metadatos: {error}"]

    parser = CatalogParser()
    parser.feed(catalog_text)
    if not parser.cards:
        errors.append("El catálogo no contiene tarjetas de aplicaciones.")
    hrefs: set[str] = set()
    for card in parser.cards:
        href = card["href"]
        if not href.startswith("./") or not href.endswith(".html"):
            errors.append(f"Enlace de ficha no canónico: {href!r}.")
            continue
        if href in hrefs:
            errors.append(f"Enlace de ficha duplicado: {href}.")
        hrefs.add(href)
        target = (root / "subpags/software/apps" / href[2:]).resolve()
        try:
            target.relative_to(root.resolve())
        except ValueError:
            errors.append(f"Enlace de ficha fuera del proyecto: {href}.")
        else:
            if not target.is_file():
                errors.append(f"Ficha enlazada inexistente: {href}.")

    def walk(nodes: list[dict]) -> list[str]:
        found: list[str] = []
        for node in nodes:
            path = node.get("path")
            if isinstance(path, str) and path.startswith("subpags/software/apps/") and path != "subpags/software/apps/index.html":
                found.append(path)
            if isinstance(node.get("children"), list):
                found.extend(walk(node["children"]))
        return found

    tree_apps = set(walk(tree.get("sections", [])))
    catalog_apps = {"subpags/software/apps/" + href[2:] for href in hrefs}
    if catalog_apps != tree_apps:
        missing_tree = sorted(catalog_apps - tree_apps)
        missing_catalog = sorted(tree_apps - catalog_apps)
        if missing_tree:
            errors.append("Fichas no registradas en tree.json: " + ", ".join(missing_tree))
        if missing_catalog:
            errors.append("Entradas del árbol ausentes del catálogo: " + ", ".join(missing_catalog))

    if len(parser.cards) != 108:
        errors.append(f"El catálogo contiene {len(parser.cards)} tarjetas; se esperaban 108.")

    software_section = next((item for item in tree.get("sections", []) if item.get("cat") == "software"), {})
    apps_section = next((item for item in software_section.get("children", []) if item.get("cat") == "apps"), {})
    for category in apps_section.get("children", []):
        category_path = category.get("path")
        if not isinstance(category_path, str):
            errors.append(f"Categoría sin ruta: {category.get('name')!r}.")
            continue
        try:
            category_html = (root / category_path).read_text(encoding="utf-8")
        except OSError:
            errors.append(f"Portada de categoría inexistente: {category_path}.")
            continue
        actual_cards = len(re.findall(r'class="category-app-card"', category_html))
        expected_cards = len(category.get("children", []))
        if actual_cards != expected_cards:
            errors.append(
                f"Tarjetas de categoría desincronizadas en {category_path}: "
                f"árbol {expected_cards}, portada {actual_cards}."
            )
        declared = re.search(
            r'<strong>(\d+)</strong>\s+(?:aplicación|aplicaciones)\s+catalogadas?',
            category_html,
        )
        if not declared or int(declared.group(1)) != expected_cards:
            errors.append(f"Recuento editorial incorrecto o ausente en {category_path}.")

    if not isinstance(audit, dict):
        errors.append("application-audit.json debe contener un objeto JSON.")
        audit = {}
    audit_records = audit.get("applications", [])
    if not isinstance(audit_records, list):
        errors.append("applications en application-audit.json debe ser una lista.")
        audit_records = []
    audit_by_path = {item.get("path"): item for item in audit_records if isinstance(item, dict)}
    if len(audit_records) != 108 or set(audit_by_path) != tree_apps:
        errors.append("El registro de auditoría debe contener exactamente una entrada por ficha del catálogo.")
    if len({item.get("id") for item in audit_records if isinstance(item, dict)}) != len(audit_records):
        errors.append("Hay identificadores duplicados en application-audit.json.")
    allowed_status = {"verified", "partial", "pending"}
    for record in audit_records:
        if not isinstance(record, dict):
            errors.append("Entrada de auditoría no válida.")
            continue
        if record.get("status") not in allowed_status:
            errors.append(f"Estado de auditoría desconocido para {record.get('id')!r}.")
        sources = record.get("sources")
        if not isinstance(sources, list) or not all(
            isinstance(url, str) and url.startswith("https://") for url in sources
        ):
            errors.append(f"Fuentes no válidas para {record.get('id')!r}.")
        if record.get("status") == "verified" and (
            not record.get("lastVerified") or not sources
        ):
            errors.append(f"La ficha verificada {record.get('id')!r} necesita fecha y fuentes.")
        if record.get("status") == "partial" and (not record.get("lastVerified") or not sources):
            errors.append(f"La ficha parcialmente verificada {record.get('id')!r} necesita fecha y fuentes.")
        if record.get("status") == "pending" and record.get("lastVerified") is not None:
            errors.append(f"La ficha pendiente {record.get('id')!r} no puede tener fecha de verificación.")
    if audit.get("version") != 1 or audit.get("updated") != "2026-11-28":
        errors.append("Metadatos de application-audit.json no válidos.")

    count_pattern = re.compile(
        r'<section class="library-category" id="library-category-(\d+)"[^>]*>.*?'
        r'<span class="library-category-count">(\d+) aplicaciones</span>',
        re.S,
    )
    for category_id, declared_count in count_pattern.findall(catalog_text):
        actual_count = parser.category_counts.get("library-category-" + category_id, 0)
        if actual_count != int(declared_count):
            errors.append(
                f"Recuento incorrecto en la categoría {category_id}: "
                f"declara {declared_count}, contiene {actual_count} tarjetas."
            )

    match = ICON_MAP.search(library_js)
    if not match:
        errors.append("No se encontró el mapa de iconos del catálogo.")
    else:
        for app_slug, icon_slug in ICON_ENTRY.findall(match.group(1)):
            icon_path = root / "images/apps" / f"{icon_slug}.svg"
            if not icon_path.is_file():
                errors.append(f"Icono asignado a {app_slug} inexistente: {icon_path.relative_to(root)}.")
                continue
            try:
                document = ET.parse(icon_path)
                svg = document.getroot()
            except ET.ParseError as error:
                errors.append(f"SVG no válido ({icon_path.relative_to(root)}): {error}.")
                continue
            if not svg.tag.endswith("svg") or not (svg.attrib.get("viewBox") or (svg.attrib.get("width") and svg.attrib.get("height"))):
                errors.append(f"SVG sin raíz o dimensiones/viewBox válidos: {icon_path.relative_to(root)}.")
            for element in svg.iter():
                local_tag = element.tag.rsplit("}", 1)[-1].lower()
                if local_tag in {"script", "foreignobject", "iframe", "object"}:
                    errors.append(f"Elemento SVG activo no permitido en {icon_path.relative_to(root)}: {local_tag}.")
                for attribute, value in element.attrib.items():
                    local_attribute = attribute.rsplit("}", 1)[-1].lower()
                    if local_attribute.startswith("on"):
                        errors.append(f"Evento inline SVG no permitido en {icon_path.relative_to(root)}.")
                    if local_attribute in {"href", "src"} and value and not (value.startswith("#") or value.startswith("data:image/png;base64,") or value.startswith("data:image/jpeg;base64,") or value.startswith("data:image/webp;base64,")):
                        errors.append(f"Referencia externa en SVG no permitida en {icon_path.relative_to(root)}.")
    if "CC0 1.0" not in icon_readme or "simple-icons" not in icon_readme.lower():
        errors.append("La procedencia y licencia de los logotipos debe documentar Simple Icons y CC0 1.0.")
    return errors


def main() -> int:
    errors = validate_catalog()
    if errors:
        for error in errors:
            print("ERROR: " + error, file=sys.stderr)
        return 1
    print("OK: catálogo, fichas, árbol y logotipos SVG íntegros.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
