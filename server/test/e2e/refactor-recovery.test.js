const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const path = require('node:path');
const { chromium } = require('playwright');

test('invalid lesson drafts recover and music XP retries survive reload without premature success', { skip: process.env.RUN_PLAYWRIGHT_E2E !== '1' }, async () => {
  const app = express(); app.use(express.static(path.resolve(__dirname, '../../../client/dist')));
  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s)); s.on('error', reject);
  });
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const line = { en: 'Synthetic sentence', pt: 'Frase de teste', time: 0 };
    const song = { key: 'test', title: 'Synthetic track', artist: 'Test', ytId: 'abcdefghijk', level: 'A1', tags: ['custom'], lyricsVersion: 2, lyrics: [line] };
    const lesson = { id: 'test-review', title: 'Revisão', level: 'A1', focus: 'Prática', xp: 20,
      questions: [{ id: 'q', prompt: 'Qual a resposta?', helper: '', explain: '', choices: ['Hello'], answer: 0 }] };
    const entry = (activity, state) => ({ activity, revision: 1, state: { version: 1, ...state } });
    const drafts = {
      navigation: entry('navigation', { activeTab: 'lessons' }),
      lessons: entry('lessons', { activeLesson: lesson, questionIndex: 999999 }),
      music: entry('music', { activeSong: song, quiz: [{ line, choices: [line.pt], correct: line.pt, prompt: 'Traduza' }],
        quizIndex: 1, quizCorrect: 1, quizRewarded: false, learningRun: 'recovery-run' })
    };
    let user = { id: 'recovery-user', name: 'Ana', email: 'test@example.test', xp: 100, correct_answers: 0, level: 1, english_level: 'A1', placement_completed: 1, achievements: [], favorites: [] };
    const requests = [];
    await page.addInitScript(() => { window.YT = { Player: class { constructor(_node, options) { setTimeout(() => options.events.onReady({ target: { getCurrentTime: () => 0 } }), 0); } destroy() {} } }; });
    await page.route('**/api/**', async route => {
      const request = route.request(), pathname = new URL(request.url()).pathname;
      let json = {};
      if (pathname === '/api/auth/session') json = { userId: user.id };
      else if (pathname === '/api/profile') {
        if (request.method() === 'PUT') {
          const body = request.postDataJSON(); requests.push(body);
          if (requests.length <= 2) return route.fulfill({ status: 503, json: { error: 'Falha simulada de salvamento.' } });
          user = { ...user, xp: body.xp, correct_answers: body.correct_answers };
          json = { success: true, updates: { xp: user.xp, level: user.level } };
        } else json = { user };
      } else if (pathname === '/api/activities') json = { activities: Object.values(drafts) };
      else if (pathname.startsWith('/api/activities/')) {
        const activity = pathname.split('/').at(-1), body = request.postDataJSON();
        drafts[activity] = { activity, state: body.state, revision: body.revision + 1 }; json = { revision: body.revision + 1 };
      } else if (pathname === '/api/curation') json = { items: [] };
      else if (pathname === '/api/flashcards/mistakes') json = { cards: [] };
      await route.fulfill({ json });
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.locator('.lesson-question h3').filter({ hasText: 'Qual a resposta?' }).waitFor();
    await page.waitForFunction(() => Object.keys(JSON.parse(localStorage.getItem('linguafire-drafts-v1:recovery-user') || '{}')).length === 0);
    assert.equal(drafts.lessons.state.questionIndex, 0);
    await page.getByRole('button', { name: 'Música', exact: true }).click();
    await page.getByRole('dialog').getByRole('alert').filter({ hasText: 'Falha simulada' }).waitFor();
    assert.equal(await page.getByText(/Você ganhou/).count(), 0);
    await page.waitForFunction(() => Object.keys(JSON.parse(localStorage.getItem('linguafire-drafts-v1:recovery-user') || '{}')).length === 0);
    assert.equal(drafts.music.state.quizRewarded, false);
    await page.reload();
    await page.getByRole('dialog').getByRole('alert').filter({ hasText: 'Falha simulada' }).waitFor();
    await page.getByRole('dialog').getByRole('button', { name: 'Tentar salvar XP', exact: true }).click();
    await page.getByText('Você ganhou 35 XP com este treino musical.', { exact: true }).waitFor();
    assert.equal(requests.length, 3); assert.deepEqual(requests[1], requests[0]); assert.deepEqual(requests[2], requests[0]);
    assert.equal(user.xp, 135); assert.equal(user.correct_answers, 1);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: '/tmp/linguafire-refactor-quiz-mobile.png' });
    assert.deepEqual(errors, []);
  } finally { await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
