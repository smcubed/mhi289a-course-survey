import test from 'node:test';
import assert from 'node:assert/strict';
import { flattenAnswers, answersToText, isVisible, buildPayload } from '../site/lib.js';

const SECTIONS = [
  {
    id: 's1', title: 'One',
    questions: [
      { id: 'rating', type: 'scale', label: 'Rate it', min: 1, max: 5 },
      { id: 'pick', type: 'single', label: 'Pick', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] },
      { id: 'many', type: 'multi', label: 'Many', other: true, options: [{ value: 'x', label: 'X' }, { value: 'y', label: 'Y' }] },
      { id: 'note', type: 'text', label: 'Note' },
      {
        id: 'lec', type: 'lecture_tags', label: 'Tag', tags: [{ value: 'helpful', label: 'H' }, { value: 'redundant', label: 'R' }],
        lectures: [{ id: '1_1', title: 'L1' }, { id: '1_2', title: 'L2' }],
      },
      { id: 'mat', type: 'matrix', label: 'Matrix', options: [{ value: '1', label: '1' }, { value: 'na', label: 'NA' }], rows: [{ id: 'r1', label: 'Row 1' }, { id: 'r2', label: 'Row 2' }] },
    ],
  },
  {
    id: 's2', title: 'Two', showIf: { any: [{ questionId: 'pick', values: ['b'] }, { questionId: 'many', values: ['y'] }] },
    questions: [{ id: 'hidden_note', type: 'text', label: 'Hidden' }],
  },
];

const ANSWERS = {
  rating: 4,
  pick: 'a',
  many: ['x', 'y'],
  many_other: 'something else',
  note: 'free text',
  lec: { '1_1': ['helpful', 'redundant'] },
  mat: { r1: '1' },
};

test('flattenAnswers produces one column per simple question', () => {
  const flat = flattenAnswers(SECTIONS, ANSWERS);
  assert.equal(flat.rating, '4');
  assert.equal(flat.pick, 'a');
  assert.equal(flat.note, 'free text');
});

test('flattenAnswers joins multi-select with "; " and appends other text', () => {
  const flat = flattenAnswers(SECTIONS, ANSWERS);
  assert.equal(flat.many, 'x; y; other: something else');
});

test('flattenAnswers expands lecture tags to one column per lecture', () => {
  const flat = flattenAnswers(SECTIONS, ANSWERS);
  assert.equal(flat.lec_1_1, 'helpful; redundant');
  assert.equal(flat.lec_1_2, '');
  assert.equal('lec' in flat, false);
});

test('flattenAnswers expands matrix rows to one column per row', () => {
  const flat = flattenAnswers(SECTIONS, ANSWERS);
  assert.equal(flat.mat_r1, '1');
  assert.equal(flat.mat_r2, '');
});

test('flattenAnswers blanks unanswered questions and omits hidden sections', () => {
  const flat = flattenAnswers(SECTIONS, { rating: 3 });
  assert.equal(flat.pick, '');
  assert.equal(flat.hidden_note, '');
  const flat2 = flattenAnswers(SECTIONS, { pick: 'b', hidden_note: 'now visible' });
  assert.equal(flat2.hidden_note, 'now visible');
  const flat3 = flattenAnswers(SECTIONS, { pick: 'a', hidden_note: 'stale answer from before toggling' });
  assert.equal(flat3.hidden_note, '', 'answers in hidden sections are not submitted');
});

test('isVisible honours showIf with any-of semantics', () => {
  assert.equal(isVisible(SECTIONS[0], {}), true);
  assert.equal(isVisible(SECTIONS[1], {}), false);
  assert.equal(isVisible(SECTIONS[1], { pick: 'b' }), true);
  assert.equal(isVisible(SECTIONS[1], { many: ['y'] }), true);
  assert.equal(isVisible(SECTIONS[1], { many: ['x'] }), false);
});

test('answersToText is readable and includes labels not ids', () => {
  const txt = answersToText(SECTIONS, ANSWERS);
  assert.match(txt, /Rate it: 4/);
  assert.match(txt, /Pick: A/);
  assert.match(txt, /Many: X; Y; other: something else/);
  assert.match(txt, /L1: H; R/);
  assert.match(txt, /Row 1: 1/);
  assert.doesNotMatch(txt, /Hidden/);
});

test('buildPayload wraps flattened answers with version and test flag', () => {
  const p = buildPayload(SECTIONS, ANSWERS, { version: 3, isTest: true });
  assert.equal(p.survey_version, 3);
  assert.equal(p.is_test, true);
  assert.equal(p.answers.rating, '4');
});
