const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { setupAuthRoutes } = require('../routes/auth-routes');
const { createRateLimiter } = require('../middleware/rate-limiter');
const { hashToken, sessionClaims, sessionIsCurrent } = require('../utils/auth-security');

async function serve(t, deps) {
  const app = express(); app.use(express.json()); setupAuthRoutes(app, { logger: { error() {} }, ...deps });
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  return (path, body, extra = {}) => fetch(base + path, body === undefined ? extra : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), ...extra
  });
}

test('email scanners do not activate accounts; tokens remain out of redirect query strings', async t => {
  const request = await serve(t, { supabaseVerifyUserEmail: () => assert.fail('GET must not activate') });
  const token = 'a'.repeat(64);
  const response = await request(`/api/auth/verify-email?token=${token}`, undefined, { redirect: 'manual' });
  assert.equal(response.status, 302);
  const target = new URL(response.headers.get('location'));
  assert.equal(target.search, ''); assert.equal(target.hash, `#confirm-email=${token}`);
  assert.equal(response.headers.get('set-cookie'), null);
});

test('expired and previously consumed confirmation links never activate or issue cookies', async t => {
  for (const user of [null, { id: 'pending', email_verified: 0, email_verification_expires: Date.now() - 1000 }]) {
    const request = await serve(t, {
      supabaseGetUserByEmailVerificationToken: async () => user,
      supabaseVerifyUserEmail: () => assert.fail('must not activate')
    });
    const res = await request('/api/auth/verify-email', { token: 'x', newPassword: 'new-password123' });
    assert.equal(res.status, 400); assert.equal(res.headers.get('set-cookie'), null);
  }
});

test('legacy password login works and password reset still revokes old session cookies', async t => {
  const user = { id: '1', email: 'test@example.com', password: await bcrypt.hash('secret123', 4), auth_version: 2 };
  const request = await serve(t, { JWT_SECRET: 'test', supabaseGetUserByEmail: async () => user, supabaseGetUserById: async () => user });
  assert.equal((await request('/api/login', { email: user.email, password: 'secret123' })).status, 200);
  user.email_verified = 1;
  const session = jwt.sign(sessionClaims(user), 'test');
  const headers = { cookie: `linguafire_token=${session}` };
  assert.equal((await request('/api/auth/session', undefined, { headers })).status, 200);
  user.auth_version = 3;
  assert.equal((await request('/api/auth/session', undefined, { headers })).status, 401);
  assert.equal(sessionIsCurrent({ av: 2 }, user), false);
});

test('failed resend restores previous link, without logging or returning tokens', async t => {
  const previous = { id: '1', email_verified: 0, email: 'test@example.com', email_verification_token: hashToken('old'), email_verification_expires: Date.now() + 100000 };
  let restored = false;
  const request = await serve(t, {
    supabaseGetUserByEmail: async () => previous,
    isTransactionalEmailConfigured: () => true,
    supabaseSetEmailVerificationToken: async () => ({ error: null }),
    sendEmailVerificationEmail: async () => { throw new Error('provider unavailable'); },
    supabaseRestoreEmailVerificationToken: async (id, token, snapshot) => {
      assert.equal(id, previous.id); assert.equal(snapshot, previous); assert.equal(token.length, 64);
      restored = true; return {};
    }
  });
  assert.equal((await request('/api/auth/resend-verification', { email: previous.email })).status, 500);
  assert.equal(restored, true);
});

function limiterRequest(limiter, path, email, ip = '1') {
  const result = { status: 200, headers: {} };
  const res = { setHeader(k, v) { result.headers[k] = v; }, status(n) { result.status = n; return this; }, json(body) { result.body = body; return this; } };
  return limiter({ path, body: { email }, ip }, res, () => {}).then(() => result);
}

test('Redis limits are shared across instances and IPs; register cannot bypass resend cooldown', async () => {
  const counts = new Map();
  const redis = { async eval(script, { keys, arguments: args }) {
    assert.match(script, /PEXPIRE/); assert.doesNotMatch(keys[0], /example|@/);
    counts.set(keys[0], (counts.get(keys[0]) || 0) + 1);
    return [counts.get(keys[0]), Number(args[0])];
  } };
  const first = createRateLimiter({ redis }), second = createRateLimiter({ redis });
  assert.equal((await limiterRequest(first, '/api/register', 'person@example.com')).status, 200);
  const blocked = await limiterRequest(second, '/api/auth/resend-verification', ' PERSON@EXAMPLE.COM ', '2');
  assert.equal(blocked.status, 429); assert.equal(blocked.headers['Retry-After'], '60');
  for (let i = 0; i < 10; i++) assert.equal((await limiterRequest(first, '/api/login', 'login@example.com', String(i))).status, 200);
  assert.equal((await limiterRequest(second, '/api/login', 'login@example.com', 'another')).status, 429);
});

test('authentication fails closed when Redis is unavailable in production', async () => {
  for (const options of [{ requireRedis: true }, { redis: { eval: async () => { throw new Error('offline'); } } }]) {
    assert.equal((await limiterRequest(createRateLimiter(options), '/api/login', 'a@example.com')).status, 503);
  }
});
