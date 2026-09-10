const ACTIVITIES = new Set(['navigation', 'lessons', 'flashcard', 'conversation', 'music', 'natives', 'placement']);

function validDraft(body) {
  return body && Number.isSafeInteger(body.revision) && body.revision >= 0 && body.revision < 2147483647 &&
    body.state && typeof body.state === 'object' && !Array.isArray(body.state) &&
    body.state.version === 1 && Buffer.byteLength(JSON.stringify(body.state)) <= 150000;
}

function setupActivityRoutes(app, { authenticateToken, supabase }) {
  app.get('/api/activities', authenticateToken, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      const { data, error } = await supabase.from('activity_progress')
        .select('activity,state,revision,updated_at').eq('user_id', req.user.id);
      if (error) throw error;
      res.json({ activities: data || [] });
    } catch {
      res.status(503).json({ error: 'Não foi possível carregar suas atividades salvas.' });
    }
  });

  app.put('/api/activities/:activity', authenticateToken, async (req, res) => {
    if (!ACTIVITIES.has(req.params.activity) || !validDraft(req.body)) {
      return res.status(400).json({ error: 'Atividade ou rascunho inválido.' });
    }
    const { state, revision } = req.body;
    const row = { state, revision: revision + 1, updated_at: new Date().toISOString() };
    try {
      const query = revision === 0
        ? supabase.from('activity_progress').insert({ ...row, user_id: req.user.id, activity: req.params.activity })
        : supabase.from('activity_progress').update(row).eq('user_id', req.user.id)
          .eq('activity', req.params.activity).eq('revision', revision);
      const { data, error } = await query.select('revision,updated_at').maybeSingle();
      if (error?.code === '23505' || (!error && !data)) {
        return res.status(409).json({ error: 'Esta atividade foi alterada em outro dispositivo. Recarregue para continuar a versão salva.' });
      }
      if (error) throw error;
      res.json(data);
    } catch {
      res.status(503).json({ error: 'Não foi possível sincronizar sua atividade.' });
    }
  });
}
module.exports = { setupActivityRoutes, validDraft };
