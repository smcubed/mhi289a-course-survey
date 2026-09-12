// Pure helpers shared by the survey page, the results page, and the tests.
// No DOM access here.

const SEP = '; ';

export function isVisible(section, answers) {
  if (!section.showIf) return true;
  return section.showIf.any.some(({ questionId, values }) => {
    const a = answers[questionId];
    if (Array.isArray(a)) return a.some(v => values.includes(v));
    return a != null && values.includes(a);
  });
}

// Column names a question expands to (matches the Sheet header layout).
export function columnsFor(q) {
  if (q.type === 'lecture_tags') return q.lectures.map(l => `lec_${l.id}`);
  if (q.type === 'matrix') return q.rows.map(r => `${q.id}_${r.id}`);
  return [q.id];
}

function str(v) {
  return v == null ? '' : String(v);
}

export function flattenAnswers(sections, answers) {
  const out = {};
  for (const s of sections) {
    const visible = isVisible(s, answers);
    for (const q of s.questions) {
      const a = visible ? answers[q.id] : undefined;
      switch (q.type) {
        case 'lecture_tags':
          for (const l of q.lectures) out[`lec_${l.id}`] = Array.isArray(a?.[l.id]) ? a[l.id].join(SEP) : '';
          break;
        case 'matrix':
          for (const r of q.rows) out[`${q.id}_${r.id}`] = str(a?.[r.id]);
          break;
        case 'multi': {
          const parts = Array.isArray(a) ? a.slice() : [];
          const other = visible ? answers[`${q.id}_other`] : undefined;
          if (q.other && other && String(other).trim()) parts.push(`other: ${String(other).trim()}`);
          out[q.id] = parts.join(SEP);
          break;
        }
        default:
          out[q.id] = str(a);
      }
    }
  }
  return out;
}

function optLabel(q, value) {
  const o = (q.options || []).find(x => x.value === value);
  return o ? o.label : str(value);
}

export function answersToText(sections, answers) {
  const lines = [];
  for (const s of sections) {
    if (!isVisible(s, answers)) continue;
    const block = [];
    for (const q of s.questions) {
      const a = answers[q.id];
      switch (q.type) {
        case 'lecture_tags':
          for (const l of q.lectures) {
            const tags = a?.[l.id];
            if (Array.isArray(tags) && tags.length) {
              block.push(`${l.title}: ${tags.map(t => (q.tags.find(x => x.value === t) || { label: t }).label).join(SEP)}`);
            }
          }
          break;
        case 'matrix':
          for (const r of q.rows) if (a?.[r.id] != null && a[r.id] !== '') block.push(`${r.label}: ${optLabel(q, a[r.id])}`);
          break;
        case 'multi': {
          const parts = Array.isArray(a) ? a.map(v => optLabel(q, v)) : [];
          const other = answers[`${q.id}_other`];
          if (q.other && other && String(other).trim()) parts.push(`other: ${String(other).trim()}`);
          if (parts.length) block.push(`${q.label}: ${parts.join(SEP)}`);
          break;
        }
        case 'single':
          if (a != null && a !== '') block.push(`${q.label}: ${optLabel(q, a)}`);
          break;
        default:
          if (a != null && String(a).trim() !== '') block.push(`${q.label}: ${a}`);
      }
    }
    if (block.length) lines.push(`## ${s.title}`, ...block, '');
  }
  return lines.join('\n');
}

export function buildPayload(sections, answers, { version, isTest }) {
  return { survey_version: version, is_test: !!isTest, answers: flattenAnswers(sections, answers) };
}

// ---------------------------------------------------------------------------
// Results helpers (rows are flat objects as returned by the Apps Script doGet)
// ---------------------------------------------------------------------------

export const FIXED_COLUMNS = ['submitted_at', 'survey_version', 'is_test'];

export function isTestRow(row) {
  const v = row.is_test;
  return v === true || String(v).toUpperCase() === 'TRUE';
}

function cell(row, key) {
  const v = row[key];
  return v == null ? '' : String(v).trim();
}

function splitMulti(v) {
  return v ? v.split(';').map(s => s.trim()).filter(Boolean) : [];
}

export function summarizeScale(rows, q) {
  const counts = {};
  for (let v = q.min; v <= q.max; v++) counts[v] = 0;
  let n = 0, na = 0, sum = 0;
  for (const r of rows) {
    const v = cell(r, q.id);
    if (!v) continue;
    if (v === 'na') { na++; continue; }
    const num = Number(v);
    if (!(num in counts)) continue;
    counts[num]++; n++; sum += num;
  }
  return { n, na, counts, mean: n ? Math.round((sum / n) * 100) / 100 : null };
}

// single or multi choice. Multi cells look like "a; b; other: text".
export function summarizeChoice(rows, q) {
  const counts = new Map(q.options.map(o => [o.value, 0]));
  const other = [];
  let n = 0;
  for (const r of rows) {
    const parts = splitMulti(cell(r, q.id));
    if (!parts.length) continue;
    n++;
    for (const p of parts) {
      if (p.startsWith('other:')) other.push(p.slice(6).trim());
      else if (counts.has(p)) counts.set(p, counts.get(p) + 1);
    }
  }
  const items = q.options.map(o => ({ value: o.value, label: o.label, count: counts.get(o.value) }))
    .sort((a, b) => b.count - a.count);
  return { n, items, other };
}

export function summarizeLectureTags(rows, q) {
  return q.lectures.map(l => {
    const out = { lectureId: l.id, title: l.title };
    for (const t of q.tags) out[t.value] = 0;
    for (const r of rows) for (const t of splitMulti(cell(r, `lec_${l.id}`))) if (t in out) out[t]++;
    return out;
  }).sort((a, b) => (b.helpful - a.helpful) || (a.redundant - b.redundant));
}

export function summarizeMatrix(rows, q) {
  return q.rows.map(row => {
    const counts = {};
    for (const o of q.options) counts[o.value] = 0;
    let n = 0;
    for (const r of rows) {
      const v = cell(r, `${q.id}_${row.id}`);
      if (v && v in counts) { counts[v]++; n++; }
    }
    const nums = q.options.map(o => Number(o.value)).filter(x => !Number.isNaN(x));
    const numN = nums.reduce((a, v) => a + counts[v], 0);
    const mean = numN ? Math.round((nums.reduce((a, v) => a + v * counts[v], 0) / numN) * 100) / 100 : null;
    return { id: row.id, label: row.label, counts, n, mean };
  });
}

export function textResponses(rows, id) {
  return rows.map(r => ({ text: cell(r, id), track: cell(r, 'track') })).filter(x => x.text);
}

export function toCsv(rows) {
  const keys = FIXED_COLUMNS.slice();
  for (const r of rows) for (const k of Object.keys(r)) if (!keys.includes(k)) keys.push(k);
  const esc = v => {
    const s = v == null ? '' : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(','), ...rows.map(r => keys.map(k => esc(r[k])).join(','))].join('\r\n');
}
