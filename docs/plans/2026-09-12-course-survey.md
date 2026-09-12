# MHI 289A Course Survey Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A public, anonymous end-of-course survey site for MHI 289A whose responses land in the instructor's Google Sheet, plus a private results dashboard.

**Architecture:** Static HTML/JS on GitHub Pages. The survey is rendered from a single `questions.js` definition so the dashboard can reuse it. Submissions POST JSON to a Google Apps Script web app that appends rows to a Sheet; the dashboard GETs rows back with a secret key. A Python mock server stands in for Apps Script during development.

**Tech Stack:** Vanilla HTML/CSS/JS (no build step), Node 18+ `node:test` for unit tests, Python 3 stdlib for the mock server, Google Apps Script, GitHub Pages via `gh`.

Design: `docs/plans/2026-09-12-course-survey-design.md`

Project root: `/Users/smcgrath/Desktop/UC Davis AI course/Course survey/`

```
Course survey/
  site/                 # deployed to GitHub Pages (repo root == site contents)
    index.html
    results.html
    survey.css
    questions.js        # single source of truth for questions (ES module)
    survey.js
    results.js
    config.js           # APPS_SCRIPT_URL, SURVEY_VERSION — instructor edits this
  apps-script/
    Code.gs
    SETUP.md
  tools/
    mock_server.py
  tests/
    questions.test.mjs
    serialize.test.mjs
    results.test.mjs
  docs/plans/
```

Note on module loading: `questions.js`, `survey.js`, `results.js` are ES modules (`<script type="module">`). Pure helpers live in `lib.js` so Node tests import them without a DOM.

---

### Task 1: Project scaffold and git

**Files:** Create `site/`, `tests/`, `tools/`, `apps-script/`, `.gitignore`, `package.json`, `README.md`

**Steps**
1. `git init` in project root. `.gitignore`: `node_modules/`, `tools/mock_data.json`, `.DS_Store`.
2. `package.json` with `"type": "module"` and `"scripts": {"test": "node --test tests/"}`.
3. `README.md`: one paragraph on what this is, how to run tests, how to run the mock server, link to `apps-script/SETUP.md`.
4. Commit: `chore: scaffold course survey project`.

### Task 2: Question definitions (`site/questions.js`)

**Files:** Create `site/questions.js`, `tests/questions.test.mjs`

Export `SECTIONS`: array of `{id, title, intro?, showIf?, questions: Question[]}`.

Question types and shapes:
```js
{ id, type: 'scale', label, min: 1, max: 5, minLabel, maxLabel, allowNA?: string }
{ id, type: 'single', label, options: [{value, label}] }
{ id, type: 'multi',  label, options: [{value, label}], other?: true }
{ id, type: 'text',   label, placeholder?, rows? }
{ id, type: 'lecture_tags', label, lectures: [{id, title}], tags: [{value, label}] }
{ id, type: 'matrix', label, rows: [{id, label}], options: [{value,label}] }   // readings "how much read"
```
`showIf` is `{questionId, anyOf: [values]}` evaluated against answers; used for Weeks 5–6
(`track` is `grad` OR `did_weeks_5_6` includes `yes`).

Content: sections 2–10 from the design doc, lecture titles verbatim from Canvas:

Week 1: 1.1 Course Introduction; 1.2 History of AI in Medicine; 1.3 AI vs Machine Learning vs Deep Learning; 1.4 Discriminative AI vs Generative AI; 1.5 Supervised, Unsupervised, & Reinforcement Learning; 1.6 Introduction to Model Evaluation; 1.7 Sensitivity, Specificity, & the Confusion Matrix; 1.8 AUC, PPV, NPV.
Week 2: 2.1 Neural Networks; 2.2 Deep Learning and Why Depth Matters; 2.3 CNNs in Medical Imaging; 2.4 AI in Radiology & Pathology; 2.5 Natural Language Processing; 2.6 The Transformer Revolution; 2.7 Large Language Models; 2.8 Understanding Hallucinations.
Week 3: 3.1 Clinical Prompt Engineering; 3.2 Retrieval-Augmented Generation & Grounding; 3.3 Recognizing Bias in AI Systems; 3.4 The Optum Algorithm & Racial Bias; 3.5 Trust Calibration; 3.6 The Regulatory Landscape; 3.7 HIPAA, Privacy & "Shadow AI"; 3.8 Talking to Patients About AI in Their Care.
Week 4: 4.1 Integrating AI into Clinical Workflows; 4.2 Evaluating AI Tools; 4.3 Specialty Spotlight; 4.4 AI Governance & Institutional Policy; 4.5 The Liability Question; 4.6 Building Your AI-Ready Career.

