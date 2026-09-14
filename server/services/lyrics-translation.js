const crypto = require('crypto');
const { fetchJsonWithTimeout, fetchTextWithTimeout } = require('./provider-http');

const TRANSLATION_CACHE_VERSION = 'translation-v1';
const TRANSLATION_SEPARATOR = 'LF_LINE_BREAK';
const MAX_ACTIVE_TRANSLATIONS = Number(process.env.TRANSLATION_CONCURRENCY || 2);
let activeTranslations = 0;
const pendingTranslations = [];

function acquireTranslationSlot() {
  if (activeTranslations < MAX_ACTIVE_TRANSLATIONS) {
    activeTranslations += 1;
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    pendingTranslations.push(resolve);
  }).then(() => {
    activeTranslations += 1;
  });
}

function releaseTranslationSlot() {
  activeTranslations = Math.max(0, activeTranslations - 1);
  const next = pendingTranslations.shift();
  if (next) next();
}

async function withTranslationSlot(task) {
  await acquireTranslationSlot();
  try {
    return await task();
  } finally {
    releaseTranslationSlot();
  }
}

function normalizeTranslationCompare(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&(?:amp|quot|#39|lt|gt);/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTranslationText(value = '') {
  return String(value || '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/\r\n/g, '\n')
    .trim();
}

function isUsefulTranslation(original = '', translated = '') {
  const clean = cleanTranslationText(translated);
  return Boolean(clean)
    && clean !== TRANSLATION_SEPARATOR
    && normalizeTranslationCompare(original) !== normalizeTranslationCompare(clean);
}

function asTranslationResponse(translatedText, provider) {
  return {
    responseStatus: 200,
    provider,
    responseData: {
      translatedText
    }
  };
}

function splitTranslationBlock(text = '') {
  return String(text || '').split(/\n?LF_LINE_BREAK\n?/);
}

function hasTranslationBlock(text = '') {
  return splitTranslationBlock(text).length > 1;
}

function hasMatchingTranslationBlockShape(original = '', translated = '') {
  if (!hasTranslationBlock(original)) return true;
  return splitTranslationBlock(original).length === splitTranslationBlock(translated).length;
}

function buildTranslationCacheKey(text = '', from = 'en', to = 'pt-BR') {
  const hash = crypto
    .createHash('sha256')
    .update(`${TRANSLATION_CACHE_VERSION}|${from}|${to}|${String(text || '').trim()}`)
    .digest('hex');
  return `${TRANSLATION_CACHE_VERSION}:${hash}`;
}

function shouldCacheTranslation(translated = '') {
  const clean = cleanTranslationText(translated);
  if (!clean) return false;
  if (clean.includes('Tradução em revisão.')) return false;
  if (clean.includes('Tradução automática indisponível')) return false;
  return true;
}

function compactProviderBody(data) {
  const raw = typeof data?.raw === 'string' ? data.raw : JSON.stringify(data || {});
  return String(raw || '').slice(0, 500);
}

async function translateWithDeepL(text, from, to, env = process.env, logger = console) {
  const apiKey = String(env.DEEPL_API_KEY || '').trim();
  if (!apiKey) return null;

  const targetLang = to.toLowerCase().startsWith('pt') ? 'PT-BR' : to.toUpperCase();
  const sourceLang = from ? from.toUpperCase() : 'EN';
  const endpoint = apiKey.endsWith(':fx') ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate';
  const body = new URLSearchParams({
    text,
    source_lang: sourceLang,
    target_lang: targetLang,
    preserve_formatting: '1'
  });

  const { response, data } = await fetchTextWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body
  }, 12000);

  const translated = cleanTranslationText(data?.translations?.[0]?.text || '');
  if (!response.ok) {
    logger.warn?.('DeepL translation failed', {
      statusCode: response.status,
      textLength: text.length,
      body: compactProviderBody(data)
    });
    return null;
  }
  if (!isUsefulTranslation(text, translated)) {
    logger.warn?.('DeepL translation returned unusable text', { textLength: text.length });
    return null;
  }
  return translated;
}

function translateNoLiteralLine(text = '') {
  const normalized = normalizeTranslationCompare(text).replace(/-/g, ' ');
  if (!normalized) return '';
  if (/^(yeah|yea|uh|uh huh|ooh|oh|ah|la|na|skrrt|hmm|mm)(\s+(yeah|yea|uh|uh huh|ooh|oh|ah|la|na|skrrt|hmm|mm))*$/.test(normalized)) {
    return 'Expressão sonora, sem tradução literal.';
  }
  return 'Tradução automática indisponível para esta linha.';
}

