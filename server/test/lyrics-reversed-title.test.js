const test = require('node:test');
const assert = require('node:assert/strict');
const { registerLyricsRoutes } = require('../routes/lyrics-routes');

test('No Pole lyrics load from reversed upload metadata and saved song fields', async t => {
  const calls = [];
  t.mock.method(global, 'fetch', async input => {
    const url = new URL(input); calls.push(url);
    const matches = url.searchParams.get('track_name') === 'No Pole' && url.searchParams.get('artist_name') === 'Don Toliver';
    return new Response(JSON.stringify(matches
      ? { trackName: 'No Pole', artistName: 'Don Toliver', syncedLyrics: '[00:01.00]Synthetic test line', duration: 188 }
      : { message: 'not found' }), { status: matches ? 200 : 404 });
  });
  const handlers = {};
  registerLyricsRoutes({ get: (path, handler) => { handlers[path] = handler; }, post() {} });
  for (const source of [{ video_title: 'No Pole - Don Toliver | Clean Version', channel_name: 'Clean Version' }, {}]) {
    let payload, status = 200;
    const res = { status(code) { status = code; return this; }, json(data) { payload = data; return this; } };
    await handlers['/api/lyrics/find']({ query: { track_name: 'Don Toliver | Clean Version', artist_name: 'No Pole', ...source } }, res);
    assert.equal(status, 200); assert.equal(payload.success, true);
    assert.equal(payload.trackName, 'No Pole'); assert.equal(payload.artistName, 'Don Toliver');
    assert.equal(payload.mode, 'synced'); assert.match(payload.syncedLyrics, /Synthetic test line/);
  }
  assert.equal(calls.length, 4);
});

test('reversed metadata cannot accept a different artist', async t => {
  t.mock.method(global, 'fetch', async () => new Response(JSON.stringify({
    trackName: 'No Pole', artistName: 'Another Artist', syncedLyrics: '[00:01.00]Wrong match'
  })));
  const { findReliableLyrics } = require('../routes/lyrics-routes');
  assert.equal(await findReliableLyrics('Don Toliver | Clean Version', 'No Pole'), null);
});