Lecture tag values: `helpful`, `redundant`, `unclear`.

**Test (`tests/questions.test.mjs`)**
- every question id is unique across all sections
- every id matches `/^[a-z0-9_]+$/`
- lecture_tags questions have 8, 8, 8, 6 lectures for weeks 1–4
- every `showIf.questionId` refers to an existing question

Run: `npm test` → expect FAIL (module missing) → write → PASS. Commit `feat: question definitions`.

### Task 3: Pure helpers (`site/lib.js`)

**Files:** Create `site/lib.js`, `tests/serialize.test.mjs`

Functions:
- `flattenAnswers(sections, answers) → Record<string,string>`: one key per question id; lecture_tags expand to `lec_<id>_tags` keys with `"helpful; unclear"`; multi joins with `"; "`; `_other` text appended as `other: <text>`; missing → `""`.
- `answersToText(sections, answers) → string`: human-readable for the clipboard fallback.
- `isVisible(section, answers) → boolean`.
- `buildPayload(sections, answers, {version, isTest}) → {survey_version, is_test, answers: flattened}`.

Tests: flatten a small fixture covering each type; `isVisible` true/false; payload contains `survey_version`. TDD steps as in Task 2. Commit `feat: answer serialization helpers`.

### Task 4: Survey page (`site/index.html`, `survey.css`, `survey.js`, `config.js`)

**Files:** Create all four.

`config.js`:
```js
export const CONFIG = {
  APPS_SCRIPT_URL: "",          // paste the /exec URL from apps-script/SETUP.md
  SURVEY_VERSION: 1,
  INSTRUCTOR_EMAIL: "smcgrath@berkeley.edu",
  COURSE_TITLE: "MHI 289A: Introduction to AI for Clinical Students",
};
```
For local dev, `?api=http://localhost:8787` overrides `APPS_SCRIPT_URL`.

`survey.js` responsibilities:
1. Render sections from `SECTIONS` into `<section>` elements with progress list in a sticky header (section count done / total, based on any answer in section).
2. Answer state object; on any change → `localStorage.setItem('mhi289a_survey_v<version>', JSON)`. Restore on load. "Clear my answers" link.
3. Re-evaluate `showIf` sections on every change (toggle `hidden`).
4. Lecture tags: each lecture row has three `<button aria-pressed>` chips.
5. Submit: build payload, POST `fetch(url, {method:'POST', body: JSON.stringify(payload), headers:{'Content-Type':'text/plain;charset=utf-8'}, redirect:'follow'})`. If response JSON `ok` → success view, clear storage. On thrown error → retry with `mode:'no-cors'`; if that doesn't throw, treat as success. On failure → error panel with Retry and "Copy my answers" (uses `answersToText`).
6. Honeypot: hidden text input `website`; if filled, pretend success without posting.
7. `?test=1` → `isTest: true` and a visible "TEST MODE" ribbon.
8. If `APPS_SCRIPT_URL` is empty and no `?api`, show a banner "Survey not yet connected" and disable submit (prevents students hitting a dead form).

`survey.css`: system font stack, max-width 720px, large tap targets (min 44px), scale rendered as a row of radio-like buttons, light/dark via `prefers-color-scheme`, print-friendly.

`index.html`: `<noscript>` message; title; intro block (purpose, anonymous, ~10 min, optional questions, pilot); `<main id="survey">`; submit button; footer with instructor email.

Manual check: open with the Browser pane against the mock server (Task 5); verify autosave across reload, Weeks 5–6 toggling, submit success, forced failure (stop mock server) shows retry + copy. Commit `feat: survey page`.

### Task 5: Mock server (`tools/mock_server.py`)

`python3 tools/mock_server.py` on port 8787. `POST /` appends `{received_at, ...payload}` to `tools/mock_data.json` and returns `{"ok":true}` with `Access-Control-Allow-Origin: *`. `GET /?key=dev` returns `{ok:true, rows:[...]}` in the same shape Apps Script will return (flat objects with `submitted_at`, `survey_version`, `is_test`, plus answer columns). Handles `OPTIONS`. Commit `chore: mock backend for local testing`.

### Task 6: Apps Script (`apps-script/Code.gs`, `SETUP.md`)

