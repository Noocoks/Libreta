#!/usr/bin/env python3
"""Servidor local que reproduce el prefijo /Libreta usado en GitHub Pages."""

from __future__ import annotations

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
