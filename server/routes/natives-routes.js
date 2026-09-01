const NATIVES_CACHE_VERSION = 'strict-v5';
const NATIVES_CACHE_SOURCE = 'youtube-strict-v1';
const NATIVES_FALLBACK_CACHE_SOURCE = 'verified-short-v4';
const NATIVES_EMPTY_CACHE_VERSION = 'empty-v1';
const NATIVES_EMPTY_CACHE_SOURCE = 'verified-empty-v1';
const NATIVES_CURATED_CACHE_VERSION = 'curated-v1';
const NATIVES_CURATED_CACHE_SOURCE = 'curated-short-v1';
const NATIVES_REPORT_CACHE_VERSION = 'reported-v1';
const NATIVES_REPORT_CACHE_SOURCE = 'reported-bad-video-v1';
const NATIVES_MAX_DURATION_SECONDS = 60;
const NATIVES_RESULT_LIMIT = 6;
const NATIVES_MIN_SCORE = 280;
const NATIVES_MIN_QUERY_LENGTH = 2;
const { nativeCoachSchema, nativeReportSchema, validateBody } = require('../validation');
const NATIVES_SEARCH_STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'can', 'could', 'do', 'does', 'for', 'have', 'how', 'i', 'is', 'it', 'me', 'my', 'of', 'on', 'please', 'some', 'the', 'this', 'to', 'we', 'what', 'where', 'with', 'you', 'your'
]);

const NATIVE_SITUATION_COACHES = {
  restaurant: 'voce e um atendente de restaurante nativo, educado, objetivo e focado em pedidos, conta, alergias e cardapio',
  airport: 'voce e um agente de aeroporto nativo, claro e direto, focado em portao, embarque, bagagem, seguranca e imigração',
  hotel: 'voce e uma recepcionista de hotel nativa, cordial e pratica, focada em check-in, reserva, problemas no quarto e pedidos',
  job_interview: 'voce e um entrevistador nativo, profissional e exigente, focado em respostas naturais para emprego',
  small_talk: 'voce e um amigo nativo, casual e natural, focado em conversa leve sem frases roboticas',
  shopping: 'voce e um atendente de loja nativo, util e natural, focado em preco, tamanho, troca, produto e pagamento',
  emergency: 'voce e um atendente de emergencia nativo, claro e calmo, focado em seguranca, localizacao e urgencia',
  meeting: 'voce e um colega de trabalho nativo, profissional e diplomatico, focado em reuniao, prazos e alinhamento'
};

const NATIVE_LEVEL_GUIDES = {
  A1: 'corrija com frases muito curtas, vocabulario basico e uma explicacao em portugues bem simples',
  A2: 'corrija com frases curtas, pedidos educados e explicacao pratica em portugues',
  B1: 'corrija naturalidade, preposicoes, ordem das palavras e escolha de expressao',
  B2: 'corrija tom, precisao, profissionalismo e alternativas mais naturais',
  C1: 'corrija nuance, registro, idiomaticidade e impacto da frase',
  C2: 'corrija sutileza, concisao, estilo, naturalidade e adequacao cultural'
};

function parseNativeCoachJson(content = '') {
  const raw = String(content || '').trim();
  const jsonText = raw.match(/\{[\s\S]*\}/)?.[0] || raw;

  try {
    const parsed = JSON.parse(jsonText);
    const score = Number(parsed.score);
    return {
      score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 60,
      natural: String(parsed.natural || '').slice(0, 500) || 'Try saying it in a simpler, clearer way.',
      feedback: String(parsed.feedback || '').slice(0, 700) || 'Boa tentativa. Ajuste a frase para soar mais natural.',
      correction: String(parsed.correction || '').slice(0, 500) || 'Revise gramática, educação e contexto.',
      nextReply: String(parsed.nextReply || '').slice(0, 500) || 'Now try answering with one complete sentence.'
    };
  } catch (_error) {
    return {
      score: 60,
      natural: 'Try saying it in a more natural and polite way.',
      feedback: raw.slice(0, 700) || 'A IA corrigiu sua resposta, mas retornou em formato inesperado.',
      correction: 'Reescreva a frase com sujeito, verbo e tom adequado para a situação.',
      nextReply: 'Try again with a short complete sentence.'
    };
  }
}

function isValidYouTubeId(value = '') {
  return /^[a-zA-Z0-9_-]{11}$/.test(String(value));
}

