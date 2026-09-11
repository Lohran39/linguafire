const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { promisify } = require('node:util');
const { createRedisSessions } = require('../services/redis-sessions');
const { setupProductUsageRoutes } = require('../routes/product-usage-routes');
const { createGeminiService } = require('../services/gemini-service');
const invoke = (store, method, ...args) => promisify(store[method]).apply(store, args);

test('Redis store shares sessions across clients, uses TTL and destroys without resurrection', async () => {
  const rows = new Map();
  function factory(options) {
    assert.equal(options.disableOfflineQueue, true);
    return Object.assign(new EventEmitter(), {
      get: async key => rows.get(key)?.value || null,
      set: async (key, value, options) => rows.set(key, { value, ttl: options.expiration.value }),
      expire: async (key, ttl) => { if (rows.has(key)) rows.get(key).ttl = ttl; },
      del: async keys => keys.forEach(key => rows.delete(key))
    });
  }
  const a = createRedisSessions({ url: 'redis://localhost', clientFactory: factory }).store;
  const b = createRedisSessions({ url: 'redis://localhost', clientFactory: factory }).store;
  await invoke(a, 'set', 'one', { passport: { user: 'learner' }, cookie: {} });
  assert.equal((await invoke(b, 'get', 'one')).passport.user, 'learner');
  assert.equal(rows.get('linguafire:session:one').ttl, 86400);
  await invoke(b, 'destroy', 'one');
  await invoke(a, 'touch', 'one', { cookie: {} });
  assert.equal(await invoke(a, 'get', 'one'), null);
  await invoke(a, 'set', 'expired', { cookie: { expires: new Date(0) } });
  assert.equal(await invoke(b, 'get', 'expired'), null);
});

test('Redis configuration fails without URL and connection failures propagate', async () => {
  assert.throws(() => createRedisSessions({}), /REDIS_URL/);
  const backend = createRedisSessions({ url: 'redis://localhost', clientFactory: () => Object.assign(new EventEmitter(), {
    isOpen: false, connect: async () => { throw new Error('connection refused'); }
  }) });
  await assert.rejects(backend.connect(), /connection refused/);
});

test('truncated provider output is rejected instead of shown as a correction', async () => {
  const service = createGeminiService({ fetchImpl: async () => ({ status: 200, text: async () => JSON.stringify({
    candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: 'Quick correction: I want' }] } }]
  }) }) });
  await assert.rejects(service.callGeminiChat({ messages: [{ role: 'user', content: 'I wants water' }], apiKey: 'test' }), { code: 'AI_RESPONSE_TRUNCATED' });
});

test('usage binds identity and date to server, excludes admins and protects summary', async () => {
  const routes = {};
  let write, role = 'student';
  setupProductUsageRoutes({ post(path, ...handlers) { routes[path] = handlers.at(-1); },
    get(path, ...handlers) { routes[path] = handlers.at(-1); } }, {
    authenticateToken() {}, supabaseGetUserById: async () => ({ role }),
    supabase: { from() { return { upsert: async (value, options) => { write = value; assert.equal(options.ignoreDuplicates, true); return {}; } }; },
      rpc: async () => ({ data: { activeToday: 0 } }) }
  });
  let status, result;
  const res = { set() {}, sendStatus(code) { status = code; }, status(code) { status = code; return this; }, json(value) { result = value; } };
  await routes['/api/product/usage']({ user: { id: 'real' }, body: { userId: 'fake', day: '2000-01-01', feature: 'music' } }, res);
  assert.equal(status, 204);
  assert.equal(write.user_id, 'real');
  assert.equal(write.day, new Date().toISOString().slice(0, 10));
  await routes['/api/admin/product-usage']({ user: { id: 'real' } }, res);
  assert.equal(status, 403);
  role = 'admin'; write = null;
  await routes['/api/product/usage']({ user: { id: 'admin' }, body: { feature: 'home' } }, res);
  assert.equal(write, null);
  await routes['/api/admin/product-usage']({ user: { id: 'admin' } }, res);
  assert.equal(result.activeToday, 0);
  await routes['/api/product/usage']({ user: { id: 'real' }, body: { feature: 'unknown' } }, res);
  assert.equal(status, 400);
});
