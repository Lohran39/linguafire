function normalizeMessageContent(content = '') {
  if (Array.isArray(content)) {
    return content
      .filter((part) => part && part.type === 'text')
      .map((part) => part.text || '')
      .join('\n')
      .trim();
  }
  return String(content || '');
}

function asGeminiContents(openaiMessages = []) {
  const systemParts = [];
  const contents = [];

  for (const message of openaiMessages) {
    const role = String(message?.role || 'user');
    const text = normalizeMessageContent(message?.content);
    if (!text) continue;

    if (role === 'system') {
      systemParts.push({ text });
      continue;
    }

    contents.push({
      role: role === 'assistant' ? 'model' : 'user',
      parts: [{ text }]
    });
  }

  return {
    contents,
    systemInstruction: systemParts.length ? { parts: systemParts } : undefined
  };
}

function pickTextFromGemini(responseJson = {}) {
  const parts = responseJson?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((part) => part?.text || '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

function stripThinkBlocks(text = '') {
  let cleaned = String(text).replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (cleaned.toLowerCase().includes('</think>')) {
    cleaned = cleaned.split(/<\/think>/i).pop().trim();
  }
  return cleaned;
}

function buildOpenAIChatResponse({ model, content, promptTokens = 0, completionTokens = 0 }) {
  return {
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content } }],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens
    }
  };
}

function normalizeGeminiModel(model = '') {
  const value = String(model || 'gemini-3.6-flash').trim();
  return value.startsWith('models/') ? value : `models/${value}`;
}

function createGeminiService(config = {}) {
  const {
    geminiBaseUrl = 'https://generativelanguage.googleapis.com',
    minimaxBaseUrl,
    geminiModel = 'gemini-3.6-flash',
    minimaxModel,
    openaiModelAlias = geminiModel,
    proxyTimeoutMs = 60000,
    fetchImpl = fetch
  } = config;

  const configuredModel = geminiModel || minimaxModel || 'gemini-3.6-flash';
  const configuredAlias = openaiModelAlias || configuredModel;
  const baseUrl = String(geminiBaseUrl || minimaxBaseUrl || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');

  async function postToGemini(payload, apiKey) {
    const modelPath = normalizeGeminiModel(payload.model || configuredModel);
    const url = `${baseUrl}/v1beta/${modelPath}:generateContent`;
    let lastError = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetchImpl(url, {
          method: 'POST',
          headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload.body),
          signal: AbortSignal.timeout(proxyTimeoutMs)
        });

        if (response.status >= 500 && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }

        return response;
      } catch (error) {
        lastError = error;
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }
      }
    }

    throw lastError || new Error('Gemini request failed');
  }

  async function callGeminiChat({ messages, temperature = 0.3, maxTokens, topP, requestedModel = configuredAlias, apiKey }) {
    if (!apiKey) {
      const err = new Error('GEMINI_API_KEY nao configurada.');
      err.status = 401;
      throw err;
    }

    const { contents, systemInstruction } = asGeminiContents(messages);
    const body = {
      contents: contents.length ? contents : [{ role: 'user', parts: [{ text: '' }] }],
      generationConfig: { temperature }
    };

    if (systemInstruction) body.systemInstruction = systemInstruction;
    if (maxTokens != null) body.generationConfig.maxOutputTokens = maxTokens;
    if (topP != null) body.generationConfig.topP = topP;

    let upstreamResponse;
    try {
      upstreamResponse = await postToGemini({ model: configuredModel, body }, apiKey);
    } catch (error) {
      const err = new Error('Gemini request failed');
      err.status = 502;
      err.detail = { proxy_error: 'Gemini request failed', error: error.message };
      throw err;
    }

    const rawBody = await upstreamResponse.text();
    if (upstreamResponse.status >= 400) {
      const err = new Error('Gemini request failed');
      err.status = upstreamResponse.status;
      err.detail = {
        proxy_error: 'Gemini request failed',
        upstream_status: upstreamResponse.status,
        body: rawBody
      };
      throw err;
    }

    let responseJson;
    try {
      responseJson = JSON.parse(rawBody);
    } catch (_error) {
      const err = new Error('Gemini returned non-JSON response');
      err.status = 502;
      err.detail = { proxy_error: 'Gemini returned non-JSON response', body: rawBody };
      throw err;
    }

    const content = stripThinkBlocks(pickTextFromGemini(responseJson));
    if (!content) {
      const finishReason = responseJson?.candidates?.[0]?.finishReason;
      const err = new Error(finishReason
        ? `Could not extract text from Gemini response. finishReason=${finishReason}`
        : 'Could not extract text from Gemini response');
      err.status = 502;
      err.detail = {
        proxy_error: 'Could not extract text from Gemini response',
        finish_reason: finishReason || null,
        raw: responseJson
      };
      throw err;
    }

    const usage = responseJson?.usageMetadata || {};
    return {
      model: requestedModel,
      content,
      usage: {
        promptTokens: Number(usage.promptTokenCount || 0),
        completionTokens: Number(usage.candidatesTokenCount || 0)
      },
      raw: responseJson
    };
  }

  return {
    callGeminiChat,
    callMiniMaxChat: callGeminiChat
  };
}

const createMiniMaxService = createGeminiService;
const asMiniMaxMessages = asGeminiContents;
const pickTextFromMiniMax = pickTextFromGemini;

module.exports = {
  asGeminiContents,
  pickTextFromGemini,
  asMiniMaxMessages,
  pickTextFromMiniMax,
  stripThinkBlocks,
  buildOpenAIChatResponse,
  createGeminiService,
  createMiniMaxService
};
