const { normalize } = require('./mistake-review');
const SKILLS = {
  lesson: 'Uso do inglês nas lições', flashcard: 'Vocabulário', music_quiz: 'Compreensão de letras',
  native_coach: 'Escrita em contexto', dictation: 'Ditado'
};
function buildLearningSummary(cards, errors, events, now = Date.now()) {
  const vocabulary = cards.filter(card => !card.word.startsWith('mistake:'));
  const consolidated = vocabulary.filter(card => card.repetitions >= 3 && card.interval_days >= 7);
  const types = new Map();
  for (const error of errors) {
    if (!error.user_sentence || !error.correct_form) continue;
    const key = normalize(error.error_type) || 'grammar';
    const item = types.get(key) || { type: key, count: 0, examples: [] };
    item.count++;
    if (item.examples.length < 2 && !item.examples.some(example => normalize(example.incorrect) === normalize(error.user_sentence))) {
      item.examples.push({ incorrect: error.user_sentence, correct: error.correct_form });
    }
    types.set(key, item);
  }
  const split = now - 14 * 86400000, start = now - 28 * 86400000;
  const skills = Object.entries(SKILLS).map(([activity, label]) => {
    const attempts = events.filter(event => event.activity === activity && Date.parse(event.occurred_at) >= start && Date.parse(event.occurred_at) <= now);
    const current = attempts.filter(event => Date.parse(event.occurred_at) >= split);
    const previous = attempts.filter(event => Date.parse(event.occurred_at) < split);
    const mean = values => values.length ? Math.round(values.reduce((sum, value) => sum + value.score, 0) / values.length) : null;
    const score = mean(current), previousScore = mean(previous);
    return { activity, label, attempts: current.length, previousAttempts: previous.length, score,
      change: current.length >= 5 && previous.length >= 5 ? score - previousScore : null };
  });
  return {
    consolidatedWords: consolidated.length, reviewedWords: vocabulary.length,
    words: consolidated.slice(0, 12).map(card => ({ word: card.word, translation: card.translation })),
    recurringErrors: [...types.values()].filter(item => item.count >= 2).sort((a, b) => b.count - a.count).slice(0, 5),
    skills
  };
}
module.exports = { buildLearningSummary, SKILLS };
