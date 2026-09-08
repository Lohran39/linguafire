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
    return issues;
  }

  async function stripeRequest(path, body = {}) {
    if (!secretKey) {
      const error = new Error('STRIPE_SECRET_KEY nao configurada.');
      error.status = 501;
      throw error;
    }

    const response = await fetchImpl(`https://api.stripe.com/v1${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: encodeForm(body)
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
      customer_email: user.email,
      success_url: `${baseUrl}/?checkout=success`,
      cancel_url: `${baseUrl}/?checkout=cancelled`,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': 1,
      'metadata[user_id]': user.id,
      'metadata[plan]': normalizedPlan,
      'subscription_data[metadata][user_id]': user.id,
      'subscription_data[metadata][plan]': normalizedPlan
    });

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

  function verifyWebhook(rawBody, signatureHeader) {
    if (!webhookSecret) {
      const error = new Error('STRIPE_WEBHOOK_SECRET nao configurado.');
      error.status = 501;
      throw error;
    }

    const parts = String(signatureHeader || '').split(',').reduce((acc, item) => {
      const [key, value] = item.split('=');
      if (key && value) acc[key] = value;
      return acc;
    }, {});

    const timestamp = parts.t;
    const signature = parts.v1;
    if (!timestamp || !signature) {
      const error = new Error('Assinatura Stripe ausente.');
      error.status = 400;
      throw error;
    }

    const payload = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '');
    const expected = crypto
      .createHmac('sha256', webhookSecret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');

    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      const error = new Error('Assinatura Stripe invalida.');
      error.status = 400;
      throw error;
    }

    return JSON.parse(payload);
  }

  return {
    isConfigured,
    getConfigurationIssues,
    createCheckoutSession,
    cancelSubscription,
    verifyWebhook
  };
}

module.exports = {
  createStripeService
};
