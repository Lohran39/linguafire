const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const express = require('express');
const { chromium } = require('playwright');

test('profile stays compact on mobile and scopes settings, errors and password creation', { skip: process.env.RUN_PLAYWRIGHT_E2E !== '1' }, async () => {
  const app = express(); app.use(express.static(path.resolve(__dirname, '../../../client/dist')));
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    let user = { id: 'profile-user', name: 'Ana', email: 'ana@example.test', level: 2, xp: 240,
      streak: 3, lessons_completed: 12, english_level: 'A2', placement_completed: true,
      google_linked: true, has_password: true, theme: 'default' };
    let emailRequests = 0;
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      const req = route.request(), pathname = new URL(req.url()).pathname;
      let payload = {};
      if (pathname === '/api/auth/session') payload = { userId: user.id };
      else if (pathname === '/api/profile') {
        if (req.method() === 'PUT') {
          const changes = req.postDataJSON();
          if (changes.theme) return route.fulfill({ status: 500, json: { error: 'Falha ao salvar aparência.' } });
          user = { ...user, ...changes }; payload = { success: true };
        } else payload = { user };
      } else if (pathname === '/api/activities') payload = { activities: [] };
      else if (pathname.startsWith('/api/activities/')) payload = { revision: req.postDataJSON().revision + 1 };
      else if (pathname === '/api/subscription/status') payload = { active: false, expires: 0, plan: 'free',
        billingStatus: 'none', checkoutConfigured: true, canSubscribe: true,
        aiUsage: { used: 2, limit: 10, remaining: 8, resetsAt: '2099-01-01T00:00:00Z' } };
      else if (pathname === '/api/change-password') return route.fulfill({ status: 400, json: { error: 'Senha atual incorreta.' } });
      else if (pathname === '/api/auth/forgot-password') { emailRequests++; assert.equal(req.postDataJSON().email, user.email); payload = { message: 'Confira seu e-mail.' }; }
      await route.fulfill({ json: payload });
    });
    const url = `http://127.0.0.1:${server.address().port}/?billing=return`;
    await page.goto(url);
    const profile = page.getByRole('region', { name: 'Perfil', exact: true });
    await profile.getByRole('heading', { name: 'Ana', exact: true }).waitFor();
    assert.equal(await profile.locator('details[open]').count(), 0);
    await profile.getByText('Inglês A2', { exact: true }).waitFor();
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}`);
      await profile.screenshot({ path: `/tmp/linguafire-profile-${width}.png` });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await profile.getByText('Meus dados', { exact: true }).click();
    await profile.getByLabel('Nome', { exact: true }).fill('Ana Silva');
    await profile.getByRole('button', { name: 'Salvar nome' }).click();
    await profile.getByRole('heading', { name: 'Ana Silva', exact: true }).waitFor();
    await profile.getByText('Aparência', { exact: true }).click();
    await profile.getByRole('radio', { name: 'Claro Mais leve para o dia' }).check();
    await profile.getByRole('alert').filter({ hasText: 'Falha ao salvar aparência' }).waitFor();
    assert.equal(await page.locator('body').getAttribute('data-theme'), 'default');
    assert.ok(await profile.getByRole('radio', { name: 'Fogo Escuro com laranja' }).isChecked());
    await profile.getByText('Segurança', { exact: true }).click();
    await profile.getByLabel('Senha atual', { exact: true }).fill('incorrect');
    await profile.getByLabel('Nova senha', { exact: true }).fill('new-password');
    await profile.getByLabel('Confirmar nova senha').fill('new-password');
    await profile.getByRole('button', { name: 'Alterar senha' }).click();
    await profile.locator('details').filter({ has: page.locator('summary', { hasText: /^Segurança$/ }) }).getByRole('alert').waitFor();
    await profile.getByText('Excluir conta', { exact: true }).click();
    assert.ok(await profile.getByRole('button', { name: 'Excluir minha conta' }).isDisabled());
    user = { ...user, has_password: false, placement_completed: false };
    await page.goto(url);
    await profile.getByText('Segurança', { exact: true }).click();
    assert.equal(await profile.getByLabel('Senha atual', { exact: true }).count(), 0);
    await profile.getByRole('button', { name: 'Criar senha por e-mail' }).click();
    await profile.getByRole('status').filter({ hasText: 'Abra o link para definir sua senha' }).waitFor();
    assert.equal(emailRequests, 1);
    await profile.getByRole('button', { name: 'Descobrir meu nível' }).click();
    await profile.waitFor({ state: 'hidden' });
    assert.deepEqual(errors, []);
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
});
