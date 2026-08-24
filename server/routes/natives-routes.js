const NATIVES_CACHE_VERSION = 'strict-v4';
const NATIVES_CACHE_SOURCE = 'verified-short-v4';
const NATIVES_EMPTY_CACHE_VERSION = 'empty-v1';
const NATIVES_EMPTY_CACHE_SOURCE = 'verified-empty-v1';
const NATIVES_CURATED_CACHE_VERSION = 'curated-v1';
const NATIVES_CURATED_CACHE_SOURCE = 'curated-short-v1';
const NATIVES_MAX_DURATION_SECONDS = 60;
const NATIVES_RESULT_LIMIT = 6;
const NATIVES_MIN_SCORE = 280;

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

function buildNativesCacheKey(rawQuery = '', lang = 'english') {
  const selectedLang = String(lang || 'english').trim().toLowerCase();
  return `${NATIVES_CACHE_VERSION}::${selectedLang}::${normalizeNativesText(rawQuery)}`;
}

function buildNativesCuratedCacheKey(rawQuery = '', lang = 'english') {
  const selectedLang = String(lang || 'english').trim().toLowerCase();
  return `${NATIVES_CURATED_CACHE_VERSION}::${selectedLang}::${normalizeNativesText(rawQuery)}`;
}

function buildNativesEmptyCacheKey(rawQuery = '', lang = 'english') {
  const selectedLang = String(lang || 'english').trim().toLowerCase();
  return `${NATIVES_EMPTY_CACHE_VERSION}::${selectedLang}::${normalizeNativesText(rawQuery)}`;
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
  const normalizedQuery = normalizeNativesText(rawQuery);
  const normalizedText = normalizeNativesText(text);

  if (!normalizedQuery || !normalizedText) return false;

  const pattern = escapeRegex(normalizedQuery).replace(/\s+/g, '\\s+');
  return new RegExp(`(^|\\s)${pattern}(?=\\s|$)`).test(normalizedText);
}

function isShortNativeVideo(candidate = {}) {
  const durationSeconds = Number(candidate?.durationSeconds || 0);
  return Number.isFinite(durationSeconds)
    && durationSeconds > 0
    && durationSeconds <= NATIVES_MAX_DURATION_SECONDS;
}

function isBlockedNativeCandidate(candidate = {}) {
  const text = `${candidate?.title || ''} ${candidate?.author || ''}`;
  return /(lyrics?|karaoke|official music video|official video|audio|song|cover|remix|beat|instrumental|vevo|topic|album|playlist|full movie|compilation)/i.test(text)
    || /(grammar|lesson|class|tutorial|exercise|minimal pairs|pronunciation practice|how to pronounce)/i.test(text);
}

function hasNativeContextSignal(candidate = {}) {
  const text = `${candidate?.title || ''} ${candidate?.author || ''}`;
  return /(shorts?|clip|conversation|dialogue|scene|street interview|native speaker|native english|real english|daily english|vlog|interview|podcast|speaking|talking|phrase|expression)/i.test(text);
}

function isStrictNativesCandidate(candidate = {}, rawQuery = '') {
  const searchableText = [
    candidate?.title || '',
    candidate?.description || ''
  ].join(' ');

  return hasExactPhraseMatch(rawQuery, searchableText)
    && isShortNativeVideo(candidate)
    && !isBlockedNativeCandidate(candidate)
    && hasNativeContextSignal(candidate);
}

function isUsableNativesCache(row, rawQuery = '', lang = 'english') {
  if (!row || row.source !== NATIVES_CACHE_SOURCE || !isFreshNativesCache(row)) return false;
  if (normalizeNativesText(row.query || '') !== normalizeNativesText(rawQuery)) return false;
  if (String(row.lang || 'english').toLowerCase() !== String(lang || 'english').toLowerCase()) return false;
  return parseCachedVideoIds(row.video_ids).length > 0;
}

function isUsableCuratedNativesCache(row, rawQuery = '', lang = 'english') {
  if (!row || row.source !== NATIVES_CURATED_CACHE_SOURCE) return false;
  if (normalizeNativesText(row.query || '') !== normalizeNativesText(rawQuery)) return false;
  if (String(row.lang || 'english').toLowerCase() !== String(lang || 'english').toLowerCase()) return false;
  return parseCachedVideoIds(row.video_ids).length > 0;
}

