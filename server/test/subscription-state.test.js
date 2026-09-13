const test = require('node:test');
const assert = require('node:assert/strict');
const { aiUsage, subscriptionUpdates } = require('../services/subscription-state');
test('daily quota resets at UTC midnight, including legacy date keys', () => {
  const now = Date.parse('2026-09-09T23:59:59Z');
  const user = { ai_uses_date: 'Wed Sep 09 2026', ai_uses_today: 7, plan: 'max', ai_daily_limit: 1000, subscription_active: 0 };
  assert.deepEqual(aiUsage(user, now), { used: 7, limit: 10, remaining: 3, resetsAt: '2026-09-10T00:00:00.000Z', timezone: 'UTC', plan: 'free', legacy: false, monthlyUsed: 0, monthlyLimit: 100, monthlyRemaining: 100, monthlyResetsAt: '2026-10-01T00:00:00.000Z' });
  assert.equal(aiUsage(user, now + 1000).used, 0);
  assert.equal(aiUsage({ ...user, subscription_active: 1, subscription_expires: now - 1 }, now).limit, 10);
});
test('unknown prices and expired subscriptions cannot grant paid entitlement', () => {
  const remote = { id: 'sub_1', customer: 'cus_1', status: 'active', metadata: { plan: 'max' }, items: { data: [{ price: { id: 'unknown' }, current_period_end: Date.now() / 1000 + 86400 }] } };
  assert.equal(subscriptionUpdates(remote, () => null).plan, 'free');
  remote.items.data[0].current_period_end = Date.now() / 1000 - 1;
  assert.equal(subscriptionUpdates(remote, () => 'max').subscription_active, 0);
});
