const FEATURES = new Set(['home','lessons','music','flashcard','conversation','natives','shop','placement','profile']);
function setupProductUsageRoutes(app, { authenticateToken, supabaseGetUserById, supabase }) {
  app.post('/api/product/usage', authenticateToken, async (req, res) => {
    if (!FEATURES.has(req.body?.feature)) return res.status(400).json({ error: 'Funcionalidade inválida' });
    try {
      const user = await supabaseGetUserById(req.user.id);
      if (!user) return res.sendStatus(401);
      if (user.role === 'admin') return res.sendStatus(204);
      const { error } = await supabase.from('product_usage').upsert({ user_id: req.user.id,
        feature: req.body.feature, day: new Date().toISOString().slice(0, 10) },
      { onConflict: 'user_id,day,feature', ignoreDuplicates: true });
      if (error) throw error;
      return res.sendStatus(204);
    } catch { return res.status(503).json({ error: 'Métricas indisponíveis' }); }
  });
  app.get('/api/admin/product-usage', authenticateToken, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      const user = await supabaseGetUserById(req.user.id);
      if (user?.role !== 'admin') return res.sendStatus(403);
      const { data, error } = await supabase.rpc('product_usage_summary');
      if (error) throw error;
      return res.json(data);
    } catch { return res.status(503).json({ error: 'Métricas indisponíveis' }); }
  });
}
module.exports = { setupProductUsageRoutes };
