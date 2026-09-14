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
const NATIVES_SEARCH_STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'can', 'could', 'do', 'does', 'for', 'have', 'how', 'i', 'is', 'it', 'me', 'my', 'of', 'on', 'please', 'some', 'the', 'this', 'to', 'we', 'what', 'where', 'with', 'you', 'your'
]);

function isValidYouTubeId(value = '') {
  return /^[a-zA-Z0-9_-]{11}$/.test(String(value));
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

module.exports = {
  NATIVES_CACHE_VERSION,
  NATIVES_CACHE_SOURCE,
  NATIVES_FALLBACK_CACHE_SOURCE,
  NATIVES_EMPTY_CACHE_VERSION,
  NATIVES_EMPTY_CACHE_SOURCE,
  NATIVES_CURATED_CACHE_VERSION,
  NATIVES_CURATED_CACHE_SOURCE,
  NATIVES_REPORT_CACHE_VERSION,
  NATIVES_REPORT_CACHE_SOURCE,
  NATIVES_RESULT_LIMIT,
  NATIVES_MIN_SCORE,
  isValidYouTubeId,
  normalizeNativesText,
  sanitizeNativesQuery,
  isSearchableNativesQuery,
  buildNativesCacheKey,
  buildNativesCuratedCacheKey,
  buildNativesEmptyCacheKey,
  buildNativesReportCacheKey,
  parseCachedVideoIds,
  hasExactPhraseMatch,
  hasMainTermsMatch,
  isShortNativeVideo,
  isBlockedNativeCandidate,
  isStrictNativesCandidate,
  isUsableNativesCache,
  isUsableCuratedNativesCache,
  isUsableEmptyNativesCache,
  canWriteCuratedNativesCache,
  getYouTubeLocale,
  buildNativesSearchQueries,
  buildNativesShortsSearchUrl,
  buildNativesEmptyResponse,
  scoreNativesCandidate,
  parseYouTubeDuration,
  searchYouTubeDataApiVideos,
  searchInvidiousVideos
};
