#!/usr/bin/env python3
"""ClaraVision static server — serves index.html + data/state.json."""

from __future__ import annotations

import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

APP_DIR = Path(__file__).resolve().parents[1]


class ClaraVisionHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(APP_DIR), **kwargs)


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5178
    server = ThreadingHTTPServer(("127.0.0.1", port), ClaraVisionHandler)
    print(f"ClaraVision static → http://127.0.0.1:{port}/")
    server.serve_forever()


if __name__ == "__main__":
    main()
