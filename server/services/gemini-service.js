const { setTimeout: delay } = require('node:timers/promises');

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
    .filter((part) => !part?.thought)
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
    geminiModel = 'gemini-3.6-flash',
    openaiModelAlias = geminiModel,
    proxyTimeoutMs = 60000,
    fetchImpl = fetch
  } = config;

  const configuredModel = geminiModel || 'gemini-3.6-flash';
  const configuredAlias = openaiModelAlias || configuredModel;
  const baseUrl = String(geminiBaseUrl || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');

  async function postToGemini(payload, apiKey, signal, attemptTimeoutMs = proxyTimeoutMs, fallbackModel, lowLatency) {
    let lastError = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        signal?.throwIfAborted();
        const model = attempt > 0 && fallbackModel ? fallbackModel : payload.model || configuredModel;
        const url = `${baseUrl}/v1beta/${normalizeGeminiModel(model)}:generateContent`;
        const generationConfig = { ...payload.body.generationConfig };
        if (lowLatency && /gemini-3[.-].*flash/i.test(model)) {
          generationConfig.thinkingConfig = { thinkingLevel: 'low' };
        } else if (lowLatency && /gemini-2\.5-flash/i.test(model)) {
          generationConfig.thinkingConfig = { thinkingBudget: 0 };
        }
        const attemptSignal = AbortSignal.timeout(attemptTimeoutMs);
        const response = await fetchImpl(url, {
          method: 'POST',
          headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ...payload.body, generationConfig }),
          signal: signal ? AbortSignal.any([signal, attemptSignal]) : attemptSignal
        });
        const rawBody = await response.text();

        if (response.status >= 500 && attempt === 0) {
          await delay(500, undefined, { signal });
          continue;
        }

        return { response, rawBody, providerModel: model };
      } catch (error) {
        if (signal?.aborted) throw signal.reason;
        lastError = error;
        if (attempt === 0) {
          await delay(500, undefined, { signal });
          continue;
        }
      }
    }

    throw lastError || new Error('Gemini request failed');
  }

  async function callGeminiChat({ messages, temperature = 0.3, maxTokens, topP, requestedModel = configuredAlias, apiKey,
    timeoutMs, attemptTimeoutMs, signal, responseSchema, lowLatency = false, fallbackModel }) {
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
    if (responseSchema) {
      body.generationConfig.responseMimeType = 'application/json';
      body.generationConfig.responseJsonSchema = responseSchema;
    }

    const deadline = timeoutMs == null ? null : AbortSignal.timeout(timeoutMs);
    const requestSignal = deadline && signal ? AbortSignal.any([deadline, signal]) : deadline || signal;

    let upstreamResponse;
    let rawBody;
    let providerModel;
    try {
      ({ response: upstreamResponse, rawBody, providerModel } = await postToGemini({ model: configuredModel, body }, apiKey, requestSignal, attemptTimeoutMs, fallbackModel, lowLatency));
    } catch (error) {
      const err = new Error('Gemini request failed');
      err.status = deadline?.aborted || error.name === 'TimeoutError' || error.cause?.name === 'TimeoutError' ? 504 : 502;
      err.detail = { proxy_error: 'Gemini request failed', error: error.message };
      throw err;
    }

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
      providerModel,
      content,
      usage: {
        promptTokens: Number(usage.promptTokenCount || 0),
        completionTokens: Number(usage.candidatesTokenCount || 0)
      },
      raw: responseJson
    };
  }

  return { callGeminiChat };
}

module.exports = {
  asGeminiContents,
  pickTextFromGemini,
  stripThinkBlocks,
  buildOpenAIChatResponse,
  createGeminiService
};