function extractVideoIdsFromHtml(html = '') {
  const matches = [...String(html).matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)];
  return [...new Set(matches.map((match) => match[1]).filter(isValidYouTubeId))];
}

function normalizeNativesText(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeNativesQuery(rawQuery = '') {
  return normalizeNativesText(rawQuery)
    .replace(/\b(meaning|means|traducao|tradução|translate|in english|em ingles|em inglês)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSearchableNativesQuery(rawQuery = '') {
  const query = sanitizeNativesQuery(rawQuery);
  return query.length >= NATIVES_MIN_QUERY_LENGTH && /[a-z0-9]/i.test(query);
}

function buildNativesCacheKey(rawQuery = '', lang = 'english') {
  const selectedLang = String(lang || 'english').trim().toLowerCase();
  return `${NATIVES_CACHE_VERSION}::${selectedLang}::${sanitizeNativesQuery(rawQuery)}`;
}

function buildNativesCuratedCacheKey(rawQuery = '', lang = 'english') {
  const selectedLang = String(lang || 'english').trim().toLowerCase();
  return `${NATIVES_CURATED_CACHE_VERSION}::${selectedLang}::${sanitizeNativesQuery(rawQuery)}`;
}

function buildNativesEmptyCacheKey(rawQuery = '', lang = 'english') {
  const selectedLang = String(lang || 'english').trim().toLowerCase();
  return `${NATIVES_EMPTY_CACHE_VERSION}::${selectedLang}::${sanitizeNativesQuery(rawQuery)}`;
}

function buildNativesReportCacheKey(rawQuery = '', lang = 'english') {
  const selectedLang = String(lang || 'english').trim().toLowerCase();
  return `${NATIVES_REPORT_CACHE_VERSION}::${selectedLang}::${sanitizeNativesQuery(rawQuery)}`;
}

function parseCachedVideoIds(value) {
  if (Array.isArray(value)) return value.filter(isValidYouTubeId);
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(isValidYouTubeId) : [];
  } catch (_error) {
    return [];
  }
}

function isFreshNativesCache(row, ttlMs = 7 * 24 * 60 * 60 * 1000) {
  const updatedAt = row?.updated_at || row?.created_at;
  if (!updatedAt) return false;
  const timestamp = new Date(updatedAt).getTime();
  return Number.isFinite(timestamp) && Date.now() - timestamp < ttlMs;
}

function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasExactPhraseMatch(rawQuery = '', text = '') {
  const normalizedQuery = sanitizeNativesQuery(rawQuery);
  const normalizedText = normalizeNativesText(text);

  if (!normalizedQuery || !normalizedText) return false;

  const pattern = escapeRegex(normalizedQuery).replace(/\s+/g, '\\s+');
  return new RegExp(`(^|\\s)${pattern}(?=\\s|$)`).test(normalizedText);
}

function getSignificantNativesTerms(rawQuery = '') {
  const terms = sanitizeNativesQuery(rawQuery).split(' ').filter(Boolean);
  const significant = terms.filter((term) => !NATIVES_SEARCH_STOPWORDS.has(term) && term.length > 2);
  return significant.length > 0 ? significant : terms.filter((term) => term.length > 1);
}

function hasMainTermsMatch(rawQuery = '', text = '') {
  const normalizedText = normalizeNativesText(text);
  const terms = getSignificantNativesTerms(rawQuery);
  if (terms.length === 0 || !normalizedText) return false;

  const requiredCount = terms.length <= 2 ? terms.length : Math.max(2, Math.ceil(terms.length * 0.75));
  return terms.filter((term) => normalizedText.includes(term)).length >= requiredCount;
}

function isShortNativeVideo(candidate = {}) {
  const durationSeconds = Number(candidate?.durationSeconds || 0);
  return Number.isFinite(durationSeconds)
    && durationSeconds > 0
    && durationSeconds <= NATIVES_MAX_DURATION_SECONDS;
}

function isBlockedNativeCandidate(candidate = {}) {
  const text = `${candidate?.title || ''} ${candidate?.author || ''}`;
  return /(lyrics?|karaoke|official music video|official video|audio|song|cover|remix|beat|instrumental|vevo|topic|album|playlist|full movie|compilation|reaction|dance challenge)/i.test(text)
    || /(grammar|lesson|class|tutorial|exercise|minimal pairs|pronunciation practice|how to pronounce|pronounce|vocabulary list|learn english|english lesson)/i.test(text);
}

function hasNativeContextSignal(candidate = {}) {
  const text = `${candidate?.title || ''} ${candidate?.author || ''}`;
  return /(shorts?|clip|conversation|dialogue|scene|street interview|native speaker|native english|real english|daily english|vlog|interview|podcast|speaking|talking|phrase|expression|people say|how people talk|real life)/i.test(text);
}

function isStrictNativesCandidate(candidate = {}, rawQuery = '') {
  const searchableText = [
    candidate?.title || '',
    candidate?.description || ''
  ].join(' ');

  return (hasExactPhraseMatch(rawQuery, searchableText) || hasMainTermsMatch(rawQuery, searchableText))
    && isShortNativeVideo(candidate)
    && !isBlockedNativeCandidate(candidate)
    && hasNativeContextSignal(candidate);
}

function isUsableNativesCache(row, rawQuery = '', lang = 'english') {
  if (!row || ![NATIVES_CACHE_SOURCE, NATIVES_FALLBACK_CACHE_SOURCE].includes(row.source) || !isFreshNativesCache(row)) return false;
  if (sanitizeNativesQuery(row.query || '') !== sanitizeNativesQuery(rawQuery)) return false;
  if (String(row.lang || 'english').toLowerCase() !== String(lang || 'english').toLowerCase()) return false;
  return parseCachedVideoIds(row.video_ids).length > 0;
}

function isUsableCuratedNativesCache(row, rawQuery = '', lang = 'english') {
  if (!row || row.source !== NATIVES_CURATED_CACHE_SOURCE) return false;
  if (sanitizeNativesQuery(row.query || '') !== sanitizeNativesQuery(rawQuery)) return false;
  if (String(row.lang || 'english').toLowerCase() !== String(lang || 'english').toLowerCase()) return false;
  return parseCachedVideoIds(row.video_ids).length > 0;
}

function isUsableEmptyNativesCache(row, rawQuery = '', lang = 'english') {
  if (!row || row.source !== NATIVES_EMPTY_CACHE_SOURCE || !isFreshNativesCache(row, 24 * 60 * 60 * 1000)) return false;
  if (sanitizeNativesQuery(row.query || '') !== sanitizeNativesQuery(rawQuery)) return false;
  if (String(row.lang || 'english').toLowerCase() !== String(lang || 'english').toLowerCase()) return false;
  return parseCachedVideoIds(row.video_ids).length === 0;
}

function isLocalRequest(req) {
  const ip = String(req.ip || req.connection?.remoteAddress || '');
  return ip === '127.0.0.1' || ip === '::1' || ip.includes('127.0.0.1') || ip.includes('::ffff:127.0.0.1');
}

function canWriteCuratedNativesCache(req, env = process.env) {
  const configuredToken = env.NATIVES_ADMIN_TOKEN;
  const authorization = String(req.headers.authorization || '');
  const bearerToken = authorization.toLowerCase().startsWith('bearer ')
    ? authorization.slice(7).trim()
    : '';

  if (configuredToken && bearerToken === configuredToken) return true;
  return env.NODE_ENV !== 'production' && isLocalRequest(req);
}

function getLanguageLabel(lang = 'english') {
  const langLabelMap = {
    english: 'english',
    'english-us': 'american english',
    'english-uk': 'british english',
    'english-au': 'australian english',
    spanish: 'spanish',
    french: 'french',
    german: 'german',
    italian: 'italian',
    portuguese: 'portuguese'
  };

  return langLabelMap[lang] || 'english';
}

function getYouTubeLocale(lang = 'english') {
  const localeMap = {
    english: { relevanceLanguage: 'en', regionCode: 'US' },
    'english-us': { relevanceLanguage: 'en', regionCode: 'US' },
    'english-uk': { relevanceLanguage: 'en', regionCode: 'GB' },
    'english-au': { relevanceLanguage: 'en', regionCode: 'AU' },
    spanish: { relevanceLanguage: 'es', regionCode: 'ES' },
    french: { relevanceLanguage: 'fr', regionCode: 'FR' },
    german: { relevanceLanguage: 'de', regionCode: 'DE' },
    italian: { relevanceLanguage: 'it', regionCode: 'IT' },
    portuguese: { relevanceLanguage: 'pt', regionCode: 'BR' }
  };

  return localeMap[lang] || localeMap.english;
}

function buildNativesSearchQueries(rawQuery = '', lang = 'english') {
  const query = sanitizeNativesQuery(rawQuery);
  const langLabel = getLanguageLabel(lang);
  const terms = query.split(' ').filter(Boolean);
  const isPhrase = terms.length > 1;

  if (!query) return [];

  const exact = isPhrase ? `"${query}"` : query;
  const significant = getSignificantNativesTerms(query).join(' ');
  const loose = significant || query;
  return [
    `${exact} ${langLabel} shorts real conversation -lyrics -song -music`,
    `${exact} ${langLabel} native speaker shorts -lyrics -song -music`,
    `${exact} ${loose} ${langLabel} airport conversation shorts -lyrics -song -music`,
    `${exact} ${loose} ${langLabel} real life english shorts -lyrics -song -music`,
    `${exact} ${langLabel} street interview shorts -lyrics -song -music`,
    `${exact} ${langLabel} real life dialogue shorts -lyrics -song -music`,
    `${exact} ${langLabel} vlog speaking shorts -lyrics -song -music`
  ];
}

function buildNativesShortsSearchUrl(rawQuery = '', lang = 'english') {
  const query = sanitizeNativesQuery(rawQuery);
  const langLabel = getLanguageLabel(lang);
  const searchQuery = `"${query}" ${langLabel} shorts native speaker -lyrics -song`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}&sp=EgIYAQ%253D%253D`;
}

function buildNativesEmptyResponse(rawQuery, lang, message, reason) {
  return {
    videoIds: [],
    message,
    reason,
    searchUrl: buildNativesShortsSearchUrl(rawQuery, lang)
  };
}

function scoreNativesCandidate(candidate = {}, rawQuery = '') {
  const title = candidate?.title || '';
  const author = candidate?.author || '';
  const durationSeconds = Number(candidate?.durationSeconds || 0);
  const normalizedTitle = normalizeNativesText(title);
  const normalizedAuthor = normalizeNativesText(author);
  const normalizedQuery = sanitizeNativesQuery(rawQuery);
  const terms = normalizedQuery.split(' ').filter(Boolean);

  if (!normalizedTitle || !normalizedQuery || terms.length === 0 || !isStrictNativesCandidate(candidate, rawQuery)) {
    return -1000;
  }

  let score = 200;
  const isPhraseQuery = terms.length > 1;

  if (hasExactPhraseMatch(rawQuery, title)) score += 100;
  else if (hasMainTermsMatch(rawQuery, `${title} ${candidate?.description || ''}`)) score += 72;
  if (hasExactPhraseMatch(rawQuery, author)) score += 10;

  const matchedTerms = getSignificantNativesTerms(rawQuery).filter((term) => normalizedTitle.includes(term)).length;
  score += matchedTerms * 18;

  if (hasNativeContextSignal(candidate)) {
    score += 35;
  }

  if (/native|real english|conversation|street interview|speaking/i.test(`${title} ${author}`)) score += 35;
  if (/dialogue|conversation|street interview|real life|vlog/i.test(title)) score += 30;
  if (/shorts?/i.test(title)) score += 18;
  if (/(learn english|english lesson|grammar|pronunciation)/i.test(`${title} ${author}`)) score -= 80;
  if (durationSeconds <= 30) score += 35;
  else if (durationSeconds <= 60) score += 25;
  else if (durationSeconds <= NATIVES_MAX_DURATION_SECONDS) score += 10;
  if (isPhraseQuery && hasExactPhraseMatch(rawQuery, title)) score += 40;
  if (normalizedAuthor.includes('native') || normalizedAuthor.includes('english')) score += 10;

  return score;
}

function parseYouTubeDuration(duration = '') {
  const match = String(duration).match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

function buildYouTubeSearchUrl(searchQuery, apiKey, lang = 'english') {
  const locale = getYouTubeLocale(lang);
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    q: searchQuery,
    maxResults: '12',
    videoDuration: 'short',
    videoEmbeddable: 'true',
    safeSearch: 'strict',
    relevanceLanguage: locale.relevanceLanguage,
    regionCode: locale.regionCode,
    key: apiKey
  });

  return `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;
}

function buildYouTubeVideosUrl(videoIds, apiKey) {
  const params = new URLSearchParams({
    part: 'snippet,contentDetails,status',
    id: videoIds.join(','),
    key: apiKey
  });

  return `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`;
}

async function searchYouTubeDataApiVideos(searchQuery, apiKey, lang = 'english') {
  if (!apiKey) return [];

  const searchResponse = await fetch(buildYouTubeSearchUrl(searchQuery, apiKey, lang), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10000)
  });

  if (!searchResponse.ok) {
    throw new Error(`YouTube search failed: ${searchResponse.status}`);
  }

  const searchData = await searchResponse.json();
  const videoIds = [...new Set((Array.isArray(searchData.items) ? searchData.items : [])
    .map((item) => item?.id?.videoId)
    .filter(isValidYouTubeId))];

  if (videoIds.length === 0) return [];

  const videosResponse = await fetch(buildYouTubeVideosUrl(videoIds, apiKey), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10000)
  });

  if (!videosResponse.ok) {
    throw new Error(`YouTube videos failed: ${videosResponse.status}`);
  }

  const videosData = await videosResponse.json();
  return (Array.isArray(videosData.items) ? videosData.items : [])
    .map((item) => ({
      videoId: item?.id,
      title: item?.snippet?.title || '',
      author: item?.snippet?.channelTitle || '',
      description: item?.snippet?.description || '',
      durationSeconds: parseYouTubeDuration(item?.contentDetails?.duration || ''),
      embeddable: item?.status?.embeddable !== false,
      privacyStatus: item?.status?.privacyStatus || 'public'
    }))
    .filter((item) => isValidYouTubeId(item.videoId) && item.embeddable && item.privacyStatus === 'public');
}

