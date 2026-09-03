const { subscriptionCreateSchema, validateBody } = require('../validation');

const SUBSCRIPTION_PLANS = {
  pro: { price: 45, aiDailyLimit: 300 },
  max: { price: 85, aiDailyLimit: 1000 }
};

function setupSubscriptionRoutes(app, deps = {}) {
  const {
    authenticateToken = (req, res, next) => next(),
    supabaseGetUserById = async () => null,
    supabaseUpdateUser = async () => ({ error: 'not configured' }),
    isProduction = process.env.NODE_ENV === 'production',
    allowFakeSubscriptions = process.env.ALLOW_FAKE_SUBSCRIPTIONS === 'true',
    stripeService = null,
    logger = console
  } = deps;

  function buildSubscriptionPayload(user) {
    const isActive = user.subscription_active && user.subscription_expires > Date.now();
    const plan = user.plan && SUBSCRIPTION_PLANS[user.plan] ? user.plan : 'pro';
    return {
      active: !!isActive,
      expires: user.subscription_expires || 0,
      plan: isActive ? plan : null,
      price: SUBSCRIPTION_PLANS[plan].price,
      aiDailyLimit: SUBSCRIPTION_PLANS[plan].aiDailyLimit
    };
  }

  // Create subscription
  app.post('/api/subscription/create', authenticateToken, validateBody(subscriptionCreateSchema), async (req, res) => {
    try {
      const user = await supabaseGetUserById(req.user.id);
      if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });

      if (stripeService?.isConfigured?.()) {
        const checkout = await stripeService.createCheckoutSession(user, req.validatedBody.plan);
        return res.json({
          success: true,
          checkoutUrl: checkout.url,
          checkoutSessionId: checkout.id
        });
      }

      if (isProduction && !allowFakeSubscriptions) {
        return res.status(501).json({ error: 'Checkout de pagamento ainda nao configurado.' });
      }

      const plan = req.validatedBody.plan;
      const planConfig = SUBSCRIPTION_PLANS[plan];
      const expires = Date.now() + (30 * 24 * 60 * 60 * 1000);
      await supabaseUpdateUser(req.user.id, {
        subscription_active: 1,
        subscription_expires: expires,
        plan,
        ai_daily_limit: planConfig.aiDailyLimit
      });
      return res.json({
        success: true,
        message: 'Assinatura ativada com sucesso!',
        subscription: { active: true, expires, plan, price: planConfig.price, aiDailyLimit: planConfig.aiDailyLimit }
      });
    } catch (error) {
      logger.error?.('Erro ao criar assinatura', { error });
      res.status(error.status || 500).json({ error: error.message || 'Erro ao ativar assinatura' });
    }
  });

  // Cancel subscription
  app.post('/api/subscription/cancel', authenticateToken, async (req, res) => {
    try {
      const user = await supabaseGetUserById(req.user.id);
      if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });

      if (stripeService?.isConfigured?.() && user.stripe_subscription_id) {
        await stripeService.cancelSubscription(user.stripe_subscription_id);
      }

      await supabaseUpdateUser(req.user.id, {
        subscription_active: 0,
        subscription_expires: 0,
        plan: 'free',
        ai_daily_limit: 10
      });
      res.json({ success: true, message: 'Assinatura cancelada.' });
    } catch (error) {
      logger.error?.('Erro ao cancelar assinatura', { error });
      res.status(error.status || 500).json({ error: error.message || 'Erro ao cancelar assinatura' });
    }
  });

  // Get subscription status
  app.get('/api/subscription/status', authenticateToken, async (req, res) => {
    try {
      const user = await supabaseGetUserById(req.user.id);
      if (!user) return res.status(500).json({ error: 'Erro interno' });

      res.json(buildSubscriptionPayload(user));
    } catch (error) {
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  app.post('/api/subscription/webhook', async (req, res) => {
    try {
      if (!stripeService?.verifyWebhook) {
        return res.status(501).json({ error: 'Webhook Stripe nao configurado.' });
      }

      const event = stripeService.verifyWebhook(req.rawBody || Buffer.from(JSON.stringify(req.body || {})), req.headers['stripe-signature']);
      const object = event?.data?.object || {};
      const userId = object?.metadata?.user_id || object?.client_reference_id;

      if (event.type === 'checkout.session.completed' && userId) {
        const plan = object?.metadata?.plan && SUBSCRIPTION_PLANS[object.metadata.plan] ? object.metadata.plan : 'pro';
        const planConfig = SUBSCRIPTION_PLANS[plan];
        const expires = Date.now() + (30 * 24 * 60 * 60 * 1000);
        await supabaseUpdateUser(userId, {
          subscription_active: 1,
          subscription_expires: expires,
          plan,
          ai_daily_limit: planConfig.aiDailyLimit,
          stripe_customer_id: object.customer || '',
          stripe_subscription_id: object.subscription || ''
        });
      }

      if (event.type === 'customer.subscription.deleted') {
        const subscriptionId = object.id || '';
        const metadataUserId = object?.metadata?.user_id || '';
        if (metadataUserId) {
          await supabaseUpdateUser(metadataUserId, {
            subscription_active: 0,
            subscription_expires: 0,
            plan: 'free',
            ai_daily_limit: 10,
            stripe_subscription_id: subscriptionId
          });
        }
      }

      return res.json({ received: true });
    } catch (error) {
      logger.warn?.('Webhook Stripe rejeitado', { error });
      return res.status(error.status || 400).json({ error: error.message || 'Webhook invalido.' });
    }
  });
}

module.exports = { setupSubscriptionRoutes };
