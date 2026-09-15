const test = require('node:test');
const assert = require('node:assert/strict');
const { setupProfileRoutes } = require('../routes/profile-routes');
const { profileUpdateSchema } = require('../validation');
const { resolveLevel } = require('../services/progression');

test('music retries keep original preconditions after lost acknowledgements and spending', async () => {
  let handler;
  let user = { id: 'u', xp: 100, level: 1, correct_answers: 0 };
  setupProfileRoutes({ get() {}, delete() {}, put(path, ...handlers) { if (path === '/api/profile') handler = handlers.at(-1); } }, {
    supabaseGetUserById: async () => ({ ...user }),
    supabaseCompareUpdateUser: async (_id, updates, expected) => {
      if (user.xp !== expected.xp || user.correct_answers !== expected.correct_answers) return { data: null };
      user = { ...user, ...updates }; return { data: user };
    }
  });
  const request = { xp_base: 100, correct_answers_base: 0, xp: 135, correct_answers: 1 };
  const parsed = profileUpdateSchema.safeParse(request); assert.equal(parsed.success, true);
  async function attempt() {
    const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
    await handler({ user: { id: 'u' }, validatedBody: parsed.data }, res); return res;
  }
  const results = await Promise.all([attempt(), attempt()]);
  assert.deepEqual(results.map(r => r.code).sort(), [200, 409]);
  assert.equal(user.xp, 135); assert.equal(user.correct_answers, 1);
  user.xp = 100; // Spending XP must not make the previous result eligible again.
  assert.equal((await attempt()).code, 409);
  assert.equal(user.xp, 100); assert.equal(user.correct_answers, 1);
});

test('progression boundaries preserve all existing gamification levels', () => {
  for (const [xp, expected] of [[0,1],[199,1],[200,2],[399,2],[400,3],[699,3],[700,4],[1199,4],[1200,5],[2000,5]]) {
    assert.equal(resolveLevel(xp), expected);
  }
});
