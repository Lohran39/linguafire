const test = require('node:test');
const assert = require('node:assert/strict');
const { setupMiscRoutes } = require('../routes/misc-routes');
const { createAvatarStorage } = require('../services/avatar-storage');

test('account deletion never reports success or clears login after a database failure', async () => {
  let handler, cleared = false, result = { error: 'database unavailable' };
  setupMiscRoutes({ get() {}, delete(path, ...handlers) { if (path === '/api/account') handler = handlers.at(-1); } }, {
    supabaseDeleteUser: async () => result, clearAuthCookie: () => { cleared = true; }
  });
  const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; } });
  const failed = response(); await handler({ user: { id: 'test' } }, failed);
  assert.equal(failed.code, 500); assert.equal(cleared, false); assert.ok(!failed.body.success);
  result = { success: true };
  const success = response(); await handler({ user: { id: 'test' } }, success);
  assert.equal(success.code, 200); assert.equal(cleared, true); assert.equal(success.body.success, true);
});

test('avatar reads and deletion distinguish absence from outage without creating buckets', async () => {
  let error = { statusCode: 404 }, calls = [];
  const storage = createAvatarStorage({ storage: { from(bucket) {
    assert.equal(bucket, 'profile-avatars');
    return { download: async path => { calls.push(path); return { error }; }, remove: async paths => { calls.push(...paths); return { error }; } };
  } } });
  assert.equal(await storage.get('student'), null);
  assert.deepEqual(await storage.remove('student'), { success: true });
  error = { statusCode: 503, message: 'outage' };
  await assert.rejects(storage.get('student'));
  assert.equal((await storage.remove('student')).error, 'outage');
  assert.ok(calls.every(path => path === 'student/avatar'));
});
