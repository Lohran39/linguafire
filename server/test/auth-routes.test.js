const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const bcrypt = require('bcryptjs');

const { setupAuthRoutes } = require('../routes/auth-routes');

function parseJsonField(value, fallback = []) {
  if (value == null || value === '') return fallback;
  if (Array.isArray(value) || typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

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

test('login endpoint returns stored profile arrays and shop bonuses', async () => {
  const hashedPassword = await bcrypt.hash('secret123', 4);
  const app = express();
  app.use(express.json());
  setupAuthRoutes(app, {
    JWT_SECRET: 'unit-test-secret',
    parseJsonField,
    supabaseGetUserByEmail: async () => ({
      id: 'user-1',
      name: 'Stored User',
      email: 'stored@example.com',
      password: hashedPassword,
      level: 4,
      xp: 900,
      streak: 6,
      correct_answers: 42,
      lessons_completed: 11,
      english_level: 'B1',
      achievements: JSON.stringify(['lesson-daily-basics']),
      favorites: JSON.stringify([{ key: 'hello', title: 'Hello', artist: 'Adele', ytId: 'YQHsXMglC9A', level: 'B1' }]),
      titles: JSON.stringify(['caixeiro_voador']),
      google_id: 'google-1',
      theme: 'light',
      subscription_active: 1,
      subscription_expires: 1999999999999,
      ai_uses_today: 3,
      lives: 7,
      has_free_hint: 2,
      xp_multiplier: 2,
      xp_multiplier_until: 1999999999999
    })
  });

  const { server, baseUrl } = await startTestServer(app);
  try {
    const response = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'stored@example.com', password: 'secret123' })
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body.user.achievements, ['lesson-daily-basics']);
    assert.deepEqual(body.user.favorites, [{ key: 'hello', title: 'Hello', artist: 'Adele', ytId: 'YQHsXMglC9A', level: 'B1' }]);
    assert.deepEqual(body.user.titles, ['caixeiro_voador']);
    assert.equal(body.user.google_linked, true);
    assert.equal(body.user.theme, 'light');
    assert.equal(body.user.subscription_active, true);
    assert.equal(body.user.ai_uses_today, 3);
    assert.equal(body.user.lives, 7);
    assert.equal(body.user.has_free_hint, 2);
    assert.equal(body.user.xp_multiplier, 2);
  } finally {
    await stopTestServer(server);
  }
});

test('register endpoint returns complete default profile shape', async () => {
  const app = express();
  app.use(express.json());
  setupAuthRoutes(app, {
    JWT_SECRET: 'unit-test-secret',
    parseJsonField,
    verifyEmailCanReceiveMail: async () => true,
    supabaseCreateUser: async ({ name, email, password }) => ({
      data: { id: 'new-user', name, email, password },
      error: null
    })
  });

  const { server, baseUrl } = await startTestServer(app);
  try {
    const response = await fetch(`${baseUrl}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New User', email: 'new@example.com', password: 'secret123' })
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.user.id, 'new-user');
    assert.deepEqual(body.user.achievements, []);
    assert.deepEqual(body.user.favorites, []);
    assert.deepEqual(body.user.titles, []);
    assert.equal(body.user.subscription_active, false);
    assert.equal(body.user.ai_uses_today, 0);
    assert.equal(body.user.lives, 5);
    assert.equal(body.user.has_free_hint, 0);
    assert.equal(body.user.xp_multiplier, 1);
    assert.equal(body.user.xp_multiplier_until, 0);
  } finally {
    await stopTestServer(server);
  }
});

test('register endpoint rejects email domains that cannot receive mail', async () => {
  const app = express();
  app.use(express.json());
  let createUserCalled = false;

  setupAuthRoutes(app, {
    JWT_SECRET: 'unit-test-secret',
    parseJsonField,
    verifyEmailCanReceiveMail: async () => false,
    supabaseCreateUser: async () => {
      createUserCalled = true;
      return { data: { id: 'should-not-create' }, error: null };
    }
  });

  const { server, baseUrl } = await startTestServer(app);
  try {
    const response = await fetch(`${baseUrl}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New User', email: 'new@invalid.test', password: 'secret123' })
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, 'Use um email valido que consiga receber mensagens.');
    assert.equal(createUserCalled, false);
  } finally {
    await stopTestServer(server);
  }
});

test('forgot password stores reset token and sends email when SMTP is configured', async () => {
  const app = express();
  app.use(express.json());
  let storedReset = null;
  let sentEmail = null;
  const originalSmtpHost = process.env.SMTP_HOST;

  process.env.SMTP_HOST = 'smtp.example.com';
  setupAuthRoutes(app, {
    BASE_URL: 'https://linguafire.onrender.com',
    IS_PRODUCTION: true,
    logger: { error() {}, info() {} },
    supabaseGetUserByEmail: async () => ({
      id: 'user-1',
      name: 'Reset User',
      email: 'reset@example.com'
    }),
    supabaseSetPasswordResetToken: async (id, token, expiresAt) => {
      storedReset = { id, token, expiresAt };
      return { error: null };
    },
    sendPasswordResetEmail: async (to, resetUrl, name) => {
      sentEmail = { to, resetUrl, name };
    }
  });

  const { server, baseUrl } = await startTestServer(app);
  try {
    const response = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'reset@example.com' })
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(storedReset.id, 'user-1');
    assert.match(storedReset.token, /^[a-f0-9]{64}$/);
    assert.ok(storedReset.expiresAt > Date.now());
    assert.equal(sentEmail.to, 'reset@example.com');
    assert.match(sentEmail.resetUrl, /^https:\/\/linguafire\.onrender\.com\/reset-password\?token=/);
    assert.equal(sentEmail.name, 'Reset User');
  } finally {
    if (originalSmtpHost === undefined) delete process.env.SMTP_HOST;
    else process.env.SMTP_HOST = originalSmtpHost;
    await stopTestServer(server);
  }
});

test('forgot password reports missing SMTP in production after token is stored', async () => {
  const app = express();
  app.use(express.json());
  let logged = false;
  const originalSmtpHost = process.env.SMTP_HOST;
  delete process.env.SMTP_HOST;

  setupAuthRoutes(app, {
    BASE_URL: 'https://linguafire.onrender.com',
    IS_PRODUCTION: true,
    logger: {
      error(message) {
        if (message === 'Password reset email requested without SMTP_HOST configured') logged = true;
      },
      info() {}
    },
    supabaseGetUserByEmail: async () => ({
      id: 'user-1',
      name: 'Reset User',
      email: 'reset@example.com'
    }),
    supabaseSetPasswordResetToken: async () => ({ error: null })
  });

  const { server, baseUrl } = await startTestServer(app);
  try {
    const response = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'reset@example.com' })
    });
    const body = await response.json();

    assert.equal(response.status, 500);
    assert.equal(body.error, 'Email de recuperação não configurado');
    assert.equal(logged, true);
  } finally {
    if (originalSmtpHost === undefined) delete process.env.SMTP_HOST;
    else process.env.SMTP_HOST = originalSmtpHost;
    await stopTestServer(server);
  }
});
