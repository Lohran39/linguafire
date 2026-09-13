const { AsyncLocalStorage } = require('node:async_hooks');
const context = new AsyncLocalStorage();
const MAX_REQUEST_BYTES = 24000;
const MAX_PROMPT_BYTES = 32000;
const MAX_OUTPUT_TOKENS = 2048;
function requestIssue(body = {}) {
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_REQUEST_BYTES) return 'Envie um texto menor para esta atividade.';
  if (body.max_tokens != null && (!Number.isInteger(body.max_tokens) || body.max_tokens < 1 || body.max_tokens > MAX_OUTPUT_TOKENS)) return `A resposta deve ter no máximo ${MAX_OUTPUT_TOKENS} tokens.`;
  if (body.stream) return 'Streaming não está disponível nesta atividade.';
  return '';
}
function usageEvent({ model, metadata, failed, durationMs }, now = new Date()) {
  const n = key => Math.max(0, Number(metadata?.[key]) || 0);
  const inputTokens=n('promptTokenCount'), outputTokens=n('candidatesTokenCount'), thinkingTokens=n('thoughtsTokenCount'), cachedTokens=Math.min(inputTokens,n('cachedContentTokenCount'));
  const rates = {
    'gemini-3.1-flash-lite': [0.25,1.50,0.025], 'gemini-2.5-flash-lite':[0.10,0.40,0.01],
    'gemini-3.5-flash-lite':[0.30,2.50,0.03],
    'gemini-3.6-flash': now < new Date('2027-01-01T00:00:00Z') ? [0.75,3.75,0.075] : [1.50,7.50,0.15]
  };
  const rate=rates[String(model).replace(/^models\//,'')];
  const known = rate && Number.isFinite(metadata?.promptTokenCount) && Number.isFinite(metadata?.candidatesTokenCount);
  return { plan: context.getStore()?.plan || 'operation', model, failed, durationMs, inputTokens, outputTokens, thinkingTokens, cachedTokens,
    estimatedUsd: known ? ((inputTokens-cachedTokens)*rate[0]+cachedTokens*rate[2]+(outputTokens+thinkingTokens)*rate[1])/1e6 : null };
}
module.exports = { context, requestIssue, usageEvent, MAX_REQUEST_BYTES, MAX_PROMPT_BYTES, MAX_OUTPUT_TOKENS };
