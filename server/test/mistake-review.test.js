const test = require('node:test');
const assert = require('node:assert/strict');
const { mistakeCards } = require('../services/mistake-review');
const { setupFlashcardRoutes } = require('../routes/flashcard-routes');
const error = { user_sentence: 'She go home', correct_form: 'She goes home', error_type: 'agreement' };

test('deduplicates corrections and preserves spaced repetition across activities', () => {
  const [card] = mistakeCards([error, { ...error, user_sentence: ' she GO home ' }]);
  assert.equal(mistakeCards([error, error]).length, 1);
  assert.equal(card.source, 'conversation');
  const [reviewed] = mistakeCards([error], [{ word: card.word, repetitions: 2, next_review: '2099-01-01', interval_days: 6 }]);
  assert.equal(reviewed.repetitions, 2);
  assert.equal(reviewed.next_review, '2099-01-01');
  assert.equal(reviewed.isNew, false);
  assert.deepEqual(mistakeCards([{ user_sentence: 'Hi', correct_form: ' hi ' }, {}]), []);
});

test('serves personal errors first, honors future reviews and isolates users', async () => {
  const routes = {};
  const app = { get: (path, ...handlers) => { routes[path] = handlers.at(-1); }, post() {} };
  let reviews = [];
  setupFlashcardRoutes(app, {
    supabaseGetGrammarErrors: async id => id === 'student' ? [error] : [],
    supabaseGetFlashcards: async () => reviews,
    supabaseGetUserById: async () => ({ english_level: 'A1' })
  });
  const get = async (path, id) => {
    let data;
    await routes[path]({ user: { id } }, { json: value => { data = value; } });
    return data;
  };
  const available = await get('/api/flashcards/available', 'student');
  assert.equal(available.cards[0].source, 'conversation');
  assert.equal((await get('/api/flashcards/mistakes', 'other')).cards.length, 0);
  assert.equal((await get('/api/flashcards/stats', 'student')).due, 1);
  reviews = [{ ...available.cards[0], next_review: '2099-01-01' }];
  assert.equal((await get('/api/flashcards/mistakes', 'student')).cards.length, 0);
  assert.equal((await get('/api/flashcards/available', 'student')).cards.some(card => card.source === 'conversation'), false);
});
