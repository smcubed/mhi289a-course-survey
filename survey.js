import { SECTIONS } from './questions.js';
import { CONFIG } from './config.js';
import { isVisible, buildPayload, answersToText } from './lib.js';

const params = new URLSearchParams(location.search);
const API = params.get('api') || CONFIG.APPS_SCRIPT_URL;
const IS_TEST = params.get('test') === '1';
const STORE_KEY = `mhi289a_survey_v${CONFIG.SURVEY_VERSION}`;

const $ = (sel, root = document) => root.querySelector(sel);
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

// ---------- state ----------
let answers = loadAnswers();

function loadAnswers() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; } catch { return {}; }
}
function persist() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(answers)); } catch { /* private mode etc. */ }
}
function setAnswer(id, value) {
  const empty = value == null || value === '' || (Array.isArray(value) && !value.length)
    || (typeof value === 'object' && !Array.isArray(value) && !Object.keys(value).length);
  if (empty) delete answers[id]; else answers[id] = value;
  persist();
  refreshVisibility();
  refreshProgress();
}

// ---------- rendering ----------
function renderScale(q) {
  const wrap = el('div');
  const scale = el('div', { class: 'scale', role: 'radiogroup', 'aria-label': q.label });
  for (let v = q.min; v <= q.max; v++) {
    scale.append(el('label', {},
      el('input', { type: 'radio', name: q.id, value: String(v) }),
      el('span', { text: String(v) })));
  }
  if (q.allowNA) {
    scale.append(el('label', { class: 'na' },
      el('input', { type: 'radio', name: q.id, value: 'na' }),
      el('span', { text: q.allowNA })));
  }
  wrap.append(scale);
  if (q.minLabel || q.maxLabel) {
    wrap.append(el('div', { class: 'scale-ends' }, el('span', { text: `${q.min} = ${q.minLabel}` }), el('span', { text: `${q.max} = ${q.maxLabel}` })));
  }
  return wrap;
}

function renderOptions(q, type) {
  const list = el('div', { class: 'opts' });
  for (const o of q.options) {
    list.append(el('label', { class: 'opt' }, el('input', { type, name: q.id, value: o.value }), el('span', { text: o.label })));
  }
  if (q.other) {
    list.append(el('div', { class: 'other' }, el('span', { text: 'Other:' }),
      el('input', { type: 'text', name: `${q.id}_other`, 'aria-label': `${q.label} (other)` })));
  }
  return list;
}

function renderText(q) {
  return el('textarea', { name: q.id, rows: q.rows || 3, placeholder: q.placeholder || '' });
}

function renderLectureTags(q) {
  const wrap = el('div');
  wrap.append(el('div', { class: 'taglegend' }, q.tags.map(t =>
    el('span', {}, el('span', { class: `dot ${t.value}` }), el('b', { text: t.label }), ` – ${t.hint}`))));
  for (const l of q.lectures) {
    wrap.append(el('div', { class: 'lecrow' },
      el('div', { class: 'lectitle', text: l.title }),
      el('div', { class: 'tags', role: 'group', 'aria-label': `Tags for ${l.title}` }, q.tags.map(t =>
        el('button', { type: 'button', class: 'tag', 'data-q': q.id, 'data-lec': l.id, 'data-tag': t.value, 'aria-pressed': 'false', text: t.label })))));
  }
  return wrap;
}

function renderMatrix(q) {
  const table = el('table', { class: 'matrix' });
  table.append(el('thead', {}, el('tr', {}, el('th', { text: '' }), q.options.map(o => el('th', { text: o.label })))));
  const tbody = el('tbody');
  for (const r of q.rows) {
    const name = `${q.id}__${r.id}`;
    const tr = el('tr', {}, el('td', { text: r.label }));
    const cells = el('td', { class: 'cells-wrap' });
    // On desktop each option is its own cell; on mobile the CSS collapses them into a flex row.
    for (const o of q.options) {
      tr.append(el('td', { class: 'cell' }, el('label', {},
        el('input', { type: 'radio', name, value: o.value, 'aria-label': `${r.label}: ${o.label}` }),
        el('span', { class: 'lbl', text: o.label }))));
    }
    tbody.append(tr);
  }
  table.append(tbody);
  const wrap = el('div', { style: 'overflow-x:auto' }, table);
  if (q.scaleHint) wrap.append(el('div', { class: 'hint', text: q.scaleHint }));
  return wrap;
}

