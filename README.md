# MHI 289A Course Survey

Anonymous end-of-course feedback site for MHI 289A (Introduction to AI for Clinical
Students, UC Davis). Static pages on GitHub Pages; responses go to a Google Sheet
through a Google Apps Script web app. A private results dashboard reads them back.

- `site/` — the deployed pages (`index.html` survey, `results.html` dashboard)
- `apps-script/` — the Sheet-side script and `SETUP.md` (five-minute setup)
- `tools/mock_server.py` — local stand-in for Apps Script
- `tests/` — `npm test` (Node 18+, no dependencies)

Local dev: `npm run mock` in one terminal, `npm run dev` in another, then open
`http://localhost:8000/?api=http://localhost:8787&test=1`.

Design and plan: `docs/plans/`.