function isUsableEmptyNativesCache(row, rawQuery = '', lang = 'english') {
  if (!row || row.source !== NATIVES_EMPTY_CACHE_SOURCE || !isFreshNativesCache(row, 24 * 60 * 60 * 1000)) return false;
  if (normalizeNativesText(row.query || '') !== normalizeNativesText(rawQuery)) return false;
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

function buildNativesSearchQueries(rawQuery = '', lang = 'english') {
  const query = String(rawQuery).trim().replace(/^"+|"+$/g, '');
  const langLabel = getLanguageLabel(lang);

  return [
    `"${query}" "${langLabel}" "shorts" "native speaker" -lyrics -song`,
    `"${query}" "${langLabel}" "conversation" "shorts" -lyrics -song`,
    `"${query}" "${langLabel}" "real english" "shorts" -lyrics -song`,
    `"${query}" "${langLabel}" "street interview" "shorts" -lyrics -song`
  ];
}

function buildNativesShortsSearchUrl(rawQuery = '', lang = 'english') {
  const query = String(rawQuery).trim().replace(/^"+|"+$/g, '');
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
  const normalizedQuery = normalizeNativesText(rawQuery);
  const terms = normalizedQuery.split(' ').filter(Boolean);

  if (!normalizedTitle || !normalizedQuery || terms.length === 0 || !isStrictNativesCandidate(candidate, rawQuery)) {
    return -1000;
  }

  let score = 200;
  const isPhraseQuery = terms.length > 1;

  if (hasExactPhraseMatch(rawQuery, title)) score += 100;
  if (hasExactPhraseMatch(rawQuery, author)) score += 10;

  const matchedTerms = terms.filter((term) => normalizedTitle.includes(term)).length;
  score += matchedTerms * 18;

  if (hasNativeContextSignal(candidate)) {
    score += 35;
  }

  if (/native|real english|conversation|street interview|speaking/i.test(`${title} ${author}`)) score += 35;
  if (durationSeconds <= 30) score += 35;
  else if (durationSeconds <= 60) score += 25;
  else if (durationSeconds <= NATIVES_MAX_DURATION_SECONDS) score += 10;
  if (isPhraseQuery && hasExactPhraseMatch(rawQuery, title)) score += 40;
  if (normalizedAuthor.includes('native') || normalizedAuthor.includes('english')) score += 10;

  return score;
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
    logger = console
  } = deps;

  app.get('/api/natives/search', async (req, res) => {
    const { q, lang } = req.query;
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({ error: 'Query obrigatoria' });
    }

    try {
      const selectedLang = typeof lang === 'string' ? lang : 'english';
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
          source: NATIVES_CACHE_SOURCE
        });
      }

      const emptyCacheKey = buildNativesEmptyCacheKey(q, selectedLang);
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

      for (const searchQuery of queries) {
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

      rankedIds = [...new Set(rankedIds)];

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
      await supabaseUpsertNativesCache(cacheKey, {
        query: q.trim(),
        lang: selectedLang,
        videoIds: finalIds,
        source: NATIVES_CACHE_SOURCE
      });

      return res.json({
        videoIds: finalIds,
        cached: false,
        strict: true,
        source: NATIVES_CACHE_SOURCE
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

  app.post('/api/natives/curated', async (req, res) => {
    if (!canWriteCuratedNativesCache(req)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

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
  NATIVES_EMPTY_CACHE_SOURCE,
  NATIVES_EMPTY_CACHE_VERSION,
  NATIVES_MIN_SCORE,
  buildNativesCacheKey,
  buildNativesCuratedCacheKey,
  buildNativesEmptyCacheKey,
  buildNativesSearchQueries,
  buildNativesShortsSearchUrl,
  canWriteCuratedNativesCache,
  hasExactPhraseMatch,
  isBlockedNativeCandidate,
  isUsableCuratedNativesCache,
  isUsableEmptyNativesCache,
  isShortNativeVideo,
  isStrictNativesCandidate,
  isUsableNativesCache,
  normalizeNativesText,
  parseCachedVideoIds,
  registerNativesRoutes,
  scoreNativesCandidate
};
