const crypto = require('crypto');

function encodeForm(payload = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  return params;
}

function createStripeService(env = process.env, fetchImpl = fetch) {
  const secretKey = String(env.STRIPE_SECRET_KEY || '').trim();
  const legacyPriceId = String(env.STRIPE_PRICE_ID || '').trim();
  const priceIds = {
    pro: String(env.STRIPE_PRO_PRICE_ID || legacyPriceId).trim(),
    max: String(env.STRIPE_MAX_PRICE_ID || '').trim()
  };
  const portalConfiguration = String(env.STRIPE_PORTAL_CONFIGURATION_ID || '').trim();
  const webhookSecret = String(env.STRIPE_WEBHOOK_SECRET || '').trim();
  const baseUrl = String(env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

  function isConfigured() {
    return getConfigurationIssues().length === 0;
  }

  function getConfigurationIssues() {
    const issues = [];
    if (!secretKey) issues.push('STRIPE_SECRET_KEY ausente.');
    else if (!/^(sk|rk)_(test|live)_[A-Za-z0-9]+$/.test(secretKey)) {
      issues.push('STRIPE_SECRET_KEY com formato invalido. Use a chave secreta da Stripe.');
    }
    for (const [plan, value] of Object.entries(priceIds)) {
      const name = `STRIPE_${plan.toUpperCase()}_PRICE_ID`;
      if (!value) issues.push(`${name} ausente.`);
      else if (!/^price_[A-Za-z0-9]+$/.test(value)) {
        issues.push(`${name} deve ser um ID de preco iniciado por price_.`);
      }
    }
    if (priceIds.pro && priceIds.pro === priceIds.max) issues.push('Pro e Max precisam de IDs de preço diferentes.');
    return issues;
  }

  function isPortalConfigured() { return /^(sk|rk)_(test|live)_[A-Za-z0-9]+$/.test(secretKey) && (!portalConfiguration || /^bpc_[A-Za-z0-9]+$/.test(portalConfiguration)); }

  function planForPrice(priceId) { return Object.keys(priceIds).find(plan => priceIds[plan] && priceIds[plan] === priceId) || null; }

  async function stripeRequest(path, body = {}, method = 'POST', idempotencyKey) {
    if (!secretKey) {
      const error = new Error('STRIPE_SECRET_KEY nao configurada.');
      error.status = 501;
      throw error;
    }

    const response = await fetchImpl(`https://api.stripe.com/v1${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {})
      },
      ...(method === 'POST' ? { body: encodeForm(body) } : {}),
      signal: AbortSignal.timeout(12000)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data?.error?.message || 'Erro ao chamar Stripe.');
      error.status = response.status;
      error.detail = data;
      throw error;
    }
    return data;
  }

  async function createCheckoutSession(user, plan = 'pro') {
    const normalizedPlan = priceIds[plan] ? plan : 'pro';
    const priceId = priceIds[normalizedPlan];

    if (!priceId) {
      const error = new Error(`STRIPE_${String(normalizedPlan).toUpperCase()}_PRICE_ID nao configurado.`);
      error.status = 501;
      throw error;
    }

    const session = await stripeRequest('/checkout/sessions', {
      mode: 'subscription',
      client_reference_id: user.id,
      ...(user.stripe_customer_id ? { customer: user.stripe_customer_id } : { customer_email: user.email }),
      success_url: `${baseUrl}/?billing=return&checkout=success`,
      cancel_url: `${baseUrl}/?billing=return&checkout=cancelled`,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': 1,
      'metadata[user_id]': user.id,
      'metadata[plan]': normalizedPlan,
      'subscription_data[metadata][user_id]': user.id,
      'subscription_data[metadata][plan]': normalizedPlan
    }, 'POST', `checkout-${user.id}-${normalizedPlan}-${Math.floor(Date.now() / 3600000)}`);

    return {
      id: session.id,
      url: session.url,
      customerId: session.customer || '',
      subscriptionId: session.subscription || ''
    };
  }

  async function cancelSubscription(subscriptionId) {
    if (!subscriptionId) {
      const error = new Error('Usuario sem assinatura Stripe ativa.');
      error.status = 400;
      throw error;
    }

    return stripeRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      cancel_at_period_end: 'true'
    });
  }

  async function getSubscription(subscriptionId) {
    if (!/^sub_[A-Za-z0-9]+$/.test(subscriptionId)) throw Object.assign(new Error('Assinatura inválida.'), { status: 400 });
    return stripeRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {}, 'GET');
  }

  async function ensureCustomer(user) {
    if (user.stripe_customer_id) return user.stripe_customer_id;
    const customer = await stripeRequest('/customers', { email: user.email, name: user.name, 'metadata[user_id]': user.id }, 'POST', `customer-${user.id}`);
    return customer.id;
  }

  async function createPortalSession(customerId) {
    if (!/^cus_[A-Za-z0-9]+$/.test(customerId)) throw Object.assign(new Error('Cliente Stripe inválido.'), { status: 400 });
    return stripeRequest('/billing_portal/sessions', {
      customer: customerId, configuration: portalConfiguration,
      return_url: `${baseUrl}/?billing=return`, locale: 'pt-BR'
    });
  }

  function verifyWebhook(rawBody, signatureHeader) {
    if (!webhookSecret) throw Object.assign(new Error('Webhook não configurado.'), { status: 501 });
    if (!Buffer.isBuffer(rawBody)) throw Object.assign(new Error('Corpo original do webhook ausente.'), { status: 400 });
    const parts = String(signatureHeader || '').split(',').map(part => part.trim().split('='));
    const timestamp = parts.find(([key]) => key === 't')?.[1];
    if (!/^\d+$/.test(timestamp || '') || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
      throw Object.assign(new Error('Assinatura Stripe expirada ou inválida.'), { status: 400 });
    }
    const expected = crypto.createHmac('sha256', webhookSecret).update(`${timestamp}.${rawBody.toString('utf8')}`).digest();
    const valid = parts.filter(([key]) => key === 'v1').some(([, signature]) => {
      if (!/^[a-fA-F0-9]{64}$/.test(signature || '')) return false;
      return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), expected);
    });
    if (!valid) throw Object.assign(new Error('Assinatura Stripe inválida.'), { status: 400 });
    return JSON.parse(rawBody.toString('utf8'));
  }

  return {
    isConfigured,
    isPortalConfigured,
    planForPrice,
    getSubscription,
    ensureCustomer,
    createPortalSession,
    getConfigurationIssues,
    createCheckoutSession,
    cancelSubscription,
    verifyWebhook
  };
}

module.exports = {
  createStripeService
};
