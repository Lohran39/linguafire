const test = require('node:test');
const assert = require('node:assert/strict');
const { registerLyricsRoutes } = require('../routes/lyrics-routes');

const SEPARATOR = '\nLF_LINE_BREAK\n';

function translationHarness(t, deeplKey = '') {
  const previousKey = process.env.DEEPL_API_KEY;
  process.env.DEEPL_API_KEY = deeplKey;
  t.after(() => {
    if (previousKey === undefined) delete process.env.DEEPL_API_KEY;
    else process.env.DEEPL_API_KEY = previousKey;
  });

  const handlers = new Map();
  const cache = new Map();
  const app = {
    get: (path, handler) => handlers.set(`GET ${path}`, handler),
    post: (path, handler) => handlers.set(`POST ${path}`, handler)
  };
  registerLyricsRoutes(app, {
    logger: { warn() {} },
    supabaseGetTranslationCache: async key => cache.get(key),
    supabaseUpsertTranslationCache: async (key, value) => {
      cache.set(key, { translated_text: value.translatedText, provider: value.provider });
    }
  });
  return {
    cache,
    async translate(text) {
      const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
      };
      await handlers.get('POST /api/translate')({ method: 'POST', body: { q: text } }, res);
      return res;
    }
  };
}

function translatedResponse(text) {
  return Response.json({ responseStatus: 200, responseData: { translatedText: text } });
}

test('translation reuses the cache without another provider call', async t => {
  const harness = translationHarness(t);
  const requests = [];
  t.mock.method(global, 'fetch', async url => {
    requests.push(new URL(url));
    return translatedResponse('Bom dia');
  });

  const first = await harness.translate('Good morning');
  const second = await harness.translate('Good morning');
  assert.equal(first.statusCode, 200);
  assert.equal(first.body.provider, 'mymemory');
  assert.deepEqual(second.body, first.body);
  assert.equal(harness.cache.size, 1);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].hostname, 'api.mymemory.translated.net');
});

test('translation keeps DeepL first when configured', async t => {
  const harness = translationHarness(t, 'test:fx');
  const requests = [];
  t.mock.method(global, 'fetch', async url => {
    requests.push(new URL(url).hostname);
    return Response.json({ translations: [{ text: 'Bom dia' }] });
  });
  const result = await harness.translate('Good morning');
  assert.equal(result.body.provider, 'deepl');
  assert.deepEqual(requests, ['api-free.deepl.com']);
});

test('translation falls back to MyMemory, never Gemini, after a DeepL error', async t => {
  const harness = translationHarness(t, 'test:fx');
  const requests = [];
  t.mock.method(global, 'fetch', async url => {
    requests.push(new URL(url).hostname);
    return requests.length === 1
      ? Response.json({ error: 'unavailable' }, { status: 503 })
      : translatedResponse('Bom dia');
  });
  const result = await harness.translate('Good morning');
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.provider, 'mymemory');
  assert.deepEqual(requests, ['api-free.deepl.com', 'api.mymemory.translated.net']);
});

test('translation line fallback uses the same providers and preserves line order', async t => {
  const harness = translationHarness(t);
  const translations = new Map([['Good morning', 'Bom dia'], ['Good night', 'Boa noite']]);
  const block = [...translations.keys()].join(SEPARATOR);
  const requests = [];
  t.mock.method(global, 'fetch', async url => {
    const parsed = new URL(url);
    assert.equal(parsed.hostname, 'api.mymemory.translated.net');
    const text = parsed.searchParams.get('q');
    requests.push(text);
    return translatedResponse(translations.get(text) || 'Resposta sem separadores');
  });
  const result = await harness.translate(block);
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.provider, 'line-fallback');
  assert.equal(result.body.responseData.translatedText, [...translations.values()].join(SEPARATOR));
  assert.deepEqual(requests, [block, ...translations.keys()]);
});

test('translation batches reset the size counter instead of creating one request per remaining line', async t => {
  const harness = translationHarness(t);
  const lines = Array.from({ length: 6 }, (_, index) => `Line ${index} `.padEnd(200, 'x'));
  const requests = [];
  t.mock.method(global, 'fetch', async url => {
    const parsed = new URL(url);
    assert.equal(parsed.hostname, 'api.mymemory.translated.net');
    const text = parsed.searchParams.get('q');
    requests.push(text);
    return translatedResponse(text.split(SEPARATOR).map(line => `Traducao ${line}`).join(SEPARATOR));
  });
  const result = await harness.translate(lines.join(SEPARATOR));
  assert.equal(result.statusCode, 200);
  assert.deepEqual(requests, [lines.slice(0, 4).join(SEPARATOR), lines.slice(4).join(SEPARATOR)]);
  assert.equal(result.body.responseData.translatedText.split(SEPARATOR).length, lines.length);
});

test('translation failures are not saved as successful translations', async t => {
  const harness = translationHarness(t);
  t.mock.method(global, 'fetch', async () => Response.json({ error: 'unavailable' }, { status: 503 }));
  const result = await harness.translate('Good morning');
  assert.equal(result.statusCode, 502);
  assert.equal(result.body.responseStatus, 502);
  assert.equal(harness.cache.size, 0);
});
