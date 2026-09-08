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
