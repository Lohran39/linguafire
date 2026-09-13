const { randomUUID } = require('node:crypto');
const { context, requestIssue } = require('../services/ai-policy');
function createAIQuota({ supabase, logger = console }) {
  return async function checkAILimit(req, res, next) {
    const issue = requestIssue(req.validatedBody || req.body);
    if (issue) return res.status(400).json({ error: issue });
    const requestId = randomUUID();
    try {
      const { data: usage, error } = await supabase.rpc('consume_ai_use_v2', { p_user_id: req.user.id, p_request_id: requestId });
      if (error || !usage) throw new Error('quota_unavailable');
      if (!usage.allowed) {
        if (usage.reason === 'rate_limit') res.set('Retry-After', '60');
        return res.status(usage.reason === 'rate_limit' ? 429 : 403).json({ error: usage.reason === 'monthly_limit' ? 'Franquia mensal de IA atingida.' : usage.reason === 'rate_limit' ? 'Aguarde um minuto antes de enviar mais mensagens.' : 'Limite diário de IA atingido.', aiUsage: usage });
      }
      let settled = false, finalOutcome, settling;
      const finish = success => {
        finalOutcome ??= success;
        if (settled) return Promise.resolve();
        if (settling) return settling;
        settling = (async () => {
          for (let attempt=0; attempt<2; attempt++) {
            try {
              const { error } = await supabase.rpc('finish_ai_use', { p_request_id: requestId, p_success: finalOutcome });
              if (!error) { settled=true; return; }
            } catch { /* retry the same idempotent reservation */ }
          }
          logger.error('AI quota settlement failed', { code:'ai_settlement_failed', requestId });
        })().finally(() => { settling=null; });
        return settling;
      };
      req.aiUsage=usage;
      // Finish before sending JSON so the next profile read sees refunds too.
      const sendJson=res.json.bind(res);
      res.json = function(body) {
        void finish(res.statusCode<400).then(() => sendJson(body), () => sendJson(body));
        return res;
      };
      // A disconnected request remains charged if provider work may be underway;
      // it must not unlock unlimited paid calls by aborting the browser request.
      res.on('close', () => { void finish(true).catch(() => {}); });
      context.run({ plan:usage.plan, requestId }, next);
    } catch {
      return res.status(503).json({ error:'Não foi possível conferir seu limite de IA. Tente novamente.' });
    }
  };
}
module.exports={createAIQuota};
