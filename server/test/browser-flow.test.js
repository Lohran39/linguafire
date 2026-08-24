const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL ||= 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key';
process.env.JWT_SECRET ||= 'test-jwt-secret';
process.env.BASE_URL ||= 'http://127.0.0.1:3000';
process.env.CORS_ORIGINS ||= 'http://127.0.0.1:3000,http://localhost:3000';

const app = require('../index');

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

async function getText(baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`);
  const body = await response.text();

  assert.equal(response.status, 200, `${path} should load`);
  return body;
}

test('active browser shell serves the React app and keeps legacy shell available', async () => {
  const { server, baseUrl } = await startTestServer();

  try {
    const html = await getText(baseUrl, '/');

    assert.match(html, /id="root"/);
    assert.match(html, /\/assets\/index-/);
    assert.match(html, /manifest\.json/);

    const legacyHtml = await getText(baseUrl, '/legacy/index.html');

    assert.match(legacyHtml, /id="loginEmail"/);
    assert.match(legacyHtml, /id="loginPassword"/);
    assert.match(legacyHtml, /id="loginBtn"/);
    assert.match(legacyHtml, /id="googleLoginBtn"/);

    assert.match(legacyHtml, /id="ytLinkInput"/);
    assert.match(legacyHtml, /id="loadYoutubeBtn"/);
    assert.match(legacyHtml, /id="mtab-favs"/);
    assert.match(legacyHtml, /id="favBtn"/);
    assert.match(legacyHtml, /id="musicQuizBtn"/);

    assert.match(legacyHtml, /id="nativesInput"/);
    assert.match(legacyHtml, /id="nativesSearchBtn"/);
    assert.match(legacyHtml, /id="nativesNewSearchBtn"/);

    assert.ok(legacyHtml.indexOf('auth-module.js') < legacyHtml.indexOf('app.js'), 'auth module must load before app.js');
    assert.ok(legacyHtml.indexOf('music-player-module.js') < legacyHtml.indexOf('app.js'), 'music player module must load before app.js');
    assert.ok(legacyHtml.indexOf('natives-module.js') < legacyHtml.indexOf('app.js'), 'natives module must load before app.js');
    assert.ok(legacyHtml.indexOf('runtime-module.js') < legacyHtml.indexOf('app.js'), 'runtime module must load before app.js');
    assert.ok(legacyHtml.indexOf('home-module.js') < legacyHtml.indexOf('app.js'), 'home module must load before app.js');
  } finally {
    await stopTestServer(server);
  }
});

test('browser bundles keep user-flow controllers wired', async () => {
  const { server, baseUrl } = await startTestServer();

  try {
    const [auth, player, natives, placement, runtime, home, appBundle] = await Promise.all([
      getText(baseUrl, '/auth-module.js?v=test'),
      getText(baseUrl, '/music-player-module.js?v=test'),
      getText(baseUrl, '/natives-module.js?v=test'),
      getText(baseUrl, '/placement-module.js?v=test'),
      getText(baseUrl, '/runtime-module.js?v=test'),
      getText(baseUrl, '/home-module.js?v=test'),
      getText(baseUrl, '/app.js?v=test')
    ]);

    assert.match(auth, /handleLogin/);
    assert.match(auth, /initializeAuthFlow/);
    assert.match(auth, /completeAuthenticatedEntry/);

    assert.match(player, /loadFromYouTube/);
    assert.match(player, /toggleFavorite/);
    assert.match(player, /renderFavorites/);
    assert.match(player, /startMusicQuiz/);

    assert.match(natives, /strict:'1'/);
    assert.match(natives, /shorts:'1'/);
    assert.match(natives, /Buscando shorts com frase exata/);
    assert.match(natives, /buildRetryVariants/);

    assert.match(placement, /LinguaFirePlacement/);
    assert.match(placement, /startPlacementTest/);

    assert.match(runtime, /LinguaFireRuntime/);
    assert.match(runtime, /initLivesRegen/);
    assert.match(runtime, /startSpeechRec/);

    assert.match(home, /LinguaFireHome/);
    assert.match(home, /loadWordOfTheDay/);
    assert.match(home, /renderRanking/);

    assert.match(appBundle, /loadYoutubeBtn/);
    assert.match(appBundle, /favBtn/);
    assert.match(appBundle, /musicQuizBtn/);
    assert.match(appBundle, /nativesSearchBtn/);
  } finally {
    await stopTestServer(server);
  }
});
