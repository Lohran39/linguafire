const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

const { createGeminiService } = require('./services/minimax-service');
const { createAgentTools } = require('./services/agent-tools');
const { createMailService } = require('./services/mail-service');
const { createMonitoringService } = require('./services/monitoring-service');
const { createStripeService } = require('./services/stripe-service');
const { createPushService } = require('./services/push-service');
const { createRateLimiter } = require('./middleware/rate-limiter');
const { createRequestLogger } = require('./middleware/request-logger');
const { logger } = require('./logger');

// ============ CONFIG ============
const app = express();
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || (IS_PRODUCTION ? '0.0.0.0' : '127.0.0.1');
const JWT_SECRET = process.env.JWT_SECRET || 'linguafire-super-secret-key-2024';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const GEMINI_BASE_URL = (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const OPENAI_MODEL_ALIAS = process.env.OPENAI_MODEL_ALIAS || GEMINI_MODEL;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';
const PROXY_TIMEOUT_MS = Number(process.env.PROXY_TIMEOUT_MS || 60000);
const AGENT_MAX_STEPS = Number(process.env.AGENT_MAX_STEPS || 8);
const AGENT_CMD_TIMEOUT_MS = Number(process.env.AGENT_CMD_TIMEOUT_MS || 15000);
const DEPLOY_CMD_TIMEOUT_MS = Number(process.env.DEPLOY_CMD_TIMEOUT_MS || 120000);
const AGENT_ADMIN_TOKEN = process.env.AGENT_ADMIN_TOKEN || '';
const PUSH_ADMIN_TOKEN = process.env.PUSH_ADMIN_TOKEN || '';
const WORKSPACE_ROOT = path.resolve(__dirname, '..');
const LEGACY_FRONTEND_DIR = path.join(WORKSPACE_ROOT, 'public/dist');
const REACT_FRONTEND_DIR = path.join(WORKSPACE_ROOT, 'client/dist');
const HAS_REACT_FRONTEND = fs.existsSync(path.join(REACT_FRONTEND_DIR, 'index.html'));
const ACTIVE_FRONTEND_DIR = HAS_REACT_FRONTEND ? REACT_FRONTEND_DIR : LEGACY_FRONTEND_DIR;
const ACTIVE_FRONTEND_KIND = HAS_REACT_FRONTEND ? 'react' : 'legacy';
const runningServers = new Map();
const monitoring = createMonitoringService({ logger });
const stripeService = createStripeService(process.env);
const pushService = createPushService(process.env, logger);

function getJwtRole(token = '') {
  try {
    const [, payload] = String(token).split('.');
    if (!payload) return 'invalid';
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).role || 'unknown';
  } catch (_error) {
    return 'invalid';
  }
}

if (IS_PRODUCTION && JWT_SECRET === 'linguafire-super-secret-key-2024') {
  throw new Error('JWT_SECRET inseguro em produção. Defina uma chave aleatória grande no ambiente.');
}

if (IS_PRODUCTION && BASE_URL.startsWith('http://')) {
  throw new Error('BASE_URL deve usar HTTPS em produção.');
}

if (IS_PRODUCTION && !HAS_REACT_FRONTEND) {
  throw new Error('Build React não encontrado em client/dist. Rode npm run build antes de iniciar em produção.');
}

if (!global.__LINGUAFIRE_PROCESS_LOGGERS__) {
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { error: reason });
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error });
  });

  global.__LINGUAFIRE_PROCESS_LOGGERS__ = true;
}

const ALLOWED_CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

if (BASE_URL) {
  ALLOWED_CORS_ORIGINS.push(BASE_URL.replace(/\/$/, ''));
}

function resolveCorsOrigin(origin, callback) {
  if (!origin || ALLOWED_CORS_ORIGINS.includes(origin)) {
    callback(null, true);
    return;
  }
  if (!IS_PRODUCTION) {
    try {
      const { hostname } = new URL(origin);
      if (hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1') {
        callback(null, true);
        return;
      }
    } catch (_error) {}
  }
  callback(new Error('Origem não permitida pelo CORS.'));
}

const {
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
  sendWelcomeEmail,
  isPasswordResetEmailConfigured,
  isTransactionalEmailConfigured
} = createMailService(process.env);

