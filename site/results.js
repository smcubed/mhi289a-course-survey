import { SECTIONS } from './questions.js';
import { CONFIG } from './config.js';
import { isTestRow, summarizeScale, summarizeChoice, summarizeLectureTags, summarizeMatrix, textResponses, toCsv } from './lib.js';

const params = new URLSearchParams(location.search);
const API = params.get('api') || CONFIG.APPS_SCRIPT_URL;
const $ = sel => document.querySelector(sel);
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null) n.append(kid);
  return n;
};

let allRows = [];
const TRACK_LABEL = { med: '4-week track', grad: '6-week track' };

function getKey() {
  const k = params.get('key');
  if (k) { try { sessionStorage.setItem('mhi289a_results_key', k); } catch {} return k; }
  try { return sessionStorage.getItem('mhi289a_results_key') || ''; } catch { return ''; }
}

function showGate(msg) {
  const gate = $('#gate');
  gate.replaceChildren(
    msg ? el('div', { class: 'ribbon err', text: msg }) : null,
    el('form', { class: 'keyform', onsubmit: e => { e.preventDefault(); const k = e.target.key.value.trim(); if (k) { try { sessionStorage.setItem('mhi289a_results_key', k); } catch {} load(k); } } },
      el('input', { type: 'text', name: 'key', placeholder: 'Results key (RESULTS_KEY from Apps Script)', autocomplete: 'off' }),
      el('button', { type: 'submit', class: 'primary', text: 'Open' })));
}

async function load(key) {
  if (!API) return showGate('No Apps Script URL configured. Fill in APPS_SCRIPT_URL in config.js (see apps-script/SETUP.md).');
  if (!key) return showGate('');
  $('#gate').replaceChildren(el('p', { class: 'empty', text: 'Loading…' }));
  try {
    const url = new URL(API);
    url.searchParams.set('key', key);
    const r = await fetch(url, { redirect: 'follow' });
    const j = await r.json();
    if (!j.ok) {
      if (j.error === 'unauthorized') { try { sessionStorage.removeItem('mhi289a_results_key'); } catch {} return showGate('That key was not accepted.'); }
      return showGate(`Server error: ${j.error || 'unknown'}`);
    }
    allRows = j.rows || [];
    $('#gate').replaceChildren();
    $('#toolbar').hidden = false;
    $('#stamp').textContent = `Loaded ${new Date().toLocaleTimeString()}`;
    render();
  } catch (err) {
    console.error(err);
    showGate('Could not reach the response sheet. Check the URL in config.js and your connection.');
  }
}

function visibleRows() {
  const inc = $('#inc-test').checked;
  return inc ? allRows : allRows.filter(r => !isTestRow(r));
}

function pct(n, d) { return d ? `${(100 * n) / d}%` : '0%'; }

function bars(pairs, total) {
  // pairs: [{label, count}] ; total for the width scale (max count) so bars are comparable within the block
  const max = Math.max(1, ...pairs.map(p => p.count));
  const g = el('div', { class: 'bars' });
  for (const p of pairs) {
    g.append(el('div', { class: 'lab', text: p.label }),
      el('div', { class: 'bar', title: `${p.label}: ${p.count}` }, el('span', { style: `width:${pct(p.count, max)}` })),
      el('div', { class: 'n', text: String(p.count) }));
  }
  return g;
}

function block(q, meta, body) {
  return el('div', { class: 'qblock' }, el('p', { class: 'qtitle', text: q.label }), meta ? el('p', { class: 'qmeta', text: meta }) : null, body);
}

function renderScale(rows, q) {
  const s = summarizeScale(rows, q);
  if (!s.n && !s.na) return block(q, null, el('p', { class: 'empty', text: 'No answers yet.' }));
  const pairs = [];
  for (let v = q.max; v >= q.min; v--) {
    let label = String(v);
    if (v === q.max && q.maxLabel) label = `${v} · ${q.maxLabel}`;
    if (v === q.min && q.minLabel) label = `${v} · ${q.minLabel}`;
    pairs.push({ label, count: s.counts[v] });
  }
  const meta = `n = ${s.n}${s.mean != null ? ` · mean ${s.mean}` : ''}${s.na ? ` · ${s.na} chose "${q.allowNA || 'N/A'}"` : ''}`;
  return block(q, meta, bars(pairs));
}

function renderChoice(rows, q) {
  const s = summarizeChoice(rows, q);
  if (!s.n) return block(q, null, el('p', { class: 'empty', text: 'No answers yet.' }));
  const body = el('div', {}, bars(s.items.map(i => ({ label: i.label, count: i.count }))));
  if (s.other.length) body.append(el('p', { class: 'qmeta', style: 'margin-top:8px', text: 'Other:' }), el('ul', { class: 'quotes' }, s.other.map(t => el('li', { text: t }))));
  return block(q, `n = ${s.n}${q.type === 'multi' ? ' (multiple answers allowed)' : ''}`, body);
}

