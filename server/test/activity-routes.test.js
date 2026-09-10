const test = require('node:test');
const assert = require('node:assert/strict');
const { setupActivityRoutes, validDraft } = require('../routes/activity-routes');

function fixture() {
  const routes = {};
  const rows = [];
  const supabase = { from() {
    let operation = 'get', payload, filters = [];
    const query = {
      select() { return query; },
      eq(key, value) { filters.push(row => row[key] === value); return query; },
      insert(value) { operation = 'insert'; payload = value; return query; },
      update(value) { operation = 'update'; payload = value; return query; },
      then(resolve) { resolve({ data: rows.filter(row => filters.every(filter => filter(row))) }); },
      async maybeSingle() {
        if (operation === 'insert') {
          if (rows.some(row => row.user_id === payload.user_id && row.activity === payload.activity)) return { error: { code: '23505' } };
          rows.push(payload); return { data: payload };
        }
        const row = rows.find(row => filters.every(filter => filter(row)));
        if (!row) return { data: null };
        Object.assign(row, payload); return { data: row };
      }
    };
    return query;
  } };
  const auth = () => {};
  const app = Object.fromEntries(['get', 'put'].map(method => [method, (url, middleware, handler) => {
    assert.equal(middleware, auth);
    routes[`${method} ${url}`] = handler;
  }]));
  setupActivityRoutes(app, { authenticateToken: auth, supabase });
  return async (method, user, body, activity = 'lessons') => {
    let status = 200, data;
    await routes[`${method} ${method === 'get' ? '/api/activities' : '/api/activities/:activity'}`](
      { user: { id: user }, params: { activity }, body },
      { set() {}, status(code) { status = code; return this; }, json(value) { data = JSON.parse(JSON.stringify(value)); } }
    );
    return { status, data };
  };
}

test('restores drafts per account and rejects stale writes from another device', async () => {
  const request = fixture();
  const state = { version: 1, questionIndex: 3, typedAnswer: 'hello' };
  assert.equal((await request('put', 'alice', { revision: 0, state })).status, 200);
  assert.deepEqual((await request('get', 'bob')).data.activities, []);
  const saved = (await request('get', 'alice')).data.activities[0];
  assert.deepEqual(saved.state, state);
  assert.equal(saved.revision, 1);
  assert.equal((await request('put', 'alice', { revision: 0, state })).status, 409);
  assert.equal((await request('put', 'alice', { revision: 1, state: { ...state, questionIndex: 4 } })).status, 200);
  assert.equal((await request('put', 'alice', { revision: 1, state })).status, 409);
  assert.equal((await request('get', 'alice')).data.activities[0].state.questionIndex, 4);
});

test('validates versions, limits, revision and activity names', async () => {
  const request = fixture();
  for (const body of [null, {}, { revision: -1, state: { version: 1 } }, { revision: 0, state: [] },
    { revision: 0, state: { version: 2 } }, { revision: 0, state: { version: 1, text: 'a'.repeat(150000) } }]) {
    assert.ok(!validDraft(body));
    assert.equal((await request('put', 'alice', body)).status, 400);
  }
  assert.equal((await request('put', 'alice', { revision: 0, state: { version: 1 } }, 'admin')).status, 400);
});