async function searchYouTubeVideos(searchQuery) {
  const query = encodeURIComponent(searchQuery);
  const attempts = [
    `https://www.youtube.com/results?search_query=${query}&hl=en`,
    `https://www.youtube.com/results?search_query=${query}&persist_hl=1&hl=en`,
    `https://www.youtube.com/results?search_query=${query}&app=desktop&hl=en`
  ];

  for (const url of attempts) {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      continue;
    }

    const html = await response.text();
    const ids = extractVideoIdsFromHtml(html);
    if (ids.length > 0) {
      return ids;
    }
  }

  return [];
}

async function searchInvidiousVideos(searchQuery) {
  const instances = [
    'https://invidious.fdn.fr',
    'https://invidious.privacyredirect.com',
    'https://yewtu.be'
  ];

  for (const baseUrl of instances) {
    try {
      const url = `${baseUrl}/api/v1/search?q=${encodeURIComponent(searchQuery)}&type=video`;
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      const entries = (Array.isArray(data) ? data : [])
        .map((item) => ({
          videoId: item?.videoId,
          title: item?.title || '',
          author: item?.author || '',
          description: item?.description || '',
          durationSeconds: Number(item?.lengthSeconds || 0)
        }))
        .filter((item) => isValidYouTubeId(item.videoId));

      if (entries.length > 0) {
        return entries;
      }
    } catch (_error) {
      // Try the next public provider.
    }
  }

  return [];
}

