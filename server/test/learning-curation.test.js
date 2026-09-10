const test = require('node:test');
const assert = require('node:assert/strict');
const { buildLearningSummary } = require('../services/learning-summary');
const { contentKey, isVerified, prioritizeVideos } = require('../services/content-curation');
const { setupLearningRoutes } = require('../routes/learning-routes');
const { setupCurationRoutes, parseContent } = require('../routes/curation-routes');
const { registerNativesRoutes, buildNativesCuratedCacheKey, buildNativesReportCacheKey, NATIVES_CURATED_CACHE_SOURCE } = require('../routes/natives-routes');

const now = Date.parse('2026-09-09T12:00:00Z');
test('learning metrics use review evidence, disclose samples and compare distinct periods', () => {
  const cards = [{ word: 'water', translation: 'água', repetitions: 3, interval_days: 15 }, { word: 'home', repetitions: 1, interval_days: 1 }, { word: 'mistake:123', repetitions: 5, interval_days: 30 }];
  const errors = [{ error_type: 'Articles', user_sentence: 'a apple', correct_form: 'an apple' }, { error_type: 'articles', user_sentence: 'the water', correct_form: 'water' }];
  const events = [
    ...Array.from({ length: 5 }, () => ({ activity: 'lesson', score: 80, occurred_at: new Date(now - 86400000).toISOString() })),
    ...Array.from({ length: 5 }, () => ({ activity: 'lesson', score: 40, occurred_at: new Date(now - 20 * 86400000).toISOString() })),
    { activity: 'dictation', score: 92, occurred_at: new Date(now - 86400000).toISOString() },
    { activity: 'lesson', score: 0, occurred_at: new Date(now - 40 * 86400000).toISOString() }
  ];
  const summary = buildLearningSummary(cards, errors, events, now);
  assert.equal(summary.consolidatedWords, 1); assert.equal(summary.reviewedWords, 2);
  assert.equal(summary.recurringErrors[0].count, 2);
  assert.equal(summary.skills.find(item => item.activity === 'lesson').change, 40);
  assert.equal(summary.skills.find(item => item.activity === 'dictation').change, null);
  assert.equal(summary.skills.find(item => item.activity === 'native_coach').score, null);
  assert.equal(buildLearningSummary([], [], [], now).skills.every(item => item.score === null), true);
});

function router() {
  const routes = {};
  const app = Object.fromEntries(['get','post','put','delete'].map(method => [method, (path, ...handlers) => { routes[`${method} ${path}`] = handlers; }]));
  return { app, async call(method, path, { body, query = {}, role = 'user', id = 'student' } = {}) {
    let status = 200, data;
    const res = { set() {}, status(code) { status = code; return this; }, json(value) { data = value; return this; } };
    const req = { body, query, user: { id, role } };
    const handlers = routes[`${method} ${path}`];
    async function run(index) { if (handlers[index]) await handlers[index](req, res, () => run(index + 1)); }
    await run(0);
    return { status, data };
  } };
}
const auth = (_req, _res, next) => next();
test('learning events are idempotent, scoped to the session and store no answer text', async () => {
  const r = router(), events = new Map();
  setupLearningRoutes(r.app, { authenticateToken: auth, supabase: { from: () => ({ upsert: async (row, options) => {
    assert.equal(options.ignoreDuplicates, true);
    if (!events.has(row.event_id)) events.set(row.event_id, row);
    return {};
  } }) } });
  const body = { userId: 'student', eventId: 'run:question1', activity: 'lesson', score: 100, occurredAt: new Date().toISOString(), text: 'private answer' };
  assert.equal((await r.call('post', '/api/learning/events', { body })).status, 200);
  await r.call('post', '/api/learning/events', { body: { ...body, score: 0 } });
  assert.equal(events.size, 1); assert.equal(events.get(body.eventId).score, 100); assert.ok(!('text' in events.get(body.eventId)));
  assert.equal((await r.call('post', '/api/learning/events', { body: { ...body, userId: 'someone-else' } })).status, 403);
  assert.equal((await r.call('post', '/api/learning/events', { body: { ...body, score: 101 } })).status, 400);
});

test('verification needs reviewed video and text; new reports remove verified priority', () => {
  const verified = { video_id: 'verified123', status: 'verified', video_matches: true, text_matches: true, reports: 0 };
  assert.equal(isVerified(verified), true);
  assert.equal(isVerified({ ...verified, reports: 1 }), false);
  assert.equal(isVerified({ ...verified, text_matches: false }), false);
  assert.deepEqual(prioritizeVideos(['unknown1234','rejected123'], [verified, { video_id: 'rejected123', status: 'rejected' }]), ['verified123','unknown1234']);
  assert.notEqual(contentKey({ kind: 'native', title: 'take off', lang: 'english-us' }), contentKey({ kind: 'native', title: 'take off', lang: 'english-uk' }));
  assert.equal(contentKey({ kind: 'music', title: ' HELLO ', artist: 'Adele' }), 'hello|adele');
  assert.equal(parseContent({ kind: 'music', title: 'Hello', artist: 'Adele', videoId: 'invalid' }), null);
});

test('only a database administrator may review; invalid checklists and failed reports are not acknowledged', async () => {
  const r = router(); let role = 'user', writeFails = false, saved;
  const database = { from: () => ({
    upsert: async row => { saved = row; return writeFails ? { error: {} } : {}; },
    update: () => { const q = { eq: () => q, lte: async () => ({}) }; return q; }
  }) };
  setupCurationRoutes(r.app, { authenticateToken: auth, supabaseGetUserById: async () => ({ role }), supabase: database, curation: { list: async () => [] } });
  const body = { kind: 'music', title: 'Hello', artist: 'Adele', videoId: 'YQHsXMglC9A', status: 'verified', videoMatches: true, textMatches: true, translation: 'available' };
  assert.equal((await r.call('put', '/api/admin/curation', { body, role: 'admin' })).status, 403);
  role = 'admin';
  assert.equal((await r.call('put', '/api/admin/curation', { body: { ...body, textMatches: false } })).status, 400);
  assert.equal((await r.call('put', '/api/admin/curation', { body })).status, 200);
  assert.equal(saved.reviewed_by, 'student'); assert.equal(saved.content_key, 'hello|adele');
  writeFails = true;
  assert.equal((await r.call('post', '/api/curation/reports', { body: { ...body, reason: 'wrong_text' } })).status, 503);
});

test('native search serves reviewed videos and cannot resurrect a reported legacy curated result', async () => {
  const r = router();
  registerNativesRoutes(r.app, { contentCuration: { list: async () => [{ video_id: 'verified123', status: 'verified', video_matches: true, text_matches: true, reports: 0 }] } });
  assert.deepEqual((await r.call('get', '/api/natives/search', { query: { q: 'hello', lang: 'english' } })).data.verifiedVideoIds, ['verified123']);
  const old = router();
  registerNativesRoutes(old.app, {
    supabaseGetNativesCache: async key => key === buildNativesCuratedCacheKey('hello', 'english')
      ? { query: 'hello', lang: 'english', video_ids: JSON.stringify(['reported123','goodvideo12']), source: NATIVES_CURATED_CACHE_SOURCE }
      : key === buildNativesReportCacheKey('hello', 'english') ? { video_ids: JSON.stringify(['reported123']) } : null
  });
  const result = await old.call('get', '/api/natives/search', { query: { q: 'hello', lang: 'english' } });
  assert.deepEqual(result.data.videoIds, ['goodvideo12']);
});
