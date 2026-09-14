const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const express = require('express');
const { chromium } = require('playwright');
const { buildLearningSummary } = require('../../services/learning-summary');

test('learning evidence, verified recommendations and moderation work on mobile', { skip: process.env.RUN_PLAYWRIGHT_E2E !== '1' }, async () => {
  const app = express(); app.use(express.static(path.resolve(__dirname, '../../../client/dist')));
  const server = await new Promise(resolve => { const value = app.listen(0, '127.0.0.1', () => resolve(value)); });
  const browser = await chromium.launch({ headless: true });
  const user = { id: 'learner', name: 'Ana', role: 'admin', email: 'test@example.com', level: 9, xp: 2100, streak: 3, correct_answers: 12, lessons_completed: 2, english_level: 'A1', placement_completed: 1, achievements: [], favorites: [] };
  let reports = [], reportFails = true, review = null;
  const events = [], drafts = {};
  const music = { kind: 'music', title: 'Hello', artist: 'Adele', lang: 'english', video_id: 'YQHsXMglC9A', content_key: 'hello|adele', status: 'verified', video_matches: true, text_matches: true, translation: 'available', updated_at: new Date().toISOString(), reports: 0 };
  const native = { ...music, kind: 'native', title: 'look forward to', artist: '', content_key: 'look forward to|english', video_id: 'native12345', translation: 'missing' };
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { window.YT = { Player: class { constructor(_target, options) { setTimeout(() => options.events.onReady({ target: { getCurrentTime: () => 0 } }), 0); } destroy() {} } }; });
  await page.route('**/api/**', async route => {
    const req = route.request(), url = new URL(req.url()); let payload = {};
    if (url.pathname === '/api/auth/session') payload = { userId: user.id };
    else if (url.pathname === '/api/profile') payload = { user };
    else if (url.pathname === '/api/activities') payload = { activities: Object.values(drafts) };
    else if (url.pathname.startsWith('/api/activities/')) {
      const body = req.postDataJSON(), activity = url.pathname.split('/').at(-1);
      drafts[activity] = { activity, state: body.state, revision: body.revision + 1 }; payload = { revision: body.revision + 1 };
    } else if (url.pathname === '/api/learning/summary') payload = buildLearningSummary(
      [{ word: 'water', translation: 'água', repetitions: 3, interval_days: 15 }],
      [{ error_type: 'Articles', user_sentence: 'a apple', correct_form: 'an apple' }, { error_type: 'Articles', user_sentence: 'a orange', correct_form: 'an orange' }], events.map(event => ({ activity: event.activity, score: event.score, occurred_at: event.occurredAt }))
    );
    else if (url.pathname === '/api/learning/events') { events.push(req.postDataJSON()); payload = { success: true }; }
    else if (url.pathname === '/api/curation') payload = { items: url.searchParams.get('kind') === 'music' ? [music] : [native] };
    else if (url.pathname === '/api/curation/reports') {
      if (reportFails) return route.fulfill({ status: 503, json: { error: 'A denúncia não foi enviada. Tente novamente.' } });
      const body = req.postDataJSON(); reports = [{ ...music, id: 'report-1', video_id: body.videoId, reason: body.reason, detail: body.detail, created_at: new Date().toISOString() }]; payload = { success: true };
    } else if (url.pathname === '/api/admin/curation') {
      if (req.method() === 'PUT') { review = req.postDataJSON(); reports = []; payload = { success: true }; }
      else payload = { reports };
    } else if (url.pathname === '/api/admin/summary') payload = { stats: { totalUsers: 1, verifiedUsers: 1, googleUsers: 0, passwordUsers: 1 }, topUsers: [], recentUsers: [] };
    else if (url.pathname === '/api/admin/product-usage') payload = { activeToday: 0, active28Days: 0, retention: [], features: [] };
    else if (url.pathname === '/api/natives/search') payload = { videoIds: ['native12345'], verifiedVideoIds: ['native12345'] };
    else if (url.pathname === '/api/daily/word') payload = { word: 'hello', translation: 'olá', level: 'A1' };
    else if (url.pathname === '/api/lyrics/find') payload = { success: true, plainLyrics: 'Hello friend\nGood morning\nI like music\nSee you tomorrow' };
    else if (url.pathname === '/api/translate') payload = { responseStatus: 200, responseData: { translatedText: req.postDataJSON().q.replaceAll('Hello friend', 'Olá amigo').replaceAll('Good morning', 'Bom dia').replaceAll('I like music', 'Eu gosto de música').replaceAll('See you tomorrow', 'Até amanhã') } };
    await route.fulfill({ json: payload });
  });
  async function tab(name) {
    await page.getByRole('button', { name, exact: true }).click();
  }
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByRole('heading', { name: 'Seu aprendizado', exact: true }).waitFor();
    await page.getByText('palavras consolidadas de 1 revisadas', { exact: true }).waitFor();
    await page.locator('.home-extras > summary').click();
    assert.ok(await page.getByText('Nível de jogo 9', { exact: false }).isVisible());
    assert.ok(await page.locator('.welcome-panel .lead').filter({ hasText: 'Inglês A1' }).isVisible());
    assert.equal(await page.locator('.skill-evidence-grid article').count(), 0);
    await page.getByText('Complete uma lição ou revisão para acompanhar sua evolução.', { exact: true }).waitFor();
    await page.locator('.learning-evidence').screenshot({ path: '/tmp/linguafire-learning-panel.png' });
    await tab('Lições');
    if (await page.getByLabel('Digite a resposta', { exact: true }).count()) {
      await page.getByLabel('Digite a resposta', { exact: true }).fill('test'); await page.getByRole('button', { name: 'Conferir', exact: true }).click();
    } else await page.locator('.lesson-choices button').first().click();
    await page.getByRole('button', { name: 'Próxima', exact: true }).click();
    await tab('Início');
    await page.getByText('1 respostas', { exact: true }).waitFor();
    assert.equal(events[0].activity, 'lesson'); assert.equal(events[0].text, undefined);
    await tab('Música');
    await page.locator('.song-list .song-row').first().getByText('Hello', { exact: true }).waitFor();
    await page.locator('.song-list .song-row').first().click();
    await page.getByText('Conteúdo verificado', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Informar problema', exact: true }).click();
    await page.getByLabel('Qual é o problema?').selectOption('wrong_text');
    await page.getByLabel('Detalhes (opcional)').fill('A letra é de outra versão.');
    await page.getByRole('button', { name: 'Enviar denúncia', exact: true }).click();
    await page.getByText('A denúncia não foi enviada. Tente novamente.', { exact: true }).waitFor();
    reportFails = false;
    await page.getByRole('button', { name: 'Enviar denúncia', exact: true }).click();
    await page.getByText('Denúncia enviada para revisão. Obrigado por ajudar.', { exact: true }).waitFor();
    await page.getByText('Em revisão', { exact: true }).waitFor();
    await tab('Admin');
    await page.getByRole('button', { name: 'Conteúdos', exact: true }).click();
    await page.getByRole('button', { name: 'Revisar este conteúdo', exact: true }).click();
    assert.ok(await page.getByRole('button', { name: 'Aprovar conteúdo', exact: true }).isDisabled());
    await page.getByLabel('Assisti ao vídeo e confirmei a música ou expressão.').check();
    await page.getByLabel('Conferi a correspondência com a letra ou expressão exibida na atividade.').check();
    await page.getByLabel('Tradução em português').selectOption('available');
    await page.getByRole('button', { name: 'Aprovar conteúdo', exact: true }).click();
    await page.getByText('Conteúdo verificado. Sugestões atualizadas.', { exact: true }).waitFor();
    assert.equal(review.status, 'verified'); assert.equal(review.textMatches, true);
    await page.locator('.curator-panel').screenshot({ path: '/tmp/linguafire-curator-panel.png' });
    await tab('Nativos');
    await page.locator('#nativesInput').fill('look forward to');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await page.getByText('Detalhes e opções do vídeo', { exact: true }).click();
    await page.getByText('Tradução ausente', { exact: true }).waitFor();
    assert.ok(await page.getByText('Conteúdo verificado', { exact: true }).isVisible());
    await page.screenshot({ path: '/tmp/linguafire-curation-native.png', fullPage: true });
    const overflow = await page.evaluate(() => [...document.querySelectorAll('body *')].map(element => ({ tag: element.tagName, cls: element.className, width: element.getBoundingClientRect().width, right: element.getBoundingClientRect().right })).filter(item => item.right > window.innerWidth + 1));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), JSON.stringify(overflow.slice(0, 15)));
    assert.deepEqual(errors, []);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
});
