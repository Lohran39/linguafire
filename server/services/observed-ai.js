function observeAI(call, logger) {
  return async options => {
    const started = Date.now();
    try {
      const result = await call(options);
      logger.info('AI request completed', {
        provider: 'gemini', model: result.providerModel, durationMs: Date.now() - started,
        inputUnits: result.usage?.promptTokens || 0, outputUnits: result.usage?.completionTokens || 0
      });
      return result;
    } catch (error) {
      logger.error('AI request failed', { provider: 'gemini', durationMs: Date.now() - started,
        status: error.status || 502, code: error.code || 'provider_failed' });
      throw error;
    }
  };
}
module.exports = { observeAI };
