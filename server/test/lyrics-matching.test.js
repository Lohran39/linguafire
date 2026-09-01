const test = require('node:test');
const assert = require('node:assert/strict');

const {
  LYRICS_APPROVED_CACHE_SOURCE,
  LYRICS_CACHE_VERSION,
  LYRICS_PROVIDER_CACHE_SOURCE,
  buildLyricsCacheKey,
  buildLyricsLookupCandidates,
  canWriteApprovedLyricsCache,
  isUsableLyricsCache,
  normalizeLyricsText,
  parseYouTubeMusicTitle,
  scoreMusicVideoCandidate,
  getLyricsMatchDetails,
  MIN_LYRICS_CONFIDENCE,
  scoreLyricsMatch,
  isReliableLyricsMatch
} = require('../routes/lyrics-routes');

test('parses common YouTube music titles without keeping video suffixes', () => {
  const parsed = parseYouTubeMusicTitle('Don Toliver - No Idea [Official Music Video]', 'DonToliverVEVO');

  assert.equal(parsed.trackOriginal, 'No Idea');
  assert.equal(parsed.artistOriginal, 'Don Toliver');
  assert.equal(parsed.track, 'no idea');
  assert.equal(parsed.artist, 'don toliver');
});

test('normalizes music metadata consistently', () => {
  assert.equal(normalizeLyricsText('Raindance (Official Audio) [HD]'), 'raindance');
  assert.equal(normalizeLyricsText('No Idea ft. Artist - Official Video'), 'no idea artist');
});

test('builds lyrics lookup variants without featured artists', () => {
  const candidates = buildLyricsLookupCandidates('Raindance ft. Tems', 'Dave');

  assert.deepEqual(candidates.slice(0, 2), [
    { track: 'Raindance ft. Tems', artist: 'Dave' },
    { track: 'Raindance', artist: 'Dave' }
  ]);
});

test('scores official music video above weak music search candidates', () => {
  const official = scoreMusicVideoCandidate({
    title: 'Dave - Raindance ft. Tems (Official Video)',
    author: 'DaveVEVO',
    durationSeconds: 218
  }, 'raindance');
  const weak = scoreMusicVideoCandidate({
    title: 'Raindance karaoke slowed remix 1 hour',
    author: 'Random Channel',
    durationSeconds: 3600
  }, 'raindance');

  assert.ok(official > weak);
});

test('accepts only lyrics that match both track and artist', () => {
  const correct = {
    trackName: 'No Idea',
    artistName: 'Don Toliver',
    plainLyrics: 'I know, I know, I know that you drunk'
  };
  const wrongArtist = {
    trackName: 'No Idea',
    artistName: 'Someone Else',
    plainLyrics: 'Wrong song'
  };
  const wrongTrack = {
    trackName: 'Rico',
    artistName: 'Don Toliver',
    plainLyrics: 'Wrong song'
  };

  assert.equal(isReliableLyricsMatch(correct, 'No Idea', 'Don Toliver'), true);
  assert.equal(isReliableLyricsMatch(wrongArtist, 'No Idea', 'Don Toliver'), false);
  assert.equal(isReliableLyricsMatch(wrongTrack, 'No Idea', 'Don Toliver'), false);
  assert.ok(scoreLyricsMatch(correct, 'No Idea', 'Don Toliver') >= MIN_LYRICS_CONFIDENCE);
  assert.ok(scoreLyricsMatch(correct, 'No Idea', 'Don Toliver') > scoreLyricsMatch(wrongTrack, 'No Idea', 'Don Toliver'));
});

test('rejects partial artist matches that commonly return wrong lyrics', () => {
  const wrongArtist = {
    trackName: 'Raindance',
    artistName: 'Dave East',
    plainLyrics: 'Wrong lyrics from another artist'
  };

  const details = getLyricsMatchDetails(wrongArtist, 'Raindance', 'Dave');

  assert.equal(details.trackAccepted, true);
  assert.equal(details.artistAccepted, false);
  assert.equal(isReliableLyricsMatch(wrongArtist, 'Raindance', 'Dave'), false);
});

test('rejects remixes and alternate versions unless explicitly requested', () => {
  const remix = {
    trackName: 'No Idea Remix',
    artistName: 'Don Toliver',
    plainLyrics: 'Wrong remix lyrics'
  };

  assert.equal(isReliableLyricsMatch(remix, 'No Idea', 'Don Toliver'), false);
});

test('lyrics cache keys are normalized and versioned', () => {
  assert.equal(
    buildLyricsCacheKey('No Idea [Official Music Video]', 'Don Toliver'),
    `${LYRICS_CACHE_VERSION}::don toliver::no idea`
  );
});

test('lyrics cache accepts approved rows without freshness limit', () => {
  const row = {
    track: 'No Idea',
    artist: 'Don Toliver',
    source: LYRICS_APPROVED_CACHE_SOURCE,
    lyrics_payload: JSON.stringify({
      plainLyrics: 'I know, I know, I know that you drunk',
      trackName: 'No Idea',
      artistName: 'Don Toliver'
    }),
    confidence: 999,
    updated_at: '2020-01-01T00:00:00.000Z'
  };

  assert.equal(isUsableLyricsCache(row, 'No Idea', 'Don Toliver'), true);
  assert.equal(isUsableLyricsCache({ ...row, artist: 'Someone Else' }, 'No Idea', 'Don Toliver'), false);
});

test('lyrics cache rejects stale or low confidence provider rows', () => {
  const baseRow = {
    track: 'No Idea',
    artist: 'Don Toliver',
    source: LYRICS_PROVIDER_CACHE_SOURCE,
    lyrics_payload: JSON.stringify({
      plainLyrics: 'I know, I know, I know that you drunk',
      trackName: 'No Idea',
      artistName: 'Don Toliver'
    }),
    confidence: MIN_LYRICS_CONFIDENCE,
    updated_at: new Date().toISOString()
  };

  assert.equal(isUsableLyricsCache(baseRow, 'No Idea', 'Don Toliver'), true);
  assert.equal(isUsableLyricsCache({ ...baseRow, confidence: MIN_LYRICS_CONFIDENCE - 1 }, 'No Idea', 'Don Toliver'), false);
  assert.equal(isUsableLyricsCache({ ...baseRow, updated_at: '2020-01-01T00:00:00.000Z' }, 'No Idea', 'Don Toliver'), false);
});

test('approved lyrics cache writes require token in production or local dev request', () => {
  const localReq = {
    ip: '127.0.0.1',
    headers: {}
  };
  const remoteReq = {
    ip: '203.0.113.10',
    headers: { authorization: 'Bearer secret-token' }
  };

  assert.equal(canWriteApprovedLyricsCache(localReq, { NODE_ENV: 'development' }), true);
  assert.equal(canWriteApprovedLyricsCache(localReq, { NODE_ENV: 'production' }), false);
  assert.equal(canWriteApprovedLyricsCache(remoteReq, { NODE_ENV: 'production', LYRICS_ADMIN_TOKEN: 'secret-token' }), true);
  assert.equal(canWriteApprovedLyricsCache(remoteReq, { NODE_ENV: 'production', LYRICS_ADMIN_TOKEN: 'other-token' }), false);
});
