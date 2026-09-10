const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL ||= 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key';
process.env.JWT_SECRET ||= 'test-jwt-secret';
process.env.BASE_URL ||= 'http://127.0.0.1:3000';
process.env.CORS_ORIGINS ||= 'http://127.0.0.1:3000,http://localhost:3000';

let chromium = null;
try {
  chromium = require('playwright').chromium;
} catch (_error) {
  chromium = null;
}

const app = require('../../index');

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

function fixtureUser() {
  return {
    id: 'e2e-user',
    name: 'E2E User',
    email: 'e2e@example.com',
    level: 2,
    xp: 310,
    streak: 1,
    correct_answers: 12,
    lessons_completed: 4,
    english_level: 'A1',
    placement_completed: 1,
    achievements: [],
    favorites: [],
    google_linked: false,
    theme: 'default',
    subscription_active: false,
    subscription_expires: 0,
    ai_uses_today: 0
  };
}

function readRequestJson(request) {
  try {
    return request.postDataJSON();
  } catch (_error) {
    try {
      return JSON.parse(request.postData() || '{}');
    } catch (__error) {
      return {};
    }
  }
}

async function mockAuthenticatedApis(page) {
  const user = fixtureUser();
  const activities = {};
  await page.route('**/api/learning/summary', route => route.fulfill({ json: { consolidatedWords: 0, reviewedWords: 0, words: [], recurringErrors: [], skills: [] } }));
  await page.route('**/api/learning/events', route => route.fulfill({ json: { success: true } }));
  await page.route('**/api/curation?*', route => route.fulfill({ json: { items: [] } }));
  await page.route('**/api/flashcards/mistakes', route => route.fulfill({ json: { cards: [] } }));
  await page.route('**/api/activities', route => route.fulfill({ json: { activities: Object.values(activities) } }));
  await page.route('**/api/activities/*', route => {
    const activity = new URL(route.request().url()).pathname.split('/').at(-1);
    const body = readRequestJson(route.request());
    activities[activity] = { activity, state: body.state, revision: body.revision + 1 };
    return route.fulfill({ json: { revision: body.revision + 1 } });
  });

  await page.route('**/api/auth/session', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ userId: user.id })
  }));

  await page.route('**/api/profile', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user })
      });
    }

    const payload = readRequestJson(route.request());
    Object.assign(user, payload.user || payload);

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, user })
    });
  });

  await page.route('**/api/streak/rewards', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ rewards: [] })
  }));

  await page.route('**/api/daily/word', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      word: 'Serendipity',
      translation: 'Feliz acaso',
      level: 'C1',
      context: 'A useful word for unexpected good things.'
    })
  }));

  await page.route('**/api/leaderboard', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ leaderboard: [{ name: 'E2E User', xp: 310, level: 2, streak: 1 }] })
  }));

  await page.route('**/api/rank', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ rank: 1 })
  }));

  await page.route('**/api/quests', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      quests: [
        { id: 'daily_1', type: 'daily', title: 'Complete 2 lições', desc: 'Estude hoje', quest: 'lessons', target: 2, reward: 100 },
        { id: 'weekly_1', type: 'weekly', title: 'Acumule 500 XP', desc: 'Ganhe XP na semana', quest: 'xp', target: 500, reward: 300 }
      ]
    })
  }));

  await page.route('**/api/push/status', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ subscribed: false })
  }));

  await page.route('**/api/lyrics/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      trackName: 'Blinding Lights',
      artistName: 'The Weeknd',
      plainLyrics: [
        'I said, ooh, I am blinded by the lights',
        'No, I cannot sleep until I feel your touch',
        'I said, ooh, I am drowning in the night',
        'When I am like this, you are the one I trust'
      ].join('\n'),
      source: 'mock',
      searchedTrack: 'Blinding Lights',
      searchedArtist: 'The Weeknd',
      cached: true
    })
  }));

  await page.route('**/api/translate**', (route) => {
    const { q = '' } = readRequestJson(route.request());
    return route.fulfill({ json: {
      responseStatus: 200,
      responseData: { translatedText: q.split('\nLF_LINE_BREAK\n').map((_, index) => `tradução de teste ${index + 1}`).join('\nLF_LINE_BREAK\n') }
    } });
  });

  await page.route('**/api/natives/saved**', (route) => route.fulfill({ json: { videos: [] } }));

  await page.route('**/api/natives/search**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      videoIds: ['dQw4w9WgXcQ'],
      cached: true,
      curated: true,
      strict: true,
      source: 'curated-short-v1'
    })
  }));

  await page.route('**/api/subscription/status', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      active: Boolean(user.subscription_active),
      expires: Number(user.subscription_expires || 0),
      plan: user.subscription_active ? 'pro' : null,
      price: 45,
      aiDailyLimit: 300,
      checkoutConfigured: true,
      canSubscribe: !user.subscription_active,
      hasBillingAccount: false, portalAvailable: false, billingStatus: user.subscription_active ? 'active' : 'none',
      aiUsage: { used: 0, limit: user.subscription_active ? 300 : 10, remaining: user.subscription_active ? 300 : 10, resetsAt: new Date(Date.now() + 86400000).toISOString() }
    })
  }));

  await page.route('**/api/subscription/create', (route) => {
    const expires = Date.now() + 30 * 24 * 60 * 60 * 1000;
    user.subscription_active = true;
    user.subscription_expires = expires;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        subscription: { active: true, expires, plan: 'pro', price: 45, aiDailyLimit: 300 }
      })
    });
  });

  await page.route('**/api/subscription/cancel', (route) => {
    user.subscription_active = false;
    user.subscription_expires = 0;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true })
    });
  });

  await page.route('**/api/change-password', (route) => {
    const payload = readRequestJson(route.request());
    assert.equal(payload.currentPassword, 'oldpass1');
    assert.equal(payload.newPassword, 'newpass1');
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message: 'Senha alterada com sucesso' })
    });
  });

  await page.route('**/api/account', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true })
  }));

  await page.route('**/api/flashcards/stats', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ due: 1, total: 3 })
  }));

  await page.route('**/api/flashcards/available', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      cards: [
        { word: 'serendipity', translation: 'feliz acaso', level: 'C1', isNew: false }
      ]
    })
  }));

  await page.route('**/api/flashcards/review', (route) => {
    const payload = readRequestJson(route.request());
    assert.equal(payload.word, 'serendipity');
    assert.equal(payload.quality, 4);
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, interval: 3 })
    });
  });

  await page.route('**/api/shop', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      items: [
        { id: 'free_hint', name: '💡 Dica Grátis', cost: 30, type: 'consumable' },
        { id: 'xp_booster', name: '⚡ Dobrar XP', cost: 150, type: 'booster' }
      ]
    })
  }));

  await page.route('**/api/shop/buy', (route) => {
    const payload = readRequestJson(route.request());
    assert.equal(payload.itemId, 'free_hint');
    user.xp = 280;
    user.has_free_hint = 1;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        xp: user.xp,
        lives: 5,
        has_free_hint: 1,
        message: 'Dica comprada!'
      })
    });
  });

  await page.route('**/api/conversation/topics', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      topics: [
        { id: 'restaurant', name: '🍽️ Restaurant', icon: '🍽️' },
        { id: 'airport', name: '✈️ Airport', icon: '✈️' }
      ]
    })
  }));

  await page.route('**/api/conversation', (route) => {
    const payload = readRequestJson(route.request());
    assert.equal(payload.topicId, 'restaurant');
    assert.equal(payload.message, 'I would like a table, please.');
    user.ai_uses_today = 1;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ reply: 'Sure. A table for how many people?' })
    });
  });

  await page.route('**/api/grammar/analyze', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ errors: [] })
  }));
}

