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
        self.csp: str | None = None
        self.csp_count = 0
        self.duplicate_attributes: list[str] = []
        self.inline_handlers: list[str] = []
        self.inline_scripts: list[str] = []
        self.inline_styles: list[str] = []
        self.unsafe_links: list[str] = []
        self.unsafe_blank_links: list[str] = []
        self.style_blocks = 0
        self.in_style = False
        self.iframes: list[set[str]] = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "style":
            self.in_style = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attribute_names = [name.lower() for name, _ in attrs]
        seen_attributes: set[str] = set()
        for name in attribute_names:
            if name in seen_attributes:
                self.duplicate_attributes.append(name)
            seen_attributes.add(name)
        values = dict(attrs)
        for name in values:
            if name.lower().startswith("on"):
                self.inline_handlers.append(name)
            if name.lower() == "style":
                self.inline_styles.append(name)
        if tag == "script" and not values.get("src"):
            script_type = (values.get("type") or "").lower()
            if script_type not in {"application/json", "application/ld+json"}:
                self.inline_scripts.append("script inline")
        if tag == "style":
            self.style_blocks += 1
            self.in_style = True
        if tag == "a" and values.get("href"):
            try:
                scheme = urlsplit(values["href"].strip()).scheme.lower()
            except ValueError:
                scheme = "invalid"
            if scheme in {"javascript", "vbscript", "data", "file"}:
                self.unsafe_links.append(values["href"])
            if (values.get("target") or "").lower() == "_blank":
                rel = set((values.get("rel") or "").lower().split())
                if not {"noopener", "noreferrer"}.issubset(rel):
                    self.unsafe_blank_links.append(values["href"])
        if tag == "meta" and (values.get("http-equiv") or "").lower() == "content-security-policy":
            self.csp_count += 1
            self.csp = values.get("content") or ""
        if tag == "iframe":
            self.iframes.append(set((values.get("sandbox") or "").split()))
        element_id = values.get("id")
        if element_id:
            if element_id in self.ids:
                self.duplicates.add(element_id)
            self.ids.add(element_id)

        if tag == "a" and values.get("href"):
            self.fragments.append(values["href"])


def local_target(source: Path, raw_url: str) -> tuple[Path, str] | None:
    raw_reference = raw_url.strip()
    invalid_target = ROOT / "__invalid_local_reference__"
    if any(ord(char) < 32 or ord(char) == 127 for char in raw_reference) or "\\" in raw_reference:
        return invalid_target, ""
    try:
        parsed = urlsplit(raw_reference)
    except ValueError:
        return invalid_target, ""
    if parsed.scheme or parsed.netloc or raw_reference.startswith("//"):
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
        return invalid_target, unquote(parsed.fragment)

    if target.is_dir():
        target = target / "index.html"
    return target, unquote(parsed.fragment)


# Allowlist deliberada: no se admiten comodines, hosts adicionales ni directivas desconocidas.
EXPECTED_CSP = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "script-src": ["'self'"],
    "script-src-attr": ["'none'"],
    "style-src": ["'self'"],
    "style-src-attr": ["'none'"],
    "style-src-elem": ["'self'"],
    "img-src": ["'self'", "data:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'"],
    "form-action": ["'self'"],
}
SANDBOXED_DOCUMENT_CSP = {
    "script-src": ["'self'", "https://noocoks.github.io/Libreta/"],
    "style-src": ["'self'", "https://noocoks.github.io/Libreta/"],
    "style-src-elem": ["'self'", "https://noocoks.github.io/Libreta/"],
    "img-src": ["'self'", "https://noocoks.github.io/Libreta/", "data:"],
    "font-src": ["'self'", "https://noocoks.github.io/Libreta/"],
    "connect-src": ["'self'", "https://noocoks.github.io/Libreta/"],
}
# frame-src puede omitirse: default-src 'self' aplica como fallback equivalente.
OPTIONAL_CSP = {"frame-src": ["'self'"]}


