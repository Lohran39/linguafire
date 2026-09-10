import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { fetchSongLyrics, searchMusicByName, translateLyricLines } from '../src/services/lyrics.ts';

function mockTextDecoder(t) {
  const original = globalThis.document;
  // These fixtures contain plain text; entity decoding is exercised by the browser tests.
  globalThis.document = { createElement: () => ({ innerHTML: '', get value() { return this.innerHTML; } }) };
  t.after(() => {
    if (original === undefined) delete globalThis.document;
    else globalThis.document = original;
  });
}

function translation(text) {
  return Response.json({ responseStatus: 200, responseData: { translatedText: text } });
}

test('original lyrics and timings arrive before a slow translation', async t => {
  mockTextDecoder(t);
  let release;
  const delayed = new Promise(resolve => { release = resolve; });
  t.mock.method(globalThis, 'fetch', async url => url.startsWith('/api/lyrics')
    ? Response.json({ success: true, synced: true, syncedLyrics: '[00:05.50]A fictional morning begins', source: 'fixture' })
    : delayed);
  const updates = [];
  const result = fetchSongLyrics('Fixture', 'Test', 80, undefined, { onProgress: lines => updates.push(lines) });
  await setImmediate();
  assert.equal(updates.length, 1);
  assert.equal(updates[0][0].en, 'A fictional morning begins');
  assert.equal(updates[0][0].time, 5.5);
  assert.equal(updates[0][0].pt, '');
  assert.equal(updates[0][0].translationStatus, 'pending');
  release(translation('Uma manhã fictícia começa'));
  const lines = await result;
  assert.equal(lines[0].translationStatus, 'ready');
  assert.equal(lines[0].pt, 'Uma manhã fictícia começa');
  assert.equal(lines[0].time, 5.5);
});

test('a cancelled translation propagates cancellation instead of caching a fallback', async t => {
  mockTextDecoder(t);
  const controller = new AbortController();
  let providerSignal;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (url.startsWith('/api/lyrics')) return Response.json({ success: true, plainLyrics: 'A cancelled fictional verse' });
    providerSignal = options.signal;
    return new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true }));
  });
  const result = fetchSongLyrics('Cancel fixture', 'Test', 80, undefined, { signal: controller.signal });
  const rejection = assert.rejects(result, { name: 'AbortError' });
  await setImmediate();
  controller.abort();
  await rejection;
  assert.equal(providerSignal.aborted, true);
});

test('translation failure preserves original lines and retry does not fetch lyrics again', async t => {
  mockTextDecoder(t);
  t.mock.method(console, 'error', () => {});
  const requests = [];
  let failing = true;
  t.mock.method(globalThis, 'fetch', async url => {
    requests.push(url);
    if (url.startsWith('/api/lyrics')) return Response.json({ success: true, plainLyrics: 'An imaginary retry example' });
    return failing ? Response.json({ error: 'unavailable' }, { status: 503 }) : translation('Um exemplo imaginário de nova tentativa');
  });
  const lines = await fetchSongLyrics('Retry fixture', 'Test');
  assert.equal(lines[0].en, 'An imaginary retry example');
  assert.equal(lines[0].translationStatus, 'unavailable');
  failing = false;
  const retried = await translateLyricLines(lines);
  assert.equal(retried[0].translationStatus, 'ready');
  assert.equal(requests.filter(url => url.startsWith('/api/lyrics')).length, 1);
  assert.equal(requests.filter(url => url === '/api/translate').length, 2);
});

test('a malformed translated batch is not assigned to the wrong original lines or cached', async t => {
  mockTextDecoder(t);
  let requests = 0;
  const originals = ['First imaginary batch phrase', 'Second imaginary batch phrase'].map(en => ({ en, pt: '', explain: '', translationStatus: 'pending' }));
  t.mock.method(globalThis, 'fetch', async () => {
    requests += 1;
    return translation('Resposta única para um lote incorreto');
  });
  const lines = await translateLyricLines(originals);
  assert.ok(lines.every(line => line.translationStatus === 'unavailable'));
  await translateLyricLines(lines);
  assert.equal(requests, 2);
});

test('search times out and only records anonymous stage timings', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let signal;
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    signal = options.signal;
    return new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
  });
  const result = searchMusicByName('private search terms');
  const rejection = assert.rejects(result, /demorou demais/);
  t.mock.timers.tick(20000);
  await rejection;
  assert.equal(signal.aborted, true);
  const last = performance.getEntriesByName('linguafire:music:video-search').at(-1);
  assert.deepEqual(last.detail, { outcome: 'timeout' });
  assert.ok(!JSON.stringify(last).includes('private search terms'));
});

test('empty lyrics do not trigger translation requests', async t => {
  let count = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    count += 1;
    return Response.json({ success: true, plainLyrics: '' });
  });
  await assert.rejects(fetchSongLyrics('Empty fixture', 'Test'), /vazia/);
  assert.equal(count, 1);
});
