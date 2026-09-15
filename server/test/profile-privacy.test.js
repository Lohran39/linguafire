const test = require('node:test');
const assert = require('node:assert/strict');
const { setupProfileRoutes } = require('../routes/profile-routes');

async function profile(row) {
  let handler, body;
  setupProfileRoutes({ get(path, ...handlers) { if (path === '/api/profile') handler = handlers.at(-1); }, put() {}, delete() {} }, {
    supabaseGetUserById: async () => row,
    parseJsonField(value, fallback) { return typeof value === 'string' ? JSON.parse(value) : value || fallback; }
  });
  await handler({ user: { id: row.id } }, { json(value) { body = value; } });
  return body.user;
}

test('profile endpoint keeps student data and excludes internal and future secret columns', async () => {
  const result = await profile({ id: 'student', name: 'Ana', email: 'ana@example.test',
    xp: 123, streak: 2, lessons_completed: 8, english_level: 'A2', placement_completed: 1,
    achievements: '["first"]', favorites: '["song"]', titles: '["reader"]', lives: 10,
    password: 'private-hash', google_id: 'provider-id', password_reset_token: 'reset-secret',
    email_verification_token: 'verification-secret', auth_version: 123,
    stripe_customer_id: 'billing-id', future_secret: 'must-stay-private' });
  for (const key of ['password', 'google_id', 'password_reset_token', 'email_verification_token',
    'auth_version', 'stripe_customer_id', 'future_secret']) assert.equal(Object.hasOwn(result, key), false, key);
  assert.equal(result.has_password, true); assert.equal(result.google_linked, true);
  assert.equal(result.xp, 123); assert.equal(result.lives, 10); assert.equal(result.english_level, 'A2');
  assert.deepEqual(result.achievements, ['first']); assert.deepEqual(result.favorites, ['song']);
  assert.deepEqual(result.titles, ['reader']); assert.equal(result.plan, 'free');
  assert.equal(typeof result.ai_daily_limit, 'number');
});

test('Google-only profile advertises that a password must be created', async () => {
  const result = await profile({ id: 'google-user', password: '', google_id: 'google-id' });
  assert.equal(result.has_password, false); assert.equal(result.google_linked, true);
});
