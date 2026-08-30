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
    server.closeAllConnections?.();
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

test('register endpoint stores pending user and sends email verification', async () => {
  const app = express();
  app.use(express.json());
  let createdUser = null;
  let verificationEmail = null;
  setupAuthRoutes(app, {
    BASE_URL: 'https://linguafire.test',
    JWT_SECRET: 'unit-test-secret',
    parseJsonField,
    verifyEmailCanReceiveMail: async () => true,
    supabaseCreateUser: async (payload) => {
      createdUser = payload;
      return {
        data: { id: 'new-user', ...payload },
        error: null
      };
    },
    isTransactionalEmailConfigured: () => true,
    sendEmailVerificationEmail: async (email, verifyUrl, name) => {
      verificationEmail = { email, verifyUrl, name };
    }
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
    assert.equal(body.requiresEmailVerification, true);
    assert.match(body.message, /link de confirmação/);
    assert.equal(body.user, undefined);
    assert.equal(createdUser.email_verified, 0);
    assert.match(createdUser.email_verification_token, /^[a-f0-9]{64}$/);
    assert.ok(createdUser.email_verification_expires > Date.now());
    assert.equal(verificationEmail.email, 'new@example.com');
    assert.match(verificationEmail.verifyUrl, /^https:\/\/linguafire\.test\/api\/auth\/verify-email\?token=/);
    assert.equal(verificationEmail.name, 'New User');
  } finally {
    await stopTestServer(server);
  }
});

test('login endpoint blocks password users that have not confirmed email', async () => {
  const hashedPassword = await bcrypt.hash('secret123', 4);
  const app = express();
  app.use(express.json());
  setupAuthRoutes(app, {
    JWT_SECRET: 'unit-test-secret',
    parseJsonField,
    supabaseGetUserByEmail: async () => ({
      id: 'user-1',
      name: 'Pending User',
      email: 'pending@example.com',
      password: hashedPassword,
      email_verified: 0
    })
  });

  const { server, baseUrl } = await startTestServer(app);
  try {
    const response = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'pending@example.com', password: 'secret123' })
    });
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.error, 'Confirme seu email antes de entrar.');
  } finally {
    await stopTestServer(server);
  }
});

test('email verification link verifies user and creates session cookie', async () => {
  const app = express();
  app.use(express.json());
  let verifiedUserId = null;
  let welcomeEmail = null;

  setupAuthRoutes(app, {
    BASE_URL: 'https://linguafire.test',
    JWT_SECRET: 'unit-test-secret',
    parseJsonField,
    supabaseGetUserByEmailVerificationToken: async (token) => token === 'verify-token' ? ({
      id: 'user-1',
      name: 'Verify User',
      email: 'verify@example.com',
      email_verification_expires: Date.now() + 1000
    }) : null,
    supabaseVerifyUserEmail: async (id) => {
      verifiedUserId = id;
      return { data: { id }, error: null };
    },
    isTransactionalEmailConfigured: () => true,
    sendWelcomeEmail: async (email, name) => {
      welcomeEmail = { email, name };
    }
  });

  const { server, baseUrl } = await startTestServer(app);
  try {
    const response = await fetch(`${baseUrl}/api/auth/verify-email?token=verify-token`, {
      redirect: 'manual'
    });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), 'https://linguafire.test/?auth=email_verified&placement=1');
    assert.match(response.headers.get('set-cookie') || '', /linguafire_token=/);
    assert.equal(verifiedUserId, 'user-1');
    assert.deepEqual(welcomeEmail, { email: 'verify@example.com', name: 'Verify User' });
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

test('forgot password reports missing email provider in production after token is stored', async () => {
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
        if (message === 'Password reset email requested without email provider configured') logged = true;
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
