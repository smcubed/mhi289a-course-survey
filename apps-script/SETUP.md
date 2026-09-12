# Connecting the survey to your Google Sheet (about 5 minutes)

You do this once. Afterwards the survey posts straight into the Sheet.

## 1. Create the Sheet

1. Go to https://sheets.new (signed in to the Google account that should own the responses;
   your UC Davis or Berkeley account is fine).
2. Name it something like `MHI 289A Course Survey Responses`.

## 2. Add the script

1. In the Sheet: **Extensions → Apps Script**.
2. Delete the placeholder code in `Code.gs` and paste the entire contents of
   [`Code.gs`](Code.gs) from this folder.
3. Click the save icon (or ⌘S). Name the project if asked.

## 3. Set the results key

This is the password for the results dashboard. Anyone with the key can read responses.

1. Make one: in Terminal run

   ```bash
   openssl rand -hex 24
   ```

   and copy the output.
2. In Apps Script, click the gear icon (**Project Settings**) in the left sidebar.
3. Scroll to **Script Properties → Add script property**.
   Property: `RESULTS_KEY`   Value: the string you copied.
4. **Save script properties**.

## 4. Deploy as a web app

1. Top right: **Deploy → New deployment**.
2. Click the gear next to "Select type" and choose **Web app**.
3. Description: `survey v1`.
   **Execute as: Me.**
   **Who has access: Anyone.** (This is what lets students submit without logging in.
   "Anyone" here means anyone can *post a response*; nobody can read the Sheet.)
4. **Deploy**. Google will ask you to authorize the script. Choose your account,
   click **Advanced → Go to … (unsafe)** if it warns you (it is your own script), then **Allow**.
5. Copy the **Web app URL**. It ends in `/exec`.

## 5. Put the URL in the site

1. Open `site/config.js` and paste the URL into `APPS_SCRIPT_URL`.
2. Redeploy the site. The git repo is the `Course survey` folder, so change into it first:

   ```bash
   cd ~/Desktop/"UC Davis AI course"/"Course survey" && git add site/config.js && git commit -m "config: connect apps script" && npm run deploy
   ```

## 6. Test it

1. Open the survey with `?test=1` on the end of the URL, answer a couple of questions, submit.
   A row should appear in the Sheet's `Responses` tab within a few seconds, with `is_test` = TRUE.
2. Open `results.html?key=YOUR_KEY` on the site and tick **include test rows**. Your test row should show.
3. Delete the test row from the Sheet if you like, or leave it; the dashboard hides test rows by default.

## Later: if you edit `Code.gs`

Changes do not go live until you **Deploy → Manage deployments → ✎ (edit) → Version: New version → Deploy**.
The URL stays the same.

## Later: if you edit questions

Bump `SURVEY_VERSION` in `site/config.js`. New columns are added to the Sheet automatically
when the first response with them arrives; old columns are left in place.
