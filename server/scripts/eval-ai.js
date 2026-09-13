// Opt-in real-provider evaluation: synthetic inputs only, never customer chats.
require('dotenv').config({ quiet: true });
const fs = require('node:fs');
const { cases, evaluateReply } = require('../evals/conversation-cases');
const suite = [...cases, ...require('../evals/pedagogy-cases')];
const { CONVERSATION_TOPICS, buildConversationSystemPrompt, CONVERSATION_GENERATION } = require('../routes/conversation-routes');
const { createGeminiService } = require('../services/gemini-service');

async function main() {
  if (process.env.AI_EVAL_LIVE !== '1') throw new Error('Set AI_EVAL_LIVE=1 to run 30 synthetic cases; retries may add requests.');
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY required');
  const model = process.env.AI_EVAL_MODEL || process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const { callGeminiChat } = createGeminiService({ geminiModel: model, geminiBaseUrl: process.env.GEMINI_BASE_URL });
  const results = [];
  for (const item of suite) {
    const started = Date.now();
    try {
      const result = await callGeminiChat({ apiKey: process.env.GEMINI_API_KEY, requestedModel: model,
        ...CONVERSATION_GENERATION,
        messages: [{ role: 'system', content: buildConversationSystemPrompt(CONVERSATION_TOPICS.find(t => t.id === item.topicId), item.level || 'A2') },
          { role: 'user', content: item.input }] });
      results.push({ id: item.id, topic: item.topicId, level: item.level || 'A2', input: item.input,
        expectedCorrection: item.correction, reviewGuidance: item.review,
        pedagogicalReview: { status: 'pending', correctionNecessary: null, meaningPreserved: null, explanationAccurate: null, levelAppropriate: null, naturalReply: null },
        failures: evaluateReply(item, result.content), reply: result.content, model: result.providerModel, usage: result.usage, durationMs: Date.now() - started });
    } catch (error) {
      results.push({ id: item.id, failures: ['provider_error'], status: error.status || 502 });
      break; // Do not keep consuming quota when the provider is unavailable.
    }
  }
  const report = { createdAt: new Date().toISOString(), model, expected: suite.length, attempted: results.length,
    completed: results.filter(r => typeof r.reply === 'string').length, notRun: suite.length - results.length,
    status: results.some(r => r.failures.includes('provider_error')) ? 'provider_blocked' : 'completed',
    pedagogicalStatus: 'pending_review', automaticPassed: results.filter(r => r.failures.length === 0).length, results };
  fs.writeFileSync(process.env.AI_EVAL_REPORT || '/tmp/linguafire-ai-eval.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, results: undefined }));
  if (report.automaticPassed !== suite.length) process.exitCode = 1;
}
main().catch(() => { fs.writeFileSync(process.env.AI_EVAL_REPORT || '/tmp/linguafire-ai-eval.json', JSON.stringify({status:'configuration_blocked',completed:0,expected:suite.length,pedagogicalStatus:'not_evaluated',createdAt:new Date().toISOString()},null,2)); console.error('AI evaluation failed. Check opt-in, credentials and provider configuration.'); process.exitCode = 1; });
