import test from 'node:test';
import assert from 'node:assert/strict';
import { isLessonSet, safeQuestionIndex } from '../src/services/lesson-state.ts';
import { restoreActivityValue } from '../src/services/activity-drafts.ts';

const lesson = { id: 'review', title: 'Revisão', level: 'A1', focus: 'Erros', xp: 20,
  questions: [{ id: 'q', prompt: 'Complete:', helper: '', explain: '', choices: ['Hello'], answer: 0 }] };
test('restored lessons reject empty questions, wrong answers and malformed shapes', () => {
  assert.equal(isLessonSet(lesson), true);
  for (const value of [null, {}, { ...lesson, questions: [] }, { ...lesson, questions: [{ ...lesson.questions[0], answer: 3 }] }]) {
    assert.equal(isLessonSet(value), false);
    assert.equal(restoreActivityValue(value, lesson, isLessonSet), lesson);
  }
  for (const index of [-1, 999, NaN, 1.5]) assert.equal(safeQuestionIndex(index, 5), 0);
  assert.equal(safeQuestionIndex(3, 5), 3);
});
test('primitive draft fields retain valid values and reject incompatible JSON', () => {
  assert.equal(restoreActivityValue('false', false), false);
  assert.equal(restoreActivityValue({}, 'draft'), 'draft');
  assert.equal(restoreActivityValue(0, 1), 0);
  assert.deepEqual(restoreActivityValue({}, []), []);
});
