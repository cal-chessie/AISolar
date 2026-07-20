#!/usr/bin/env python3
"""
Lightweight static file server for AISolar SPA.
Serves the Vite build output (dist/) on 0.0.0.0:8080 with SPA fallback.
"""
import http.server
import socketserver
import os
import sys
from pathlib import Path

DIST_DIR = Path("/home/z/my-project/aisolar/dist").resolve()
PORT = 3000

# Known client-side route prefixes (must fallback to index.html)
SPA_PREFIXES = (
    "/dashboard", "/admin", "/auth", "/installer", "/customer",
    "/consultant", "/audit", "/premium", "/about", "/portal",
    "/value", "/installers", "/customers",
)


class SpaHandler(http.server.SimpleHTTPRequestHandler):
    """Serve static files with SPA fallback to index.html."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST_DIR), **kwargs)

    def do_GET(self):
        # SPA fallback: if path doesn't match a real file (and isn't a static asset),
        # serve index.html so client-side router can take over.
        path = self.path.split("?", 1)[0]
        requested = self.translate_path(path)
        is_static_asset = (
            path.startswith("/assets/")
            or path in ("/favicon.ico", "/robots.txt", "/placeholder.svg", "/sw.js", "/index.html", "/")
        )
        if not is_static_asset and (not os.path.exists(requested) or any(path.startswith(p) for p in SPA_PREFIXES)):
            self.path = "/index.html"
        return super().do_GET()

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stdout.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))
        sys.stdout.flush()


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


if __name__ == "__main__":
    os.chdir(str(DIST_DIR))
    httpd = ReusableTCPServer(("0.0.0.0", PORT), SpaHandler)
    print(f"Serving {DIST_DIR} on http://0.0.0.0:{PORT}", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...", flush=True)
        httpd.shutdown()
