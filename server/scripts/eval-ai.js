// Opt-in real-provider evaluation: synthetic inputs only, never customer chats.
require('dotenv').config({ quiet: true });
const fs = require('node:fs');
const { cases, evaluateReply } = require('../evals/conversation-cases');
const { CONVERSATION_TOPICS, buildConversationSystemPrompt } = require('../routes/conversation-routes');
const { createGeminiService } = require('../services/gemini-service');

async function main() {
  if (process.env.AI_EVAL_LIVE !== '1') throw new Error('Set AI_EVAL_LIVE=1 to run 20 paid provider requests.');
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY required');
  const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const { callGeminiChat } = createGeminiService({ geminiModel: model });
  const results = [];
  for (const item of cases) {
    const started = Date.now();
    try {
      const result = await callGeminiChat({ apiKey: process.env.GEMINI_API_KEY, requestedModel: model,
        temperature: 0.55, maxTokens: 180, timeoutMs: 25000,
        messages: [{ role: 'system', content: buildConversationSystemPrompt(CONVERSATION_TOPICS.find(t => t.id === item.topicId), 'A2') },
          { role: 'user', content: item.input }] });
      results.push({ id: item.id, failures: evaluateReply(item, result.content), reply: result.content, model: result.providerModel, durationMs: Date.now() - started });
    } catch (error) {
      results.push({ id: item.id, failures: ['provider_error'], status: error.status || 502 });
      break; // Do not keep consuming quota when the provider is unavailable.
    }
  }
  const report = { createdAt: new Date().toISOString(), model, expected: cases.length, completed: results.length,
    passed: results.filter(r => r.failures.length === 0).length, results };
  fs.writeFileSync(process.env.AI_EVAL_REPORT || '/tmp/linguafire-ai-eval.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ expected: report.expected, completed: report.completed, passed: report.passed }));
  if (report.passed !== cases.length) process.exitCode = 1;
}
main().catch(() => { console.error('AI evaluation failed. Check opt-in, credentials and provider configuration.'); process.exitCode = 1; });
