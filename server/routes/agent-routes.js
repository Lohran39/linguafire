function parseAgentResponse(text = '') {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch (_error) {
    let depth = 0;
    let inString = false;
    let escaping = false;
    let start = -1;

    for (let index = 0; index < trimmed.length; index += 1) {
      const char = trimmed[index];
      if (escaping) { escaping = false; continue; }
      if (char === '\\') { escaping = true; continue; }
      if (char === '"') { inString = !inString; continue; }
      if (inString) continue;

      if (char === '{') {
        if (depth === 0) start = index;
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
        if (depth === 0 && start !== -1) {
          const candidate = trimmed.slice(start, index + 1);
          try {
            return JSON.parse(candidate);
          } catch (_candidateError) {
            start = -1;
          }
        }
      }
    }

    const match = trimmed.match(/```json\s*([\s\S]*?)```/i) || trimmed.match(/```([\s\S]*?)```/);
    if (match) return JSON.parse(match[1].trim());
    throw new Error('Model did not return valid JSON.');
  }
}

function setupAgentRoutes(app, deps = {}) {
  const {
    callMiniMaxChat,
    getBearerToken,
    agentTools,
    aiApiKey = '',
    openaiModelAlias = 'gemini-3.6-flash',
    agentMaxSteps = 8,
    port = 3000,
    agentAdminToken = '',
    isProduction = process.env.NODE_ENV === 'production'
  } = deps;

  app.post('/v1/agent/run', async (req, res) => {
    const adminToken = String(agentAdminToken || '').trim();
    if (isProduction || adminToken) {
      const providedToken = req.headers['x-agent-admin-token'] || '';
      if (!adminToken || providedToken !== adminToken) {
        return res.status(404).json({ error: 'Not found' });
      }
    }

    const apiKey = aiApiKey || getBearerToken(req);
    if (!apiKey) {
      return res.status(401).json({ error: 'GEMINI_API_KEY nao configurada e nenhum Bearer enviado.' });
    }

    const body = req.body || {};
    const userMessages = Array.isArray(body.messages) ? body.messages : [];
    const task = typeof body.task === 'string' ? body.task.trim() : '';
    if (!userMessages.length && !task) {
      return res.status(400).json({ error: 'Envie task ou messages.' });
    }

    const maxSteps = Math.min(Number(body.max_steps || agentMaxSteps), 12);
    const requestedModel = body.model || openaiModelAlias;
    const temperature = body.temperature ?? 0.2;
    const debug = Boolean(body.debug);
    const toolSpecs = Object.entries(agentTools).map(([name, tool]) => ({ name, description: tool.description }));
    const transcript = [];

    const messages = [
      {
        role: 'system',
        content: `Voce e um agente de software com ferramentas. Responda sempre em JSON valido sem markdown. Ferramentas: ${JSON.stringify(toolSpecs)}`
      },
      ...userMessages
    ];
    if (task) messages.push({ role: 'user', content: task });

    for (let step = 1; step <= maxSteps; step += 1) {
      let modelResult;
      try {
        modelResult = await callMiniMaxChat({ messages, temperature, requestedModel, apiKey });
      } catch (error) {
        return res.status(error.status || 502).json(error.detail || { error: error.message });
      }

      let decision;
      try {
        decision = parseAgentResponse(modelResult.content);
      } catch (error) {
        return res.status(502).json({ error: 'Agent returned invalid JSON.', raw: modelResult.content });
      }

      transcript.push({ step, assistant: decision });

      if (decision.type === 'final') {
        return res.json({
          ok: true,
          output: decision.content || '',
          summary: decision.summary || '',
          ...(debug ? { steps: transcript } : {})
        });
      }

      if (decision.type !== 'tool_call' || !agentTools[decision.tool]) {
        return res.status(400).json({ error: 'Agent requested invalid tool.', raw: decision });
      }

      try {
        const toolResult = await agentTools[decision.tool].execute(decision.input || {});
        transcript[transcript.length - 1].tool_result = toolResult;
        messages.push({ role: 'assistant', content: JSON.stringify(decision) });
        messages.push({ role: 'user', content: JSON.stringify({ type: 'tool_result', tool: decision.tool, result: toolResult }) });
      } catch (error) {
        const toolError = { error: error.message };
        transcript[transcript.length - 1].tool_error = toolError;
        messages.push({ role: 'assistant', content: JSON.stringify(decision) });
        messages.push({ role: 'user', content: JSON.stringify({ type: 'tool_result', tool: decision.tool, result: toolError }) });
      }
    }

    const startedServerStep = [...transcript]
      .reverse()
      .find((entry) => entry?.assistant?.tool === 'start_server' && entry?.tool_result?.pid);

    if (startedServerStep) {
      const startedServer = startedServerStep.tool_result;
      const serverUrl = startedServer.url || `http://localhost:${port}`;
      return res.json({
        ok: true,
        summary: `Servidor iniciado em ${serverUrl}.`,
        output: `O agente iniciou o servidor com o comando "${startedServer.command}". Acesse em ${serverUrl}.`,
        ...(debug ? { steps: transcript } : {})
      });
    }

    return res.status(408).json({
      error: 'Agent exceeded max_steps without final answer.',
      ...(debug ? { steps: transcript } : {})
    });
  });
}

module.exports = {
  parseAgentResponse,
  setupAgentRoutes
};
