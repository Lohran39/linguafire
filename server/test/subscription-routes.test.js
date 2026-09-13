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

test('checkout diagnostics are only included for admins loaded from the database', async () => {
  let role = 'user';
  const app = express();
  setupSubscriptionRoutes(app, {
    authenticateToken: (req, _res, next) => {
      req.user = { id: 'user-1', role: 'admin' };
      next();
    },
    supabaseGetUserById: async () => ({ id: 'user-1', role }),
    isProduction: true,
    allowFakeSubscriptions: false,
    stripeService: {
      isConfigured: () => false,
      getConfigurationIssues: () => ['STRIPE_MAX_PRICE_ID ausente.']
    }
  });
  const { server, baseUrl } = await startTestServer(app);
  try {
    const regular = await (await fetch(`${baseUrl}/api/subscription/status`)).json();
    assert.equal(regular.checkoutConfigured, false);
    assert.equal(regular.checkoutIssues, undefined);
    role = 'admin';
    const admin = await (await fetch(`${baseUrl}/api/subscription/status`)).json();
    assert.deepEqual(admin.checkoutIssues, ['STRIPE_MAX_PRICE_ID ausente.']);
  } finally {
    await stopTestServer(server);
  }
});

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
    supabaseGetUserById: async () => ({ id: 'user-1', stripe_customer_id: 'cus_123' }),
    supabaseUpdateUser: async (id, update) => {
      updates.push({ id, update });
      return { data: update };
    },
    stripeService: {
      getSubscription: async () => ({ id: 'sub_123', customer: 'cus_123', status: 'active', items: { data: [{ price: { id: 'price_max' }, current_period_end: Math.floor(Date.now() / 1000) + 86400 }] } }),
      planForPrice: price => price === 'price_max' ? 'max' : null,
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
    assert.equal(updates[0].update.ai_daily_limit, 150);
    assert.equal(updates[0].update.stripe_customer_id, 'cus_123');
    assert.equal(updates[0].update.stripe_subscription_id, 'sub_123');
  } finally {
    await stopTestServer(server);
  }
});

async function withBilling(run, overrides = {}) {
  let user = { id: 'user-1', stripe_customer_id: 'cus_owner', stripe_subscription_id: 'sub_current' };
  let remote = { id: 'sub_current', customer: 'cus_owner', status: 'active', metadata: { user_id: 'user-1', plan: 'pro' },
    items: { data: [{ price: { id: 'price_max', currency: 'brl', unit_amount: 8500 }, current_period_end: Math.floor(Date.now() / 1000) + 86400 }] } };
  let portalCustomer;
  const app = express(); app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));
  setupSubscriptionRoutes(app, {
    logger: { warn() {}, error() {} },
    authenticateToken: (req, _res, next) => { req.user = { id: 'user-1' }; next(); },
    supabaseGetUserById: async () => user,
    supabaseFindUserByStripe: async () => user,
    supabaseUpdateUser: async (_id, updates) => { user = { ...user, ...updates }; return { data: user }; },
    stripeService: {
      isConfigured: () => true, isPortalConfigured: () => true,
      getSubscription: async () => remote,
      planForPrice: id => id === 'price_max' ? 'max' : id === 'price_pro' ? 'pro' : null,
      createPortalSession: async id => { portalCustomer = id; return { url: 'https://billing.stripe.com/p/session' }; },
      cancelSubscription: async () => { remote.cancel_at_period_end = true; },
      verifyWebhook: buf => JSON.parse(buf.toString())
    }, ...overrides
  });
  const { server, baseUrl } = await startTestServer(app);
  const request = async (path, body) => fetch(`${baseUrl}/api/subscription/${path}`, body === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  try { await run({ request, remote, getUser: () => user, getPortalCustomer: () => portalCustomer }); }
  finally { await stopTestServer(server); }
}

test('portal uses only the authenticated customer, even when browser supplies another account', async () => {
  await withBilling(async ({ request, getPortalCustomer }) => {
    const response = await request('portal', { customer: 'cus_victim', return_url: 'https://evil.example' });
    assert.equal(response.status, 200);
    assert.equal(getPortalCustomer(), 'cus_owner');
  });
});

test('portal plan changes use the actual price, include usage, and prevent duplicate active checkout', async () => {
  await withBilling(async ({ request }) => {
    const response = await request('status');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const state = await response.json();
    assert.equal(state.plan, 'max');
    assert.equal(state.aiUsage.limit, 150);
    assert.equal(state.canSubscribe, false);
    assert.equal((await request('create', { plan: 'pro' })).status, 409);
  });
});

test('canceling renewal retains paid access until the Stripe period ends', async () => {
  await withBilling(async ({ request, remote }) => {
    const result = await (await request('cancel', {})).json();
    assert.equal(result.subscription.active, true);
    assert.equal(result.subscription.cancelAtPeriodEnd, true);
    assert.equal(result.subscription.expires, remote.items.data[0].current_period_end * 1000);
    assert.equal(result.subscription.aiDailyLimit, 150);
  });
});

test('past-due accounts retain portal access but receive Free quota', async () => {
  await withBilling(async ({ request, remote }) => {
    remote.status = 'past_due';
    const state = await (await request('status')).json();
    assert.equal(state.active, false); assert.equal(state.aiUsage.limit, 10);
    assert.equal(state.portalAvailable, true); assert.equal(state.canSubscribe, false);
  });
});

test('replayed events use current Stripe state and never extend the paid period', async () => {
  await withBilling(async ({ request, getUser, remote }) => {
    const event = { type: 'customer.subscription.updated', data: { object: { id: 'sub_current', customer: 'cus_owner', status: 'canceled' } } };
    for (let i = 0; i < 2; i++) assert.equal((await request('webhook', event)).status, 200);
    assert.equal(getUser().plan, 'max');
    assert.equal(getUser().subscription_expires, remote.items.data[0].current_period_end * 1000);
    const old = { type: 'customer.subscription.deleted', data: { object: { id: 'sub_old', customer: 'cus_owner' } } };
    assert.equal((await request('webhook', old)).status, 200);
    assert.equal(getUser().stripe_subscription_id, 'sub_current');
  });
});

test('webhook persistence failures are retryable and failed status synchronization is visible', async () => {
  await withBilling(async ({ request }) => {
    const event = { type: 'customer.subscription.updated', data: { object: { id: 'sub_current', customer: 'cus_owner' } } };
    assert.equal((await request('webhook', event)).status, 503);
    const state = await (await request('status')).json();
    assert.match(state.syncWarning, /última informação salva/);
    assert.equal(state.canSubscribe, false);
  }, { supabaseSyncSubscription: async () => ({ error: 'db unavailable' }) });
});
