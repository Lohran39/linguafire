const { contentKey } = require('../services/content-curation');
function parseContent(body = {}) {
  const { kind, title, artist = '', lang = 'english', videoId } = body;
  if (!['music', 'native'].includes(kind) || typeof title !== 'string' || !title.trim() || title.length > 160 ||
    typeof artist !== 'string' || artist.length > 120 || (kind === 'music' && !artist.trim()) ||
    typeof lang !== 'string' || !/^[a-z-]{2,24}$/.test(lang) || typeof videoId !== 'string' || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;
  return { kind, title: title.trim(), artist: artist.trim(), lang, video_id: videoId, content_key: contentKey(body) };
}
function setupCurationRoutes(app, { authenticateToken, supabaseGetUserById, supabase, curation }) {
  async function admin(req, res, next) {
    try {
      const user = await supabaseGetUserById(req.user.id);
      if (user?.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito à curadoria.' });
      return next();
    } catch { res.status(503).json({ error: 'Não foi possível verificar seu acesso.' }); }
  }
  app.get('/api/curation', async (req, res) => {
    if (!['music', 'native'].includes(req.query.kind)) return res.status(400).json({ error: 'Tipo inválido.' });
    try { res.json({ items: await curation.list(req.query.kind) }); }
    catch { res.status(503).json({ error: 'Não foi possível carregar a curadoria.' }); }
  });
  app.post('/api/curation/reports', authenticateToken, async (req, res) => {
    const content = parseContent(req.body), { reason, detail = '' } = req.body || {};
    if (!content || !['wrong_video','wrong_text','translation','unavailable','other'].includes(reason) || typeof detail !== 'string' || detail.length > 500) return res.status(400).json({ error: 'Denúncia inválida.' });
    try {
      const { error } = await supabase.from('content_reports').upsert({ ...content, user_id: req.user.id, reason, detail: detail.trim(), status: 'open', created_at: new Date().toISOString() }, { onConflict: 'user_id,kind,content_key,video_id,reason' });
      if (error) throw error;
      res.json({ success: true });
    } catch { res.status(503).json({ error: 'A denúncia não foi enviada. Tente novamente.' }); }
  });
  app.get('/api/admin/curation', authenticateToken, admin, async (_req, res) => {
    try {
      const { data, error } = await supabase.from('content_reports').select('id,kind,content_key,video_id,title,artist,lang,reason,detail,created_at').eq('status', 'open').order('created_at').limit(100);
      if (error) throw error;
      res.json({ reports: data });
    } catch { res.status(503).json({ error: 'Não foi possível carregar as denúncias.' }); }
  });
  app.put('/api/admin/curation', authenticateToken, admin, async (req, res) => {
    const content = parseContent(req.body);
    const { status, videoMatches, textMatches, translation, notes = '' } = req.body || {};
    if (!content || !['verified', 'rejected'].includes(status) || typeof videoMatches !== 'boolean' || typeof textMatches !== 'boolean' ||
      (status === 'verified' && (!videoMatches || !textMatches)) || !['available','partial','missing'].includes(translation) || typeof notes !== 'string' || notes.length > 500) {
      return res.status(400).json({ error: 'Confira o vídeo, o texto e a tradução antes de aprovar.' });
    }
    const reviewedAt = new Date().toISOString();
    try {
      const { error } = await supabase.from('content_curations').upsert({ ...content, status, video_matches: videoMatches, text_matches: textMatches, translation, notes, reviewed_by: req.user.id, updated_at: reviewedAt }, { onConflict: 'kind,content_key,video_id' });
      if (error) throw error;
      const resolved = await supabase.from('content_reports').update({ status: 'resolved' }).eq('kind', content.kind).eq('content_key', content.content_key).eq('video_id', content.video_id).lte('created_at', reviewedAt);
      if (resolved.error) throw resolved.error;
      res.json({ success: true });
    } catch { res.status(503).json({ error: 'Não foi possível concluir a revisão. Tente novamente.' }); }
  });
}
module.exports = { setupCurationRoutes, parseContent };