`Code.gs`:
```js
const SHEET_NAME = 'Responses';
const FIXED = ['submitted_at', 'survey_version', 'is_test'];

function doPost(e) {
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > 100000) return json_({ok:false, error:'bad_payload'});
    let p; try { p = JSON.parse(raw); } catch (_) { return json_({ok:false, error:'bad_json'}); }
    if (!p || typeof p.answers !== 'object') return json_({ok:false, error:'bad_shape'});
    const sh = sheet_();
    const headers = ensureHeaders_(sh, Object.keys(p.answers));
    const row = headers.map(h =>
      h === 'submitted_at' ? new Date().toISOString() :
      h === 'survey_version' ? String(p.survey_version || '') :
      h === 'is_test' ? (p.is_test ? 'TRUE' : 'FALSE') :
      (p.answers[h] == null ? '' : String(p.answers[h]).slice(0, 5000)));
    sh.appendRow(row);
    return json_({ok:true});
  } finally { lock.releaseLock(); }
}

function doGet(e) {
  const key = PropertiesService.getScriptProperties().getProperty('RESULTS_KEY');
  if (!key || !e || !e.parameter || e.parameter.key !== key) return json_({ok:false, error:'unauthorized'});
  const sh = sheet_();
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return json_({ok:true, rows:[]});
  const [hdr, ...rows] = values;
  return json_({ok:true, rows: rows.map(r => Object.fromEntries(hdr.map((h,i) => [h, r[i]])))});
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}
function ensureHeaders_(sh, keys) {
  let headers = sh.getLastRow() ? sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].filter(String) : [];
  if (!headers.length) { headers = FIXED.slice(); }
  const missing = FIXED.concat(keys).filter(k => headers.indexOf(k) < 0);
  if (missing.length) { headers = headers.concat(missing); sh.getRange(1,1,1,headers.length).setValues([headers]); }
  return headers;
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
```

`SETUP.md` steps: create Sheet → Extensions → Apps Script → paste → Project Settings → Script properties → add `RESULTS_KEY` (long random string; give a generator command) → Deploy → New deployment → Web app, Execute as *Me*, Who has access *Anyone* → authorize → copy `/exec` URL → paste into `site/config.js` → commit/push → open survey with `?test=1`, submit → confirm row → open `results.html?key=...`. Include note: redeploy ("Manage deployments → Edit → New version") after editing the script. Commit `feat: apps script backend and setup guide`.

### Task 7: Results dashboard (`site/results.html`, `results.js`, `tests/results.test.mjs`)

Pure helpers in `lib.js` (tested):
- `summarizeScale(rows, id) → {n, mean, counts:{1..5}, na}`
- `summarizeMulti(rows, id) → [{value, label, count}]` sorted desc
- `summarizeLectureTags(rows, question) → [{lectureId, title, helpful, redundant, unclear}]` sorted by helpful desc
- `toCsv(rows) → string` (RFC 4180 quoting, header = union of keys, fixed columns first)

`results.js`: key from `?key=` or `sessionStorage` or a prompt form; fetch `${API}?key=…`; toggle "include test rows"; header stats (n responses, n test, last submission); render per section in survey order with CSS bar charts (no chart lib); open-text as blockquotes labeled with track when present; Export CSV via `Blob` download; error states for unauthorized / empty / network.

Tests: each summarize function on a 3-row fixture; `toCsv` quotes commas, quotes, newlines. Commit `feat: results dashboard`.

### Task 8: End-to-end local check

1. Start mock server; open `site/index.html?api=http://localhost:8787&test=1` in the Browser pane via a static `python3 -m http.server` (add a `.claude/launch.json` entry `survey-dev` for port 8000).
2. Fill several answers in every type, reload → restored. Submit → success. Check `tools/mock_data.json` has row.
3. Open `results.html?api=http://localhost:8787&key=dev` → dashboard shows the row; export CSV.
4. Screenshot desktop and mobile widths. Fix anything found. Commit `test: e2e local pass`.

### Task 9: Publish to GitHub Pages

1. Move site files so the repo root serves the site: keep `site/` as folder and deploy via Pages "from branch `main`, folder `/site`"? GitHub Pages only offers `/` or `/docs`. So: rename `site/` → `docs/` is confusing with plans. Decision: keep `site/`, and publish with a `gh-pages` branch built by `git subtree push --prefix site origin gh-pages`. Add `npm run deploy` script for that.
2. `gh repo create smcubed/mhi289a-course-survey --public --source=. --push`.
3. `git subtree push --prefix site origin gh-pages`; `gh api -X POST repos/smcubed/mhi289a-course-survey/pages -f build_type=legacy -f source[branch]=gh-pages -f source[path]=/`.
4. Verify `https://smcubed.github.io/mhi289a-course-survey/` loads and shows the "not yet connected" banner (expected until config is filled).
5. Commit `chore: deploy script`.

### Task 10: Handoff

Write `HANDOFF.md` at project root: the survey URL, the results URL pattern, the 5-minute Apps Script setup, how to edit questions (bump `SURVEY_VERSION`), how to redeploy (`npm run deploy`), and the list of Canvas rough edges from the design doc. Save memory notes about the project location and deployment for future sessions.
