#!/usr/bin/env python3
"""Serve ./site on http://127.0.0.1:8000 with no caching (for local development)."""
import os
from functools import partial
import socketserver
from http.server import HTTPServer, SimpleHTTPRequestHandler

SITE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'site')
PORT = int(os.environ.get('PORT', '8000'))


class FastBind(HTTPServer):
    """HTTPServer.server_bind does a reverse-DNS lookup that can hang for a minute; skip it."""
    def server_bind(self):
        socketserver.TCPServer.server_bind(self)
        self.server_name, self.server_port = self.server_address[0], self.server_address[1]


class H(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *a):
        pass


if __name__ == '__main__':
    print(f'serving {SITE} on http://127.0.0.1:{PORT}')
    FastBind(('127.0.0.1', PORT), partial(H, directory=SITE)).serve_forever()
