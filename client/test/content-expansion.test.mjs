import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { additionalLessons } from '../src/data/additional-lessons.ts';
import { additionalNativePhrases } from '../src/data/additional-native-practice.ts';
import { getDailyPhraseWeight } from '../src/services/daily-order.ts';

const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
test('expanded lessons have unique questions, distinct choices and explanations at every level', () => {
  const previous = readFileSync(new URL('../src/data/lessons.ts', import.meta.url), 'utf8');
  const ids = new Set();
  for (const lesson of additionalLessons) {
    assert.ok(levels.includes(lesson.level));
    assert.ok(!previous.includes(`id: '${lesson.id}'`));
    assert.ok(lesson.questions.length >= 5);
    for (const question of lesson.questions) {
      assert.ok(!ids.has(question.id)); ids.add(question.id);
      assert.equal(new Set(question.choices).size, 4);
      assert.ok(question.choices[question.answer]);
      assert.ok(question.explain.trim());
    }
  }
  for (const level of levels) assert.equal(additionalLessons.filter(l => l.level === level).length, 2);
  assert.equal(ids.size, 50);
});

test('native practice adds distinct contexts and examples across all levels', () => {
  const previous = readFileSync(new URL('../src/data/native-practice.ts', import.meta.url), 'utf8');
  const ids = new Set();
  for (const phrase of additionalNativePhrases) {
    assert.ok(!ids.has(phrase.id)); ids.add(phrase.id);
    assert.ok(!previous.includes(`id: '${phrase.id}'`));
    assert.ok(previous.includes(`id: '${phrase.situation}'`));
    assert.equal(phrase.expected, phrase.natural);
    for (const field of ['meaning', 'useWhen', 'avoidWhen', 'example', 'prompt']) assert.ok(phrase[field].length > 10);
  }
  for (const level of levels) assert.equal(additionalNativePhrases.filter(p => p.level === level).length, 5);
});

test('daily native ordering is stable within a day and changes between days', () => {
  const ids = additionalNativePhrases.map(p => p.id);
  const order = day => [...ids].sort((a, b) => getDailyPhraseWeight(a, day) - getDailyPhraseWeight(b, day));
  assert.deepEqual(order('2026-09-15'), order('2026-09-15'));
  assert.notDeepEqual(order('2026-09-15'), order('2026-09-16'));
});
