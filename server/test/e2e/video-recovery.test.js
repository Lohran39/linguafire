const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { chromium } = require('playwright');

test('mobile player recovers a destroyed iframe and keeps plain playback when timing API is blocked', { skip: process.env.RUN_PLAYWRIGHT_E2E !== '1' }, async () => {
  const { SONGS } = await import('../../../client/src/data/music.ts');
  const song = { ...SONGS[0], tags: ['custom'], videoCandidates: [], lyricsVersion: 2,
    lyrics: [{ en: 'Synthetic phrase', pt: 'Frase sintética', time: 0 }] };
  const app = express(); app.use(express.static(require('path').resolve(__dirname, '../../../client/dist')));
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    async function device(withApi) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      if (withApi) await context.addInitScript(() => {
        window.__time = 0; window.__players = 0;
        window.YT = { Player: class {
          constructor(frame, options) {
            this.frame = frame; window.__players++; window.__events = options.events;
            setTimeout(() => options.events.onReady({ target: { getCurrentTime: () => window.__time } }), 0);
          }
          destroy() { this.frame.remove(); }
        } };
      });
      await context.route('https://www.youtube.com/iframe_api', route => route.abort());
      await context.route(/https:\/\/www\.youtube(?:-nocookie)?\.com\/embed\//, route => route.fulfill({ contentType: 'text/html', body: '<button onclick="this.textContent=\'Playing\'">Play</button>' }));
      await context.route('**/api/**', route => {
        const path = new URL(route.request().url()).pathname;
        const data = path === '/api/auth/session' ? { userId: 'test' }
          : path === '/api/profile' ? { user: { id: 'test', name: 'Aluno', english_level: 'A1', favorites: [], achievements: [] } }
          : path === '/api/activities' ? { activities: [
            { activity: 'navigation', revision: 1, state: { version: 1, activeTab: 'music' } },
            { activity: 'music', revision: 1, state: { version: 1, activeSong: song } }
          ] } : path === '/api/curation' ? { items: [] } : { revision: 2 };
        return route.fulfill({ json: data });
      });
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      await page.locator('.youtube-player').waitFor();
      return page;
    }
    const page = await device(true);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.waitForFunction(() => window.__events);
    await page.evaluate(() => { window.__events.onError({ data: 153 }); });
    await page.getByRole('button', { name: 'Tentar carregar aqui' }).click();
    await page.waitForFunction(() => window.__players >= 2);
    assert.equal(await page.locator('.youtube-player').count(), 1);
    assert.ok(await page.locator('.youtube-player').evaluate(frame => frame.isConnected));
    assert.match(await page.locator('.youtube-player').getAttribute('src'), /youtube-nocookie/);
    assert.deepEqual(errors, []);
    const blocked = await device(false);
    await blocked.getByText(/O destaque automático da letra está indisponível/).waitFor();
    await blocked.frameLocator('.youtube-player').getByRole('button', { name: 'Play' }).click();
    await blocked.frameLocator('.youtube-player').getByRole('button', { name: 'Playing' }).waitFor();
    assert.equal(await blocked.locator('.video-fallback').count(), 0);
    assert.ok(await blocked.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await blocked.screenshot({ path: '/tmp/linguafire-video-recovery-mobile.png', fullPage: true });
  } finally { await browser?.close(); server.closeAllConnections(); server.close(); }
});
