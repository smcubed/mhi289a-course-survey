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
