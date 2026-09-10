const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const express = require('express');
const { chromium } = require('playwright');

const enabled = process.env.RUN_PLAYWRIGHT_E2E === '1';
test('activities resume across isolated devices; mobile navigation and keyboard remain usable', { skip: !enabled }, async () => {
  const app = express();
  app.use(express.static(path.resolve(__dirname, '../../../client/dist')));
  const server = await new Promise(resolve => { const value = app.listen(0, '127.0.0.1', () => resolve(value)); });
  const browser = await chromium.launch({ headless: true });
  const entries = {};
  let offlineSave = false;
  const user = { id: 'resume-user', name: 'Aluno', email: 'test@example.com', level: 1, xp: 0, streak: 0,
    correct_answers: 0, lessons_completed: 0, english_level: 'A1', placement_completed: 1, achievements: [], favorites: [] };
  async function device(viewport) {
    const context = await browser.newContext({ viewport });
    await context.addInitScript(() => {
      window.YT = { Player: class {
        constructor(_target, options) {
          window.__playerOptions = options;
          window.__playerHost = options.host;
          window.__playerStart = options.playerVars.start;
          setTimeout(() => window.__failPlayer
            ? options.events.onError({ data: 153 })
            : options.events.onReady({ target: { getCurrentTime: () => options.playerVars.start || 12 } }), 0);
        }
        destroy() {}
      } };
    });
    await context.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      let payload = {};
      if (url.pathname === '/api/activities') payload = { activities: Object.values(entries) };
      else if (url.pathname.startsWith('/api/activities/')) {
        if (offlineSave) return route.fulfill({ status: 503, json: {} });
        const activity = url.pathname.split('/').at(-1);
        const body = route.request().postDataJSON();
        if ((entries[activity]?.revision || 0) !== body.revision) return route.fulfill({ status: 409, json: {} });
        entries[activity] = { activity, state: body.state, revision: body.revision + 1 };
        payload = { revision: body.revision + 1 };
      } else if (url.pathname === '/api/auth/session') payload = { userId: user.id };
      else if (url.pathname === '/api/profile') payload = { user };
      else if (url.pathname === '/api/conversation/topics') payload = { topics: [{ id: 'restaurant', name: 'Restaurante' }] };
      else if (url.pathname === '/api/flashcards/available') payload = { cards: [
        { word: 'water', translation: 'água', level: 'A1' }, { word: 'home', translation: 'casa', level: 'A1' }] };
      else if (url.pathname === '/api/flashcards/stats') payload = { due: 2, total: 2 };
      else if (url.pathname === '/api/lyrics/find') payload = { success: true, plainLyrics: 'Hello friend\nGood morning\nI like music\nSee you tomorrow' };
      else if (url.pathname === '/api/translate') payload = { responseStatus: 200, responseData: { translatedText:
        route.request().postDataJSON().q.replaceAll('Hello friend', 'Olá amigo').replaceAll('Good morning', 'Bom dia')
          .replaceAll('I like music', 'Eu gosto de música').replaceAll('See you tomorrow', 'Até amanhã') } };
      else if (url.pathname === '/api/daily/word') payload = { word: 'hello', translation: 'olá', level: 'A1' };
      return route.fulfill({ status: 200, json: payload });
    });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByRole('button', { name: 'Lições', exact: true }).waitFor();
    return page;
  }
  async function synced(page) {
    await page.waitForFunction(() => !document.querySelector('.activity-sync'));
  }
  try {
    const phone = await device({ width: 390, height: 844 });
    assert.ok(await phone.locator('.app-nav button:visible').count() >= 9);
    assert.equal(await phone.getByRole('button', { name: 'Mais', exact: true }).count(), 0);
    await phone.getByRole('button', { name: 'Revisão', exact: true }).click();
    await phone.getByRole('button', { name: 'Começar revisão', exact: true }).click();
    await phone.getByRole('button', { name: 'Revelar resposta', exact: true }).click();
    const flashPrompt = await phone.locator('.flash-card h1').textContent();
    await synced(phone);
    await phone.getByRole('button', { name: 'Lições', exact: true }).click();
    const prompt = await phone.locator('.lesson-question h3').textContent();
    if (await phone.getByRole('textbox', { name: 'Digite a resposta' }).count()) {
      await phone.getByRole('textbox', { name: 'Digite a resposta' }).fill('resposta em andamento');
    } else await phone.locator('.lesson-choices button').first().click();
    await synced(phone);
    const desktop = await device({ width: 1280, height: 900 });
    assert.equal(await desktop.locator('.lesson-question h3').textContent(), prompt);
    if (await desktop.getByRole('textbox', { name: 'Digite a resposta' }).count()) {
      assert.equal(await desktop.getByRole('textbox', { name: 'Digite a resposta' }).inputValue(), 'resposta em andamento');
    } else assert.ok(await desktop.locator('.lesson-feedback').isVisible());
    await desktop.getByRole('button', { name: 'Revisão', exact: true }).click();
    assert.equal(await desktop.locator('.flash-card h1').textContent(), flashPrompt);
    assert.ok(await desktop.locator('.quality-grid').isVisible());
    await desktop.getByRole('button', { name: 'Nível', exact: true }).click();
    await desktop.getByRole('button', { name: 'Começar teste', exact: true }).click();
    await desktop.locator('.placement-choices button').first().click();
    const placementPrompt = await desktop.locator('.placement-layout h1').textContent();
    await synced(desktop);
    await phone.reload();
    await phone.locator('.placement-choices').waitFor();
    assert.equal(await phone.locator('.placement-layout h1').textContent(), placementPrompt);
    assert.ok(await phone.locator('.placement-choices button.selected').isVisible());
    await phone.getByRole('button', { name: 'Próxima pergunta', exact: true }).click();
    await synced(phone);
    await desktop.reload();
    await desktop.locator('.placement-count').waitFor();
    assert.match(await desktop.locator('.placement-count').textContent(), /2\//);
    await desktop.getByRole('button', { name: 'Nativos', exact: true }).click();
    await desktop.locator('#native-answer').fill('I would like a coffee, please.');
    await synced(desktop);
    await phone.reload();
    await phone.locator('#native-answer').waitFor();
    assert.equal(await phone.locator('#native-answer').inputValue(), 'I would like a coffee, please.');
    await desktop.getByRole('button', { name: /^M[uú]sica$/, exact: true }).click();
    await desktop.getByRole('button', { name: 'Quiz', exact: true }).click();
    await desktop.locator('.quiz-choices button').first().click();
    const quizPrompt = await desktop.locator('.quiz-prompt').textContent();
    await synced(desktop);
    await phone.reload();
    await phone.getByRole('dialog', { name: 'Quiz de música' }).waitFor();
    assert.equal(await phone.locator('.quiz-prompt').textContent(), quizPrompt);
    assert.ok(await phone.locator('.quiz-choices button.selected').isVisible());
    await phone.waitForFunction(() => window.__playerStart === 12);
    await phone.keyboard.press('Shift+Tab');
    assert.equal(await phone.evaluate(() => document.activeElement?.textContent), 'Sair do quiz');
    await phone.keyboard.press('Escape');
    await phone.evaluate(() => { window.__failPlayer = true; window.__playerOptions.events.onError({ data: 153 }); });
    const retry = phone.getByRole('button', { name: 'Tentar carregar aqui' });
    await retry.waitFor();
    assert.ok(await phone.locator('.video-fallback').evaluate(element => element.scrollHeight <= element.clientHeight));
    await phone.evaluate(() => { window.__failPlayer = false; });
    await retry.click();
    await phone.waitForFunction(() => window.__playerHost === 'https://www.youtube-nocookie.com');
    await phone.locator('.video-fallback').waitFor({ state: 'detached' });
    await synced(phone);
    await desktop.reload();
    await desktop.getByRole('button', { name: 'Conversar', exact: true }).waitFor();
    await desktop.keyboard.press('Escape');
    await desktop.getByRole('button', { name: 'Conversar', exact: true }).click();
    await desktop.getByRole('button', { name: /Restaurante/ }).click();
    const input = desktop.locator('.conversation-room input, .conversation-room textarea').first();
    await input.fill('Can I have some water');
    await synced(desktop);
    await phone.reload();
    await phone.locator('.conversation-room').waitFor();
    assert.equal(await phone.locator('.conversation-room input, .conversation-room textarea').first().inputValue(), 'Can I have some water');
    await phone.getByRole('button', { name: 'Nível', exact: true }).focus();
    assert.equal(await phone.evaluate(() => document.activeElement?.textContent), 'Nível');
    assert.ok(await phone.locator('.app-nav').evaluate(nav => nav.scrollLeft > 0));
    await phone.keyboard.press('Tab');
    assert.notEqual(await phone.evaluate(() => getComputedStyle(document.activeElement).outlineStyle), 'none');
    for (const width of [320, 390, 768]) {
      await phone.setViewportSize({ width, height: 844 });
      assert.ok(await phone.locator('.app-nav').evaluate(nav => nav.scrollWidth > nav.clientWidth), `scrollable menu at ${width}`);
      assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `overflow at ${width}`);
    }
    await phone.setViewportSize({ width: 390, height: 844 });
    await phone.screenshot({ path: '/tmp/linguafire-mobile-resume.png', fullPage: true });
    offlineSave = true;
    await phone.locator('.conversation-room input, .conversation-room textarea').first().fill('Rascunho offline');
    await phone.getByText('Sem sincronização.', { exact: false }).waitFor();
    await phone.reload();
    await phone.locator('.conversation-room').waitFor();
    assert.equal(await phone.locator('.conversation-room input, .conversation-room textarea').first().inputValue(), 'Rascunho offline');
    await phone.getByText('Sem sincronização.', { exact: false }).waitFor();
    offlineSave = false;
    await phone.getByRole('button', { name: 'Tentar novamente' }).click();
    await synced(phone);
    assert.equal(entries.conversation.state.input, 'Rascunho offline');
    // The old desktop session cannot overwrite the newer phone draft.
    await input.fill('Versão desatualizada');
    await desktop.getByText('Outra sessão alterou esta atividade.', { exact: false }).waitFor();
    assert.equal(entries.conversation.state.input, 'Rascunho offline');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
