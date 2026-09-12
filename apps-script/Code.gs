/**
 * MHI 289A course survey backend.
 *
 * Bound to the Google Sheet that stores responses. Deployed as a Web app
 * (Execute as: Me, Who has access: Anyone). See SETUP.md.
 *
 *   POST  <exec url>            body: {"survey_version": 1, "is_test": false, "answers": {...}}
 *   GET   <exec url>?key=SECRET -> {"ok": true, "rows": [...]}
 */

const SHEET_NAME = 'Responses';
const FIXED = ['submitted_at', 'survey_version', 'is_test'];
const MAX_BODY = 100000;
const MAX_CELL = 5000;

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > MAX_BODY) return json_({ ok: false, error: 'bad_payload' });
    let p;
    try { p = JSON.parse(raw); } catch (_) { return json_({ ok: false, error: 'bad_json' }); }
    if (!p || typeof p !== 'object' || !p.answers || typeof p.answers !== 'object') {
      return json_({ ok: false, error: 'bad_shape' });
    }
    const sh = sheet_();
    const headers = ensureHeaders_(sh, Object.keys(p.answers));
    const row = headers.map(function (h) {
      if (h === 'submitted_at') return new Date().toISOString();
      if (h === 'survey_version') return String(p.survey_version == null ? '' : p.survey_version);
      if (h === 'is_test') return p.is_test ? 'TRUE' : 'FALSE';
      const v = p.answers[h];
      return v == null ? '' : String(v).slice(0, MAX_CELL);
    });
    sh.appendRow(row);
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  const key = PropertiesService.getScriptProperties().getProperty('RESULTS_KEY');
  const given = e && e.parameter && e.parameter.key;
  if (!key || !given || given !== key) return json_({ ok: false, error: 'unauthorized' });
  const sh = sheet_();
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return json_({ ok: true, rows: [] });
  const hdr = values[0];
  const rows = values.slice(1).filter(function (r) { return r.some(String); }).map(function (r) {
    const o = {};
    hdr.forEach(function (h, i) {
      if (!h) return;
      const v = r[i];
      o[h] = v instanceof Date ? v.toISOString() : v;
    });
    return o;
  });
  return json_({ ok: true, rows: rows });
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

// Header row = FIXED columns, then every answer key ever seen (appended in arrival order).
function ensureHeaders_(sh, keys) {
  let headers = [];
  if (sh.getLastRow() >= 1 && sh.getLastColumn() >= 1) {
    headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String).filter(function (h) { return h !== ''; });
  }
  if (!headers.length) headers = FIXED.slice();
  const missing = FIXED.concat(keys).filter(function (k) { return headers.indexOf(k) < 0; });
  if (missing.length) {
    headers = headers.concat(missing);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  }
  return headers;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Run this once from the editor to confirm the Sheet is wired up (creates the tab and header row).
function selfTest() {
  const sh = sheet_();
  ensureHeaders_(sh, ['selftest']);
  Logger.log('OK: sheet "%s" has %s columns', sh.getName(), sh.getLastColumn());
}
