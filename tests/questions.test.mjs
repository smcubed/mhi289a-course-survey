import test from 'node:test';
import assert from 'node:assert/strict';
import { SECTIONS } from '../site/questions.js';

const allQuestions = SECTIONS.flatMap(s => s.questions);

test('every question id is unique', () => {
  const ids = allQuestions.map(q => q.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate ids: ' + ids.filter((x, i) => ids.indexOf(x) !== i));
});

test('ids are lowercase snake_case', () => {
  for (const q of allQuestions) assert.match(q.id, /^[a-z0-9_]+$/, q.id);
  for (const s of SECTIONS) assert.match(s.id, /^[a-z0-9_]+$/, s.id);
});

test('weeks 1-4 lecture tag questions list 8, 8, 8, 6 lectures', () => {
  const tags = allQuestions.filter(q => q.type === 'lecture_tags');
  assert.deepEqual(tags.map(q => q.lectures.length), [8, 8, 8, 6]);
  for (const q of tags) {
    const ids = q.lectures.map(l => l.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.deepEqual(q.tags.map(t => t.value), ['helpful', 'redundant', 'unclear']);
  }
});

test('showIf references existing questions', () => {
  const ids = new Set(allQuestions.map(q => q.id));
  for (const s of SECTIONS) {
    if (!s.showIf) continue;
    for (const c of s.showIf.any) assert.ok(ids.has(c.questionId), `${s.id} showIf -> ${c.questionId}`);
  }
});

test('every question has a type the renderer knows', () => {
  const known = new Set(['scale', 'single', 'multi', 'text', 'lecture_tags', 'matrix']);
  for (const q of allQuestions) assert.ok(known.has(q.type), `${q.id}: ${q.type}`);
});

test('option values within a question are unique', () => {
  for (const q of allQuestions) {
    if (!q.options) continue;
    const v = q.options.map(o => o.value);
    assert.equal(new Set(v).size, v.length, q.id);
  }
});
