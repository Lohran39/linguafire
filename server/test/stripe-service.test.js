const test = require('node:test');
const assert = require('node:assert/strict');
const { createStripeService } = require('../services/stripe-service');

test('Stripe configuration identifies missing variables without exposing values', () => {
  const service = createStripeService({ STRIPE_SECRET_KEY: 'sk_test_example' });
  assert.equal(service.isConfigured(), false);
  assert.deepEqual(service.getConfigurationIssues(), [
    'STRIPE_PRO_PRICE_ID ausente.',
    'STRIPE_MAX_PRICE_ID ausente.'
  ]);
  assert.ok(!JSON.stringify(service.getConfigurationIssues()).includes('sk_test_example'));
});

test('Stripe configuration rejects product IDs and publishable keys', () => {
  const service = createStripeService({
    STRIPE_SECRET_KEY: 'pk_test_example',
    STRIPE_PRO_PRICE_ID: 'prod_example',
    STRIPE_MAX_PRICE_ID: 'price_max'
  });
  assert.equal(service.isConfigured(), false);
  assert.equal(service.getConfigurationIssues().length, 2);
  assert.match(service.getConfigurationIssues()[1], /price_/);
});

test('Stripe accepts both plan prices and the legacy Pro variable', () => {
  for (const name of ['STRIPE_PRO_PRICE_ID', 'STRIPE_PRICE_ID']) {
    const service = createStripeService({
      STRIPE_SECRET_KEY: 'sk_test_example',
      [name]: 'price_pro',
      STRIPE_MAX_PRICE_ID: 'price_max'
    });
    assert.equal(service.isConfigured(), true);
    assert.deepEqual(service.getConfigurationIssues(), []);
  }
});

test('portal request uses configured customer, return URL and configuration', async () => {
  let request;
  const stripe = createStripeService({ STRIPE_SECRET_KEY: 'sk_test_example', BASE_URL: 'https://app.example', STRIPE_PORTAL_CONFIGURATION_ID: 'bpc_example' }, async (url, options) => {
    request = { url, options }; return { ok: true, json: async () => ({ url: 'https://billing.stripe.com/p/session' }) };
  });
  assert.equal(stripe.isPortalConfigured(), true);
  await stripe.createPortalSession('cus_owner');
  assert.equal(request.url, 'https://api.stripe.com/v1/billing_portal/sessions');
  assert.equal(request.options.body.get('customer'), 'cus_owner');
  assert.equal(request.options.body.get('configuration'), 'bpc_example');
  assert.equal(request.options.body.get('return_url'), 'https://app.example/?billing=return');
  await assert.rejects(stripe.createPortalSession('bad/id'));
});

test('Stripe signatures require original body, valid HMAC and recent timestamp; rotation accepts multiple v1 signatures', () => {
  const crypto = require('node:crypto');
  const stripe = createStripeService({ STRIPE_WEBHOOK_SECRET: 'whsec_test' });
  const body = Buffer.from('{"type":"invoice.paid"}');
  const sign = timestamp => `t=${timestamp},v1=${crypto.createHmac('sha256', 'whsec_test').update(`${timestamp}.${body}`).digest('hex')}`;
  const now = Math.floor(Date.now() / 1000);
  assert.equal(stripe.verifyWebhook(body, `${sign(now)},v1=invalid`).type, 'invoice.paid');
  assert.throws(() => stripe.verifyWebhook(body, sign(now - 600)));
  assert.throws(() => stripe.verifyWebhook(Buffer.from('{}'), sign(now)));
  assert.throws(() => stripe.verifyWebhook(body.toString(), sign(now)));
});