// ============ SUPABASE ============
const {
  supabase,
  supabaseGetUserByEmail, supabaseGetUserById, supabaseFindUserByGoogleOrEmail, supabaseCreateUser, supabaseUpdateUser,
  supabaseUpdateGoogleLink, supabaseSetPasswordResetToken, supabaseGetUserByResetToken, supabaseResetPassword,
  supabaseGetUserByEmailVerificationToken, supabaseSetEmailVerificationToken, supabaseVerifyUserEmail,
  supabaseGetPushSubscription, supabaseGetAllPushSubscriptions, supabaseSavePushSubscription, supabaseDeletePushSubscription,
  supabaseGetUserRewards, supabaseAwardReward,
  supabaseGetGrammarErrors, supabaseAddGrammarError,
  supabaseGetFlashcards, supabaseUpsertFlashcard,
  supabaseGetNativesCache, supabaseUpsertNativesCache,
  supabaseGetNativeSavedVideos, supabaseSaveNativeVideo, supabaseDeleteNativeVideo,
  supabaseGetLyricsCache, supabaseUpsertLyricsCache,
  supabaseGetTranslationCache, supabaseUpsertTranslationCache,
  supabaseGetWorkingMusicVideo, supabaseGetBadMusicVideos, supabaseSaveWorkingMusicVideo, supabaseSaveBadMusicVideo,
  supabaseDeleteUser
} = require('./db-supabase');

// ============ MIDDLEWARE ============
if (IS_PRODUCTION) {
  app.set('trust proxy', 1);
}

// Politica de seguranca unica. O Helmet padrao bloquearia iframes/scripts do YouTube.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://www.youtube.com",
        "https://www.youtube-nocookie.com",
        "https://s.ytimg.com",
        "https://www.googletagmanager.com"
      ],
      frameSrc: ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      connectSrc: [
        "'self'",
        "https://www.youtube.com",
        "https://www.youtube-nocookie.com",
        "https://noembed.com",
        "https://lrclib.net",
        "https://api.mymemory.translated.net",
        "https://generativelanguage.googleapis.com",
        "https://*.supabase.co",
        "https://www.googletagmanager.com"
      ],
      mediaSrc: ["'self'", "blob:", "https://*.youtube.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(cors({ origin: resolveCorsOrigin, credentials: true }));
app.use(express.json({
  limit: process.env.JSON_BODY_LIMIT || '1mb',
  verify: (req, _res, buf) => {
    if (req.originalUrl === '/api/subscription/webhook') {
      req.rawBody = Buffer.from(buf);
    }
  }
}));

// Session + Passport
app.use(session({
  name: 'linguafire_session',
  secret: JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PRODUCTION || BASE_URL.startsWith('https://'),
    maxAge: 24 * 60 * 60 * 1000
  }
}));
app.use(passport.initialize());
app.use(passport.session());

// Arquivos do frontend compilado. Durante a migracao, /legacy preserva o app antigo.
app.use('/legacy', express.static(LEGACY_FRONTEND_DIR));
app.use(express.static(ACTIVE_FRONTEND_DIR));
app.use(express.static(LEGACY_FRONTEND_DIR, { index: false }));

app.use(createRequestLogger({ logger, monitoring }));
app.use(createRateLimiter());

// ============ AUTH UTILS ============
const { getCookieToken, setAuthCookie, clearAuthCookie } = require('./utils/auth');

// ============ AUTHENTICATE TOKEN ============
async function authenticateToken(req, res, next) {
  const cookieToken = getCookieToken(req);
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.split(' ')[1];
  const token = cookieToken || headerToken;

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const user = require('jsonwebtoken').verify(token, JWT_SECRET);
    const storedUser = await supabaseGetUserById(user.id);
    if (!storedUser) {
      clearAuthCookie(res);
      return res.status(401).json({ error: 'Token inválido' });
    }
    if (Number(storedUser.email_verified ?? 1) === 0) {
      clearAuthCookie(res);
      return res.status(403).json({ error: 'Confirme seu email antes de entrar.' });
    }
    req.user = user;
    next();
  } catch (_error) {
    clearAuthCookie(res);
    return res.status(403).json({ error: 'Token inválido' });
  }
}

// ============ AI USAGE LIMIT ============
const FREE_DAILY_LIMIT = 10;

