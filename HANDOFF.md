# MHI 289A Course Survey — Handoff

## Links

| What | Where |
|---|---|
| Student survey | https://smcubed.github.io/mhi289a-course-survey/ |
| Test mode (row flagged as test) | https://smcubed.github.io/mhi289a-course-survey/?test=1 |
| Results dashboard | https://smcubed.github.io/mhi289a-course-survey/results.html?key=YOUR_RESULTS_KEY |
| Repository | https://github.com/smcubed/mhi289a-course-survey |
| Local project | `~/Desktop/UC Davis AI course/Course survey/` |

## One thing left for you: connect the Google Sheet (about 5 minutes)

Follow [`apps-script/SETUP.md`](apps-script/SETUP.md). Until you do, the live survey shows a
"not connected" banner and the submit button is disabled, so nothing is lost if a student
finds the link early.

## Sending it to students

Suggested note (edit freely):

> You were the pilot group for MHI 289A, and I want to fix the rough edges before it runs
> again. This 10-minute survey is anonymous, every question is optional, and it has nothing
> to do with grades. Blunt is useful. Link: https://smcubed.github.io/mhi289a-course-survey/

Fewer than ten students means a single missing response matters; a reminder after a week helps.

## Reading results

- The dashboard hides test rows unless you tick "Include test rows".
- Scales show the distribution, n, and mean. Lecture tags are sorted by "most helpful".
- Every open-text answer is listed under its question, with the track label when given.
- "Export CSV" downloads exactly what the dashboard is showing. The raw data is also just
  the `Responses` tab in your Sheet.
- With a cohort this small, read counts, not percentages, and weight the open text heavily.

## Changing things later

| Change | Do this |
|---|---|
| Edit a question or add one | Edit `site/questions.js`, bump `SURVEY_VERSION` in `site/config.js`, run `npm test`, then `npm run deploy` |
| Change the intro text | Edit `site/index.html` |
| Edit the Apps Script | Paste the new `Code.gs`, then Deploy → Manage deployments → Edit → New version |
| Run locally | `npm run mock` and `npm run dev`, then open `http://127.0.0.1:8000/?api=http://127.0.0.1:8787&test=1` |
| Run tests | `npm test` (all commands in this table run from the `Course survey` folder) |
| Redeploy the site | `cd ~/Desktop/"UC Davis AI course"/"Course survey" && git add -A && git commit -m "..." && npm run deploy` (pushes `site/` to the `gh-pages` branch) |

Deploys to GitHub Pages take a minute or two to appear.

## Canvas rough edges noticed while reading the export

Separate from anything students say, these looked like leftovers worth fixing:

1. **"How to be Successful in This Course"** page mentions "consumer health technologies" and
   "group writing assignments ... 50% of your final grade". That text is from another course.
2. **Week 2 Assignment** page opens with "critically review a journal article..." which does not
   match its title (Iterating Your Clinical Prompts) or the rest of the instructions.
3. **Syllabus vs. shell:** the syllabus lists a Week 4 quiz and an Ethics Case Discussion
   "Canvas board post". The shell has three quizzes and an assignment-style alternative page.
4. **Duplicate wiki pages** for Week 5 and Week 6 overview and wrap-up (`-2` and `-2-2` copies).
5. The syllabus still names the Week 2 assignment "Clinical Documentation Task" and the Week 4
   one lands on "Day 3 of Week 4"; the Canvas pages say otherwise. Worth one pass to align dates and titles.

The survey's "anything broken in Canvas" question should surface more of these.
