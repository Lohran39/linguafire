const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { hashToken } = require('../utils/auth-security');

function fixture() {
  const rows = [{ id: '1', email_verified: 0, password: 'old-password' }];
  const client = { from() {
    let update, predicates = [];
    const query = {
      update(value) { update = value; return this; },
      select() { return this; }, limit() { return this; },
      eq(field, value) { predicates.push(row => row[field] === value); return this; },
      gt(field, value) { predicates.push(row => row[field] > value); return this; },
      maybeSingle() { return this; }, single() { return this; },
      then(resolve, reject) {
        const row = rows.find(row => predicates.every(p => p(row)));
        if (row && update) Object.assign(row, update);
        return Promise.resolve({ data: row ? { ...row } : null, error: null }).then(resolve, reject);
      }
    }; return query;
  } };
  const filename = require.resolve('../db-supabase');
  const realRequire = createRequire(filename);
  const sandbox = {
    module: { exports: {} }, Date,
    process: { env: { SUPABASE_URL: 'https://example.test', SUPABASE_SERVICE_ROLE_KEY: 'test-only' } },
    require: name => name === '@supabase/supabase-js' ? { createClient: () => client } : realRequire(name)
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), sandbox, { filename });
  return { db: sandbox.module.exports, row: rows[0] };
}

test('confirmation stores hash and concurrent consumers cannot reuse a token', async () => {
  const { db, row } = fixture();
  await db.supabaseSetEmailVerificationToken('1', 'raw-token', Date.now() + 10000);
  assert.equal(row.email_verification_token, hashToken('raw-token'));
  assert.equal((await db.supabaseGetUserByEmailVerificationToken('raw-token')).id, '1');
  assert.equal(await db.supabaseGetUserByEmailVerificationToken(row.email_verification_token), null);
  const results = await Promise.all([
    db.supabaseVerifyUserEmail('1', 'raw-token', 'owner-password'),
    db.supabaseVerifyUserEmail('1', 'raw-token', 'replay-password')
  ]);
  assert.equal(results.filter(r => !r.error).length, 1);
  assert.equal(row.password, 'owner-password'); assert.equal(row.email_verified, 1);
  assert.equal(row.email_verification_token, ''); assert.ok(row.auth_version > 0);
  assert.ok((await db.supabaseSetEmailVerificationToken('1', 'another', Date.now() + 10000)).error);
  assert.equal(row.email_verified, 1);
});

test('password reset expires and consumes a hashed token exactly once', async () => {
  const { db, row } = fixture();
  await db.supabaseSetPasswordResetToken('1', 'reset-token', Date.now() - 1);
  assert.equal(row.password_reset_token, hashToken('reset-token'));
  assert.ok((await db.supabaseResetPassword('1', 'new', 'reset-token')).error);
  assert.equal(row.password, 'old-password');
  await db.supabaseSetPasswordResetToken('1', 'reset-token', Date.now() + 10000);
  const results = await Promise.all([
    db.supabaseResetPassword('1', 'new-password', 'reset-token'),
    db.supabaseResetPassword('1', 'replay-password', 'reset-token')
  ]);
  assert.equal(results.filter(r => !r.error).length, 1);
  assert.equal(row.password, 'new-password'); assert.ok(row.auth_version > 0);
  assert.equal(row.password_reset_token, '');
});