async function checkAILimit(req, res, next) {
  const today = new Date().toDateString();

  try {
    const user = await supabaseGetUserById(req.user.id);
    if (!user) return res.status(500).json({ error: 'Erro interno' });

    if (user.ai_uses_date !== today) {
      await supabaseUpdateUser(req.user.id, { ai_uses_today: 0, ai_uses_date: today });
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

    await supabaseUpdateUser(req.user.id, { ai_uses_today: (user.ai_uses_today || 0) + 1 });
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno' });
  }
}

// ============ HELPER FUNCTIONS ============
function parseJsonField(value, fallback = []) {
  if (value == null || value === '') return fallback;
  if (Array.isArray(value) || typeof value === 'object') return value;
  try { return JSON.parse(value); } catch (_e) { return fallback; }
}

function getBearerToken(req) {
  const authorization = req.headers.authorization || '';
  if (!authorization.toLowerCase().startsWith('bearer ')) return '';
  return authorization.slice(7).trim();
}

// ============ AI SERVICES ============
const { callMiniMaxChat } = createGeminiService({
  geminiBaseUrl: GEMINI_BASE_URL,
  geminiModel: GEMINI_MODEL,
  openaiModelAlias: OPENAI_MODEL_ALIAS,
  proxyTimeoutMs: PROXY_TIMEOUT_MS
});

const agentTools = createAgentTools({
  workspaceRoot: WORKSPACE_ROOT,
  commandTimeoutMs: AGENT_CMD_TIMEOUT_MS,
  deployTimeoutMs: DEPLOY_CMD_TIMEOUT_MS,
  runningServers
});

// ============ ROUTES ============
const { registerLyricsRoutes } = require('./routes/lyrics-routes');
const { registerNativesRoutes } = require('./routes/natives-routes');
const { setupAuthRoutes } = require('./routes/auth-routes');
const { setupProfileRoutes } = require('./routes/profile-routes');
const { setupSubscriptionRoutes } = require('./routes/subscription-routes');
const { setupStreakRoutes } = require('./routes/streak-routes');
const { setupShopRoutes } = require('./routes/shop-routes');
const { setupFlashcardRoutes } = require('./routes/flashcard-routes');
const { setupConversationRoutes, setupGrammarRoutes } = require('./routes/conversation-routes');
const { setupPushRoutes } = require('./routes/push-routes');
const { setupAIRoutes } = require('./routes/ai-routes');
const { setupAgentRoutes } = require('./routes/agent-routes');
const { setupGoogleAuthRoutes } = require('./routes/google-auth-routes');
const { setupMiscRoutes } = require('./routes/misc-routes');

// Auth routes (register, login, forgot-password, reset-password, session, logout)
setupAuthRoutes(app, {
  supabaseGetUserByEmail, supabaseGetUserById, supabaseCreateUser, supabaseGetUserByResetToken,
  supabaseSetPasswordResetToken, supabaseResetPassword,
  supabaseGetUserByEmailVerificationToken, supabaseSetEmailVerificationToken, supabaseVerifyUserEmail,
  JWT_SECRET, BASE_URL, IS_PRODUCTION,
  sendPasswordResetEmail, sendEmailVerificationEmail, sendWelcomeEmail, isPasswordResetEmailConfigured,
  isTransactionalEmailConfigured, logger, supabase, parseJsonField
});

// Profile routes
setupProfileRoutes(app, {
  authenticateToken, supabaseGetUserById, supabaseUpdateUser, parseJsonField
});

// Subscription routes
setupSubscriptionRoutes(app, {
  authenticateToken,
  supabaseGetUserById,
  supabaseUpdateUser,
  isProduction: IS_PRODUCTION,
  allowFakeSubscriptions: process.env.ALLOW_FAKE_SUBSCRIPTIONS === 'true',
  stripeService,
  logger
});

// Streak routes
setupStreakRoutes(app, {
  authenticateToken, supabaseGetUserById, supabaseGetUserRewards, supabaseAwardReward, supabaseUpdateUser, parseJsonField
});

// Shop routes
setupShopRoutes(app, {
  authenticateToken, supabaseGetUserById, supabaseUpdateUser, parseJsonField
});

// Flashcard routes
setupFlashcardRoutes(app, {
  authenticateToken, supabaseGetFlashcards, supabaseUpsertFlashcard, supabaseGetUserById
});

// Conversation routes
setupConversationRoutes(app, {
  authenticateToken, checkAILimit, callMiniMaxChat, OPENAI_MODEL_ALIAS, AI_API_KEY: GEMINI_API_KEY
});

// Grammar routes
setupGrammarRoutes(app, {
  authenticateToken, supabaseAddGrammarError, supabaseGetGrammarErrors, callMiniMaxChat, OPENAI_MODEL_ALIAS, AI_API_KEY: GEMINI_API_KEY, supabase
});

// Push routes
setupPushRoutes(app, {
  authenticateToken,
  supabaseGetPushSubscription,
  supabaseGetAllPushSubscriptions,
  supabaseSavePushSubscription,
  supabaseDeletePushSubscription,
  pushService,
  pushAdminToken: PUSH_ADMIN_TOKEN
});

// Lyrics routes
registerLyricsRoutes(app, {
  logger,
  supabaseGetLyricsCache,
  supabaseUpsertLyricsCache,
  supabaseGetTranslationCache,
  supabaseUpsertTranslationCache,
  supabaseGetWorkingMusicVideo,
  supabaseGetBadMusicVideos,
  supabaseSaveWorkingMusicVideo,
  supabaseSaveBadMusicVideo,
  YOUTUBE_API_KEY
});

// Natives routes
registerNativesRoutes(app, {
  supabaseGetNativesCache,
  supabaseUpsertNativesCache,
  supabaseGetNativeSavedVideos,
  supabaseSaveNativeVideo,
  supabaseDeleteNativeVideo,
  supabaseGetUserById,
  authenticateToken,
  checkAILimit,
  callMiniMaxChat,
  OPENAI_MODEL_ALIAS,
  AI_API_KEY: GEMINI_API_KEY,
  YOUTUBE_API_KEY,
  logger
});

// Google OAuth routes
setupGoogleAuthRoutes(app, {
  passport,
  GoogleStrategy,
  jwtSecret: JWT_SECRET,
  baseUrl: BASE_URL,
  isProduction: IS_PRODUCTION,
  getCookieToken,
  setAuthCookie,
  supabaseFindUserByGoogleOrEmail,
  supabaseGetUserById,
  supabaseCreateUser,
  supabaseUpdateGoogleLink,
  sendWelcomeEmail,
  isTransactionalEmailConfigured,
  logger
});

// Misc public/profile routes
setupMiscRoutes(app, {
  authenticateToken,
  clearAuthCookie,
  aiProvider: 'gemini',
  aiBaseUrl: GEMINI_BASE_URL,
  aiModel: GEMINI_MODEL,
  openaiModelAlias: OPENAI_MODEL_ALIAS,
  activeFrontend: ACTIVE_FRONTEND_KIND,
  supabase,
  supabaseGetUserById,
  supabaseDeleteUser,
  monitoring,
  supabaseKeyRole: getJwtRole(process.env.SUPABASE_SERVICE_ROLE_KEY || '')
});

// OpenAI-compatible and agent routes

setupAIRoutes(app, {
  authenticateToken,
  checkAILimit,
  callMiniMaxChat,
  getBearerToken,
  aiApiKey: GEMINI_API_KEY,
  openaiModelAlias: OPENAI_MODEL_ALIAS
});

setupAgentRoutes(app, {
  callMiniMaxChat,
  getBearerToken,
  agentTools,
  aiApiKey: GEMINI_API_KEY,
  openaiModelAlias: OPENAI_MODEL_ALIAS,
  agentMaxSteps: AGENT_MAX_STEPS,
  port: PORT,
  agentAdminToken: AGENT_ADMIN_TOKEN,
  isProduction: IS_PRODUCTION
});

app.use((err, req, res, next) => {
  monitoring.recordError(err, req);
  if (res.headersSent) return next(err);
  return res.status(500).json({ error: 'Erro interno do servidor' });
});

// ============ APP SHELL ============
app.use((req, res) => {
  res.sendFile(path.join(ACTIVE_FRONTEND_DIR, 'index.html'));
});

// ============ START SERVER ============
if (require.main === module) {
  app.listen(PORT, HOST, () => {
    logger.info('Servidor iniciado', {
      port: PORT,
      host: HOST,
      url: `http://localhost:${PORT}`
    });
  });
}

module.exports = app;
