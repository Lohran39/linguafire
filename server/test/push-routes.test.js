const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { setupPushRoutes } = require('../routes/push-routes');

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

test('push public key exposes configured VAPID key without auth', async () => {
  const app = express();
  setupPushRoutes(app, {
    pushService: {
      isConfigured: () => true,
      getPublicKey: () => 'public-vapid-key'
    }
  });

  const { server, baseUrl } = await startTestServer(app);
  try {
    const response = await fetch(`${baseUrl}/api/push/public-key`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.configured, true);
    assert.equal(body.publicKey, 'public-vapid-key');
  } finally {
    await stopTestServer(server);
  }
});

test('push broadcast requires admin token and sends to all subscriptions', async () => {
  const app = express();
  app.use(express.json());
  let sentPayload = null;
  setupPushRoutes(app, {
    pushAdminToken: 'push-admin',
    supabaseGetAllPushSubscriptions: async () => ([
      { endpoint: 'https://push.example/1', p256dh: 'a', auth: 'b' }
    ]),
    pushService: {
      sendMany: async (subscriptions, payload) => {
        sentPayload = { subscriptions, payload };
        return { sent: subscriptions.length, failed: 0 };
      }
    }
  });

  const { server, baseUrl } = await startTestServer(app);
  try {
    const rejected = await fetch(`${baseUrl}/api/push/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'x' })
    });
    assert.equal(rejected.status, 404);

    const accepted = await fetch(`${baseUrl}/api/push/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer push-admin'
      },
      body: JSON.stringify({ title: 'Treino', body: 'Volte hoje', url: '/profile' })
    });
    const body = await accepted.json();

    assert.equal(accepted.status, 200);
    assert.equal(body.sent, 1);
    assert.equal(sentPayload.payload.title, 'Treino');
    assert.equal(sentPayload.payload.url, '/profile');
  } finally {
    await stopTestServer(server);
  }
});
