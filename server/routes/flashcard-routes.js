const { flashcardReviewSchema, validateBody } = require('../validation');

function setupFlashcardRoutes(app, deps = {}) {
  const {
    authenticateToken = (req, res, next) => next(),
    supabaseGetFlashcards = async () => [],
    supabaseUpsertFlashcard = async () => ({ error: 'not configured' })
  } = deps;

  const FLASHCARD_VOCAB = [
    { word: 'awkward', translation: 'Constrangedor/Desajeitado', level: 'B1' },
    { word: 'thrilled', translation: 'Muito empolgado', level: 'B1' },
    { word: 'overwhelmed', translation: 'Sobrecarregado', level: 'B1' },
    { word: 'stubborn', translation: 'Teimoso', level: 'B1' },
    { word: 'crave', translation: 'Ter desejo intenso por', level: 'B2' },
    { word: 'gorgeous', translation: 'Deslumbrante/Lindo', level: 'A2' },
    { word: 'resilient', translation: 'Resistente/Forte', level: 'B2' },
    { word: 'thorough', translation: 'Minucioso/Detalhado', level: 'B2' },
    { word: 'inevitable', translation: 'Inevitável', level: 'B2' },
    { word: 'ubiquitous', translation: 'Presente em todos os lugares', level: 'C1' },
    { word: 'subtle', translation: 'Sutil/Delicado', level: 'B2' },
    { word: 'reluctant', translation: 'Relutante', level: 'B1' },
    { word: 'endeavor', translation: 'Esforçar-se/Empreender', level: 'C1' },
    { word: 'meticulous', translation: 'Minucioso/Preciso', level: 'C1' },
    { word: 'ambitious', translation: 'Ambicioso', level: 'B1' },
    { word: 'curious', translation: 'Curioso', level: 'A2' },
    { word: 'generous', translation: 'Generoso', level: 'A2' },
    { word: 'exhausted', translation: 'Exausto', level: 'A2' },
    { word: 'accomplish', translation: 'Realizar/Conquistar', level: 'B1' },
    { word: 'procrastinate', translation: 'Procrastinar', level: 'B2' },
    { word: 'comprehend', translation: 'Compreender', level: 'B1' },
    { word: 'flourish', translation: 'Florescer/Prosperar', level: 'B2' },
    { word: 'persevere', translation: 'Perseverar', level: 'C1' },
  ];

  // Get available flashcards
  app.get('/api/flashcards/available', authenticateToken, async (req, res) => {
    try {
      const now = new Date().toISOString();
      const flashcards = await supabaseGetFlashcards(req.user.id);
      const due = flashcards.filter(f => f.next_review && f.next_review <= now);
      const seen = due.map(d => d.word);

      if (due.length < 10) {
        const upcoming = flashcards.filter(f => f.next_review && f.next_review > now);
        seen.push(...upcoming.map(u => u.word));
        const newWords = FLASHCARD_VOCAB.filter(v => !seen.includes(v.word)).slice(0, 10 - due.length);
        const newItems = newWords.map(w => ({ ...w, ease_factor: 2.5, interval_days: 1, next_review: now, repetitions: 0, isNew: true }));
        res.json({ cards: [...due, ...newItems] });
      } else {
        res.json({ cards: due.slice(0, 20) });
      }
    } catch (error) {
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  // Review flashcard
  app.post('/api/flashcards/review', authenticateToken, validateBody(flashcardReviewSchema), async (req, res) => {
    const { word, translation, quality } = req.validatedBody;

    try {
      const flashcards = await supabaseGetFlashcards(req.user.id);
      const review = flashcards.find(f => f.word === word);

      let easeFactor = 2.5;
      let interval = 1;
      let repetitions = 0;

      if (review) {
        easeFactor = review.ease_factor;
        repetitions = review.repetitions;
        interval = review.interval_days;
      }

      // SM-2 update
      if (quality >= 3) {
        if (repetitions === 0) interval = 1;
        else if (repetitions === 1) interval = 6;
        else interval = Math.round(interval * easeFactor);
        repetitions += 1;
      } else {
        repetitions = 0;
        interval = 1;
      }

      easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + interval);

      await supabaseUpsertFlashcard(req.user.id, word, translation, {
        ease_factor: easeFactor,
        interval_days: interval,
        next_review: nextReview.toISOString(),
        repetitions
      });

      res.json({ success: true, next_review: nextReview.toISOString(), interval });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao processar review' });
    }
  });

  // Get flashcard stats
  app.get('/api/flashcards/stats', authenticateToken, async (req, res) => {
    try {
      const now = new Date().toISOString();
      const flashcards = await supabaseGetFlashcards(req.user.id);
      const due = flashcards.filter(f => f.next_review && f.next_review <= now);
      res.json({ due: due.length, total: flashcards.length });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno' });
    }
  });
}

module.exports = { setupFlashcardRoutes };