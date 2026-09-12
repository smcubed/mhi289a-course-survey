# MHI 289A Course Survey — Design

Date: 2026-09-12
Status: Approved by Scott McGrath (instructor)

## Purpose

Collect end-of-pilot feedback from the first cohort (fewer than 10 students) of
MHI 289A "Introduction to Artificial Intelligence for Clinical Students" (UC Davis,
Summer 2026). The instructor wants to find rough edges before the next offering.
Specifically:

- Which sections and lectures were most helpful
- Which content felt redundant or repetitive
- What students expected the course to cover that it did not
- Secondary: assignments, readings, live sessions, workload, format issues

## Decisions made with the instructor

| Decision | Choice | Why |
|---|---|---|
| Storage | Google Sheet via Apps Script web app | Instructor owns the data, no student login, free, anonymous |
| Hosting | GitHub Pages, public repo under `smcubed` | Free, already logged in, no infrastructure |
| Anonymity | Anonymous; one optional track question | Small cohort, candor matters; track is the only segmentation that changes the questions |
| Length | About 10 minutes | Per-week ratings plus lecture tags; not 32 individual ratings |
| Required fields | None | Maximize completion in a small cohort |

## Architecture

```
Student browser ──POST (text/plain JSON)──► Apps Script doPost ──► Google Sheet "Responses"
Instructor browser ──GET ?key=SECRET──────► Apps Script doGet  ──► JSON of all rows ──► results.html
```

Three deliverables:

1. `site/index.html` (+ `survey.js`, `survey.css`, `questions.js`, `config.js`)
   The student-facing survey. Single page, sectioned, autosaves to `localStorage`.
2. `site/results.html` (+ `results.js`)
   Instructor dashboard. Reads all rows through the script with a secret key,
   renders rating distributions, lecture tag tallies, and every open-text answer.
   CSV export. Filter that hides rows flagged as tests.
3. `apps-script/Code.gs`
   `doPost` validates and appends a row. `doGet` returns rows as JSON when the
   `key` parameter matches a script property. Setup instructions in
   `apps-script/SETUP.md`.

### Why Apps Script POST works from a static page

A `fetch` POST with `Content-Type: text/plain` and no custom headers is a CORS
"simple request", so there is no preflight. Apps Script answers with a redirect to
`script.googleusercontent.com`, which serves the `ContentService` output with
`Access-Control-Allow-Origin: *`, so the JSON response is readable. If reading the
response fails for any reason the page falls back to `mode: "no-cors"` and treats
"no network error" as success.

### Data model

One Sheet row per submission. Fixed columns first, then one column per question id.

| Column | Meaning |
|---|---|
| `submitted_at` | Server timestamp (ISO) |
| `survey_version` | Integer, bumped when questions change |
| `is_test` | `TRUE` when submitted with `?test=1` in the survey URL |
| `<question_id>` | One column per question. Scales store the number. Multi-selects store `a; b; c`. Lecture tags store `helpful; redundant` per lecture column |

Question ids are stable strings defined once in `questions.js` (e.g. `overall_rating`,
`w1_rating`, `lec_1_3_tags`, `expect_missing_text`). The script writes the header
row from the ids in the first submission and appends new columns if a later
submission has ids the header lacks, so question edits never break ingestion.

## Survey content

All questions optional. Sections, in order:

1. **Welcome** — purpose, anonymity statement, ~10 minutes, pilot framing.
2. **About you** — track (4-week medical student / 6-week graduate student / prefer not to say);
   AI familiarity before the course (1–5); how often they used generative AI tools before the course.
3. **Overall** — overall rating (1–5); the course met my expectations (1–5);
   workload vs the stated 8–10 h/week (much less … much more); pace (too slow … too fast);
   would recommend to a peer (1–5).
4. **Weeks 1–4**, one block each — week helpfulness (1–5); each of the week's lectures listed
   with three toggle tags: *Most helpful*, *Redundant / repetitive*, *Confusing / too thin*;
   optional comment. Lecture titles taken verbatim from Canvas.
5. **Expectations** — checklist of topics they may have expected but did not get
   (hands-on coding or Python; building or training a model; specific EHR tools such as Epic
   or ambient scribes; deep dive into their specialty; more statistics; more regulation and policy;
   more prompt practice; AI for research or writing; other). Open text: what was missing;
   what was unexpectedly valuable; what felt repeated across weeks.
