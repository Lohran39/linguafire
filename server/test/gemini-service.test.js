const assert = require('node:assert/strict');
const test = require('node:test');
const { setTimeout: delay } = require('node:timers/promises');

const {
  asGeminiContents,
  createGeminiService,
  pickTextFromGemini
} = require('../services/minimax-service');

test('asGeminiContents maps OpenAI-style messages to Gemini contents', () => {
  const result = asGeminiContents([
    { role: 'system', content: 'You are concise.' },
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi' }
  ]);

  assert.deepEqual(result.systemInstruction, { parts: [{ text: 'You are concise.' }] });
  assert.deepEqual(result.contents, [
    { role: 'user', parts: [{ text: 'Hello' }] },
    { role: 'model', parts: [{ text: 'Hi' }] }
  ]);
});

test('pickTextFromGemini joins candidate text parts', () => {
  assert.equal(
    pickTextFromGemini({
      candidates: [{ content: { parts: [{ text: 'Hello' }, { text: 'world' }] } }]
    }),
    'Hello\nworld'
  );
});

test('Gemini excludes internal thought parts from learner feedback', () => {
  assert.equal(pickTextFromGemini({ candidates: [{ content: { parts: [
    { text: 'Internal analysis', thought: true }, { text: 'Hello' }
  ] } }] }), 'Hello');
});

test('native coach options request structured output and lower thinking without changing other callers', async () => {
  const bodies = [];
  const service = createGeminiService({
    fetchImpl: async (_url, options) => {
      bodies.push(JSON.parse(options.body));
      return Response.json({ candidates: [{ content: { parts: [{ text: '{}' }] } }] });
    }
  });
  const responseSchema = { type: 'object', properties: { score: { type: 'integer' } } };
  await service.callGeminiChat({ apiKey: 'test', messages: [], responseSchema, lowLatency: true, maxTokens: 2048 });
  await service.callGeminiChat({ apiKey: 'test', messages: [] });
  assert.deepEqual(bodies[0].generationConfig, { temperature: 0.3, maxOutputTokens: 2048,
    responseMimeType: 'application/json', responseJsonSchema: responseSchema, thinkingConfig: { thinkingLevel: 'low' } });
  assert.deepEqual(bodies[1].generationConfig, { temperature: 0.3 });
});

test('Gemini total deadline also bounds response body reading and stops retries', async () => {
  let calls = 0;
  const service = createGeminiService({ fetchImpl: async (_url, options) => {
    calls += 1;
    return { status: 200, text: () => delay(200, 'slow body', { signal: options.signal }) };
  } });
  await assert.rejects(service.callGeminiChat({ apiKey: 'test', messages: [], timeoutMs: 20 }), { status: 504 });
  assert.equal(calls, 1);
});

test('Gemini retries a transient 503 within the same request', async () => {
  let calls = 0;
  const service = createGeminiService({ fetchImpl: async () => {
    calls += 1;
    return calls === 1 ? new Response('', { status: 503 }) : Response.json({ candidates: [{ content: { parts: [{ text: 'Recovered' }] } }] });
  } });
  const result = await service.callGeminiChat({ apiKey: 'test', messages: [], timeoutMs: 2000 });
  assert.equal(result.content, 'Recovered');
  assert.equal(calls, 2);
});

test('Gemini does not retry exhausted quota', async () => {
  let calls = 0;
  const service = createGeminiService({ fetchImpl: async () => {
    calls += 1;
    return new Response('', { status: 429 });
  } });
  await assert.rejects(service.callGeminiChat({ apiKey: 'test', messages: [], timeoutMs: 1000 }), { status: 429 });
  assert.equal(calls, 1);
});

test('Gemini retries a stalled attempt without extending the total deadline', async () => {
  let calls = 0;
  const service = createGeminiService({ fetchImpl: async (_url, options) => {
    calls += 1;
    if (calls === 1) await delay(200, undefined, { signal: options.signal });
    return Response.json({ candidates: [{ content: { parts: [{ text: 'Recovered' }] } }] });
  } });
  const result = await service.callGeminiChat({ apiKey: 'test', messages: [], timeoutMs: 2000, attemptTimeoutMs: 20 });
  assert.equal(calls, 2);
  assert.equal(result.content, 'Recovered');
});

test('Gemini uses the configured fallback only after transient failure', async () => {
  const urls = [];
  const service = createGeminiService({ fetchImpl: async (url) => {
    urls.push(url);
    return urls.length === 1 ? new Response('', { status: 503 }) : Response.json({ candidates: [{ content: { parts: [{ text: 'Recovered' }] } }] });
  } });
  const result = await service.callGeminiChat({ apiKey: 'test', messages: [], timeoutMs: 2000, fallbackModel: 'gemini-3.1-flash-lite' });
  assert.match(urls[0], /gemini-3\.6-flash:generateContent$/);
  assert.match(urls[1], /gemini-3\.1-flash-lite:generateContent$/);
  assert.equal(result.providerModel, 'gemini-3.1-flash-lite');
});

test('createGeminiService calls generateContent and returns OpenAI-compatible usage', async () => {
  const calls = [];
  const service = createGeminiService({
    geminiBaseUrl: 'https://generativelanguage.googleapis.com',
    geminiModel: 'gemini-3.6-flash',
    openaiModelAlias: 'gemini-3.6-flash',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: 'Resposta ok' }] } }],
        usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 2 }
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
  });

  const result = await service.callGeminiChat({
    messages: [{ role: 'user', content: 'Teste' }],
    apiKey: 'test-key'
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent');
  assert.equal(calls[0].options.headers['x-goog-api-key'], 'test-key');
  assert.deepEqual(JSON.parse(calls[0].options.body).contents, [
    { role: 'user', parts: [{ text: 'Teste' }] }
  ]);
  assert.equal(result.content, 'Resposta ok');
  assert.deepEqual(result.usage, { promptTokens: 3, completionTokens: 2 });
});
