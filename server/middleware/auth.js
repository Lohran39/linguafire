const jwt = require('jsonwebtoken');

function setupAuthMiddleware(app, deps = {}) {
  const { JWT_SECRET = 'dev-secret', supabaseGetUserById = async () => null } = deps;

  // Authenticate JWT from cookie or Authorization header
  app.use((req, res, next) => {
    const cookieToken = (() => {
      const cookies = req.headers.cookie || '';
      const match = cookies.match(/(?:^|;\s*)linguafire_token=([^;]*)/);
      return match ? decodeURIComponent(match[1]) : '';
    })();

    const authHeader = req.headers['authorization'];
    const headerToken = authHeader && authHeader.split(' ')[1];
    const token = cookieToken || headerToken;

    if (!token) {
      req.user = null;
      return next();
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        req.user = null;
        return next();
      }

      try {
        const user = await supabaseGetUserById(decoded.id);
        req.user = user ? { id: user.id, email: user.email } : null;
      } catch (e) {
        req.user = null;
      }
      next();
    });
  });

  // Middleware to require authentication
  app.use((req, res, next) => {
    const originalRequireAuth = req.path.includes('/api/') && !['/api/auth/session', '/api/auth/google/configured', '/api/auth/google', '/api/leaderboard', '/api/daily/word', '/api/shop', '/api/conversation/topics'].includes(req.path);

    if (!originalRequireAuth) return next();

    const cookieToken = (() => {
      const cookies = req.headers.cookie || '';
      const match = cookies.match(/(?:^|;\s*)linguafire_token=([^;]*)/);
      return match ? decodeURIComponent(match[1]) : '';
    })();

    const authHeader = req.headers['authorization'];
    const headerToken = authHeader && authHeader.split(' ')[1];
    const token = cookieToken || headerToken;

    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Token inválido' });
      }
      req.user = user;
      next();
    });
  });
}

function authenticateToken(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  next();
}

// AI usage limit middleware - Free tier: 10 uses/day, Paid: unlimited
const FREE_DAILY_LIMIT = 10;

async function checkAILimit(req, res, next) {
  const today = new Date().toDateString();

  try {
    const user = await res.locals?.supabaseGetUserById(req.user.id);
    if (!user) return res.status(500).json({ error: 'Erro interno' });

    if (user.ai_uses_date !== today) {
      await res.locals?.supabaseUpdateUser(req.user.id, { ai_uses_today: 0, ai_uses_date: today });
      return next();
    }

    if (user.subscription_active && user.subscription_expires > Date.now()) {
      return next();
    }

    if (user.ai_uses_today >= FREE_DAILY_LIMIT) {
      return res.status(403).json({
        error: 'limit_reached',
        message: 'Limite diário de IA atingido',
        uses: user.ai_uses_today,
        limit: FREE_DAILY_LIMIT,
        upgradeUrl: '/subscription'
      });
    }

    await res.locals?.supabaseUpdateUser(req.user.id, { ai_uses_today: (user.ai_uses_today || 0) + 1 });
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno' });
  }
}

module.exports = { setupAuthMiddleware, authenticateToken, checkAILimit, FREE_DAILY_LIMIT };