6. **Assignments and assessments** — usefulness (1–5, plus "did not do") for: Week 1 Quiz,
   Week 2 Quiz, Week 3 Quiz, Muddiest Point Quiz, Week 2 Prompt Engineering Assignment,
   Week 3 Reflection Essay, Week 4 Literature Synthesis, Week 4 Final Project, MAIRS-MS surveys.
   Final project track chosen (A manuscript analysis / B implementation proposal).
   Open text: clearest instructions; least clear instructions.
7. **Readings and live sessions** — for Quinn textbook, Lee/Kohane textbook, assigned papers:
   how much read (none / some / most / all) and usefulness (1–5). Zoom sessions attended
   (multi-select by week); value of live sessions (1–5); Week 3 ethics case discussion format
   (live / Canvas alternative / neither) and its value.
8. **Weeks 5–6** — shown when track is graduate, or when the student ticks
   "I did some or all of Weeks 5–6". Lab notebook value (1–5); lightning talk value (1–5);
   would you recommend making these part of the core course; open text.
9. **Format and delivery** — lecture length (too short / right / too long); video and audio
   quality (1–5); Canvas navigation (1–5); anything broken or confusing (open).
10. **Closing** — the one change that would most improve the course; what must stay;
    anything else.

## Behavior

- Progress indicator across sections; sections collapse/expand; single scrolling page.
- Autosave every answer to `localStorage` under a versioned key; restore on load;
  clear on successful submit.
- Submit: disable button, POST, show thank-you. On failure: show retry, plus
  "Copy my answers" which puts a readable text version on the clipboard with the
  instructor's email address for manual sending.
- Honeypot field to discourage bots. No CAPTCHA.
- `?test=1` in the URL sets `is_test`.
- Mobile-friendly, respects light/dark scheme, no external dependencies except
  system fonts. Works with JavaScript-free fallback message if scripts are blocked.

## Results dashboard

- Prompts for the key (stored in `sessionStorage` once entered, or read from `?key=`).
- Toggle: include test rows.
- Sections mirror the survey. Scales render as horizontal bar distributions with n and mean.
  Lecture tags render as a table sorted by "most helpful" count with all three tag counts.
  Multi-selects render as ranked bars. Open text renders as quote lists grouped by question,
  with the track label if the respondent gave one.
- Export CSV button (client-side from the JSON).

## Error handling

- Apps Script `doPost` rejects payloads over 100 KB or without a JSON object; returns `{ok:false}`.
- Script uses `LockService` to avoid concurrent header/row corruption.
- Dashboard shows a clear message for wrong key, empty sheet, or network failure.

## Testing

- A local mock endpoint (`tools/mock_server.py`) that mimics `doPost`/`doGet` and writes
  to a local JSON file, so the whole flow is exercised before the real script exists.
- Manual browser pass: fill, reload (autosave restores), submit, view dashboard, export CSV.
- Apps Script tested by the instructor's first `?test=1` submission after deployment.

## Deployment

- Git repo `mhi289a-course-survey` under `smcubed`, public, GitHub Pages from `main` / `site`
  folder (or root with `site` contents at root). URL: `https://smcubed.github.io/mhi289a-course-survey/`.
- `config.js` holds the Apps Script URL and survey version; it is the only file the
  instructor edits after deploying the script.

## Out of scope

- Authentication for students, response editing after submit, email notifications,
  MAIRS-MS scoring (already in Canvas).

## Rough edges already noticed in the Canvas export (for the instructor, separate from the survey)

- "How to be Successful in This Course" page refers to "consumer health technologies" and
  "group writing assignments ... 50% of your final grade" — text from another course.
- Week 2 Assignment page opens with "critically review a journal article..." which does not
  match its prompt-engineering title and rubric.
- Syllabus lists a Week 4 quiz and an Ethics Case Discussion Canvas board post; neither exists
  in the shell (three quizzes only; the Week 3 alternative is an assignment-style page).
- Duplicate Week 5 and Week 6 overview / wrap-up pages exist in wiki content (`-2` and `-2-2` variants).
