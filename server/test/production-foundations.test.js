const test = require('node:test');
const assert = require('node:assert/strict');
const { promisify } = require('node:util');
const { SupabaseSessionStore } = require('../services/session-store');
const { logger, requestContext } = require('../logger');
const { observeAI } = require('../services/observed-ai');
const { cases, evaluateReply } = require('../evals/conversation-cases');
const { createMonitoringService } = require('../services/monitoring-service');
const { createRequestLogger } = require('../middleware/request-logger');
const { EventEmitter } = require('node:events');
const { setupGrammarRoutes } = require('../routes/conversation-routes');

function database() {
  const rows = new Map();
  let failed = false;
  return { rows, fail() { failed = true; }, from() {
    let operation, payload;
    const filters = [];
    const query = {
      select() { operation = 'get'; return query; },
      upsert(value) { operation = 'set'; payload = value; return query; },
      update(value) { operation = 'update'; payload = value; return query; },
      delete() { operation = 'delete'; return query; },
      eq(key, value) { filters.push(row => row[key] === value); return query; },
      gt(key, value) { filters.push(row => row[key] > value); return query; },
      lt(key, value) { filters.push(row => row[key] < value); return query; },
      maybeSingle() { return query; },
      then(resolve, reject) {
        if (failed) return Promise.resolve({ error: new Error('database down') }).then(resolve, reject);
        const matches = [...rows.values()].filter(row => filters.every(f => f(row)));
        if (operation === 'set') rows.set(payload.sid_hash, structuredClone(payload));
        if (operation === 'update') for (const row of matches) Object.assign(row, payload);
        if (operation === 'delete') for (const row of matches) rows.delete(row.sid_hash);
        return Promise.resolve({ data: structuredClone(matches[0] || null), error: null }).then(resolve, reject);
      }
    };
    return query;
  } };
}
const invoke = (store, method, ...args) => promisify(store[method]).apply(store, args);

test('sessions survive store replacement, touch preserves data, logout deletes across instances', async () => {
  const client = database();
  const a = new SupabaseSessionStore({ client, cleanupMs: 0 });
  const b = new SupabaseSessionStore({ client, cleanupMs: 0 });
  const value = { cookie: { expires: new Date(Date.now() + 60000).toISOString() }, passport: { user: 'student' } };
  await invoke(a, 'set', 'secret-session-id', value);
  assert.deepEqual(await invoke(b, 'get', 'secret-session-id'), value);
  assert.equal(client.rows.has('secret-session-id'), false);
  await invoke(b, 'touch', 'secret-session-id', { cookie: { expires: new Date(Date.now() + 120000).toISOString() } });
  assert.deepEqual((await invoke(a, 'get', 'secret-session-id')).passport, value.passport);
  await invoke(b, 'destroy', 'secret-session-id');
  assert.equal(await invoke(a, 'get', 'secret-session-id'), null);
  await invoke(a, 'touch', 'secret-session-id', value);
  assert.equal(await invoke(a, 'get', 'secret-session-id'), null);
});

test('expired sessions are rejected and pruned; database errors fail closed', async () => {
  const client = database();
  const store = new SupabaseSessionStore({ client, cleanupMs: 0 });
  await invoke(store, 'set', 'expired', { cookie: { expires: new Date(0).toISOString() } });
  assert.equal(await invoke(store, 'get', 'expired'), null);
  await store.prune();
  assert.equal(client.rows.size, 0);
  client.fail();
  await assert.rejects(invoke(store, 'get', 'id'), { code: 'SESSION_STORE_UNAVAILABLE' });
  await assert.rejects(invoke(store, 'set', 'id', {}), { code: 'SESSION_STORE_UNAVAILABLE' });
});

test('JSON logs preserve request correlation and redact credentials and learner content', () => {
  const original = console.info;
  let line;
  console.info = value => { line = value; };
  try {
    requestContext.run({ requestId: 'request-123' }, () => logger.info('Request completed', {
      cookie: 'session', prompt: 'private learner text', nested: { authorization: 'secret' },
      error: new Error('private error with credentials'), durationMs: 10
    }));
  } finally { console.info = original; }
  const result = JSON.parse(line);
  assert.equal(result.requestId, 'request-123');
  assert.equal(result.metadata.durationMs, 10);
  assert.doesNotMatch(line, /private learner|private error|"secret"|"session"/);
});

