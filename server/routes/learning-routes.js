const { buildLearningSummary, SKILLS } = require('../services/learning-summary');
function setupLearningRoutes(app, { authenticateToken, supabase }) {
  app.post('/api/learning/events', authenticateToken, async (req, res) => {
    if (req.body?.userId !== req.user.id) return res.status(403).json({ error: 'Conta do resultado inválida.' });
    const { eventId, activity, score, occurredAt } = req.body || {};
    const date = Date.parse(occurredAt);
    if (typeof eventId !== 'string' || !/^[a-zA-Z0-9:_-]{1,160}$/.test(eventId) || !Object.hasOwn(SKILLS, activity || '') ||
      !Number.isInteger(score) || score < 0 || score > 100 || !Number.isFinite(date) || date > Date.now() + 60000 || date < Date.now() - 90 * 86400000) {
      return res.status(400).json({ error: 'Resultado inválido.' });
    }
    try {
      const { error } = await supabase.from('learning_events').upsert({ user_id: req.user.id, event_id: eventId, activity, score, occurred_at: new Date(date).toISOString() }, { onConflict: 'user_id,event_id', ignoreDuplicates: true });
      if (error) throw error;
      res.json({ success: true });
    } catch { res.status(503).json({ error: 'Não foi possível registrar o resultado.' }); }
  });
  app.get('/api/learning/summary', authenticateToken, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      // Paginate to avoid silently truncating Supabase's default 1000-row limit.
      async function readAll(table, columns, recent = false) {
        const rows = [];
        for (let offset = 0; ; offset += 1000) {
          let query = supabase.from(table).select(columns).eq('user_id', req.user.id);
          if (recent) query = query.gte('occurred_at', new Date(Date.now() - 28 * 86400000).toISOString()).order('occurred_at').order('event_id');
          else query = query.order(table === 'flashcard_review' ? 'word' : 'id');
          const result = await query.range(offset, offset + 999);
          if (result.error) throw result.error;
          rows.push(...result.data);
          if (result.data.length < 1000) return rows;
        }
      }
      const results = await Promise.all([
        readAll('flashcard_review', 'word,translation,repetitions,interval_days'),
        readAll('grammar_errors', 'error_type,user_sentence,correct_form'),
        readAll('learning_events', 'activity,score,occurred_at', true)
      ]);
      res.json(buildLearningSummary(...results));
    } catch { res.status(503).json({ error: 'Os indicadores de aprendizado estão indisponíveis. Tente novamente.' }); }
  });
}
module.exports = { setupLearningRoutes };