async function translateBlockByLines(text, from, to, env = process.env, logger = console) {
  const lines = splitTranslationBlock(text);
  if (lines.length <= 1) return null;

  let fallbackCount = 0;
  const translatedLines = [];
  for (const line of lines) {
    const cleanLine = cleanTranslationText(line);
    if (!cleanLine) {
      translatedLines.push('');
      continue;
    }

    const result = await translateTextSmart(cleanLine, from, to, env, logger);
    if (!result) fallbackCount += 1;
    translatedLines.push(result?.translated || translateNoLiteralLine(cleanLine));
  }

  if (fallbackCount > 0) {
    logger.warn?.('Translation line fallback used', {
      totalLines: lines.length,
      fallbackLines: fallbackCount
    });
  }

  return translatedLines.join(`\n${TRANSLATION_SEPARATOR}\n`);
}

function chunkTranslationLines(lines = [], maxChars = 900) {
  const chunks = [];
  let current = [];
  let currentSize = 0;

  for (const line of lines) {
    const lineSize = String(line || '').length + TRANSLATION_SEPARATOR.length + 2;
    if (current.length && currentSize + lineSize > maxChars) {
      chunks.push(current);
      current = [];
      currentSize = 0;
    }
    current.push(line);
    currentSize += lineSize;
  }

  if (current.length) chunks.push(current);
  return chunks;
}

async function translateWithMyMemorySingle(text, from, to, logger = console) {
  const targetLang = String(to || '').toLowerCase().startsWith('pt') ? 'pt' : to;
  const langPair = encodeURIComponent(`${from}|${targetLang}`);
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
  const { response, data } = await fetchJsonWithTimeout(url, 12000);
  const translated = cleanTranslationText(data?.responseData?.translatedText || '');
  if (!response.ok) {
    logger.warn?.('MyMemory translation failed', {
      statusCode: response.status,
      textLength: text.length,
      body: compactProviderBody(data)
    });
    return null;
  }
  if (!isUsefulTranslation(text, translated)) {
    logger.warn?.('MyMemory translation returned unusable text', {
      responseStatus: data?.responseStatus,
      responseDetails: data?.responseDetails,
      textLength: text.length
    });
    return null;
  }
  return translated;
}

async function translateBlockWithMyMemory(text, from, to, logger = console) {
  const lines = splitTranslationBlock(text).map((line) => cleanTranslationText(line));
  if (lines.length <= 1) return null;

  const translatedChunks = [];
  const chunks = chunkTranslationLines(lines);
  for (let index = 0; index < chunks.length; index += 2) {
    const group = chunks.slice(index, index + 2);
    const groupResults = await Promise.all(group.map(async (chunk) => {
      const originalBlock = chunk.join(`\n${TRANSLATION_SEPARATOR}\n`);
      const translatedBlock = await translateWithMyMemorySingle(originalBlock, from, to, logger);
      if (!translatedBlock || !hasMatchingTranslationBlockShape(originalBlock, translatedBlock)) {
        return chunk.map((line) => translateNoLiteralLine(line));
      }
      return splitTranslationBlock(translatedBlock).map((line, lineIndex) => {
        const clean = cleanTranslationText(line);
        return isUsefulTranslation(chunk[lineIndex], clean) ? clean : translateNoLiteralLine(chunk[lineIndex]);
      });
    }));
    translatedChunks.push(...groupResults);
  }

  return translatedChunks.flat().join(`\n${TRANSLATION_SEPARATOR}\n`);
}

async function translateWithMyMemoryLogged(text, from, to, logger = console) {
  if (hasTranslationBlock(text) && text.length > 900) {
    return translateBlockWithMyMemory(text, from, to, logger);
  }

  return translateWithMyMemorySingle(text, from, to, logger);
}

async function translateTextSmart(text, from = 'en', to = 'pt-BR', env = process.env, logger = console) {
  const providers = [
    ['deepl', () => translateWithDeepL(text, from, to, env, logger)],
    ['mymemory', () => translateWithMyMemoryLogged(text, from, to, logger)]
  ];

  for (const [provider, translate] of providers) {
    try {
      const translated = await translate();
      if (translated) return { provider, translated };
    } catch (error) {
      logger.warn?.('Translation provider threw', {
        provider,
        message: error.message,
        textLength: text.length
      });
    }
  }

  return null;
}

module.exports = {
  withTranslationSlot,
  asTranslationResponse,
  splitTranslationBlock,
  hasTranslationBlock,
  hasMatchingTranslationBlockShape,
  buildTranslationCacheKey,
  shouldCacheTranslation,
  translateBlockByLines,
  translateTextSmart
};
