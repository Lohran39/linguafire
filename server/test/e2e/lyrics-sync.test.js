const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { chromium } = require('playwright');

test('lyrics adjustment waits for vocals, saves per video and resumes on another device', { skip: process.env.RUN_PLAYWRIGHT_E2E !== '1' }, async () => {
  const { SONGS } = await import('../../../client/src/data/music.ts');
  const song = { ...SONGS[0], tags: ['custom'], lyricsVersion: 2, lyrics: [
    { en: 'First synthetic phrase', pt: 'Primeira frase', time: 10 },
    { en: 'Second synthetic phrase', pt: 'Segunda frase', time: 20 }
  ] };
  const entries = {
    navigation: { activity: 'navigation', revision: 1, state: { version: 1, activeTab: 'music' } },
    music: { activity: 'music', revision: 1, state: { version: 1, activeSong: song } }
  };
  const app = express(); app.use(express.static(require('path').resolve(__dirname, '../../../client/dist')));
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    async function device() {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await context.addInitScript(() => {
        window.__musicTime = 0;
        window.YT = { Player: class {
          constructor(_target, options) { setTimeout(() => options.events.onReady({ target: { getCurrentTime: () => { window.__lastTimeRead = window.__musicTime; return window.__musicTime; } } }), 0); }
          destroy() {}
        } };
      });
      await context.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname; let json = {};
        if (path === '/api/auth/session') json = { userId: 'sync-test' };
        else if (path === '/api/profile') json = { user: { id: 'sync-test', name: 'Aluno', english_level: 'A1', placement_completed: 1, level: 1, xp: 0, favorites: [], achievements: [] } };
        else if (path === '/api/activities') json = { activities: Object.values(entries) };
        else if (path.startsWith('/api/activities/')) {
          const activity = path.split('/').at(-1); const body = route.request().postDataJSON();
          entries[activity] = { activity, state: body.state, revision: body.revision + 1 };
          json = { revision: body.revision + 1 };
        } else if (path === '/api/curation') json = { items: [] };
        await route.fulfill({ json });
      });
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      await page.locator('.lyrics-sync-controls summary').waitFor();
      return page;
    }
    const phone = await device();
    const pause = phone.locator('.lyrics-sync-controls').getByRole('button', { name: 'Pausar legenda', exact: true });
    assert.equal(await pause.isVisible(), false);
    await phone.getByText('Aguardando início do canto.', { exact: true }).waitFor();
    assert.equal(await phone.locator('.karaoke-panel').count(), 0);
    await phone.evaluate(() => { window.__musicTime = 30; });
    await phone.locator('.karaoke-panel strong').filter({ hasText: 'Second synthetic phrase' }).waitFor();
    await phone.locator('.lyrics-sync-controls summary').click();
    assert.equal(await pause.isVisible(), true);
    await phone.getByRole('button', { name: 'A primeira frase começa agora', exact: true }).click();
    await phone.getByText('Legenda 20 s mais tarde.', { exact: true }).waitFor();
    await phone.locator('.karaoke-panel strong').filter({ hasText: 'First synthetic phrase' }).waitFor();
    await phone.getByRole('button', { name: 'Atrasar 0,5 s', exact: true }).click();
    await phone.getByText('Aguardando início do canto.', { exact: true }).waitFor();
    await phone.getByRole('button', { name: 'Adiantar 0,5 s', exact: true }).click();
    await phone.locator('.karaoke-panel strong').filter({ hasText: 'First synthetic phrase' }).waitFor();
    await phone.getByRole('button', { name: 'Pausar legenda', exact: true }).click();
    assert.equal(await phone.getByRole('button', { name: 'Retomar legenda', exact: true }).getAttribute('aria-pressed'), 'true');
    await phone.evaluate(() => { window.__musicTime = 50; });
    await phone.waitForFunction(() => window.__lastTimeRead === 50);
    assert.equal(await phone.locator('.karaoke-panel strong').textContent(), 'First synthetic phrase');
    assert.match(await phone.locator('.lyric-card.active').textContent(), /First synthetic phrase/);
    await phone.getByRole('button', { name: 'Retomar legenda', exact: true }).click();
    await phone.getByText('Legenda 40 s mais tarde.', { exact: true }).waitFor();
    assert.equal(await phone.locator('.karaoke-panel strong').textContent(), 'First synthetic phrase');
    await phone.evaluate(() => { window.__musicTime = 60; });
    await phone.locator('.karaoke-panel strong').filter({ hasText: 'Second synthetic phrase' }).waitFor();
    await phone.getByRole('button', { name: 'Pausar legenda', exact: true }).click();
    await phone.getByRole('button', { name: 'Restaurar', exact: true }).click();
    assert.equal(await phone.getByRole('button', { name: 'Pausar legenda', exact: true }).getAttribute('aria-pressed'), 'false');
    await phone.evaluate(() => { window.__musicTime = 30; });
    await phone.waitForFunction(() => window.__lastTimeRead === 30);
    await phone.getByRole('button', { name: 'A primeira frase começa agora', exact: true }).click();
    await phone.waitForFunction(() => Object.keys(JSON.parse(localStorage.getItem('linguafire-drafts-v1:sync-test') || '{}')).length === 0);
    assert.equal(entries.music.state.lyricOffsets[song.ytId], 20);
    const desktop = await device();
    await desktop.locator('.lyrics-sync-controls summary').click();
    await desktop.getByText('Legenda 20 s mais tarde.', { exact: true }).waitFor();
    assert.equal(await desktop.getByRole('button', { name: 'Pausar legenda', exact: true }).getAttribute('aria-pressed'), 'false');
    for (const width of [320, 390, 768]) {
      await desktop.setViewportSize({ width, height: 844 });
      assert.ok(await desktop.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await desktop.getByRole('button', { name: 'Restaurar', exact: true }).click();
    await desktop.getByText('Sem ajuste.', { exact: true }).waitFor();
    await desktop.waitForFunction(() => Object.keys(JSON.parse(localStorage.getItem('linguafire-drafts-v1:sync-test') || '{}')).length === 0);
    entries.music.state.lyricOffsets[song.ytId] = 20;
    entries.music.state.activeSong = { ...song, ytId: 'abcdefghijk' };
    const alternate = await device();
    await alternate.locator('.lyrics-sync-controls summary').click();
    await alternate.getByText('Sem ajuste.', { exact: true }).waitFor();
    await alternate.getByRole('button', { name: 'Pausar legenda', exact: true }).click();
    const search = alternate.getByPlaceholder('Ex: stay, adele ou link do YouTube');
    await search.fill('Stay'); await search.press('Enter');
    await alternate.getByRole('heading', { name: 'Stay', exact: true }).waitFor();
    assert.equal(await alternate.getByRole('button', { name: 'Retomar legenda', exact: true }).count(), 0);
    await alternate.screenshot({ path: '/tmp/linguafire-lyrics-sync-mobile.png', fullPage: true });
  } finally { await browser?.close(); server.close(); }
});
