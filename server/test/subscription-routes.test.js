const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const express = require('express');

const { setupSubscriptionRoutes } = require('../routes/subscription-routes');

function startTestServer(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1');
    server.once('listening', () => {
      const address = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
    server.once('error', reject);
  });
}

function stopTestServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function signedStripeHeader(payload, secret = 'whsec_test', timestamp = 1700000000) {
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

test('subscription create returns Stripe checkout URL when configured', async () => {
  const app = express();
  app.use(express.json());
  setupSubscriptionRoutes(app, {
    authenticateToken: (req, _res, next) => {
      req.user = { id: 'user-1' };
      next();
    },
    supabaseGetUserById: async () => ({ id: 'user-1', email: 'user@example.com' }),
    stripeService: {
      isConfigured: () => true,
      createCheckoutSession: async (user, plan) => ({
        id: `cs_${plan}_${user.id}`,
        url: 'https://checkout.stripe.com/c/pay'
      })
    }
  });

  const { server, baseUrl } = await startTestServer(app);
  try {
    const response = await fetch(`${baseUrl}/api/subscription/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'pro' })
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.checkoutSessionId, 'cs_pro_user-1');
    assert.equal(body.checkoutUrl, 'https://checkout.stripe.com/c/pay');
  } finally {
    await stopTestServer(server);
  }
});

test('subscription create rejects fake activation in production without Stripe', async () => {
  const app = express();
  app.use(express.json());
  setupSubscriptionRoutes(app, {
    authenticateToken: (req, _res, next) => {
      req.user = { id: 'user-1' };
      next();
    },
    supabaseGetUserById: async () => ({ id: 'user-1', email: 'user@example.com' }),
    isProduction: true,
    allowFakeSubscriptions: false
  });

  const { server, baseUrl } = await startTestServer(app);
  try {
    const response = await fetch(`${baseUrl}/api/subscription/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'pro' })
    });
    const body = await response.json();

    assert.equal(response.status, 501);
    assert.match(body.error, /Checkout/);
  } finally {
    await stopTestServer(server);
  }
});

test('Stripe webhook activates subscription only with valid signature', async () => {
  const updates = [];
  const app = express();
  app.use(express.json({
    verify: (req, _res, buf) => {
      req.rawBody = Buffer.from(buf);
    }
  }));
  setupSubscriptionRoutes(app, {
    supabaseUpdateUser: async (id, update) => {
      updates.push({ id, update });
      return { data: update };
    },
    stripeService: {
      verifyWebhook(rawBody, signatureHeader) {
        const payload = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
        assert.equal(signatureHeader, signedStripeHeader(payload));
        return JSON.parse(payload);
      }
    }
  });

  const payload = JSON.stringify({
    type: 'checkout.session.completed',
    data: {
      object: {
        client_reference_id: 'user-1',
        customer: 'cus_123',
        subscription: 'sub_123',
                metadata: { user_id: 'user-1', plan: 'max' }
      }
    }
  });
  const signature = signedStripeHeader(payload);

  const { server, baseUrl } = await startTestServer(app);
  try {
    const response = await fetch(`${baseUrl}/api/subscription/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': signature
      },
      body: payload
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.received, true);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].id, 'user-1');
    assert.equal(updates[0].update.subscription_active, 1);
    assert.equal(updates[0].update.plan, 'max');
    assert.equal(updates[0].update.ai_daily_limit, 1000);
    assert.equal(updates[0].update.stripe_customer_id, 'cus_123');
    assert.equal(updates[0].update.stripe_subscription_id, 'sub_123');
  } finally {
    await stopTestServer(server);
  }
});
