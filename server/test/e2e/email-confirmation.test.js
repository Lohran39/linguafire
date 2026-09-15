const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { chromium } = require('playwright');

test('mobile signup uses name, email and password without Google or email confirmation', { skip: process.env.RUN_PLAYWRIGHT_E2E !== '1' }, async () => {
  const app = express(); app.use(express.static(require('path').resolve(__dirname, '../../../client/dist')));
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/auth/session') return route.fulfill({ status: 401, json: {} });
      if (path === '/api/register') return route.fulfill({ status: 201, json: { user: { id: 'new-user', name: 'Ana', email: 'ana@example.com', level: 1, xp: 0, streak: 0, lessons_completed: 0, english_level: 'A1', placement_completed: 0 } } });
      if (path === '/api/profile') return route.fulfill({ json: { user: { id: 'new-user', name: 'Ana', email: 'ana@example.com', level: 1, xp: 0, streak: 0, lessons_completed: 0, english_level: 'A1', placement_completed: 0 } } });
      if (path === '/api/activities') return route.fulfill({ json: { activities: [] } });
      if (path === '/api/auth/verify-email') return route.fulfill({ status: 400, json: { error: 'O link expirou. Solicite uma nova confirmação.' } });
      if (path === '/api/auth/resend-verification') return route.fulfill({ json: { message: 'Se a conta estiver pendente, enviaremos um novo link de confirmação.' } });
      return route.fulfill({ json: {} });
    });
    const base = `http://127.0.0.1:${server.address().port}`;
    await page.goto(base);
    await page.getByRole('button', { name: 'Começar agora', exact: true }).click();
    await page.getByRole('button', { name: /criar conta/i }).first().click();
    await page.getByPlaceholder('Nome', { exact: true }).fill('Ana');
    await page.getByPlaceholder('Email', { exact: true }).fill('ana@example.com');
    await page.getByPlaceholder('Senha (min. 6 caracteres)', { exact: true }).fill('safe-password123');
    await page.getByPlaceholder('Confirmar senha', { exact: true }).fill('safe-password123');
    assert.equal(await page.getByRole('button', { name: 'Criar conta com Google', exact: true }).count(), 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
    await page.getByRole('heading', { name: 'Descubra seu nível de inglês', exact: true }).waitFor();
    await page.goto(`${base}/#confirm-email=${'a'.repeat(64)}`);
    await page.getByPlaceholder('Nova senha', { exact: true }).fill('safe-password123');
    await page.getByPlaceholder('Confirmar nova senha', { exact: true }).fill('safe-password123');
    await page.getByRole('button', { name: 'Confirmar e-mail e senha' }).click();
    await page.getByText('O link expirou. Solicite uma nova confirmação.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Voltar ao login' }).click();
    await page.getByPlaceholder('Email', { exact: true }).fill('ana@example.com');
    assert.equal(await page.getByRole('button', { name: 'Reenviar confirmação de e-mail', exact: true }).count(), 0);
    assert.ok(await page.getByRole('button', { name: 'Entrar com Google', exact: true }).isVisible());
    assert.deepEqual(errors, []);
  } finally { await browser?.close(); server.closeAllConnections(); server.close(); }
});