function registerNativesRoutes(app, deps = {}) {
  const {
    supabaseGetNativesCache = async () => null,
    supabaseUpsertNativesCache = async () => {},
    supabaseGetNativeSavedVideos = async () => [],
    supabaseSaveNativeVideo = async () => ({ error: 'not configured' }),
    supabaseDeleteNativeVideo = async () => ({ error: 'not configured' }),
    supabaseGetUserById = async () => null,
    authenticateToken = (_req, _res, next) => next(),
    checkAILimit = (_req, _res, next) => next(),
    callMiniMaxChat = async () => ({ content: '' }),
    OPENAI_MODEL_ALIAS = 'gpt-4o-mini',
    AI_API_KEY = '',
    YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '',
    logger = console
  } = deps;

  async function requireNativeCurator(req, res, next) {
    if (canWriteCuratedNativesCache(req)) return next();

    return authenticateToken(req, res, async () => {
      try {
        const user = await supabaseGetUserById(req.user.id);
        if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Acesso admin restrito' });
        return next();
      } catch (_error) {
        return res.status(500).json({ error: 'Erro ao validar admin' });
      }
    });
  }

  app.get('/api/natives/search', async (req, res) => {
    const { q, lang } = req.query;
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({ error: 'Query obrigatoria' });
    }

    try {
      const selectedLang = typeof lang === 'string' ? lang : 'english';
      if (!isSearchableNativesQuery(q)) {
        return res.status(400).json({ error: 'Digite uma palavra ou frase valida para buscar.' });
      }

      const curatedCacheKey = buildNativesCuratedCacheKey(q, selectedLang);
      const curated = await supabaseGetNativesCache(curatedCacheKey);
      const curatedIds = parseCachedVideoIds(curated?.video_ids);

      if (curatedIds.length > 0 && isUsableCuratedNativesCache(curated, q, selectedLang)) {
        return res.json({
          videoIds: curatedIds.slice(0, NATIVES_RESULT_LIMIT),
          cached: true,
          curated: true,
          strict: true,
          source: NATIVES_CURATED_CACHE_SOURCE
        });
      }

      const cacheKey = buildNativesCacheKey(q, selectedLang);
      const cached = await supabaseGetNativesCache(cacheKey);
      const cachedIds = parseCachedVideoIds(cached?.video_ids);

      if (cachedIds.length > 0 && isUsableNativesCache(cached, q, selectedLang)) {
        return res.json({
          videoIds: cachedIds.slice(0, NATIVES_RESULT_LIMIT),
          cached: true,
          strict: true,
          source: cached.source || NATIVES_CACHE_SOURCE
        });
      }

      const emptyCacheKey = buildNativesEmptyCacheKey(q, selectedLang);
      const reportCacheKey = buildNativesReportCacheKey(q, selectedLang);
      const reported = await supabaseGetNativesCache(reportCacheKey);
      const reportedIds = new Set(parseCachedVideoIds(reported?.video_ids));
      const emptyCached = await supabaseGetNativesCache(emptyCacheKey);
      if (isUsableEmptyNativesCache(emptyCached, q, selectedLang)) {
        return res.json({
          ...buildNativesEmptyResponse(
            q,
            selectedLang,
            'Nenhum short confiavel com nativo falando essa expressao foi encontrado.',
            'no_reliable_match_cached'
          ),
          cached: true,
          strict: true,
          source: NATIVES_EMPTY_CACHE_SOURCE
        });
      }

      const queries = buildNativesSearchQueries(q, selectedLang);
      let rankedIds = [];
      let foundAnyProviderResponse = false;
      let usedYouTubeDataApi = false;

      if (YOUTUBE_API_KEY) {
        for (const searchQuery of queries) {
          try {
            const youtubeResults = await searchYouTubeDataApiVideos(searchQuery, YOUTUBE_API_KEY, selectedLang);
            if (youtubeResults.length > 0) {
              foundAnyProviderResponse = true;
            }

            const scoredResults = youtubeResults
              .map((item) => ({
                id: item.videoId,
                score: scoreNativesCandidate(item, q)
              }))
              .sort((a, b) => b.score - a.score);

            const acceptedIds = scoredResults
              .filter((item) => item.score >= NATIVES_MIN_SCORE)
              .map((item) => item.id);

            if (acceptedIds.length > 0) {
              usedYouTubeDataApi = true;
            }

            rankedIds.push(...acceptedIds);

            if (rankedIds.length >= 3) break;
          } catch (error) {
            logger.warn?.('YouTube Data API natives search failed', {
              error: error.message,
              queryLength: String(q || '').length
            });
            break;
          }
        }
      }

      for (const searchQuery of queries) {
        if (rankedIds.length >= 3) break;

        const invidiousResults = await searchInvidiousVideos(searchQuery);
        if (invidiousResults.length > 0) {
          foundAnyProviderResponse = true;
        }

        const scoredResults = invidiousResults
          .map((item) => ({
            id: item.videoId,
            score: scoreNativesCandidate(item, q)
          }))
          .sort((a, b) => b.score - a.score);

        rankedIds.push(
          ...scoredResults
            .filter((item) => item.score >= NATIVES_MIN_SCORE)
            .map((item) => item.id)
        );

        if (rankedIds.length >= 3) break;
      }

      rankedIds = [...new Set(rankedIds)].filter((id) => !reportedIds.has(id));

      if (rankedIds.length === 0) {
        if (foundAnyProviderResponse) {
          await supabaseUpsertNativesCache(emptyCacheKey, {
            query: q.trim(),
            lang: selectedLang,
            videoIds: [],
            source: NATIVES_EMPTY_CACHE_SOURCE
          });
        }

        return res.json(buildNativesEmptyResponse(
          q,
          selectedLang,
          foundAnyProviderResponse
            ? 'Nenhum short confiavel com nativo falando essa expressao foi encontrado.'
            : 'Os provedores de video nao responderam agora.',
          foundAnyProviderResponse ? 'no_reliable_match' : 'providers_unavailable'
        ));
      }

      const finalIds = rankedIds.slice(0, NATIVES_RESULT_LIMIT);
      const resultSource = usedYouTubeDataApi ? NATIVES_CACHE_SOURCE : NATIVES_FALLBACK_CACHE_SOURCE;
      await supabaseUpsertNativesCache(cacheKey, {
        query: q.trim(),
        lang: selectedLang,
        videoIds: finalIds,
        source: resultSource
      });

      return res.json({
        videoIds: finalIds,
        cached: false,
        strict: true,
        source: resultSource
      });
    } catch (error) {
      logger.warn?.('Natives search failed', {
        error,
        queryLength: String(q || '').length,
        lang: typeof lang === 'string' ? lang : 'english'
      });
      return res.status(200).json(buildNativesEmptyResponse(
        q,
        typeof lang === 'string' ? lang : 'english',
        'A busca de videos falhou agora.',
        'search_failed'
      ));
    }
  });

  app.post('/api/natives/coach', authenticateToken, checkAILimit, validateBody(nativeCoachSchema), async (req, res) => {
    const { situationId, englishLevel = 'A1', prompt, answer, target = '' } = req.validatedBody;
    const situationCoach = NATIVE_SITUATION_COACHES[situationId] || NATIVE_SITUATION_COACHES.small_talk;
    const levelGuide = NATIVE_LEVEL_GUIDES[englishLevel] || NATIVE_LEVEL_GUIDES.A1;

    try {
      const result = await callMiniMaxChat({
        apiKey: AI_API_KEY,
        requestedModel: OPENAI_MODEL_ALIAS,
        temperature: 0.35,
        messages: [
          {
            role: 'system',
            content: [
              'Voce e o treinador de ingles nativo do LinguaFire.',
              `Situacao: ${situationCoach}.`,
              `Nivel do aluno: ${englishLevel}. ${levelGuide}.`,
              'Avalie naturalidade, gramatica, educacao, contexto e clareza.',
              'Responda apenas JSON valido, sem markdown.',
              'Formato: {"score":0,"natural":"...","feedback":"...","correction":"...","nextReply":"..."}'
            ].join(' ')
          },
          {
            role: 'user',
            content: [
              `Cenario em portugues: ${prompt}`,
              target ? `Resposta natural esperada: ${target}` : '',
              `Resposta do aluno: ${answer}`,
              'De feedback em portugues curto e util. A frase natural e a proxima resposta devem estar em ingles.'
            ].filter(Boolean).join('\n')
          }
        ]
      });

      return res.json(parseNativeCoachJson(result.content));
    } catch (error) {
      logger.error?.('Native coach failed', {
        error: error.message,
        userId: req.user?.id,
        situationId,
        englishLevel
      });
      return res.status(500).json({ error: 'Erro ao treinar resposta com IA' });
    }
  });

  app.post('/api/natives/report', authenticateToken, validateBody(nativeReportSchema), async (req, res) => {
    const { query, videoId, lang = 'english' } = req.validatedBody;
    const selectedLang = String(lang || 'english').trim().toLowerCase();
    const reportCacheKey = buildNativesReportCacheKey(query, selectedLang);

    try {
      const existing = await supabaseGetNativesCache(reportCacheKey);
      const videoIds = [...new Set([...parseCachedVideoIds(existing?.video_ids), videoId])].slice(0, 80);

      await supabaseUpsertNativesCache(reportCacheKey, {
        query: query.trim(),
        lang: selectedLang,
        videoIds,
        source: NATIVES_REPORT_CACHE_SOURCE
      });

      return res.json({ success: true, videoIds });
    } catch (error) {
      logger.warn?.('Natives bad video report failed', {
        error: error.message,
        queryLength: String(query || '').length,
        videoId
      });
      return res.status(200).json({ success: true, localOnly: true });
    }
  });

  app.get('/api/natives/saved', authenticateToken, async (req, res) => {
    try {
      const rows = await supabaseGetNativeSavedVideos(req.user.id);
      return res.json({
        videos: rows.map((row) => ({
          id: row.video_id,
          query: row.query,
          lang: row.lang || 'english',
          date: row.created_at
        }))
      });
    } catch (error) {
      logger.warn?.('Natives saved videos load failed', { error: error.message, userId: req.user?.id });
      return res.status(500).json({ error: 'Erro ao carregar videos salvos' });
    }
  });

  app.post('/api/natives/saved', authenticateToken, validateBody(nativeReportSchema), async (req, res) => {
    const { query, videoId, lang = 'english' } = req.validatedBody;

    try {
      const saved = await supabaseSaveNativeVideo(req.user.id, {
        query: query.trim(),
        videoId,
        lang: String(lang || 'english').trim().toLowerCase()
      });
      if (saved?.error) return res.status(500).json({ error: 'Erro ao salvar video' });
      return res.json({ success: true });
    } catch (error) {
      logger.warn?.('Natives saved video write failed', { error: error.message, userId: req.user?.id });
      return res.status(500).json({ error: 'Erro ao salvar video' });
    }
  });

  app.delete('/api/natives/saved/:videoId', authenticateToken, async (req, res) => {
    const videoId = String(req.params.videoId || '').trim();
    if (!isValidYouTubeId(videoId)) return res.status(400).json({ error: 'Video invalido' });

    try {
      const deleted = await supabaseDeleteNativeVideo(req.user.id, videoId);
      if (deleted?.error) return res.status(500).json({ error: 'Erro ao remover video' });
      return res.json({ success: true });
    } catch (error) {
      logger.warn?.('Natives saved video delete failed', { error: error.message, userId: req.user?.id });
      return res.status(500).json({ error: 'Erro ao remover video' });
    }
  });

  app.post('/api/natives/curated', requireNativeCurator, async (req, res) => {
    const body = req.body || {};
    const query = String(body.q || body.query || '').trim();
    const selectedLang = String(body.lang || 'english').trim().toLowerCase();
    const videoIds = Array.isArray(body.videoIds)
      ? [...new Set(body.videoIds.map(String).filter(isValidYouTubeId))]
      : [];

    if (!query) return res.status(400).json({ error: 'Query obrigatoria' });
    if (videoIds.length === 0) return res.status(400).json({ error: 'videoIds validos obrigatorios' });

    try {
      const cacheKey = buildNativesCuratedCacheKey(query, selectedLang);
      const finalIds = videoIds.slice(0, NATIVES_RESULT_LIMIT);

      await supabaseUpsertNativesCache(cacheKey, {
        query,
        lang: selectedLang,
        videoIds: finalIds,
        source: NATIVES_CURATED_CACHE_SOURCE
      });

      return res.json({
        success: true,
        cacheKey,
        videoIds: finalIds,
        source: NATIVES_CURATED_CACHE_SOURCE
      });
    } catch (_error) {
      return res.status(500).json({ error: 'Erro ao salvar cache curado' });
    }
  });
}

