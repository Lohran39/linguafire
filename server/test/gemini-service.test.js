const assert = require('node:assert/strict');
const test = require('node:test');

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
