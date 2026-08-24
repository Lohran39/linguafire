const { pushSubscribeSchema, validateBody } = require('../validation');

function setupPushRoutes(app, deps = {}) {
  const {
    authenticateToken = (req, res, next) => next(),
    supabaseGetPushSubscription = async () => null,
    supabaseGetAllPushSubscriptions = async () => [],
    supabaseSavePushSubscription = async () => ({ error: 'not configured' }),
    supabaseDeletePushSubscription = async () => ({ error: 'not configured' }),
    pushService = null,
    pushAdminToken = process.env.PUSH_ADMIN_TOKEN || ''
  } = deps;

  function getAdminToken(req) {
    const authorization = String(req.headers.authorization || '');
    if (authorization.toLowerCase().startsWith('bearer ')) return authorization.slice(7).trim();
    return String(req.headers['x-push-admin-token'] || '').trim();
  }

  app.get('/api/push/public-key', (_req, res) => {
    res.json({
      configured: Boolean(pushService?.isConfigured?.()),
      publicKey: pushService?.getPublicKey?.() || ''
    });
  });

  // Subscribe
  app.post('/api/push/subscribe', authenticateToken, validateBody(pushSubscribeSchema), async (req, res) => {
    const { endpoint, keys } = req.validatedBody;

    try {
      const subscription = { endpoint, p256dh: keys.p256dh, auth: keys.auth };
      await supabaseSavePushSubscription(req.user.id, subscription);
      res.json({ success: true, message: 'Notificações ativadas!' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao salvar assinatura' });
    }
  });

  // Unsubscribe
  app.delete('/api/push/unsubscribe', authenticateToken, async (req, res) => {
    try {
      await supabaseDeletePushSubscription(req.user.id);
      res.json({ success: true, message: 'Notificações desativadas.' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao remover assinatura' });
    }
  });

  // Get push status
  app.get('/api/push/status', authenticateToken, async (req, res) => {
    try {
      const sub = await supabaseGetPushSubscription(req.user.id);
      res.json({ subscribed: !!sub });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  app.post('/api/push/test', authenticateToken, async (req, res) => {
    try {
      const sub = await supabaseGetPushSubscription(req.user.id);
      if (!sub) return res.status(404).json({ error: 'Usuario sem notificacao ativa' });
      if (!pushService?.send) return res.status(501).json({ error: 'Push nao configurado.' });

      await pushService.send(sub, {
        title: 'LinguaFire',
        body: 'Notificacoes funcionando.',
        url: '/'
      });

      res.json({ success: true });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || 'Erro ao enviar notificacao' });
    }
  });

  app.post('/api/push/broadcast', async (req, res) => {
    if (!pushAdminToken || getAdminToken(req) !== pushAdminToken) {
      return res.status(404).json({ error: 'Not found' });
    }

    try {
      const subscriptions = await supabaseGetAllPushSubscriptions();
      const title = String(req.body?.title || 'LinguaFire').slice(0, 120);
      const body = String(req.body?.body || 'Hora de praticar ingles.').slice(0, 240);
      const url = String(req.body?.url || '/').slice(0, 500);
      if (!pushService?.sendMany) return res.status(501).json({ error: 'Push nao configurado.' });
      const result = await pushService.sendMany(subscriptions, { title, body, url });
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message || 'Erro ao enviar notificacoes' });
    }
  });
}

module.exports = { setupPushRoutes };