test('provider telemetry records usage and failures without request or response bodies', async () => {
  const events = [];
  const log = { info: (event, data) => events.push(data), error: (event, data) => events.push(data) };
  const call = observeAI(async () => ({ content: 'private reply', usage: { promptTokens: 4, completionTokens: 8 } }), log);
  await call({ messages: ['private prompt'] });
  assert.equal(events[0].outputUnits, 8);
  await assert.rejects(observeAI(async () => { throw Object.assign(new Error('private provider body'), { status: 429 }); }, log)({}));
  assert.equal(events[1].status, 429);
  assert.doesNotMatch(JSON.stringify(events), /private/);
});

test('quality checks catch false corrections, missed errors, and scenario escape for every topic', () => {
  assert.equal(cases.length, 20);
  for (const item of cases) {
    if (item.correction === false) assert.ok(evaluateReply(item, 'Quick correction: Hello. What now?').includes('false_correction'));
    else {
      assert.ok(evaluateReply(item, 'Okay. What else?').includes('missed_correction'));
      assert.deepEqual(evaluateReply(item, `Quick correction: ${item.correction}. What else?`), []);
    }
    if (item.offTopic) assert.ok(evaluateReply(item, 'function sort() { return []; }').includes('scenario_escape'));
  }
});

test('monitoring reports bounded latency and counts a failed response only once', () => {
  const monitoring = createMonitoringService();
  monitoring.recordError(new Error('private'), { path: '/api/private-token', requestId: 'id' });
  for (let i = 0; i < 2100; i++) monitoring.recordRequest({ statusCode: i === 0 ? 500 : 200, durationMs: i });
  const result = monitoring.snapshot();
  assert.equal(result.errors.total, 1);
  assert.equal(result.errors.unhandled, 1);
  assert.equal(result.latency_ms.sample_size, 2000);
  assert.equal(result.latency_ms.p95, 1999);
  assert.doesNotMatch(JSON.stringify(result), /private/);
});

test('request logger assigns correlation IDs without recording URL parameters or bodies', () => {
  const records = [];
  const middleware = createRequestLogger({ logger: { error: (_event, record) => records.push(record) } });
  const req = { method: 'POST', path: '/api/users/private-value', route: { path: '/api/users/:id' }, body: 'private text' };
  const res = new EventEmitter();
  res.statusCode = 500;
  res.setHeader = (_name, value) => { res.header = value; };
  middleware(req, res, () => assert.equal(requestContext.getStore().requestId, res.header));
  res.emit('finish');
  assert.equal(records[0].requestId, res.header);
  assert.equal(records[0].path, '/api/users/:id');
  assert.doesNotMatch(JSON.stringify(records), /private/);
});

test('grammar analysis rejects malformed AI output and never saves invented learner fragments', async () => {
  for (const [content, expectedStatus, expectedSaved] of [
    ['not JSON', 502, 0],
    ['[]', 200, 0],
    [JSON.stringify([{ incorrect: 'She go home', correct: 'She goes home' }]), 200, 0],
    [JSON.stringify([{ incorrect: 'I wants water', correct: 'I want water' }]), 200, 1]
  ]) {
    let handler, status = 200, saved = 0;
    setupGrammarRoutes({ get() {}, post(path, ...handlers) { if (path === '/api/grammar/analyze') handler = handlers.at(-1); } }, {
      callGeminiChat: async ({ messages }) => {
        assert.equal(messages[0].role, 'system');
        assert.equal(messages[1].role, 'user');
        return { content };
      },
      supabaseAddGrammarError: async () => { saved++; return {}; }
    });
    await handler({ user: { id: 'student' }, validatedBody: { topicId: 'restaurant', conversationHistory: [{ role: 'user', content: 'I wants water' }] } },
      { status(code) { status = code; return this; }, json() {} });
    assert.equal(status, expectedStatus);
    assert.equal(saved, expectedSaved);
  }
});
