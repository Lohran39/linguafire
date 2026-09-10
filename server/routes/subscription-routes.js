const { subscriptionCreateSchema, validateBody } = require('../validation');
const { SUBSCRIPTION_PLANS, aiUsage, effectivePlan, subscriptionUpdates, idOf, hasLiveSubscription } = require('../services/subscription-state');

function setupSubscriptionRoutes(app, deps = {}) {
  const {
    authenticateToken = (_req, _res, next) => next(),
    supabaseGetUserById = async () => null,
    supabaseUpdateUser = async () => ({ error: 'not configured' }),
    supabaseFindUserByStripe = async () => null,
    supabaseSyncSubscription = supabaseUpdateUser,
    isProduction = process.env.NODE_ENV === 'production',
    allowFakeSubscriptions = process.env.ALLOW_FAKE_SUBSCRIPTIONS === 'true',
    stripeService = null, logger = console
  } = deps;
  const demoEnabled = !isProduction && allowFakeSubscriptions;
  const portalConfigured = () => Boolean(stripeService?.isPortalConfigured?.());
  async function save(userId, updates) {
    const result = await supabaseUpdateUser(userId, updates);
    if (result?.error) throw new Error('Não foi possível salvar a assinatura.');
  }
  async function synchronize(user, subscriptionId = user.stripe_subscription_id) {
    const started = Date.now();
    const remote = await stripeService.getSubscription(subscriptionId);
    if ((user.stripe_customer_id && user.stripe_customer_id !== idOf(remote.customer)) ||
      (remote.metadata?.user_id && remote.metadata.user_id !== String(user.id))) throw new Error('Vínculo da assinatura inválido.');
    const updates = subscriptionUpdates(remote, stripeService.planForPrice, started);
    const result = await supabaseSyncSubscription(user.id, updates);
    if (result?.error) throw new Error('Não foi possível sincronizar a assinatura.');
    return { user: result?.data || await supabaseGetUserById(user.id) || { ...user, ...updates }, remote };
  }
  function payload(user, warning = '', remote) {
    const usage = aiUsage(user), plan = effectivePlan(user), paid = plan !== 'free';
    const checkoutConfigured = Boolean(stripeService?.isConfigured?.() || demoEnabled);
    const managed = Boolean(user.stripe_subscription_id);
    const billingStatus = user.stripe_subscription_status || (paid ? 'active' : 'none');
    const billingRequired = managed && !['canceled', 'incomplete_expired'].includes(billingStatus);
    const item = remote?.items?.data?.[0];
    return {
      active: paid, expires: Number(user.subscription_expires || 0), plan: paid ? plan : null,
      price: item?.price?.currency === 'brl' && Number.isFinite(item.price.unit_amount) ? item.price.unit_amount / 100 : SUBSCRIPTION_PLANS[paid ? plan : 'pro'].price,
      aiDailyLimit: usage.limit, aiUsage: usage, checkoutConfigured,
      billingStatus, managed, cancelAtPeriodEnd: Boolean(user.stripe_cancel_at_period_end), cancelAt: Number(user.stripe_cancel_at || 0),
      portalAvailable: portalConfigured() && Boolean(user.stripe_customer_id || user.stripe_subscription_id),
      hasBillingAccount: Boolean(user.stripe_customer_id || managed),
      canSubscribe: checkoutConfigured && !paid && !billingRequired && !warning,
      syncWarning: warning,
      ...(user.role === 'admin' && !checkoutConfigured ? { checkoutIssues: stripeService?.getConfigurationIssues?.() || ['Pagamento indisponível.'] } : {}),
      plans: SUBSCRIPTION_PLANS
    };
  }

  app.post('/api/subscription/portal', authenticateToken, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      let user = await supabaseGetUserById(req.user.id);
      if (!user) return res.status(404).json({ error: 'Conta não encontrada.' });
      if (!portalConfigured()) return res.status(503).json({ error: 'A gestão de pagamentos está temporariamente indisponível.' });
      if (!user.stripe_customer_id && user.stripe_subscription_id) user = (await synchronize(user)).user;
      if (!user.stripe_customer_id) return res.status(409).json({ error: 'Esta conta ainda não possui histórico de cobrança na Stripe.' });
      // Never accept a customer id or return URL supplied by the browser.
      const session = await stripeService.createPortalSession(user.stripe_customer_id);
      res.json({ portalUrl: session.url });
    } catch (error) {
      logger.warn?.('Stripe portal unavailable', { status: error.status || 500 });
      res.status(503).json({ error: 'Não foi possível abrir o portal de pagamentos. Tente novamente.' });
    }
  });

  app.post('/api/subscription/create', authenticateToken, validateBody(subscriptionCreateSchema), async (req, res) => {
    try {
      let user = await supabaseGetUserById(req.user.id);
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
      if (user.stripe_subscription_id) {
        if (!portalConfigured()) return res.status(503).json({ error: 'Não foi possível conferir sua assinatura atual.' });
        const synced = await synchronize(user); user = synced.user;
        if (hasLiveSubscription(synced.remote)) return res.status(409).json({ error: 'Gerencie seu plano atual pelo portal de pagamentos.', usePortal: true });
      } else if (effectivePlan(user) !== 'free') {
        return res.status(409).json({ error: 'Sua conta já possui um plano ativo.' });
      }
      if (stripeService?.isConfigured?.()) {
        if (!user.stripe_customer_id && stripeService.ensureCustomer) {
          const customerId = await stripeService.ensureCustomer(user);
          await save(user.id, { stripe_customer_id: customerId });
          user = { ...user, stripe_customer_id: customerId };
        }
        const checkout = await stripeService.createCheckoutSession(user, req.validatedBody.plan);
        return res.json({ success: true, checkoutUrl: checkout.url, checkoutSessionId: checkout.id });
      }
      if (!demoEnabled) return res.status(501).json({ error: 'Checkout de pagamento ainda não configurado.' });
      const plan = req.validatedBody.plan, config = SUBSCRIPTION_PLANS[plan], expires = Date.now() + 30 * 86400000;
      await save(user.id, { subscription_active: 1, subscription_expires: expires, plan, ai_daily_limit: config.aiDailyLimit });
      return res.json({ success: true, subscription: { active: true, expires, plan, price: config.price, aiDailyLimit: config.aiDailyLimit } });
    } catch (error) {
      logger.error?.('Subscription checkout failed', { status: error.status || 500 });
      res.status(503).json({ error: 'Não foi possível iniciar o pagamento. Tente novamente.' });
    }
  });

  // Compatibility endpoint: cancel renewal, retaining the paid period.
  app.post('/api/subscription/cancel', authenticateToken, async (req, res) => {
    try {
      const user = await supabaseGetUserById(req.user.id);
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
      if (user.stripe_subscription_id) {
        if (!portalConfigured()) return res.status(503).json({ error: 'A gestão de pagamentos está indisponível.' });
        await synchronize(user);
        await stripeService.cancelSubscription(user.stripe_subscription_id);
        const synced = await synchronize(user);
        return res.json({ success: true, message: 'Renovação cancelada. Seu acesso continua até o fim do período contratado.', subscription: payload(synced.user, '', synced.remote) });
      }
      if (!demoEnabled) return res.status(409).json({ error: 'Não há assinatura Stripe vinculada a esta conta.' });
      await save(user.id, { subscription_active: 0, subscription_expires: 0, plan: 'free', ai_daily_limit: 10 });
      res.json({ success: true, message: 'Assinatura de demonstração cancelada.' });
    } catch (error) {
      logger.error?.('Subscription cancellation failed', { status: error.status || 500 });
      res.status(503).json({ error: 'Não foi possível cancelar a renovação. Tente pelo portal de pagamentos.' });
    }
  });

  app.get('/api/subscription/status', authenticateToken, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      let user = await supabaseGetUserById(req.user.id), warning = '', remote;
      if (!user) return res.status(404).json({ error: 'Conta não encontrada.' });
      if (user.stripe_subscription_id) {
        try {
          if (!portalConfigured()) throw new Error('Stripe unavailable');
          const synced = await synchronize(user); user = synced.user; remote = synced.remote;
        } catch { warning = 'Não foi possível atualizar os dados de cobrança. Exibindo a última informação salva.'; }
      }
      res.json(payload(user, warning, remote));
    } catch { res.status(503).json({ error: 'Não foi possível consultar a assinatura.' }); }
  });

  app.post('/api/subscription/webhook', async (req, res) => {
    let event;
    try {
      if (!stripeService?.verifyWebhook) return res.status(501).json({ error: 'Webhook não configurado.' });
      event = stripeService.verifyWebhook(req.rawBody, req.headers['stripe-signature']);
    } catch { return res.status(400).json({ error: 'Webhook inválido.' }); }
    const types = ['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed',
      'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted', 'invoice.paid', 'invoice.payment_failed'];
    if (!types.includes(event.type)) return res.json({ received: true });
    try {
      const object = event.data?.object || {};
      const isCheckout = event.type.startsWith('checkout.');
      const subscriptionId = event.type.startsWith('customer.subscription.') ? object.id : idOf(object.subscription || object.parent?.subscription_details?.subscription);
      if (!subscriptionId) return res.json({ received: true });
      const metadataId = object.metadata?.user_id || (isCheckout ? object.client_reference_id : null);
      let user = metadataId ? await supabaseGetUserById(metadataId) : await supabaseFindUserByStripe(subscriptionId, idOf(object.customer));
      if (!user) {
        const remote = await stripeService.getSubscription(subscriptionId);
        if (remote.metadata?.user_id) user = await supabaseGetUserById(remote.metadata.user_id);
      }
      if (!user) return res.json({ received: true });
      if (user.stripe_subscription_id && user.stripe_subscription_id !== subscriptionId) {
        if (!isCheckout) return res.json({ received: true });
        const current = await stripeService.getSubscription(user.stripe_subscription_id);
        if (hasLiveSubscription(current)) return res.json({ received: true });
      }
      await synchronize(user, subscriptionId);
      // Read Stripe's current state, so delayed/repeated events cannot replay an old entitlement or extend a period.
      return res.json({ received: true });
    } catch (error) {
      logger.warn?.('Stripe webhook synchronization failed', { type: event.type, status: error.status || 500 });
      return res.status(503).json({ error: 'Sincronização pendente. Reenvie o evento.' });
    }
  });
}
module.exports = { setupSubscriptionRoutes };
