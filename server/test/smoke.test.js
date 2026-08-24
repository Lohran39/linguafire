const test = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL ||= 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key';
process.env.JWT_SECRET ||= 'test-jwt-secret';
process.env.BASE_URL ||= 'http://127.0.0.1:3000';
process.env.CORS_ORIGINS ||= 'http://127.0.0.1:3000,http://localhost:3000';

const app = require('../index');
const execFileAsync = promisify(execFile);

function startTestServer() {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1');

    server.once('listening', () => {
      const address = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`
      });
    });

    server.once('error', reject);
  });
}

function stopTestServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

test('health endpoint returns service metadata', async () => {
  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(typeof body.minimax_base, 'string');
    assert.equal(typeof body.minimax_model, 'string');
    assert.equal(body.frontend, 'react');
  } finally {
    await stopTestServer(server);
  }
});

test('server module loads in production when React build exists', async () => {
  const { stdout } = await execFileAsync(process.execPath, ['-e', "require('./index'); console.log('ok')"], {
    cwd: __dirname + '/..',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      BASE_URL: 'https://example.com',
      CORS_ORIGINS: 'https://example.com',
      JWT_SECRET: 'unit-test-production-secret-with-enough-entropy',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
    },
    timeout: 5000
  });

  assert.match(stdout, /ok/);
});

test('session endpoint rejects unauthenticated requests', async () => {
  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/auth/session`);
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.error, 'Não autenticado');
  } finally {
    await stopTestServer(server);
  }
});

test('register endpoint validates required fields before touching database', async () => {
  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid' })
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.match(body.error, /Dados inv[aá]lidos/);
    assert.ok(Array.isArray(body.details));
  } finally {
    await stopTestServer(server);
  }
});

test('google configured endpoint never crashes when oauth env is absent', async () => {
  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/auth/google/configured`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(typeof body.configured, 'boolean');
  } finally {
    await stopTestServer(server);
  }
});

test('static app bundle is served with cache-busted query strings', async () => {
  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/app.js?v=test`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /javascript/i);
    assert.match(body, /LinguaFire|state|function/);
  } finally {
    await stopTestServer(server);
  }
});

test('frontend utility bundle is served before app boot', async () => {
  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/app-utils.js?v=test`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /javascript/i);
    assert.match(body, /function \$\(/);
    assert.match(body, /function extractYouTubeId/);
  } finally {
    await stopTestServer(server);
  }
});

test('music catalog bundle is served before app boot', async () => {
  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/music-module.js?v=test`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /javascript/i);
    assert.match(body, /LinguaFireMusic/);
    assert.match(body, /function findSongByQuery/);
  } finally {
    await stopTestServer(server);
  }
});

test('music player bundle is served before app boot', async () => {
  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/music-player-module.js?v=test`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /javascript/i);
    assert.match(body, /LinguaFireMusicPlayer/);
    assert.match(body, /loadFromYouTube/);
    assert.match(body, /startMusicQuiz/);
  } finally {
    await stopTestServer(server);
  }
});

test('lesson, placement and natives bundles are served before app boot', async () => {
  const { server, baseUrl } = await startTestServer();

  try {
    const [lessonResponse, placementResponse, nativesResponse] = await Promise.all([
      fetch(`${baseUrl}/lesson-module.js?v=test`),
      fetch(`${baseUrl}/placement-module.js?v=test`),
      fetch(`${baseUrl}/natives-module.js?v=test`)
    ]);
    const [lessonBody, placementBody, nativesBody] = await Promise.all([
      lessonResponse.text(),
      placementResponse.text(),
      nativesResponse.text()
    ]);

    assert.equal(lessonResponse.status, 200);
    assert.match(lessonResponse.headers.get('content-type') || '', /javascript/i);
    assert.match(lessonBody, /LinguaFireLessons/);
    assert.match(lessonBody, /QUESTIONS_DB/);
    assert.match(lessonBody, /createController/);
    assert.match(lessonBody, /prepareLessonQuestion/);
    assert.match(lessonBody, /renderKaraokeList/);

    assert.equal(placementResponse.status, 200);
    assert.match(placementResponse.headers.get('content-type') || '', /javascript/i);
    assert.match(placementBody, /LinguaFirePlacement/);
    assert.match(placementBody, /startPlacementTest/);

    assert.equal(nativesResponse.status, 200);
    assert.match(nativesResponse.headers.get('content-type') || '', /javascript/i);
    assert.match(nativesBody, /LinguaFireNatives/);
    assert.match(nativesBody, /createController/);
  } finally {
    await stopTestServer(server);
  }
});

test('runtime bundle is served before app boot', async () => {
  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/runtime-module.js?v=test`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /javascript/i);
    assert.match(body, /LinguaFireRuntime/);
    assert.match(body, /initLivesRegen/);
    assert.match(body, /startSpeechRec/);
  } finally {
    await stopTestServer(server);
  }
});

test('home bundle is served before app boot', async () => {
  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/home-module.js?v=test`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /javascript/i);
    assert.match(body, /LinguaFireHome/);
    assert.match(body, /loadWordOfTheDay/);
    assert.match(body, /renderRanking/);
  } finally {
    await stopTestServer(server);
  }
});

test('profile bundle is served before app boot', async () => {
  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/profile-module.js?v=test`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /javascript/i);
    assert.match(body, /LinguaFireProfile/);
    assert.match(body, /createController/);
    assert.match(body, /toggleImmersionMode/);
  } finally {
    await stopTestServer(server);
  }
});

test('auth bundle is served before app boot', async () => {
  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/auth-module.js?v=test`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /javascript/i);
    assert.match(body, /LinguaFireAuth/);
    assert.match(body, /initializeAuthFlow/);
    assert.match(body, /completeAuthenticatedEntry/);
  } finally {
    await stopTestServer(server);
  }
});

test('conversation bundle is served before app boot', async () => {
  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/conversation-module.js?v=test`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /javascript/i);
    assert.match(body, /LinguaFireConversation/);
    assert.match(body, /loadConversationTopics/);
    assert.match(body, /sendConvMessage/);
  } finally {
    await stopTestServer(server);
  }
});

test('practice bundle is served before app boot', async () => {
  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/practice-module.js?v=test`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /javascript/i);
    assert.match(body, /LinguaFirePractice/);
    assert.match(body, /loadFlashcardStats/);
    assert.match(body, /switchQuestTab/);
  } finally {
    await stopTestServer(server);
  }
});

test('shop bundle is served before app boot', async () => {
  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/shop-module.js?v=test`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /javascript/i);
    assert.match(body, /LinguaFireShop/);
    assert.match(body, /renderShop/);
    assert.match(body, /buyShopItem/);
  } finally {
    await stopTestServer(server);
  }
});

test('notifications bundle is served before app boot', async () => {
  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/notifications-module.js?v=test`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /javascript/i);
    assert.match(body, /LinguaFireNotifications/);
    assert.match(body, /initPushNotifications/);
    assert.match(body, /subscribeToPush/);
  } finally {
    await stopTestServer(server);
  }
});

test('push service worker is served from public root', async () => {
  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/sw-push.js`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /javascript/i);
    assert.match(body, /showNotification/);
    assert.match(body, /\/favicon\.svg/);
  } finally {
    await stopTestServer(server);
  }
});
