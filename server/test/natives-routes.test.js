const test = require('node:test');
const assert = require('node:assert/strict');

const {
  NATIVES_CACHE_SOURCE,
  NATIVES_CURATED_CACHE_SOURCE,
  NATIVES_EMPTY_CACHE_SOURCE,
  NATIVES_FALLBACK_CACHE_SOURCE,
  NATIVES_MIN_SCORE,
  NATIVES_REPORT_CACHE_SOURCE,
  NATIVES_REPORT_CACHE_VERSION,
  buildNativesCacheKey,
  buildNativesCuratedCacheKey,
  buildNativesEmptyCacheKey,
  buildNativesReportCacheKey,
  buildNativesSearchQueries,
  canWriteCuratedNativesCache,
  getYouTubeLocale,
  hasExactPhraseMatch,
  hasMainTermsMatch,
  isBlockedNativeCandidate,
  isUsableCuratedNativesCache,
  isUsableEmptyNativesCache,
  isShortNativeVideo,
  isStrictNativesCandidate,
  isUsableNativesCache,
  normalizeNativesText,
  parseCachedVideoIds,
  parseYouTubeDuration,
  sanitizeNativesQuery,
  scoreNativesCandidate
} = require('../routes/natives-routes');

test('normalizes native search text consistently', () => {
  assert.equal(normalizeNativesText('  Me, and YOU!  '), 'me and you');
  assert.equal(normalizeNativesText('Café com leite'), 'cafe com leite');
  assert.equal(sanitizeNativesQuery('Translate "Can I have" in English'), 'can i have');
});

test('native cache key is versioned to ignore old loose results', () => {
  assert.equal(buildNativesCacheKey('Me and You', 'english'), 'strict-v5::english::me and you');
  assert.equal(buildNativesCuratedCacheKey('Me and You', 'english'), 'curated-v1::english::me and you');
  assert.equal(buildNativesEmptyCacheKey('Me and You', 'english'), 'empty-v1::english::me and you');
  assert.equal(buildNativesReportCacheKey('Me and You', 'english'), 'reported-v1::english::me and you');
  assert.equal(NATIVES_REPORT_CACHE_VERSION, 'reported-v1');
  assert.equal(NATIVES_REPORT_CACHE_SOURCE, 'reported-bad-video-v1');
});

test('exact phrase matching respects word boundaries', () => {
  assert.equal(hasExactPhraseMatch('give up', 'Native speakers say give up in this short clip'), true);
  assert.equal(hasExactPhraseMatch('give up', 'This is about giving up too early'), false);
  assert.equal(hasExactPhraseMatch('me and you', 'Conversation practice: me and you #shorts'), true);
});

test('short native candidates require short duration and real speech context', () => {
  const goodCandidate = {
    videoId: 'abc123XYZ_1',
    title: 'Me and you - native English conversation #shorts',
    author: 'Real English Clips',
    durationSeconds: 42
  };

  assert.equal(isShortNativeVideo(goodCandidate), true);
  assert.equal(isStrictNativesCandidate(goodCandidate, 'me and you'), true);
  assert.ok(scoreNativesCandidate(goodCandidate, 'me and you') >= NATIVES_MIN_SCORE);
});

test('native candidates need the phrase in title or description, not only channel name', () => {
  const badCandidate = {
    videoId: 'abc123XYZ_1',
    title: 'Native speaker explains a common phrase #shorts',
    author: 'Me and You English',
    description: 'Short clip',
    durationSeconds: 35
  };

  assert.equal(isStrictNativesCandidate(badCandidate, 'me and you'), false);
  assert.equal(scoreNativesCandidate(badCandidate, 'me and you'), -1000);
});

test('native candidates can match the main terms of a practical phrase', () => {
  const airportCandidate = {
    videoId: 'abc123XYZ_1',
    title: 'Flight delayed? Real airport conversation #shorts',
    author: 'Native English Clips',
    description: 'A short real life dialogue at the airport.',
    durationSeconds: 38
  };

  assert.equal(hasExactPhraseMatch('Is my flight delayed?', airportCandidate.title), false);
  assert.equal(hasMainTermsMatch('Is my flight delayed?', airportCandidate.title), true);
  assert.equal(isStrictNativesCandidate(airportCandidate, 'Is my flight delayed?'), true);
  assert.ok(scoreNativesCandidate(airportCandidate, 'Is my flight delayed?') >= NATIVES_MIN_SCORE);
});

test('native candidates longer than one minute are rejected', () => {
  const longCandidate = {
    videoId: 'abc123XYZ_1',
    title: 'Me and you - native English conversation #shorts',
    author: 'Real English Clips',
    description: 'A short style lesson',
    durationSeconds: 75
  };

  assert.equal(isShortNativeVideo(longCandidate), false);
  assert.equal(isStrictNativesCandidate(longCandidate, 'me and you'), false);
});

test('music, topic and long videos are rejected even with exact title', () => {
  const musicCandidate = {
    videoId: 'abc123XYZ_1',
    title: 'Raindance',
    author: 'Dave - Topic',
    durationSeconds: 190
  };

  assert.equal(isBlockedNativeCandidate(musicCandidate), true);
  assert.equal(isShortNativeVideo(musicCandidate), false);
  assert.equal(isStrictNativesCandidate(musicCandidate, 'raindance'), false);
  assert.equal(scoreNativesCandidate(musicCandidate, 'raindance'), -1000);
});

