const { buildOpenAIChatResponse } = require('../services/minimax-service');

function setupAIRoutes(app, deps = {}) {
  const {
    authenticateToken,
    checkAILimit,
    callMiniMaxChat,
    getBearerToken,
    aiApiKey = '',
    openaiModelAlias = 'gemini-3.6-flash'
  } = deps;

  async function handleChatCompletion(req, res) {
    const apiKey = aiApiKey || getBearerToken(req);
    if (!apiKey) {
      return res.status(401).json({ error: 'GEMINI_API_KEY nao configurada e nenhum Bearer enviado.' });
    }

    const body = req.body || {};
    const openaiMessages = Array.isArray(body.messages) ? body.messages : [];
    if (!openaiMessages.length) {
      return res.status(400).json({ error: "Missing 'messages' list." });
    }

    if (body.stream) {
      return res.status(400).json({ error: 'Streaming ainda nao suportado neste proxy.' });
    }

    const requestedModel = body.model || openaiModelAlias;

    try {
      const result = await callMiniMaxChat({
        messages: openaiMessages,
        temperature: body.temperature ?? 0.3,
        maxTokens: body.max_tokens,
        topP: body.top_p,
        requestedModel,
        apiKey
      });

      return res.json(buildOpenAIChatResponse({
        model: requestedModel,
        content: result.content,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens
      }));
    } catch (error) {
      return res.status(error.status || 502).json(error.detail || { error: error.message });
    }
  }

  app.post('/chat/completions', authenticateToken, checkAILimit, handleChatCompletion);
  app.post('/v1/chat/completions', authenticateToken, checkAILimit, handleChatCompletion);
}

module.exports = { setupAIRoutes };
