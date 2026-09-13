// Authenticated AI calls use the atomic per-user limiter in consume_ai_use_v2.
const { hashToken } = require('../utils/auth-security');
const DEFAULT_RATE_LIMITS = {
  '/api/login': 10,
  '/api/register': 5,
  '/api/change-password': 5,
  '/api/auth/forgot-password': 3,
  '/api/auth/reset-password': 5,
  '/api/auth/resend-verification': 3,
  '/api/auth/verify-email': 20,
  '/v1/agent/run': 5,
  '/api/lyrics/lrclib/get': 30,
  '/api/lyrics/lrclib/search': 20,
  '/api/lyrics/approved': 10,
  '/api/music/search': 20,
  '/api/music/video-status': 60,
  '/api/translate': 30,
  '/api/translate/diagnostics': 10,
  '/api/natives/search': 30,
  '/api/natives/curated': 10
};

function createRateLimiter(options = {}) {
  const rateLimitMap = new Map();
  const windowMs = Number(options.windowMs || 60 * 1000);
  const maxEntries = Number(options.maxEntries || 500);
  const limits = { ...DEFAULT_RATE_LIMITS, ...(options.limits || {}) };

  async function consume(key, duration) {
    if (options.redis) {
      const result = await options.redis.eval(`
        local n = redis.call('INCR', KEYS[1])
        if n == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
        return {n, redis.call('PTTL', KEYS[1])}
      `, { keys: [`lf:limit:${hashToken(key)}`], arguments: [String(duration)] });
      return { count: Number(result[0]), remaining: Number(result[1]) };
    }
    if (options.requireRedis) throw new Error('Rate limit storage unavailable');
    const now = Date.now();
    for (const [entryKey, entry] of rateLimitMap) {
      if (entry.reset <= now) rateLimitMap.delete(entryKey);
    }
    let entry = rateLimitMap.get(key);
    if (!entry) {
      if (rateLimitMap.size >= maxEntries) throw new Error('Rate limit capacity exceeded');
      entry = { count: 0, reset: now + duration };
      rateLimitMap.set(key, entry);
    }
    entry.count += 1;
    return { count: entry.count, remaining: entry.reset - now };
  }

  return async function rateLimiter(req, res, next) {
    const routeKey = req.path || req.originalUrl || req.url;
    const maxRequests = limits[routeKey];
    if (!maxRequests) return next();

    try {
      const ip = req.ip || req.connection?.remoteAddress || 'x';
      const checks = [[`ip:${ip}:${routeKey}`, maxRequests, windowMs]];
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      if (email && ['/api/register', '/api/auth/resend-verification', '/api/auth/forgot-password'].includes(routeKey)) {
        // Registration and resend share the same cooldown, preventing bypass.
        checks.push([`email-send:${email}`, 1, 60000]);
      } else if (email && routeKey === '/api/login') {
        checks.push([`login:${email}`, 10, 15 * 60000]);
      }
      for (const [key, limit, duration] of checks) {
        const state = await consume(key, duration);
        if (state.count > limit) {
          const retryAfter = Math.max(1, Math.ceil(state.remaining / 1000));
          res.setHeader('Retry-After', String(retryAfter));
          return res.status(429).json({ error: `Muitas tentativas. Aguarde ${retryAfter} segundos.`, retryAfter });
        }
      }
      return next();
    } catch {
      res.setHeader('Retry-After', '30');
      return res.status(503).json({ error: 'Acesso temporariamente indisponível. Tente novamente em instantes.' });
    }
  };
}

module.exports = {
  DEFAULT_RATE_LIMITS,
  createRateLimiter
};
