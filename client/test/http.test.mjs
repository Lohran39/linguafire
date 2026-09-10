import test from 'node:test';
import assert from 'node:assert/strict';
import { createJsonParser } from '../src/services/http.ts';

const parseJson = createJsonParser('Falha ao carregar dados.');

test('JSON parser preserves objects and arrays returned by the API', async () => {
  for (const value of [{ success: true }, {}, [{ id: 1 }]]) {
    assert.deepEqual(await parseJson(Response.json(value)), value);
  }
});

test('JSON parser prefers a readable API message over an error code', async () => {
  await assert.rejects(parseJson(Response.json({
    error: 'limit_reached', message: 'Limite diario atingido.'
  }, { status: 403 })), { message: 'Limite diario atingido.' });
});

test('JSON parser accepts the error field and safely handles non-string errors', async () => {
  await assert.rejects(parseJson(Response.json({ error: 'Nao autorizado.' }, { status: 401 })), {
    message: 'Nao autorizado.'
  });
  for (const value of [null, { error: { code: 500 } }, { error: '', message: ' ' }]) {
    await assert.rejects(parseJson(Response.json(value, { status: 500 })), {
      message: 'Falha ao carregar dados.'
    });
  }
});

test('JSON parser rejects malformed or empty success responses instead of fabricating data', async () => {
  for (const response of [
    new Response('<html>Gateway error</html>'),
    new Response(''),
    Response.json(null),
    Response.json('unexpected text'),
    new Response('<html>Error</html>', { status: 502 })
  ]) {
    await assert.rejects(parseJson(response), { message: 'Falha ao carregar dados.' });
  }
});

test('JSON parser does not swallow cancellation while reading the body', async () => {
  const abort = new DOMException('Aborted', 'AbortError');
  await assert.rejects(parseJson({ ok: true, json: async () => { throw abort; } }), error => error === abort);
});
