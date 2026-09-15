const test = require('node:test');
const assert = require('node:assert/strict');
const { validateAvatar } = require('../utils/profile-avatar');
const { setupProfileRoutes } = require('../routes/profile-routes');

const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 '), Buffer.alloc(12)]);

test('avatar validation accepts real image signatures and rejects disguised files', () => {
  assert.equal(validateAvatar(webp, 'image/webp').contentType, 'image/webp');
  assert.match(validateAvatar(Buffer.from('not an image'), 'image/webp').error, /imagem válida/);
  assert.match(validateAvatar(webp, 'image/svg+xml').error, /JPG, PNG ou WebP/);
});

test('profile avatar can be uploaded, read and removed only for the authenticated user', async () => {
  const routes = new Map();
  const app = {
    get(path, ...handlers) { routes.set(`GET ${path}`, handlers.at(-1)); },
    put(path, ...handlers) { routes.set(`PUT ${path}`, handlers.at(-1)); },
    delete(path, ...handlers) { routes.set(`DELETE ${path}`, handlers.at(-1)); }
  };
  let stored = null, uploadedFor = null;
  const authenticateToken = (req, _res, next) => { req.user = { id: 'student-1' }; next(); };
  setupProfileRoutes(app, {
    authenticateToken,
    supabaseUploadProfileAvatar: async (id, body, contentType) => {
      uploadedFor = id; stored = new Blob([body], { type: contentType }); return { success: true };
    },
    supabaseGetProfileAvatar: async id => id === 'student-1' ? stored : null,
    supabaseDeleteProfileAvatar: async id => { assert.equal(id, 'student-1'); stored = null; return { success: true }; }
  });
  function response() {
    return { statusCode: 200, headers: {}, body: null, status(code) { this.statusCode = code; return this; },
      set(name, value) { this.headers[name.toLowerCase()] = value; return this; }, json(value) { this.body = value; return this; },
      send(value) { this.body = value; return this; }, end() { return this; } };
  }
  const upload = response();
  await routes.get('PUT /api/profile/avatar')({ user: { id: 'student-1' }, body: webp, headers: { 'content-type': 'image/webp' } }, upload);
  assert.equal(upload.statusCode, 200); assert.equal(uploadedFor, 'student-1');
  assert.match(upload.body.avatarUrl, /^\/api\/profile\/avatar\?v=/);
  const image = response();
  await routes.get('GET /api/profile/avatar')({ user: { id: 'student-1' } }, image);
  assert.equal(image.statusCode, 200); assert.equal(image.headers['content-type'], 'image/webp');
  assert.deepEqual(image.body, webp);
  const removed = response();
  await routes.get('DELETE /api/profile/avatar')({ user: { id: 'student-1' } }, removed);
  assert.equal(removed.statusCode, 200);
  const missing = response();
  await routes.get('GET /api/profile/avatar')({ user: { id: 'student-1' } }, missing);
  assert.equal(missing.statusCode, 404);
});
