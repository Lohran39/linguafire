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

  await page.route('**/api/translate**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ responseData: { translatedText: 'tradução de teste' } })
  }));

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
      plan: user.subscription_active ? 'monthly' : null,
      price: 15
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
        subscription: { active: true, expires, plan: 'monthly', price: 15 }
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
    await page.getByRole('heading', { name: /Ola, E2E User/ }).waitFor({ timeout: 5000 });
    await page.getByRole('button', { name: 'Semanais' }).click();
    await page.getByText('Acumule 500 XP').waitFor({ timeout: 3000 });

    await page.getByRole('button', { name: 'Musica' }).click();
    await page.getByRole('heading', { name: 'Blinding Lights' }).waitFor({ timeout: 3000 });
    await page.getByPlaceholder('Ex: stay, adele ou link do YouTube').fill('hello');
    await page.getByRole('button', { name: 'Buscar' }).click();
    await page.getByRole('heading', { name: 'Hello' }).waitFor({ timeout: 3000 });
    await page.getByText('Letra carregada com 4 linhas.').waitFor({ timeout: 5000 });
    await page.getByRole('button', { name: 'Quiz' }).click();
    await page.locator('.quiz-modal').waitFor({ timeout: 3000 });
    await page.locator('.quiz-choices button').first().click();
    await page.getByRole('button', { name: 'Proxima' }).click();
    await page.getByRole('button', { name: 'Sair do quiz' }).click();

    await page.getByRole('button', { name: 'Licoes' }).click();
    await page.getByRole('heading', { name: 'Licoes rapidas para ganhar XP' }).waitFor({ timeout: 3000 });
    await page.getByRole('button', { name: 'I need water', exact: true }).click();
    await page.getByRole('button', { name: 'Proxima' }).click();
    await page.getByRole('button', { name: 'is', exact: true }).click();
    await page.getByRole('button', { name: 'Proxima' }).click();
    await page.getByRole('button', { name: 'Quanto custa?', exact: true }).click();
    await page.getByRole('button', { name: 'Proxima' }).click();
    await page.getByRole('button', { name: 'Do you like coffee?', exact: true }).click();
    await page.getByRole('button', { name: 'Ver resultado' }).click();
    await page.getByRole('button', { name: 'Salvar progresso' }).click();
    await page.getByText('Progresso salvo.').waitFor({ timeout: 5000 });

    await page.getByRole('button', { name: 'Flash' }).click();
    await page.getByRole('button', { name: 'Comecar revisao' }).click();
    await page.getByRole('heading', { name: 'serendipity' }).waitFor({ timeout: 3000 });
    await page.getByRole('button', { name: 'Revelar resposta' }).click();
    await page.getByText('feliz acaso').waitFor({ timeout: 3000 });
    await page.getByRole('button', { name: /Bom/ }).click();
    await page.getByText('Sessao concluida').waitFor({ timeout: 5000 });

    await page.getByRole('button', { name: 'Loja' }).click();
    await page.getByRole('heading', { name: 'Use XP para acelerar o estudo' }).waitFor({ timeout: 3000 });
    await page.getByRole('button', { name: 'Comprar' }).first().click();
    await page.getByText('Dica comprada!').waitFor({ timeout: 5000 });

    await page.getByRole('button', { name: 'Conversar' }).click();
    await page.getByRole('heading', { name: 'Pratique ingles em cenarios reais' }).waitFor({ timeout: 3000 });
    await page.getByRole('button', { name: /Restaurant/ }).click();
    await page.getByPlaceholder('Type your answer in English...').fill('I would like a table, please.');
    await page.getByRole('button', { name: 'Enviar' }).click();
    await page.getByText('Sure. A table for how many people?').waitFor({ timeout: 5000 });
    await page.getByRole('button', { name: 'Fechar e analisar' }).click();

    await page.getByRole('button', { name: 'Nativos' }).click();
    await page.getByRole('heading', { name: 'Veja expressoes em contexto real' }).waitFor({ timeout: 3000 });
    await page.getByPlaceholder('Ex: look forward to').fill('me and you');
    await page.getByRole('button', { name: 'Buscar' }).click();
    await page.locator('.natives-result iframe').waitFor({ timeout: 5000 });

    await page.getByRole('button', { name: 'Nível' }).click();
    await page.getByRole('button', { name: 'Começar teste' }).click();
    for (let questionIndex = 0; questionIndex < 15; questionIndex += 1) {
      await page.locator('.placement-choices button').first().click();
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
        await page.getByRole('heading', { name: /Ola, E2E User/ }).waitFor({ timeout: 5000 });
        await assertNoHorizontalOverflow(page, `${viewport.label}: home`);

        for (const tab of ['Licoes', 'Musica', 'Flash', 'Conversar', 'Nativos', 'Loja', 'Nível', 'Perfil']) {
          await page.getByRole('button', { name: tab }).click();
          await page.waitForTimeout(120);
          await assertNoHorizontalOverflow(page, `${viewport.label}: ${tab}`);
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
    await page.getByText('Entrar na sua conta').waitFor({ timeout: 5000 });

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
    bodyClientWidth: document.body.clientWidth
  }));

  assert.ok(
    metrics.scrollWidth <= metrics.clientWidth + 1 && metrics.bodyScrollWidth <= metrics.bodyClientWidth + 1,
    `${label} overflowed horizontally: ${JSON.stringify(metrics)}`
  );
}
