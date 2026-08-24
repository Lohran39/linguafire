const DEFAULT_RATE_LIMITS = {
  '/api/login': 10,
  '/api/register': 5,
  '/api/change-password': 5,
  '/api/auth/forgot-password': 3,
  '/api/auth/reset-password': 5,
  '/api/conversation': 30,
  '/api/grammar/analyze': 20,
  '/chat/completions': 30,
  '/v1/chat/completions': 30,
  '/v1/agent/run': 5,
  '/api/lyrics/lrclib/get': 30,
  '/api/lyrics/lrclib/search': 20,
  '/api/lyrics/approved': 10,
  '/api/translate': 30,
  '/api/natives/search': 30,
  '/api/natives/curated': 10
};

function createRateLimiter(options = {}) {
  const rateLimitMap = new Map();
  const windowMs = Number(options.windowMs || 60 * 1000);
  const maxEntries = Number(options.maxEntries || 500);
  const limits = { ...DEFAULT_RATE_LIMITS, ...(options.limits || {}) };

  return function rateLimiter(req, res, next) {
    const routeKey = req.path || req.originalUrl || req.url;
    const maxRequests = limits[routeKey];
    if (!maxRequests) return next();

    const ip = req.ip || req.connection.remoteAddress || 'x';
    const key = `${ip}:${routeKey}`;
    const now = Date.now();
    const windowState = rateLimitMap.get(key) || { count: 0, reset: now + windowMs };

    if (now > windowState.reset) {
      windowState.count = 0;
      windowState.reset = now + windowMs;
    }

    windowState.count += 1;
    rateLimitMap.set(key, windowState);

    if (rateLimitMap.size > maxEntries) {
      for (const [entryKey, entry] of rateLimitMap) {
        if (now > entry.reset + windowMs) rateLimitMap.delete(entryKey);
      }
    }

    if (windowState.count > maxRequests) {
      return res.status(429).json({ error: 'Muitas tentativas. Aguarde.' });
    }

    return next();
  };
}

module.exports = {
  DEFAULT_RATE_LIMITS,
  createRateLimiter
};
