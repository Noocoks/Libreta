#!/usr/bin/env python3
"""Servidor local que reproduce el prefijo /Libreta usado en GitHub Pages."""

from __future__ import annotations

import io
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2]
HOST = "127.0.0.1"
PORT = 4173
PREFIX = "/Libreta"


class LibretaHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _rewrite_project_path(self) -> None:
        parsed = urlsplit(self.path)

        if parsed.path == PREFIX:
            self.send_response(301)
            self.send_header("Location", PREFIX + "/" )
            self.end_headers()
            return

        if parsed.path.startswith(PREFIX + "/"):
            self.path = self.path[len(PREFIX):]

    def send_head(self):
        path = self.translate_path(self.path)
        source = Path(path)

        # En las pruebas locales el iframe tiene origen opaco por sandbox.
        # Se añade el origen del servidor E2E solo a la respuesta de test;
        # nunca se publica esta excepción en las políticas CSP del repositorio.
        if source.is_file() and source.suffix.lower() == ".html":
            try:
                content = source.read_text(encoding="utf-8")
            except (OSError, UnicodeDecodeError):
                content = None

            if content is not None and "Content-Security-Policy" in content:
                content = content.replace(
                    "https://noocoks.github.io",
                    "https://noocoks.github.io http://127.0.0.1:4173",
                )
                payload = content.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-type", self.guess_type(path))
                self.send_header("Content-Length", str(len(payload)))
                self.send_header(
                    "Last-Modified",
                    self.date_time_string(os.path.getmtime(path)),
                )
                self.end_headers()
                return io.BytesIO(payload)

        return super().send_head()

    def do_GET(self) -> None:
        original_path = self.path
        self._rewrite_project_path()

        if urlsplit(original_path).path == PREFIX:
            return

        super().do_GET()

    def do_HEAD(self) -> None:
        original_path = self.path
        self._rewrite_project_path()

        if urlsplit(original_path).path == PREFIX:
            return

        super().do_HEAD()


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), LibretaHandler)
    print(f"Libreta E2E server: http://{HOST}:{PORT}{PREFIX}/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