function renderLectureTags(rows, q) {
  const s = summarizeLectureTags(rows, q);
  const max = Math.max(1, ...s.flatMap(r => q.tags.map(t => r[t.value])));
  const any = s.some(r => q.tags.some(t => r[t.value]));
  if (!any) return block(q, null, el('p', { class: 'empty', text: 'No tags yet.' }));
  const table = el('table', { class: 'lec' },
    el('thead', {}, el('tr', {}, el('th', { text: 'Lecture (sorted by "most helpful")' }), q.tags.map(t => el('th', { text: t.label })))),
    el('tbody', {}, s.map(r => el('tr', {},
      el('td', { text: r.title }),
      q.tags.map(t => el('td', { class: 'c' }, el('div', { class: `mini ${t.value}`, title: `${t.label}: ${r[t.value]}` },
        el('div', { class: 'bar' }, el('span', { style: `width:${pct(r[t.value], max)}` })),
        el('span', { class: 'n', text: String(r[t.value]) }))))))));
  return block(q, `Each count is the number of respondents who gave that lecture that tag.`, el('div', { style: 'overflow-x:auto' }, table));
}

function renderMatrix(rows, q) {
  const s = summarizeMatrix(rows, q);
  if (!s.some(r => r.n)) return block(q, null, el('p', { class: 'empty', text: 'No answers yet.' }));
  const numeric = q.options.every(o => o.value === 'na' || !Number.isNaN(Number(o.value)));
  const body = el('div');
  body.append(el('div', { class: 'legend' }, q.options.map((o, i) =>
    el('span', {}, el('i', { style: o.value === 'na' ? 'background:var(--line)' : `opacity:${numeric ? [0.25, 0.45, 0.65, 0.85, 1][Number(o.value) - 1] ?? 1 : [0.3, 0.55, 0.8, 1][i] ?? 1}` }), o.label))));
  for (const r of s) {
    const seg = el('div', { class: 'seg', title: q.options.map(o => `${o.label}: ${r.counts[o.value]}`).join(' · ') });
    q.options.forEach((o, i) => {
      if (!r.counts[o.value]) return;
      const a = { style: `width:${pct(r.counts[o.value], r.n)}`, 'data-v': o.value };
      if (!numeric) { a.class = 'q'; a['data-i'] = String(i); }
      seg.append(el('span', a));
    });
    body.append(el('div', { class: 'mrow' }, el('span', { text: r.label }), seg,
      el('span', { class: 'n', style: 'color:var(--muted);font-size:13px', text: r.mean != null ? `${r.mean} (n=${r.n})` : `n=${r.n}` })));
  }
  return block(q, q.scaleHint || null, body);
}

function renderText(rows, q) {
  const t = textResponses(rows, q.id);
  if (!t.length) return block(q, null, el('p', { class: 'empty', text: 'No answers yet.' }));
  return block(q, `${t.length} answer${t.length === 1 ? '' : 's'}`, el('ul', { class: 'quotes' }, t.map(x =>
    el('li', {}, x.text, TRACK_LABEL[x.track] ? el('span', { class: 'who', text: TRACK_LABEL[x.track] }) : null))));
}

const RENDER = { scale: renderScale, single: renderChoice, multi: renderChoice, lecture_tags: renderLectureTags, matrix: renderMatrix, text: renderText };

function render() {
  const rows = visibleRows();
  const nTest = allRows.filter(isTestRow).length;
  const last = allRows.map(r => r.submitted_at).filter(Boolean).sort().at(-1);
  const tracks = { med: 0, grad: 0 };
  for (const r of rows) if (r.track in tracks) tracks[r.track]++;
  $('#kpis').replaceChildren(
    kpi(rows.length, 'responses'),
    kpi(tracks.med, '4-week track'),
    kpi(tracks.grad, '6-week track'),
    kpi(nTest, 'test rows (hidden unless ticked)'),
    kpi(last ? new Date(last).toLocaleDateString() : '–', 'last submission'));
  const report = $('#report');
  report.replaceChildren();
  if (!rows.length) { report.append(el('p', { class: 'empty', text: 'No responses yet. Tick "Include test rows" to see test submissions.' })); return; }
  SECTIONS.forEach((s, i) => {
    const sec = el('section', { class: 'sec' }, el('h2', {}, el('span', { class: 'sec-num', text: `${i + 1}.` }), s.title));
    for (const q of s.questions) sec.append(RENDER[q.type](rows, q));
    report.append(sec);
  });
}

function kpi(v, l) { return el('div', { class: 'kpi' }, el('div', { class: 'v', text: String(v) }), el('div', { class: 'l', text: l })); }

function exportCsv() {
  const csv = toCsv(visibleRows());
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = el('a', { href: URL.createObjectURL(blob), download: `mhi289a-survey-${new Date().toISOString().slice(0, 10)}.csv` });
  document.body.append(a); a.click(); a.remove();
}

$('#inc-test').addEventListener('change', render);
$('#refresh').addEventListener('click', () => load(getKey()));
$('#export').addEventListener('click', exportCsv);
load(getKey());
