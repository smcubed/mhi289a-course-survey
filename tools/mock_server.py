#!/usr/bin/env python3
"""Local stand-in for the Apps Script web app.

POST /            body = JSON payload from the survey  -> appends a row, returns {"ok": true}
GET  /?key=dev    -> {"ok": true, "rows": [...]}  (same shape Apps Script doGet returns)
Rows are kept in tools/mock_data.json next to this file.
"""
import json, os, sys
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, 'mock_data.json')
KEY = 'dev'
PORT = int(os.environ.get('PORT', '8787'))


def load():
    if not os.path.exists(DATA):
        return []
    with open(DATA) as f:
        return json.load(f)


def save(rows):
    with open(DATA, 'w') as f:
        json.dump(rows, f, indent=1)


class H(BaseHTTPRequestHandler):
    def _send(self, status, obj):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send(204, {})

    def do_GET(self):
        qs = parse_qs(urlparse(self.path).query)
        if qs.get('key', [''])[0] != KEY:
            return self._send(200, {'ok': False, 'error': 'unauthorized'})
        self._send(200, {'ok': True, 'rows': load()})

    def do_POST(self):
        n = int(self.headers.get('Content-Length', '0'))
        raw = self.rfile.read(n)
        if n > 100000:
            return self._send(200, {'ok': False, 'error': 'bad_payload'})
        try:
            p = json.loads(raw)
        except Exception:
            return self._send(200, {'ok': False, 'error': 'bad_json'})
        if not isinstance(p, dict) or not isinstance(p.get('answers'), dict):
            return self._send(200, {'ok': False, 'error': 'bad_shape'})
        row = {
            'submitted_at': datetime.now(timezone.utc).isoformat(),
            'survey_version': str(p.get('survey_version', '')),
            'is_test': 'TRUE' if p.get('is_test') else 'FALSE',
        }
        row.update({k: ('' if v is None else str(v))[:5000] for k, v in p['answers'].items()})
        rows = load(); rows.append(row); save(rows)
        sys.stderr.write(f'[mock] stored row {len(rows)} (is_test={row["is_test"]})\n')
        self._send(200, {'ok': True})

    def log_message(self, *a):
        pass


if __name__ == '__main__':
    print(f'mock apps-script on http://localhost:{PORT}  (results key: {KEY})')
    HTTPServer(('127.0.0.1', PORT), H).serve_forever()
