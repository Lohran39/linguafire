const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const express = require('express');
const { chromium } = require('playwright');

test('mobile billing shows usage, handles portal failures and reconciles a return over saved navigation', { skip: process.env.RUN_PLAYWRIGHT_E2E !== '1' }, async () => {
  const app = express(); app.use(express.static(path.resolve(__dirname, '../../../client/dist')));
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Sao_Paulo' });
  const user = { id: 'billing-user', name: 'Ana', email: 'ana@example.com', level: 1, xp: 0, streak: 0, correct_answers: 0, lessons_completed: 0, english_level: 'A1' };
  let state = { active: false, expires: 0, plan: null, price: 45, aiDailyLimit: 10, checkoutConfigured: true, canSubscribe: true, hasBillingAccount: false, portalAvailable: false, billingStatus: 'none', aiUsage: { used: 7, limit: 10, remaining: 3, resetsAt: '2099-09-10T00:00:00Z' } };
  let portalFails = true;
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.route('**/api/**', async route => {
    const req = route.request(), pathname = new URL(req.url()).pathname; let payload = {};
    if (pathname === '/api/auth/session') payload = { userId: user.id };
    else if (pathname === '/api/profile') payload = { user };
    else if (pathname === '/api/activities') payload = { activities: [{ activity: 'navigation', state: { activeTab: 'lessons' }, revision: 1 }] };
    else if (pathname.startsWith('/api/activities/')) payload = { revision: req.postDataJSON().revision + 1 };
    else if (pathname === '/api/subscription/status') payload = state;
    else if (pathname === '/api/subscription/portal') {
      assert.equal(req.method(), 'POST');
      assert.ok(!req.postData());
      if (portalFails) return route.fulfill({ status: 503, json: { error: 'Portal temporariamente indisponível. Tente novamente.' } });
      payload = { portalUrl: 'https://billing.stripe.com/p/testsession' };
    }
    await route.fulfill({ json: payload });
  });
  await page.route('https://billing.stripe.com/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Portal Stripe de teste</h1>' }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    await page.goto(`${origin}/?billing=return`);
    await page.getByRole('heading', { name: 'Seu uso de IA' }).waitFor();
    await page.getByText('7 de 10 usos', { exact: true }).waitFor();
    assert.ok(await page.getByText('3 disponíveis', { exact: false }).isVisible());
    assert.ok(await page.getByText('21:00 (America/Sao_Paulo)', { exact: false }).isVisible());
    assert.ok(await page.getByRole('button', { name: 'Ativar Pro', exact: true }).isEnabled());
    state = { ...state, active: true, plan: 'max', expires: Date.now() + 86400000, aiDailyLimit: 1000, canSubscribe: false, hasBillingAccount: true, portalAvailable: true, cancelAtPeriodEnd: true, billingStatus: 'active', aiUsage: { ...state.aiUsage, limit: 1000, remaining: 993 } };
    await page.getByRole('button', { name: 'Atualizar dados da assinatura' }).click();
    await page.getByText('Plano MAX ativo', { exact: true }).waitFor();
    await page.getByText('Renovação cancelada. Acesso até', { exact: false }).waitFor();
    const manage = page.getByRole('button', { name: 'Gerenciar assinatura e cobranças' });
    await manage.click();
    await page.getByRole('alert').filter({ hasText: 'Portal temporariamente indisponível' }).waitFor();
    assert.ok(await manage.isEnabled());
    await page.locator('.subscription-panel').screenshot({ path: '/tmp/linguafire-subscription-mobile.png' });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    portalFails = false;
    await manage.click();
    await page.waitForURL('https://billing.stripe.com/p/testsession');
    state = { ...state, cancelAtPeriodEnd: false };
    await page.goto(`${origin}/?billing=return`);
    await page.getByText('Plano MAX ativo', { exact: true }).waitFor();
    assert.ok(await page.getByText('Próxima renovação em', { exact: false }).isVisible());
    assert.deepEqual(errors, []);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
});