function renderQuestion(q) {
  const fs = el('fieldset', { class: 'q', 'data-q': q.id });
  fs.append(el('legend', { class: 'qlabel', text: q.label }));
  if (q.note) fs.append(el('p', { class: 'qnote', text: q.note }));
  const body = {
    scale: renderScale, single: q => renderOptions(q, 'radio'), multi: q => renderOptions(q, 'checkbox'),
    text: renderText, lecture_tags: renderLectureTags, matrix: renderMatrix,
  }[q.type](q);
  fs.append(body);
  return fs;
}

function renderAll() {
  const host = $('#sections');
  SECTIONS.forEach((s, i) => {
    const sec = el('section', { class: 'sec', id: `sec-${s.id}`, 'data-sec': s.id });
    sec.append(el('h2', {}, el('span', { class: 'sec-num', text: `${i + 1}.` }), s.title));
    if (s.intro) sec.append(el('p', { class: 'intro', text: s.intro }));
    for (const q of s.questions) sec.append(renderQuestion(q));
    host.append(sec);
  });
}

// ---------- restore ----------
function applyAnswersToDom() {
  const form = $('#survey');
  for (const s of SECTIONS) for (const q of s.questions) {
    const a = answers[q.id];
    if (q.type === 'lecture_tags') {
      for (const b of form.querySelectorAll(`.tag[data-q="${q.id}"]`)) {
        b.setAttribute('aria-pressed', String(!!a?.[b.dataset.lec]?.includes(b.dataset.tag)));
      }
    } else if (q.type === 'matrix') {
      for (const r of q.rows) for (const i of form.querySelectorAll(`input[name="${q.id}__${r.id}"]`)) i.checked = a?.[r.id] === i.value;
    } else if (q.type === 'multi') {
      for (const i of form.querySelectorAll(`input[name="${q.id}"]`)) i.checked = Array.isArray(a) && a.includes(i.value);
      const other = form.querySelector(`input[name="${q.id}_other"]`);
      if (other) other.value = answers[`${q.id}_other`] || '';
    } else if (q.type === 'text') {
      form.querySelector(`textarea[name="${q.id}"]`).value = a || '';
    } else {
      for (const i of form.querySelectorAll(`input[name="${q.id}"]`)) i.checked = a != null && String(a) === i.value;
    }
  }
}

