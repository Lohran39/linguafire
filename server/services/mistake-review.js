const { createHash } = require('node:crypto');
const normalize = value => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();

function mistakeCards(errors, reviews = []) {
  const cards = new Map();
  for (const error of errors) {
    const incorrect = String(error.user_sentence || '').trim();
    const correct = String(error.correct_form || '').trim();
    if (!incorrect || !correct || incorrect.length > 500 || correct.length > 500 || normalize(incorrect) === normalize(correct)) continue;
    const word = 'mistake:' + createHash('sha256').update(`${normalize(incorrect)}|${normalize(correct)}`).digest('hex');
    if (cards.has(word)) continue;
    const review = reviews.find(item => item.word === word);
    cards.set(word, {
      ease_factor: 2.5, interval_days: 1, repetitions: 0,
      next_review: new Date(0).toISOString(), ...review,
      word, translation: correct, incorrect, source: 'conversation',
      category: 'Erros da conversa', note: error.error_type || 'Gramática',
      isNew: !review
    });
  }
  return [...cards.values()];
}
module.exports = { mistakeCards, normalize };