def has_exact_iframe_sandbox_permissions(sandbox: set[str]) -> bool:
    """El iframe de documentación solo puede ejecutar scripts aislados."""
    return sandbox == {"allow-scripts"}


def validate_csp_policy(policy: str, sandboxed_document: bool = False) -> list[str]:
    """Valida la CSP con allowlists exactas según el contexto del documento."""
    errors: list[str] = []
    expected_csp = dict(EXPECTED_CSP)
    if sandboxed_document:
        expected_csp.update(SANDBOXED_DOCUMENT_CSP)
    directives: dict[str, list[str]] = {}
    for raw_directive in policy.split(";"):
        parts = raw_directive.strip().split()
        if not parts:
            continue
        name = parts[0].lower()
        if name in directives:
            errors.append(f"directiva duplicada: {name}")
            continue
        directives[name] = parts[1:]

    allowed_names = set(expected_csp) | set(OPTIONAL_CSP)
    for name in sorted(set(directives) - allowed_names):
        errors.append(f"directiva no autorizada: {name}")
    for name, expected_sources in OPTIONAL_CSP.items():
        if name in directives and directives[name] != expected_sources:
            errors.append(
                f"{name}: valores esperados {expected_sources!r}, recibidos {directives[name]!r}"
            )
    for name, expected_sources in expected_csp.items():
        actual_sources = directives.get(name)
        if actual_sources is None:
            errors.append(f"falta directiva: {name}")
            continue
        if actual_sources != expected_sources:
            errors.append(
                f"{name}: valores esperados {expected_sources!r}, recibidos {actual_sources!r}"
            )
    return errors


def is_google_fonts_reference(reference: str) -> bool:
    """Detecta Google Fonts comparando el hostname analizado, no subcadenas."""
    try:
        hostname = urlsplit(reference.strip()).hostname
    except ValueError:
        return False

    if hostname is None:
        return False

    normalized_hostname = hostname.lower().rstrip(".")
    return (
        normalized_hostname == "fonts.googleapis.com"
        or normalized_hostname == "fonts.gstatic.com"
    )


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

        if any(is_google_fonts_reference(reference) for reference in references):
            ERRORS.append(f"Dependencia de Google Fonts no permitida en {css_file.relative_to(ROOT)}")

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

        relative = html_file.relative_to(ROOT).as_posix()
        if parser.duplicate_attributes:
            duplicates = sorted(set(parser.duplicate_attributes))
            ERRORS.append(f"Atributos HTML duplicados en {relative}: {', '.join(duplicates)}")
        if parser.csp_count > 1:
            ERRORS.append(f"Política Content-Security-Policy repetida en {relative}")
        if not parser.csp:
            ERRORS.append(f"Falta Content-Security-Policy en {relative}")
        else:
            sandboxed_document = relative == "Template/template.html" or relative.startswith("subpags/")
            for policy_error in validate_csp_policy(parser.csp, sandboxed_document):
                ERRORS.append(f"CSP inválida en {relative}: {policy_error}")
        if parser.inline_handlers:
            ERRORS.append(f"Eventos inline no permitidos en {relative}: {', '.join(parser.inline_handlers)}")
        if parser.inline_scripts:
            ERRORS.append(f"Scripts inline no permitidos en {relative}")
        if parser.unsafe_links:
            ERRORS.append(f"Protocolos peligrosos en enlaces de {relative}: {parser.unsafe_links}")
        if parser.unsafe_blank_links:
            ERRORS.append(f"Enlaces target=_blank sin noopener noreferrer en {relative}: {parser.unsafe_blank_links}")
        if parser.inline_styles:
            ERRORS.append(f"Estilos inline no permitidos en {relative}: {', '.join(parser.inline_styles)}")
        if parser.style_blocks:
            ERRORS.append(f"Bloques <style> inline no permitidos en {relative}")
        for sandbox in parser.iframes:
            if not has_exact_iframe_sandbox_permissions(sandbox):
                ERRORS.append(
                    f"iframe con permisos sandbox no autorizados en {relative}: {sorted(sandbox)}"
                )

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