// ---------- events ----------
function wireEvents() {
  const form = $('#survey');
  const byName = new Map();
  for (const s of SECTIONS) for (const q of s.questions) byName.set(q.id, q);

  form.addEventListener('change', e => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    const name = t.name;
    if (name === 'website') return;
    if (name.includes('__')) {                      // matrix
      const [qid, rid] = name.split('__');
      const cur = { ...(answers[qid] || {}) };
      cur[rid] = t.value;
      setAnswer(qid, cur);
      return;
    }
    const q = byName.get(name);
    if (!q) return;
    if (q.type === 'multi') {
      const vals = [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(i => i.value);
      setAnswer(name, vals);
    } else if (t.type === 'radio') {
      setAnswer(name, q.type === 'scale' && t.value !== 'na' ? Number(t.value) : t.value);
    }
  });

  const timers = new Map();                       // one debounce timer per field
  form.addEventListener('input', e => {
    const t = e.target;
    if (!(t instanceof HTMLTextAreaElement) && !(t instanceof HTMLInputElement && t.type === 'text')) return;
    if (t.name === 'website') return;
    clearTimeout(timers.get(t.name));
    timers.set(t.name, setTimeout(() => setAnswer(t.name, t.value.trim() ? t.value : ''), 250));
  });

  form.addEventListener('click', e => {
    const b = e.target.closest('.tag');
    if (!b) return;
    const { q, lec, tag } = b.dataset;
    const cur = { ...(answers[q] || {}) };
    const set = new Set(cur[lec] || []);
    set.has(tag) ? set.delete(tag) : set.add(tag);
    if (set.size) cur[lec] = [...set]; else delete cur[lec];
    b.setAttribute('aria-pressed', String(set.has(tag)));
    setAnswer(q, cur);
  });

  form.addEventListener('submit', onSubmit);
  $('#clear-btn').addEventListener('click', () => {
    if (!confirm('Clear all your answers on this page?')) return;
    answers = {}; persist(); applyAnswersToDom(); refreshVisibility(); refreshProgress();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ---------- visibility + progress ----------
function refreshVisibility() {
  for (const s of SECTIONS) $(`#sec-${s.id}`).hidden = !isVisible(s, answers);
}
function sectionStarted(s) {
  return s.questions.some(q => answers[q.id] != null || (q.other && answers[`${q.id}_other`]));
}
function refreshProgress() {
  const vis = SECTIONS.filter(s => isVisible(s, answers));
  const done = vis.filter(sectionStarted).length;
  $('#prog-text').textContent = `${done} of ${vis.length} sections started`;
  $('#prog-bar').style.width = `${vis.length ? (100 * done) / vis.length : 0}%`;
}

// ---------- submit ----------
async function post(payload) {
  const body = JSON.stringify(payload);
  try {
    const r = await fetch(API, { method: 'POST', body, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow' });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || 'server_rejected');
    return;
  } catch (err) {
    // A CORS-opaque redirect can make the JSON unreadable even though the row was written.
    // Retry in no-cors: if it doesn't throw, the request reached the server.
    if (String(err).includes('server_rejected')) throw err;
    await fetch(API, { method: 'POST', body, mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
  }
}

async function onSubmit(e) {
  e.preventDefault();
  const btn = $('#submit-btn');
  const result = $('#result');
  if ($('input[name=website]').value) { showSuccess(); return; }   // bot
  if (!Object.keys(answers).length && !confirm('You have not answered anything yet. Submit anyway?')) return;
  btn.disabled = true; btn.textContent = 'Sending…';
  result.replaceChildren();
  const payload = buildPayload(SECTIONS, answers, { version: CONFIG.SURVEY_VERSION, isTest: IS_TEST });
  try {
    await post(payload);
    showSuccess();
  } catch (err) {
    console.error(err);
    showFailure();
    btn.disabled = false; btn.textContent = 'Submit feedback';
  }
}

function showSuccess() {
  try { localStorage.removeItem(STORE_KEY); } catch {}
  $('#survey').hidden = true;
  $('#result').replaceChildren(el('div', { class: 'status ok', role: 'status' },
    el('h2', { text: 'Thank you.' }),
    el('p', { text: 'Your feedback is in. It goes straight into fixing the next version of the course.' }),
    IS_TEST ? el('p', { text: '(Test mode: this row is flagged as a test.)' }) : null));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showFailure() {
  const text = answersToText(SECTIONS, answers);
  const box = el('div', { class: 'status err', role: 'alert' },
    el('h2', { text: 'That did not go through.' }),
    el('p', { text: 'Your answers are still saved in this browser. You can try again, or copy them and email them to the instructor.' }),
    el('div', { class: 'actions' },
      el('button', { type: 'button', class: 'secondary', text: 'Try again', onclick: () => $('#submit-btn').click() }),
      el('button', { type: 'button', class: 'secondary', text: 'Copy my answers', onclick: async ev => {
        try { await navigator.clipboard.writeText(text); ev.target.textContent = 'Copied'; } catch { pre.hidden = false; }
      } }),
      el('a', { class: 'secondary', href: `mailto:${CONFIG.INSTRUCTOR_EMAIL}?subject=${encodeURIComponent('MHI 289A course feedback')}&body=${encodeURIComponent(text).slice(0, 1800)}`, text: 'Open email' })));
  const pre = el('pre', { hidden: true, text });
  box.append(pre);
  $('#result').replaceChildren(box);
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ---------- boot ----------
function boot() {
  $('#mail').href = `mailto:${CONFIG.INSTRUCTOR_EMAIL}`;
  $('#mail').textContent = CONFIG.INSTRUCTOR_EMAIL;
  renderAll();
  applyAnswersToDom();
  wireEvents();
  refreshVisibility();
  refreshProgress();
  const banner = $('#banner');
  if (!API) {
    banner.append(el('div', { class: 'ribbon err', text: 'This survey is not connected to a response sheet yet, so submissions are disabled. If you are a student seeing this, please let the instructor know.' }));
    $('#submit-btn').disabled = true;
  } else if (IS_TEST) {
    banner.append(el('div', { class: 'ribbon', text: 'TEST MODE: this submission will be flagged as a test and hidden from the results by default.' }));
  }
}
boot();