test('lesson/pronunciation videos are rejected from native context results', () => {
  const pronunciationCandidate = {
    videoId: 'abc123XYZ_1',
    title: 'American English Pronunciation Practice: rights rides rise rice',
    author: 'PerfectlyPronounced English',
    durationSeconds: 16
  };

  assert.equal(isBlockedNativeCandidate(pronunciationCandidate), true);
  assert.equal(isStrictNativesCandidate(pronunciationCandidate, 'rights'), false);
});

test('native cache only accepts current source, fresh date and matching query/lang', () => {
  const row = {
    query: 'give up',
    lang: 'english',
    source: NATIVES_CACHE_SOURCE,
    video_ids: JSON.stringify(['abc123XYZ_1', 'too-short']),
    updated_at: new Date().toISOString()
  };

  assert.deepEqual(parseCachedVideoIds(row.video_ids), ['abc123XYZ_1']);
  assert.equal(isUsableNativesCache(row, 'give up', 'english'), true);
  assert.equal(isUsableNativesCache({ ...row, source: NATIVES_FALLBACK_CACHE_SOURCE }, 'give up', 'english'), true);
  assert.equal(isUsableNativesCache({ ...row, source: 'verified-short' }, 'give up', 'english'), false);
  assert.equal(isUsableNativesCache(row, 'give in', 'english'), false);
  assert.equal(isUsableNativesCache(row, 'give up', 'english-uk'), false);
});

test('youtube duration parser supports short ISO 8601 durations', () => {
  assert.equal(parseYouTubeDuration('PT45S'), 45);
  assert.equal(parseYouTubeDuration('PT1M'), 60);
  assert.equal(parseYouTubeDuration('PT1M05S'), 65);
  assert.equal(parseYouTubeDuration('PT1H2M3S'), 3723);
  assert.equal(parseYouTubeDuration('bad-duration'), 0);
});

test('curated native cache is separate from automatic strict cache', () => {
  const row = {
    query: 'give up',
    lang: 'english',
    source: NATIVES_CURATED_CACHE_SOURCE,
    video_ids: JSON.stringify(['abc123XYZ_1']),
    updated_at: '2020-01-01T00:00:00.000Z'
  };

  assert.equal(isUsableCuratedNativesCache(row, 'give up', 'english'), true);
  assert.equal(isUsableCuratedNativesCache({ ...row, source: NATIVES_CACHE_SOURCE }, 'give up', 'english'), false);
  assert.equal(isUsableNativesCache(row, 'give up', 'english'), false);
});

test('empty native cache stores verified no-match results briefly', () => {
  const row = {
    query: 'me and you',
    lang: 'english',
    source: NATIVES_EMPTY_CACHE_SOURCE,
    video_ids: JSON.stringify([]),
    updated_at: new Date().toISOString()
  };

  assert.equal(isUsableEmptyNativesCache(row, 'me and you', 'english'), true);
  assert.equal(isUsableEmptyNativesCache({ ...row, source: NATIVES_CACHE_SOURCE }, 'me and you', 'english'), false);
  assert.equal(isUsableEmptyNativesCache({ ...row, video_ids: JSON.stringify(['abc123XYZ_1']) }, 'me and you', 'english'), false);
});

test('native search queries are strict and avoid music results', () => {
  const queries = buildNativesSearchQueries('me and you', 'english-us');

  assert.ok(queries.length >= 3);
  assert.ok(queries.every((query) => query.includes('"me and you"')));
  assert.ok(queries.every((query) => query.includes('-lyrics')));
  assert.ok(queries.every((query) => query.includes('-song')));
  assert.ok(queries.every((query) => query.includes('-music')));
});

test('native search queries support single words without broken quoting', () => {
  const queries = buildNativesSearchQueries('serendipity', 'english');

  assert.ok(queries.length >= 3);
  assert.ok(queries.every((query) => query.includes('serendipity')));
  assert.ok(queries.every((query) => !query.includes('"serendipity"')));
});

test('youtube locale follows selected language variant', () => {
  assert.deepEqual(getYouTubeLocale('english-us'), { relevanceLanguage: 'en', regionCode: 'US' });
  assert.deepEqual(getYouTubeLocale('english-uk'), { relevanceLanguage: 'en', regionCode: 'GB' });
  assert.deepEqual(getYouTubeLocale('spanish'), { relevanceLanguage: 'es', regionCode: 'ES' });
});

test('curated native cache writes require token in production or local dev request', () => {
  const localReq = {
    ip: '::ffff:127.0.0.1',
    headers: {}
  };
  const remoteReq = {
    ip: '203.0.113.10',
    headers: { authorization: 'Bearer natives-secret' }
  };

  assert.equal(canWriteCuratedNativesCache(localReq, { NODE_ENV: 'development' }), true);
  assert.equal(canWriteCuratedNativesCache(localReq, { NODE_ENV: 'production' }), false);
  assert.equal(canWriteCuratedNativesCache(remoteReq, { NODE_ENV: 'production', NATIVES_ADMIN_TOKEN: 'natives-secret' }), true);
  assert.equal(canWriteCuratedNativesCache(remoteReq, { NODE_ENV: 'production', NATIVES_ADMIN_TOKEN: 'other-token' }), false);
});
