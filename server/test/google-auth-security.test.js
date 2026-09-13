const test = require('node:test');
const assert = require('node:assert/strict');
const { setupGoogleAuthRoutes } = require('../routes/google-auth-routes');

function fixture(user) {
  const routes = new Map(); let verifyProfile, created;
  const deps = {
    passport: {
      serializeUser() {}, deserializeUser() {}, use() {},
      authenticate() { return (_req, _res, next) => next?.(); }
    },
    GoogleStrategy: class { constructor(_options, verify) { verifyProfile = verify; } },
    env: { GOOGLE_CLIENT_ID: 'test-id', GOOGLE_CLIENT_SECRET: 'test-secret' },
    baseUrl: 'https://example.test', jwtSecret: 'test',
    supabaseFindUserByGoogleOrEmail: async () => user,
    supabaseCreateUser: async (payload) => { created = payload; return { data: { id: 'new', ...payload } }; },
    supabaseUpdateGoogleLink: () => assert.fail('must not silently link pending accounts'),
    setAuthCookie(res) { res.cookieIssued = true; }
  };
  setupGoogleAuthRoutes({ get(path, ...handlers) { routes.set(path, handlers); } }, deps);
  return { routes, verifyProfile: (...args) => verifyProfile(...args), get created() { return created; } };
}

test('Google rejects profiles without affirmative verified email', () => {
  const f = fixture();
  for (const emails of [undefined, [], [{ value: 'x@example.com' }], [{ value: 'x@example.com', verified: false }]]) {
    f.verifyProfile({}, '', '', { emails }, (error, user) => { assert.equal(error, null); assert.equal(user, false); });
  }
  f.verifyProfile({}, '', '', { id: 'google1', emails: [{ value: 'x@example.com', verified: true }] }, (_, user) => assert.equal(user.email, 'x@example.com'));
});

test('OAuth state is bound to initiating session, expires and cannot be reused', () => {
  const f = fixture(), res = { redirect(url) { this.url = url; } };
  const req = { query: {}, session: {} };
  f.routes.get('/auth/google')[0](req, res, () => {});
  const state = req.session.googleOAuthState.value;
  const check = f.routes.get('/auth/google/callback')[0];
  let allowed = 0;
  check({ query: { state }, session: {} }, res, () => allowed++);
  assert.equal(allowed, 0);
  check({ query: { state }, session: { googleOAuthState: { value: state, expires: 0 } } }, res, () => allowed++);
  assert.equal(allowed, 0);
  req.query.state = state;
  check(req, res, () => allowed++); check(req, res, () => allowed++);
  assert.equal(allowed, 1);
});

test('Google cannot activate an existing pending account or inherit its password', async () => {
  const f = fixture({ id: 'pending', email_verified: 0, password: 'third-party-password' });
  const res = { redirect(url) { this.url = url; } };
  await f.routes.get('/auth/google/callback').at(-1)({ user: { email: 'x@example.com', googleId: 'g1' }, query: {} }, res);
  assert.match(res.url, /email_confirmation_required/); assert.equal(res.cookieIssued, undefined);
});

test('Google creates explicitly verified accounts and issues a session', async () => {
  const f = fixture(null), res = { redirect(url) { this.url = url; } };
  await f.routes.get('/auth/google/callback').at(-1)({ user: { email: 'x@example.com', googleId: 'g1' }, query: {} }, res);
  assert.equal(f.created.email_verified, 1); assert.equal(f.created.password, '');
  assert.equal(res.cookieIssued, true);
});
