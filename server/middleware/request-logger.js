const { randomUUID } = require('node:crypto');
const { requestContext } = require('../logger');
function shouldLogRequest(path = '') {
  return path.startsWith('/api') || path.startsWith('/v1') || path === '/health';
}

function createRequestLogger({ logger, monitoring, slowMs = 1500 } = {}) {
  return (req, res, next) => {
    const startedAt = Date.now();
    req.requestId = randomUUID();
    res.setHeader('X-Request-ID', req.requestId);

    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      const requestInfo = {
        method: req.method,
        path: req.route?.path || 'unmatched',
        requestId: req.requestId,
        statusCode: res.statusCode,
        durationMs
      };

      monitoring?.recordRequest?.(requestInfo);

      if (!shouldLogRequest(req.path)) return;

      if (res.statusCode >= 500) {
        logger?.error?.('HTTP request failed', requestInfo);
      } else if (res.statusCode >= 400) {
        logger?.warn?.('HTTP request rejected', requestInfo);
      } else if (durationMs >= slowMs) {
        logger?.warn?.('HTTP request slow', requestInfo);
      } else if (process.env.LOG_HTTP_REQUESTS !== 'false') {
        logger?.info?.('HTTP request', requestInfo);
      }
    });

    requestContext.run({ requestId: req.requestId }, next);
  };
}

module.exports = {
  createRequestLogger
};
