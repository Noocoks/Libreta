#!/usr/bin/env python3
"""Calcula las estadísticas de líneas del repositorio Libreta."""

import json
import os
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "res" / "json" / "project-stats.json"

LANGUAGES = {
    ".html": ("html", "HTML"),
    ".htm": ("html", "HTML"),
    ".css": ("css", "CSS"),
    ".js": ("javascript", "JavaScript"),
    ".mjs": ("javascript", "JavaScript"),
    ".cjs": ("javascript", "JavaScript"),
    ".json": ("json", "JSON"),
    ".py": ("python", "Python"),
    ".txt": ("txt", "TXT"),
    ".md": ("markdown", "Markdown"),
}

def main():
    totals = {}
    total_files = 0
    total_lines = 0

    for path in ROOT.rglob("*"):
        if not path.is_file() or path == OUTPUT:
            continue

        if ".git" in path.parts or "node_modules" in path.parts:
            continue

        language = LANGUAGES.get(path.suffix.lower())
        if language is None:
            continue

        key, label = language

        try:
            content = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue

        lines = sum(1 for line in content.splitlines() if line.strip())
        entry = totals.setdefault(key, {
            "key": key,
            "label": label,
            "files": 0,
            "lines": 0,
        })
        entry["files"] += 1
        entry["lines"] += lines
        total_files += 1
        total_lines += lines

    result = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "commit": os.environ.get("GITHUB_SHA", "local")[:7],
        "total_files": total_files,
        "total_lines": total_lines,
        "counting": "non-empty lines",
        "languages": sorted(totals.values(), key=lambda item: item["lines"], reverse=True),
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(result, ensure_ascii=False, indent=4) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(result, ensure_ascii=False, indent=4))


if __name__ == "__main__":
    main()
