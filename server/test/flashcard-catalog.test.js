const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { setupFlashcardRoutes } = require('../routes/flashcard-routes');
const added = require('../data/additional-flashcards.json');

function handler(reviews = []) {
  let available;
  setupFlashcardRoutes({ get(path, ...handlers) { if (path.endsWith('/available')) available = handlers.at(-1); }, post() {} }, {
    supabaseGetFlashcards: async () => reviews,
    supabaseGetUserById: async () => ({ english_level: 'A1' })
  });
  return async category => {
    const response = { status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
    await available({ user: { id: 'catalog-student' }, query: category ? { category } : {} }, response);
    assert.ok(!response.code, JSON.stringify(response.body));
    return response.body.cards;
  };
}

test('50 new review cards have unique words, examples and balanced levels', () => {
  const existing = readFileSync(require.resolve('../routes/flashcard-routes'), 'utf8');
  assert.equal(added.length, 50);
  assert.equal(new Set(added.map(c => c.word)).size, 50);
  for (const level of ['A1', 'A2', 'B1', 'B2', 'C1']) assert.equal(added.filter(c => c.level === level).length, 10);
  for (const card of added) {
    assert.ok(!existing.includes(`word: '${card.word}'`));
    assert.ok(card.translation && card.category && card.example);
  }
});

test('category is selected before limiting the session; due cards stay ahead of new ones', async () => {
  const cards = await handler([
    { word: 'desk', category: 'Lugar', next_review: '2020-01-01', translation: 'Escrivaninha', level: 'A1' },
    { word: 'window', next_review: '2099-01-01', level: 'A1' },
    { word: 'water', next_review: '2020-01-01', level: 'A1' }
  ])('Lugar');
  assert.equal(cards[0].word, 'desk');
  assert.ok(cards.every(c => c.category === 'Lugar'));
  assert.ok(!cards.some(c => c.word === 'window'));
  assert.ok(cards.length <= 20);
  const advanced = await handler()('Argumento');
  assert.ok(advanced.some(c => added.some(a => a.word === c.word)));
  assert.ok(advanced.every(c => c.category === 'Argumento'));
  assert.ok((await handler()()).length === 20);
});
