// Logger seguro: evita imprimir credenciais, tokens e dados pessoais.
const { AsyncLocalStorage } = require('node:async_hooks');
const requestContext = new AsyncLocalStorage();
const SENSITIVE_FIELDS = ['password', 'email', 'token', 'resetToken', 'authorization', 'cookie', 'secret', 'key', 'auth', 'prompt', 'content', 'history', 'answer', 'body'];
const SECRET_VALUE_PATTERNS = [
  /\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/,
  /\bsk-[a-zA-Z0-9_-]{12,}\b/,
  /\bBearer\s+[a-zA-Z0-9._-]+\b/i,
  /\bsk_(?:live|test)_[a-zA-Z0-9]+\b/,
  /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/
];

function isSensitiveKey(key) {
  const lower = String(key).toLowerCase();
  return SENSITIVE_FIELDS.some(f => lower.includes(f));
}

function sanitizeValue(value, depth = 0) {
  if (value instanceof Error) {
    return {
      name: value.name,
      code: value.code,
      status: value.status
    };
  }

  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value)) ? '[REDACTED]' : value;
  }

  if (typeof value !== 'object') return value;

  if (depth > 3) {
    return '[complex-value]';
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1));
  }

  return sanitizeObject(value, depth);
}

function sanitizeObject(obj, depth = 0) {
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key) || (key === 'error' && typeof value === 'string')) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitizeValue(value, depth + 1);
    }
  }
  return sanitized;
}

function safeLog(level, message, meta = {}) {
  const sanitizedMeta = sanitizeValue(meta);
  const timestamp = new Date().toISOString();
  const logMethod = typeof console[level] === 'function' ? console[level] : console.log;

  logMethod(JSON.stringify({ timestamp, level, service: 'linguafire',
    requestId: requestContext.getStore()?.requestId,
    message: sanitizeValue(message), metadata: sanitizedMeta }));
}

const logger = {
  info: (msg, meta) => safeLog('info', msg, meta),
  warn: (msg, meta) => safeLog('warn', msg, meta),
  error: (msg, meta) => safeLog('error', msg, meta),
  debug: (msg, meta) => safeLog('debug', msg, meta)
};

module.exports = { logger, requestContext };