async function openSecondaryTab(page, name) {
  await page.locator('.topbar').waitFor();
  const more = page.getByRole('button', { name: 'Mais', exact: true });
  if (await more.isVisible() && await more.getAttribute('aria-expanded') !== 'true') await more.click();
  await page.getByRole('button', { name, exact: true }).click();
}

test('Playwright E2E: tabs load on demand and failed chunks leave navigation usable', {
  skip: !chromium || process.env.RUN_PLAYWRIGHT_E2E !== '1'
}, async () => {
  const { server, baseUrl } = await startTestServer();
  const browser = await chromium.launch({ headless: true });
  let releaseChunk;
  const chunkGate = new Promise(resolve => { releaseChunk = resolve; });
  try {
    const page = await browser.newPage();
    await mockAuthenticatedApis(page);
    const scripts = [];
    page.on('request', request => {
      if (request.resourceType() === 'script') scripts.push(request.url());
    });
    await page.route('**/assets/MusicTab-*.js', async route => {
      await chunkGate;
      await route.continue().catch(() => {});
    });
    await page.route('**/assets/NativesTab-*.js', route => route.abort('failed'));
    await page.goto(baseUrl);
    await page.getByRole('heading', { name: 'Olá, E2E User' }).waitFor();
    assert.ok(!scripts.some(url => /\/(MusicTab|LessonTab|NativesTab|AdminTab)-/.test(url)), 'unused tabs must not load with the dashboard');
    await openSecondaryTab(page, 'Música');
    await page.getByText('Carregando Música...', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Início', exact: true }).click();
    await page.getByRole('heading', { name: 'Olá, E2E User' }).waitFor();
    releaseChunk();
    await openSecondaryTab(page, 'Música');
    await page.getByRole('heading', { name: 'Shape of You', exact: true }).waitFor();
    await openSecondaryTab(page, 'Nativos');
    await page.getByRole('heading', { name: 'Não foi possível abrir Nativos', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Início', exact: true }).click();
    await page.getByRole('heading', { name: 'Olá, E2E User' }).waitFor();
  } finally {
    releaseChunk();
    await browser.close();
    await stopTestServer(server);
  }
});

test('Playwright E2E: music shows original lyrics early and ignores outdated requests', {
  skip: !chromium || process.env.RUN_PLAYWRIGHT_E2E !== '1'
}, async () => {
  const { server, baseUrl } = await startTestServer();
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      let releaseLyrics;
      let releaseTranslation;
      let releaseSearch;
      const lyricsGate = new Promise(resolve => { releaseLyrics = resolve; });
      const translationGate = new Promise(resolve => { releaseTranslation = resolve; });
      const searchGate = new Promise(resolve => { releaseSearch = resolve; });
      let betaRetry = false;
      let betaLookups = 0;
      let alphaTranslations = 0;
      try {
        await mockAuthenticatedApis(page);
        await page.route('**/api/music/video-status', route => route.fulfill({ json: { success: true } }));
        await page.route('**/api/music/search?*', async route => {
          const query = new URL(route.request().url()).searchParams.get('q');
          if (query === 'fixture delayed') await searchGate;
          const beta = query === 'fixture beta';
          await route.fulfill({ json: {
            success: true, title: beta ? 'Fixture Beta' : 'Fixture Alpha', artist: 'Fixture Artist',
            videoId: beta ? 'BBBBBBBBBBB' : 'AAAAAAAAAAA', videoTitle: 'Fixture video', channelName: 'Fixture Artist'
          } }).catch(() => {});
        });
        await page.route('**/api/lyrics/find?*', async route => {
          const beta = new URL(route.request().url()).searchParams.get('track_name') === 'Fixture Beta';
          if (beta) betaLookups += 1;
          else await lyricsGate;
          await route.fulfill({ json: {
            success: true, source: 'fixture', plainLyrics: beta ? 'A fictional beta verse' : 'A fictional alpha verse\nAnother imaginary phrase'
          } }).catch(() => {});
        });
        await page.route('**/api/translate', async route => {
          const { q } = readRequestJson(route.request());
          if (q.includes('alpha')) {
            alphaTranslations += 1;
            await translationGate;
          }
          if (q.includes('beta') && !betaRetry) {
            return route.fulfill({ status: 503, json: { error: 'Translation temporarily unavailable' } });
          }
          await route.fulfill({ json: {
            responseStatus: 200,
            responseData: { translatedText: q.split('\nLF_LINE_BREAK\n').map(() => q.includes('beta') ? 'Um verso beta fictício' : 'Um verso alfa fictício').join('\nLF_LINE_BREAK\n') }
          } }).catch(() => {});
        });
        await page.goto(baseUrl);
        await page.getByRole('heading', { name: 'Olá, E2E User' }).waitFor();
        await openSecondaryTab(page, 'Música');
        const search = page.getByPlaceholder('Ex: stay, adele ou link do YouTube');
        await search.fill('fixture alpha');
        await page.getByRole('button', { name: 'Buscar', exact: true }).click();
        await page.getByRole('heading', { name: 'Fixture Alpha', exact: true }).waitFor();
        await page.getByText('Buscando letra...', { exact: true }).waitFor();
        assert.equal(await page.locator('.music-embed').count(), 1);
        releaseLyrics();
        await page.getByText('Letra disponível com 2 linhas. Traduzindo...', { exact: true }).waitFor();
        assert.equal(await page.locator('.lyric-card').count(), 2);
        assert.equal(await page.getByRole('button', { name: 'Quiz', exact: true }).isEnabled(), false);
        assert.equal(alphaTranslations, 1, 'only one translation request per selected song');
        await assertNoHorizontalOverflow(page, `progressive music ${viewport.width}`);
        await page.locator('.lyrics-list').screenshot({ path: `/tmp/linguafire-progressive-lyrics-${viewport.width}.png` });

        await search.fill('fixture beta');
        await page.getByRole('button', { name: 'Buscar', exact: true }).click();
        await page.getByRole('heading', { name: 'Fixture Beta', exact: true }).waitFor();
        await page.getByText('Letra disponível. Parte da tradução não está disponível agora.', { exact: true }).waitFor();
        await assertNoHorizontalOverflow(page, `translation retry ${viewport.width}`);
        if (viewport.width < 600) {
          const header = await page.locator('.music-header').boundingBox();
          assert.ok(header.height < 420, 'mobile header must not keep desktop flex bases as heights');
          for (const button of await page.locator('.music-actions button').all()) {
            const bounds = await button.boundingBox();
            assert.ok(bounds.height >= 44 && bounds.height < 100, 'mobile actions should remain compact touch targets');
          }
        }
        await page.locator('.music-player-panel').screenshot({ path: `/tmp/linguafire-translation-retry-${viewport.width}.png` });
        releaseTranslation();
        betaRetry = true;
        await page.getByRole('button', { name: 'Tentar tradução novamente', exact: true }).click();
        await page.locator('.lyric-card').getByText('Um verso beta fictício', { exact: true }).waitFor();
        assert.equal(betaLookups, 1, 'retrying translation must not fetch the lyrics again');
        assert.equal(await page.getByRole('heading', { name: 'Fixture Beta', exact: true }).count(), 1);
        assert.equal(await page.getByText('A fictional alpha verse', { exact: true }).count(), 0);

        await search.fill('fixture delayed');
        await page.getByRole('button', { name: 'Buscar', exact: true }).click();
        await page.getByRole('button', { name: 'Buscando...', exact: true }).waitFor();
        await page.locator('.song-list').getByRole('button', { name: /Shape of You/ }).click();
        releaseSearch();
        await page.getByRole('heading', { name: 'Shape of You', exact: true }).waitFor();
        await page.getByRole('button', { name: 'Início', exact: true }).click();
        await page.getByRole('heading', { name: 'Olá, E2E User' }).waitFor();
      } finally {
        releaseLyrics();
        releaseTranslation();
        releaseSearch();
        await page.close();
      }
    }
  } finally {
    await browser.close();
    await stopTestServer(server);
  }
});

test('Playwright E2E: native coach keeps ten turns, recovers errors and cancels stale replies', {
  skip: !chromium || process.env.RUN_PLAYWRIGHT_E2E !== '1'
}, async () => {
  const { server, baseUrl } = await startTestServer();
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      try {
        await mockAuthenticatedApis(page);
        let mode = 'ok';
        let pendingRoute;
        const requests = [];
        await page.route('**/api/natives/coach', async (route) => {
          const payload = route.request().postDataJSON();
          requests.push(payload);
          if (mode === 'pending') { pendingRoute = route; return; }
          if (mode === 'error') {
            return route.fulfill({ status: 503, json: { message: 'A IA esta temporariamente indisponivel.' } });
          }
          return route.fulfill({ json: { score: 90, natural: payload.answer,
            correction: 'Frase correta.', feedback: 'Pedido educado.', nextReply: `Restaurant reply ${requests.length}` } });
        });
        await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
        await openSecondaryTab(page, 'Nativos');
        const answer = page.getByLabel('Treino com IA', { exact: true });
        for (let index = 0; index < 10; index += 1) {
          await answer.fill(`I would like some water, please. Turn ${index + 1}.`);
          await page.getByRole('button', { name: index === 0 ? 'Avaliar naturalidade' : 'Enviar resposta', exact: true }).click();
          await page.getByRole('log', { name: 'Conversa do treino' }).getByText(`Restaurant reply ${index + 1}`, { exact: false }).waitFor();
          assert.equal(requests[index].history.length, index);
          if (index) assert.equal(requests[index].history[0].answer, requests[0].answer);
        }
        assert.equal(await page.locator('.native-coach-turn').count(), 10);
        await page.locator('.native-coach').screenshot({ path: `/tmp/linguafire-native-coach-${viewport.width}.png` });
        await assertNoHorizontalOverflow(page, `native coach ${viewport.width}`);

        mode = 'error';
        await answer.fill('Could I have the bill?');
        await page.getByRole('button', { name: 'Enviar resposta', exact: true }).click();
        await page.getByRole('alert').waitFor();
        assert.equal(await answer.inputValue(), 'Could I have the bill?');
        assert.equal(await page.locator('.native-coach-turn').count(), 10);
        mode = 'ok';
        await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
        await page.getByText('Restaurant reply 12', { exact: false }).waitFor();
        assert.equal(requests[11].history.length, 10);
        assert.equal(await page.locator('.native-coach-turn').count(), 10);

        mode = 'pending';
        await answer.fill('Can I pay by card?');
        const pending = page.waitForRequest('**/api/natives/coach');
        await page.getByRole('button', { name: 'Enviar resposta', exact: true }).click();
        await pending;
        await page.getByRole('button', { name: 'Recomeçar treino', exact: true }).click();
        if (pendingRoute) await pendingRoute.fulfill({ json: { score: 10, nextReply: 'Stale response' } }).catch(() => {});
        assert.equal(await answer.inputValue(), '');
        assert.equal(await page.locator('.native-coach-turn').count(), 0);
        assert.equal(await page.getByText('Stale response').count(), 0);
        assert.equal(await answer.isEnabled(), true);

        await answer.fill('Could we see the menu?');
        const changingSituation = page.waitForRequest('**/api/natives/coach');
        await page.getByRole('button', { name: 'Avaliar naturalidade', exact: true }).click();
        await changingSituation;
        await page.locator('.native-situation-grid button').filter({ hasText: 'Aeroporto' }).click();
        await page.getByRole('button', { name: 'Avaliar naturalidade', exact: true }).waitFor();
        if (pendingRoute) await pendingRoute.fulfill({ json: { score: 10, nextReply: 'Old restaurant reply' } }).catch(() => {});
        assert.equal(await answer.inputValue(), '');
        assert.equal(await answer.isEnabled(), true);
        assert.equal(await page.getByText('Old restaurant reply').count(), 0);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
    await stopTestServer(server);
  }
});

test('Playwright E2E: React app primary flows work', {
  skip: !chromium || process.env.RUN_PLAYWRIGHT_E2E !== '1'
    ? 'Rode com npm --prefix server run test:e2e para ativar o navegador real'
    : false
}, async (t) => {
  const { server, baseUrl } = await startTestServer();
  let browser = null;
  let page = null;

  try {
    try {
      browser = await chromium.launch({ headless: true });
    } catch (error) {
      t.skip(`Instale o browser do Playwright: npx playwright install chromium (${error.message})`);
      return;
    }

    page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await mockAuthenticatedApis(page);

    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Olá, E2E User' }).waitFor({ timeout: 5000 });
    await page.getByRole('button', { name: 'Semanais' }).click();
    await page.getByText('Acumule 500 XP').waitFor({ timeout: 3000 });

    await openSecondaryTab(page, 'Música');
    await page.getByRole('heading', { name: 'Shape of You' }).waitFor({ timeout: 3000 });
    await page.getByPlaceholder('Ex: stay, adele ou link do YouTube').fill('hello');
    await page.getByRole('button', { name: 'Buscar' }).click();
    await page.getByRole('heading', { name: 'Hello' }).waitFor({ timeout: 3000 });
    await page.getByText('Letra disponível, sem sincronismo.', { exact: true }).waitFor({ timeout: 5000 });
    assert.equal(await page.locator('.lyric-card').count(), 4);
    await page.locator('.lyric-card').first().getByText('tradução de teste 1', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Quiz' }).click();
    await page.locator('.quiz-modal').waitFor({ timeout: 3000 });
    await page.locator('.quiz-choices button').first().click();
    await page.getByRole('button', { name: 'Próxima' }).click();
    await page.getByRole('button', { name: 'Sair do quiz' }).click();

    await page.getByRole('button', { name: 'Lições', exact: true }).click();
    await page.getByRole('heading', { name: 'Lições rápidas para ganhar XP' }).waitFor({ timeout: 3000 });
    // Questions vary daily; exercise both answer formats without assuming their order.
    for (let index = 0; index < 5; index += 1) {
      const typedAnswer = page.getByLabel('Digite a resposta', { exact: true });
      if (await typedAnswer.isVisible()) {
        await typedAnswer.fill('test answer');
        await page.getByRole('button', { name: 'Conferir', exact: true }).click();
      } else {
        await page.locator('.lesson-choices button').first().click();
      }
      await page.locator('.lesson-feedback').waitFor();
      await page.getByRole('button', { name: index === 4 ? 'Ver resultado' : 'Próxima', exact: true }).click();
    }
    await page.locator('.lesson-result').waitFor();
    await page.getByRole('button', { name: 'Salvar progresso' }).click();
    await page.getByText('Progresso salvo.').waitFor({ timeout: 5000 });

    await page.getByRole('button', { name: 'Revisão' }).click();
    await page.getByRole('button', { name: 'Começar revisão' }).click();
    await page.getByRole('heading', { name: 'serendipity' }).waitFor({ timeout: 3000 });
    await page.getByRole('button', { name: 'Revelar resposta' }).click();
    await page.getByText('feliz acaso').waitFor({ timeout: 3000 });
    await page.getByRole('button', { name: /Bom/ }).click();
    await page.getByText('Sessão concluída', { exact: true }).waitFor({ timeout: 5000 });

    await page.getByRole('button', { name: 'Loja' }).click();
    await page.getByRole('heading', { name: 'Use XP para acelerar o estudo' }).waitFor({ timeout: 3000 });
    await page.getByRole('button', { name: 'Comprar' }).first().click();
    await page.getByText('Dica comprada!').waitFor({ timeout: 5000 });

    await page.getByRole('button', { name: 'Conversar' }).click();
    await page.getByRole('heading', { name: 'Pratique inglês em cenários reais' }).waitFor({ timeout: 3000 });
    await page.getByRole('button', { name: /Restaurant/ }).click();
    await page.getByPlaceholder('Type your answer in English...').fill('I would like a table, please.');
    await page.getByRole('button', { name: 'Enviar' }).click();
    await page.getByText('Sure. A table for how many people?').waitFor({ timeout: 5000 });
    await page.getByRole('button', { name: 'Fechar e analisar' }).click();

    await page.getByRole('button', { name: 'Nativos' }).click();
    await page.getByRole('heading', { name: 'Treine inglês real por situação' }).waitFor({ timeout: 3000 });
    await page.locator('#nativesInput').fill('me and you');
    await page.getByRole('button', { name: 'Buscar' }).click();
    await page.locator('.natives-result iframe').waitFor({ timeout: 5000 });

    await page.getByRole('button', { name: 'Nível' }).click();
    await page.getByRole('button', { name: 'Começar teste' }).click();
    for (let questionIndex = 0; questionIndex < 15; questionIndex += 1) {
      await page.locator('.placement-choices button').first().click();
      await page.getByRole('button', { name: questionIndex === 14 ? 'Concluir teste' : 'Próxima pergunta', exact: true }).click();
      if (questionIndex < 14) {
        await page.locator('.placement-count', { hasText: `${questionIndex + 2}/15` }).waitFor({ timeout: 3000 });
      }
    }
    await page.getByText('Resultado').waitFor({ timeout: 5000 });

    await page.getByRole('button', { name: 'Perfil' }).click();
    await page.getByRole('heading', { name: 'Assinatura' }).waitFor({ timeout: 3000 });
    await page.getByRole('button', { name: 'Ativar Pro' }).click();
    await page.getByText('Assinatura ativada.').waitFor({ timeout: 5000 });

    await page.getByLabel('Senha atual', { exact: true }).fill('oldpass1');
    await page.getByLabel('Nova senha', { exact: true }).fill('newpass1');
    await page.getByLabel('Confirmar nova senha', { exact: true }).fill('newpass1');
    await page.getByRole('button', { name: 'Alterar senha' }).click();
    await page.getByText('Senha alterada com sucesso').waitFor({ timeout: 5000 });

    await assertNoCriticalConsoleErrors(consoleErrors);
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    await stopTestServer(server);
  }
});

test('Playwright E2E: React desktop and mobile layouts avoid horizontal overflow', {
  skip: !chromium || process.env.RUN_PLAYWRIGHT_E2E !== '1'
    ? 'Rode com npm --prefix server run test:e2e para ativar o navegador real'
    : false
}, async (t) => {
  const { server, baseUrl } = await startTestServer();
  let browser = null;

  try {
    try {
      browser = await chromium.launch({ headless: true });
    } catch (error) {
      t.skip(`Instale o browser do Playwright: npx playwright install chromium (${error.message})`);
      return;
    }

    for (const viewport of [
      { width: 1280, height: 900, label: 'desktop' },
      { width: 390, height: 844, label: 'mobile' }
    ]) {
      const page = await browser.newPage({ viewport });
      try {
        await mockAuthenticatedApis(page);
        const consoleErrors = [];
        page.on('console', (message) => {
          if (message.type() === 'error') consoleErrors.push(message.text());
        });

        await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
        await page.getByRole('heading', { name: 'Olá, E2E User' }).waitFor({ timeout: 5000 });
        await assertNoHorizontalOverflow(page, `${viewport.label}: home`);

        for (const tab of ['Lições', 'Música', 'Revisão', 'Conversar', 'Nativos', 'Loja', 'Nível', 'Perfil']) {
          if (viewport.label === 'mobile' && !['Lições', 'Revisão', 'Conversar'].includes(tab)) {
            await page.getByRole('button', { name: 'Mais', exact: true }).click();
          }
          await page.getByRole('button', { name: tab, exact: true }).click();
          await page.waitForTimeout(120);
          await assertNoHorizontalOverflow(page, `${viewport.label}: ${tab}`);
          if (tab === 'Música') {
            await page.locator('.music-embed').screenshot({ path: `/tmp/linguafire-music-player-${viewport.label}.png` });
          }
        }

        await assertNoCriticalConsoleErrors(consoleErrors);
      } finally {
        await page.close().catch(() => {});
      }
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    await stopTestServer(server);
  }
});

test('Playwright E2E: login shell, music, favorites, natives and profile are clickable', {
  skip: !chromium || process.env.RUN_PLAYWRIGHT_E2E !== '1'
    ? 'Rode com npm --prefix server run test:e2e para ativar o navegador real'
    : false
}, async (t) => {
  const { server, baseUrl } = await startTestServer();
  let browser = null;
  let page = null;

  try {
    try {
      browser = await chromium.launch({ headless: true });
    } catch (error) {
      t.skip(`Instale o browser do Playwright: npx playwright install chromium (${error.message})`);
      return;
    }

    page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await mockAuthenticatedApis(page);
    await page.addInitScript(() => {
      localStorage.setItem('linguafire_userId', 'e2e-user');
      localStorage.setItem('linguafire_onboarding_seen_e2e-user', '1');
    });

    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto(`${baseUrl}/legacy/index.html`, { waitUntil: 'domcontentloaded' });
    await page.locator('#app.screen.active').waitFor({ timeout: 5000 });
    await assertNoCriticalConsoleErrors(consoleErrors);

    await page.locator('#nav-music').click();
    await page.locator('#music-tab.active').waitFor({ timeout: 3000 });
    await page.locator('.sugg-card').first().click();
    await page.locator('#music-player:not(.is-hidden)').waitFor({ timeout: 5000 });
    const favoriteSave = page.waitForResponse((response) => (
      response.url().includes('/api/profile')
      && response.request().method() !== 'GET'
      && response.status() === 200
    ), { timeout: 5000 });
    await page.locator('#favBtn').click();
    await favoriteSave;
    await page.locator('#mtab-favs').click();
    await page.locator('#music-favs-panel:not(.is-hidden)').waitFor({ timeout: 3000 });
    await page.locator('#favsList .sugg-card').first().waitFor({ timeout: 3000 });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('#app.screen.active').waitFor({ timeout: 5000 });
    await page.locator('#nav-music').click();
    await page.locator('#mtab-favs').click();
    await page.locator('#favsList .sugg-card').first().waitFor({ timeout: 3000 });

    await page.locator('#favsList .sugg-card').first().click();
    await page.locator('#music-player:not(.is-hidden)').waitFor({ timeout: 5000 });
    await page.locator('#musicQuizBtn').click();
    await page.locator('#quizOverlay:not(.is-hidden)').waitFor({ timeout: 3000 });
    await page.locator('#quizChoices .quiz-choice').first().click();
    await page.locator('#quizNextBtn:not(.is-hidden)').waitFor({ timeout: 3000 });
    await page.locator('#closeQuizBtn').click();

    await page.locator('#nav-natives').click();
    await page.locator('#natives-tab.active').waitFor({ timeout: 3000 });
    await page.locator('#nativesInput').fill('me and you');
    await page.locator('#nativesSearchBtn').click();
    await page.locator('#nativesIframe').waitFor({ timeout: 5000 });

    await page.locator('#nav-profile').click();
    await page.locator('#profile-tab-content.active').waitFor({ timeout: 3000 });
    await expectVisibleText(page, '#profileName', 'E2E User');

    await assertNoCriticalConsoleErrors(consoleErrors);
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    await stopTestServer(server);
  }
});

test('Playwright E2E: reset password route returns to login after success', {
  skip: !chromium || process.env.RUN_PLAYWRIGHT_E2E !== '1'
    ? 'Rode com npm --prefix server run test:e2e para ativar o navegador real'
    : false
}, async (t) => {
  const { server, baseUrl } = await startTestServer();
  let browser = null;
  let page = null;

  try {
    try {
      browser = await chromium.launch({ headless: true });
    } catch (error) {
      t.skip(`Instale o browser do Playwright: npx playwright install chromium (${error.message})`);
      return;
    }

    page = await browser.newPage({ viewport: { width: 430, height: 820 } });
    await page.route('**/api/auth/session', (route) => route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Nao autenticado' })
    }));
    await page.route('**/api/auth/reset-password', (route) => {
      const payload = readRequestJson(route.request());
      assert.equal(payload.token, 'e2e-reset-token');
      assert.equal(payload.newPassword, 'nova1234');

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto(`${baseUrl}/reset-password?token=e2e-reset-token`, { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('Nova senha', { exact: true }).fill('nova1234');
    await page.getByPlaceholder('Confirmar nova senha', { exact: true }).fill('nova1234');
    await page.getByRole('button', { name: 'Alterar senha' }).click();
    await page.getByRole('form', { name: 'Entrar na conta' }).waitFor({ timeout: 5000 });
    await page.getByRole('button', { name: 'Entrar', exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, '/');

    await assertNoCriticalConsoleErrors(consoleErrors);
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    await stopTestServer(server);
  }
});

async function expectVisibleText(page, selector, expected) {
  const text = await page.locator(selector).textContent({ timeout: 3000 });
  assert.match(text || '', new RegExp(expected));
}

async function assertNoCriticalConsoleErrors(consoleErrors) {
  const criticalErrors = consoleErrors.filter((message) => !/favicon|ResizeObserver|push|compute-pressure/i.test(message));
  assert.deepEqual(criticalErrors, []);
}

async function assertNoHorizontalOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    bodyClientWidth: document.body.clientWidth,
    overflowing: [...document.querySelectorAll('body *')].filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.right > document.documentElement.clientWidth + 1;
    }).slice(0, 15).map((element) => ({
      tag: element.tagName,
      className: element.className,
      width: Math.round(element.getBoundingClientRect().width)
    }))
  }));

  assert.ok(
    metrics.scrollWidth <= metrics.clientWidth + 1 && metrics.bodyScrollWidth <= metrics.bodyClientWidth + 1,
    `${label} overflowed horizontally: ${JSON.stringify(metrics)}`
  );
}
