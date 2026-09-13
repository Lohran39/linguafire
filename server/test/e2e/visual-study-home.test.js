const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { chromium } = require('playwright');

test('study home prioritizes continuation and keeps illustrated mobile navigation', { skip: process.env.RUN_PLAYWRIGHT_E2E !== '1' }, async () => {
  const app = express(); app.use(express.static(require('path').resolve(__dirname, '../../../client/dist')));
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    let assessed = 1;
    const entries = { navigation: { activity: 'navigation', revision: 1, state: { version: 1, activeTab: 'home', lastStudyTab: 'conversation' } } };
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname; let json = {};
      if (path === '/api/auth/session') json = { userId: 'design-test' };
      else if (path === '/api/profile') json = { user: { id: 'design-test', name: 'Ana', english_level: 'A2', placement_completed: assessed, level: 2, xp: 260, streak: 3, correct_answers: 18, favorites: [], achievements: [] } };
      else if (path === '/api/activities') json = { activities: Object.values(entries) };
      else if (path.startsWith('/api/activities/')) {
        const activity = path.split('/').at(-1); const body = route.request().postDataJSON();
        entries[activity] = { activity, state: body.state, revision: body.revision + 1 }; json = { revision: body.revision + 1 };
      } else if (path === '/api/conversation/topics') json = { topics: [{ id: 'restaurant', name: '🍽️ Restaurante' }, { id: 'airport', name: '✈️ Aeroporto' }] };
      else if (path === '/api/curation') json = { items: [] };
      else if (path === '/api/daily/word') json = { word: 'journey', translation: 'jornada', level: 'A2' };
      else if (path === '/api/learning/summary') json = { consolidatedWords: 8, reviewedWords: 20, words: [], recurringErrors: [], skills: [{ activity: 'lesson', label: 'Lições', attempts: 18, previousAttempts: 0, score: 80, change: null }] };
      else if (path === '/api/leaderboard') json = { leaderboard: [{ id: 'design-test', name: 'Ana', xp: 260 }] };
      else if (path === '/api/rank') json = { rank: 1 };
      await route.fulfill({ json });
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const resume = page.getByRole('button', { name: 'Continuar: Conversa', exact: true });
    await resume.waitFor();
    assert.ok(await page.locator('.app-screen').evaluate(node => getComputedStyle(node).backgroundImage.includes('app-global-pathways')));
    assert.equal(await page.locator('.home-extras').getAttribute('open'), null);
    await page.screenshot({ path: '/tmp/linguafire-home-refresh-desktop.png', fullPage: true });
    await resume.click();
    await page.locator('.topic-card .study-artwork').first().waitFor();
    await page.screenshot({ path: '/tmp/linguafire-conversation-refresh.png', fullPage: true });
    await page.getByRole('button', { name: 'Música', exact: true }).click();
    await page.locator('.song-artwork img').first().waitFor();
    await page.screenshot({ path: '/tmp/linguafire-music-refresh.png', fullPage: true });
    await page.getByRole('button', { name: 'Início', exact: true }).click();
    await page.getByRole('button', { name: 'Continuar: Música', exact: true }).waitFor();
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `home overflow ${width}`);
      assert.ok(await page.locator('.app-nav').evaluate(node => node.scrollWidth > node.clientWidth));
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: '/tmp/linguafire-home-refresh-mobile.png', fullPage: true });
    await page.waitForFunction(() => Object.keys(JSON.parse(localStorage.getItem('linguafire-drafts-v1:design-test') || '{}')).length === 0);
    await page.reload();
    await page.getByRole('button', { name: 'Continuar: Música', exact: true }).waitFor();
    assessed = 0;
    await page.reload();
    await page.getByRole('button', { name: 'Descobrir meu nível', exact: true }).click();
    await page.getByRole('button', { name: 'Começar teste', exact: true }).waitFor();
    assert.deepEqual(errors, []);
  } finally { await browser?.close(); server.close(); }
});
