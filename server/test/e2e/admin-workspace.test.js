const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { chromium } = require('playwright');

test('admin navigation keeps review drafts, updates pending reports and fits mobile', { skip: process.env.RUN_PLAYWRIGHT_E2E !== '1' }, async () => {
  const app = express();
  app.use(express.static(require('path').resolve(__dirname, '../../../client/dist')));
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = []; const mutations = [];
    let failUsage = false;
    let reports = [{ id: 'r1', kind: 'music', title: 'Música exemplo', artist: 'Artista', video_id: 'abcdefghijk', reason: 'wrong_text', detail: 'Texto incompleto', lang: 'english', content_key: 'test' }];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      const req = route.request(); const url = new URL(req.url()); let json = {};
      if (url.pathname === '/api/auth/session') json = { userId: 'admin-test' };
      else if (url.pathname === '/api/profile') json = { user: { id: 'admin-test', role: 'admin', name: 'Admin', email: 'admin@example.com', xp: 0, level: 1, english_level: 'A1', placement_completed: 1, achievements: [], favorites: [] } };
      else if (url.pathname === '/api/activities') json = { activities: [] };
      else if (url.pathname.startsWith('/api/activities/')) json = { revision: 1 };
      else if (url.pathname === '/api/admin/summary') json = { stats: { totalUsers: 12, verifiedUsers: 10, googleUsers: 5, passwordUsers: 7 }, recentUsers: [{ id: 'u1', name: 'Ana', email: 'ana@example.com', xp: 50, level: 2, english_level: 'A2', placement_completed: 1 }], topUsers: [] };
      else if (url.pathname === '/api/admin/product-usage') {
        if (failUsage) return route.fulfill({ status: 503, json: { error: 'unavailable' } });
        json = { activeToday: 3, active28Days: 8, retention: [{ day: 7, returned: 2, eligible: 4 }], features: [{ feature: 'lessons', users: 5, activeDays: 12 }] };
      } else if (url.pathname === '/api/admin/curation') {
        if (req.method() === 'PUT') { mutations.push(req.postDataJSON()); reports = []; }
        else json = { reports };
      } else if (url.pathname === '/api/curation') json = { items: [] };
      await route.fulfill({ json });
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByRole('button', { name: 'Admin', exact: true }).click();
    const nav = page.getByRole('navigation', { name: 'Seções do Admin' });
    await page.locator('.admin-metrics').getByText('50%', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Aprovar conteúdo' }).count(), 0);
    await page.getByRole('button', { name: 'Revisar conteúdos', exact: true }).click();
    await page.getByRole('button', { name: 'Revisar este conteúdo' }).click();
    assert.equal(await page.getByLabel('Título da música', { exact: true }).inputValue(), 'Música exemplo');
    await page.getByRole('textbox', { name: 'Observações', exact: true }).fill('Conferido durante a revisão');
    await nav.getByRole('button', { name: 'Alunos', exact: true }).click();
    await page.locator('#admin-students').getByText('Ana', { exact: true }).click();
    await page.locator('#admin-students').getByText('an***@example.com', { exact: true }).waitFor();
    await nav.getByRole('button', { name: 'Conteúdos', exact: true }).click();
    assert.equal(await page.getByRole('textbox', { name: 'Observações', exact: true }).inputValue(), 'Conferido durante a revisão');
    await page.getByLabel('Assisti ao vídeo', { exact: false }).check();
    await page.getByLabel('Conferi a correspondência', { exact: false }).check();
    await page.getByRole('combobox', { name: 'Tradução em português', exact: true }).selectOption('available');
    await page.getByRole('button', { name: 'Aprovar conteúdo', exact: true }).click();
    await page.getByText('Conteúdo verificado. Sugestões atualizadas.', { exact: true }).waitFor();
    await nav.getByRole('button', { name: 'Visão geral', exact: true }).click();
    await page.getByText('Nenhuma denúncia pendente.', { exact: true }).waitFor();
    assert.equal(mutations.length, 1); assert.equal(mutations[0].notes, 'Conferido durante a revisão');
    await page.locator('.admin-workspace').screenshot({ path: '/tmp/admin-desktop.png' });
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      for (const label of ['Visão geral', 'Alunos', 'Conteúdos', 'Uso e retorno']) {
        await nav.getByRole('button', { name: label, exact: true }).click();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}: ${label}`);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await nav.getByRole('button', { name: 'Visão geral', exact: true }).click();
    await page.locator('.admin-workspace').screenshot({ path: '/tmp/admin-mobile.png' });
    const usageButton = nav.getByRole('button', { name: 'Uso e retorno', exact: true });
    await usageButton.focus(); await page.keyboard.press('Enter');
    await page.getByRole('heading', { name: 'Abas acessadas · últimos 28 dias' }).waitFor();
    failUsage = true;
    await page.getByRole('button', { name: 'Atualizar painel', exact: true }).click();
    await page.getByText('Não foi possível atualizar os indicadores de uso. Tente novamente.', { exact: true }).waitFor();
    await nav.getByRole('button', { name: 'Visão geral', exact: true }).click();
    assert.equal(await page.locator('.admin-metrics article').first().locator('span').innerText(), '12');
    assert.deepEqual(errors, []);
  } finally { await browser?.close(); server.close(); }
});
