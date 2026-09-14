const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { chromium } = require('playwright');

test('mobile signup uses Google while existing confirmation links remain usable', { skip: process.env.RUN_PLAYWRIGHT_E2E !== '1' }, async () => {
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
      if (path === '/api/register') return route.fulfill({ json: { requiresEmailVerification: true, message: 'Enviamos um link de confirmação para seu email.' } });
      if (path === '/api/auth/verify-email') return route.fulfill({ status: 400, json: { error: 'O link expirou. Solicite uma nova confirmação.' } });
      if (path === '/api/auth/resend-verification') return route.fulfill({ json: { message: 'Se a conta estiver pendente, enviaremos um novo link de confirmação.' } });
      return route.fulfill({ json: {} });
    });
    const base = `http://127.0.0.1:${server.address().port}`;
    await page.goto(base);
    await page.getByRole('button', { name: 'Começar agora', exact: true }).click();
    await page.getByRole('button', { name: /criar conta/i }).first().click();
    await page.getByRole('heading', { name: 'Crie sua conta' }).waitFor();
    assert.ok(await page.getByRole('button', { name: 'Criar conta com Google', exact: true }).isVisible());
    assert.equal(await page.getByPlaceholder('Email', { exact: true }).count(), 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.route('**/auth/google', route => route.fulfill({ contentType: 'text/html', body: '<h1>Google de teste</h1>' }));
    await page.getByRole('button', { name: 'Criar conta com Google', exact: true }).click();
    await page.waitForURL('**/auth/google');
    await page.goto(`${base}/#confirm-email=${'a'.repeat(64)}`);
    await page.getByPlaceholder('Nova senha', { exact: true }).fill('safe-password123');
    await page.getByPlaceholder('Confirmar nova senha', { exact: true }).fill('safe-password123');
    await page.getByRole('button', { name: 'Confirmar e-mail e senha' }).click();
    await page.getByText('O link expirou. Solicite uma nova confirmação.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Voltar ao login ou reenviar link' }).click();
    await page.getByPlaceholder('Email', { exact: true }).fill('ana@example.com');
    assert.equal(await page.getByRole('button', { name: 'Reenviar confirmação de e-mail', exact: true }).count(), 0);
    assert.ok(await page.getByRole('button', { name: 'Entrar com Google', exact: true }).isVisible());
    assert.deepEqual(errors, []);
  } finally { await browser?.close(); server.closeAllConnections(); server.close(); }
});