module.exports = {
  NATIVES_CURATED_CACHE_SOURCE,
  NATIVES_CURATED_CACHE_VERSION,
  NATIVES_CACHE_SOURCE,
  NATIVES_CACHE_VERSION,
  NATIVES_FALLBACK_CACHE_SOURCE,
  NATIVES_EMPTY_CACHE_SOURCE,
  NATIVES_EMPTY_CACHE_VERSION,
  NATIVES_REPORT_CACHE_SOURCE,
  NATIVES_REPORT_CACHE_VERSION,
  NATIVES_MIN_SCORE,
  buildNativesCacheKey,
  buildNativesCuratedCacheKey,
  buildNativesEmptyCacheKey,
  buildNativesReportCacheKey,
  buildNativesSearchQueries,
  buildNativesShortsSearchUrl,
  getYouTubeLocale,
  canWriteCuratedNativesCache,
  hasExactPhraseMatch,
  hasMainTermsMatch,
  isBlockedNativeCandidate,
  isUsableCuratedNativesCache,
  isUsableEmptyNativesCache,
  isShortNativeVideo,
  isStrictNativesCandidate,
  isUsableNativesCache,
  normalizeNativesText,
  parseYouTubeDuration,
  parseCachedVideoIds,
  registerNativesRoutes,
  sanitizeNativesQuery,
  scoreNativesCandidate
};
