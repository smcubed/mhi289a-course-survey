import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeScale, summarizeChoice, summarizeLectureTags, summarizeMatrix, toCsv, isTestRow, textResponses } from '../site/lib.js';

const ROWS = [
  { submitted_at: '2026-09-10T10:00:00Z', is_test: 'FALSE', track: 'med', overall_rating: '4', lec_1_1: 'helpful', lec_1_2: '', expected_missing: 'coding; ehr_tools; other: RAG', assess_useful_quiz1: '5', one_change_text: 'Shorter week 2' },
  { submitted_at: '2026-09-11T10:00:00Z', is_test: false, track: 'grad', overall_rating: '5', lec_1_1: 'helpful; unclear', lec_1_2: 'redundant', expected_missing: 'coding', assess_useful_quiz1: 'na', one_change_text: '' },
  { submitted_at: '2026-09-12T10:00:00Z', is_test: true, track: '', overall_rating: 'na', lec_1_1: '', lec_1_2: '', expected_missing: '', assess_useful_quiz1: '', one_change_text: 'test row' },
  { submitted_at: '2026-09-12T11:00:00Z', is_test: 'TRUE', track: '', overall_rating: '', lec_1_1: '', lec_1_2: '', expected_missing: '', assess_useful_quiz1: '2', one_change_text: '' },
];

test('isTestRow accepts boolean and string TRUE forms', () => {
  assert.deepEqual(ROWS.map(isTestRow), [false, false, true, true]);
});

test('summarizeScale counts values, skips blanks, tracks NA and mean', () => {
  const s = summarizeScale(ROWS, { id: 'overall_rating', min: 1, max: 5 });
  assert.equal(s.n, 2);
  assert.equal(s.na, 1);
  assert.deepEqual(s.counts, { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 });
  assert.equal(s.mean, 4.5);
});

test('summarizeChoice splits multi-select cells and ranks options, keeping other text', () => {
  const q = { id: 'expected_missing', options: [{ value: 'coding', label: 'Coding' }, { value: 'ehr_tools', label: 'EHR' }, { value: 'stats', label: 'Stats' }] };
  const s = summarizeChoice(ROWS, q);
  assert.deepEqual(s.items.map(i => [i.label, i.count]), [['Coding', 2], ['EHR', 1], ['Stats', 0]]);
  assert.deepEqual(s.other, ['RAG']);
  assert.equal(s.n, 2);
});

test('summarizeLectureTags counts each tag per lecture and sorts by helpful', () => {
  const q = { lectures: [{ id: '1_1', title: 'L1' }, { id: '1_2', title: 'L2' }], tags: [{ value: 'helpful' }, { value: 'redundant' }, { value: 'unclear' }] };
  const s = summarizeLectureTags(ROWS, q);
  assert.deepEqual(s, [
    { lectureId: '1_1', title: 'L1', helpful: 2, redundant: 0, unclear: 1 },
    { lectureId: '1_2', title: 'L2', helpful: 0, redundant: 1, unclear: 0 },
  ]);
});

test('summarizeMatrix gives one summary per row keyed by option value', () => {
  const q = { id: 'assess_useful', rows: [{ id: 'quiz1', label: 'Quiz 1' }], options: [{ value: '1' }, { value: '2' }, { value: '5' }, { value: 'na' }] };
  const s = summarizeMatrix(ROWS, q);
  assert.equal(s[0].label, 'Quiz 1');
  assert.deepEqual(s[0].counts, { 1: 0, 2: 1, 5: 1, na: 1 });
  assert.equal(s[0].n, 3);
});

test('textResponses returns non-empty answers with their track', () => {
  const t = textResponses(ROWS, 'one_change_text');
  assert.deepEqual(t, [{ text: 'Shorter week 2', track: 'med' }, { text: 'test row', track: '' }]);
});

test('toCsv puts fixed columns first, unions keys, and quotes correctly', () => {
  const csv = toCsv([{ b: 'x,y', submitted_at: 't1', a: 'say "hi"' }, { c: 'line\nbreak', submitted_at: 't2' }]);
  const lines = csv.split('\r\n');
  assert.equal(lines[0], 'submitted_at,survey_version,is_test,b,a,c');
  assert.equal(lines[1], 't1,,,"x,y","say ""hi""",');
  assert.equal(lines[2], 't2,,,,,"line\nbreak"');
  assert.equal(lines.length, 3);
});
