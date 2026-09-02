async function fetchJsonWithTimeout(url, timeoutMs = 12000, extraHeaders = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'LinguaFire/1.0',
      ...extraHeaders
    },
    signal: AbortSignal.timeout(timeoutMs)
  });

  const body = await response.text();
  let data = null;
  try {
    data = body ? JSON.parse(body) : null;
  } catch (_error) {
    data = { raw: body };
  }

  return { response, data };
}

async function fetchTextWithTimeout(url, options = {}, timeoutMs = 12000) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs)
  });
  const body = await response.text();
  let data = null;
  try {
    data = body ? JSON.parse(body) : null;
  } catch (_error) {
    data = { raw: body };
  }
  return { response, data };
}

const MIN_LYRICS_CONFIDENCE = 190;
const MIN_TRACK_OVERLAP = 0.92;
const MIN_ARTIST_OVERLAP = 0.82;
const LYRICS_CACHE_VERSION = 'lyrics-strict-v1';
const LYRICS_PROVIDER_CACHE_SOURCE = 'lrclib-strict-v1';
const LYRICS_APPROVED_CACHE_SOURCE = 'approved-lyrics-v1';
const LYRICS_VARIANT_PATTERN = /\b(remix|cover|karaoke|instrumental|live|acoustic|sped up|slowed|nightcore|edit|version)\b/i;
const LYRICS_FEATURE_PATTERN = /\s*(?:\(|\[)?\b(?:feat|ft|featuring|with)\b\.?\s+[^()[\]-]+(?:\)|\])?/gi;
const MUSIC_VIDEO_REJECT_PATTERN = /\b(karaoke|instrumental|cover|reaction|tutorial|lesson|playlist|mix|sped up|slowed|nightcore|remix|loop|hour|extended)\b/i;
const TRANSLATION_SEPARATOR = 'LF_LINE_BREAK';

function normalizeLyricsText(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/\b(official|music|video|lyrics?|lyric|audio|visualizer|remaster(?:ed)?|hd|4k|vevo|topic)\b/g, ' ')
    .replace(/\b(feat|ft|featuring|with)\b\.?/g, ' ')
    .replace(/[^a-z0-9\s'&-]/g, ' ')
    .replace(/\s*[-–—]\s*$/g, ' ')
    .replace(/^\s*[-–—]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

async function translateWithDeepL(text, from, to, env = process.env) {
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
  if (!response.ok || !isUsefulTranslation(text, translated)) return null;
  return translated;
}

async function translateWithGemini(text, from, to, env = process.env) {
  const apiKey = String(env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return null;

  const configuredModel = String(env.GEMINI_MODEL || '').trim();
  const modelCandidates = [...new Set([
    configuredModel,
    'gemini-2.5-flash',
    'gemini-1.5-flash'
  ].filter(Boolean))];
  const baseUrl = String(env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');
  const prompt = [
    `Traduza do ${from || 'en'} para ${to || 'pt-BR'} em portugues brasileiro natural.`,
    'Contexto: letras de musica e frases curtas para estudo de ingles.',
    `Se houver varias linhas separadas por ${TRANSLATION_SEPARATOR}, mantenha exatamente o mesmo separador e a mesma quantidade de linhas.`,
    'Nao explique. Nao adicione aspas. Responda somente com a traducao.',
    '',
    text
  ].join('\n');

  for (const model of modelCandidates) {
    const modelPath = model.startsWith('models/') ? model : `models/${model}`;
    const url = `${baseUrl}/v1beta/${modelPath}:generateContent`;
    const { response, data } = await fetchTextWithTimeout(url, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.15,
          maxOutputTokens: 1800
        }
      })
    }, 16000);

    const translated = cleanTranslationText((data?.candidates?.[0]?.content?.parts || [])
      .map((part) => part?.text || '')
      .filter(Boolean)
      .join('\n'));
    if (response.ok && isUsefulTranslation(text, translated)) return translated;
  }

  return null;
}

function translateNoLiteralLine(text = '') {
  const normalized = normalizeTranslationCompare(text).replace(/-/g, ' ');
  if (!normalized) return '';
  if (/^(yeah|yea|uh|uh huh|ooh|oh|ah|la|na|skrrt|hmm|mm)(\s+(yeah|yea|uh|uh huh|ooh|oh|ah|la|na|skrrt|hmm|mm))*$/.test(normalized)) {
    return 'Expressão sonora, sem tradução literal.';
  }
  return 'Tradução automática indisponível para esta linha.';
}

async function translateBlockByLines(text, from, to, env = process.env) {
  const lines = splitTranslationBlock(text);
  if (lines.length <= 1) return null;

  const translatedLines = [];
  for (const line of lines) {
    const cleanLine = cleanTranslationText(line);
    if (!cleanLine) {
      translatedLines.push('');
      continue;
    }

    const result = await translateTextSmart(cleanLine, from, to, env);
    translatedLines.push(result?.translated || translateNoLiteralLine(cleanLine));
  }

  return translatedLines.join(`\n${TRANSLATION_SEPARATOR}\n`);
}

async function translateWithMyMemory(text, from, to) {
  const targetLang = String(to || '').toLowerCase().startsWith('pt') ? 'pt' : to;
  const langPair = encodeURIComponent(`${from}|${targetLang}`);
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
  const { response, data } = await fetchJsonWithTimeout(url, 12000);
  const translated = cleanTranslationText(data?.responseData?.translatedText || '');
  if (!response.ok || !isUsefulTranslation(text, translated)) return null;
  return translated;
}

async function translateTextSmart(text, from = 'en', to = 'pt-BR', env = process.env) {
  const providers = [
    ['deepl', () => translateWithDeepL(text, from, to, env)],
    ['gemini', () => translateWithGemini(text, from, to, env)],
    ['mymemory', () => translateWithMyMemory(text, from, to)]
  ];

  for (const [provider, translate] of providers) {
    try {
      const translated = await translate();
      if (translated) return { provider, translated };
    } catch (_error) {}
  }

  return null;
}

function normalizeArtistName(value = '') {
  return normalizeLyricsText(value)
    .replace(/\b(channel|records|recordings|official artist channel)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripFeaturedArtistsFromTrack(value = '') {
  return String(value || '')
    .replace(LYRICS_FEATURE_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildLyricsLookupCandidates(trackName = '', artistName = '') {
  const track = String(trackName || '').trim();
  const artist = String(artistName || '').trim();
  const candidates = [];
  const seen = new Set();

  function add(candidateTrack, candidateArtist) {
    const safeTrack = String(candidateTrack || '').trim();
    const safeArtist = String(candidateArtist || '').trim();
    const key = `${normalizeLyricsText(safeTrack)}::${normalizeArtistName(safeArtist)}`;
    if (!safeTrack || seen.has(key)) return;
    seen.add(key);
    candidates.push({ track: safeTrack, artist: safeArtist });
  }

  add(track, artist);
  add(stripFeaturedArtistsFromTrack(track), artist);

  const artistWithoutFeatures = stripFeaturedArtistsFromTrack(artist);
  if (artistWithoutFeatures !== artist) {
    add(track, artistWithoutFeatures);
    add(stripFeaturedArtistsFromTrack(track), artistWithoutFeatures);
  }

  return candidates;
}

function buildLyricsCacheKey(trackName = '', artistName = '') {
  return `${LYRICS_CACHE_VERSION}::${normalizeArtistName(artistName)}::${normalizeLyricsText(trackName)}`;
}

function buildMusicTrackKey(trackName = '', artistName = '') {
  return `${normalizeLyricsText(trackName)}|${normalizeArtistName(artistName)}`;
}

function isFreshLyricsCache(row, ttlMs = 30 * 24 * 60 * 60 * 1000) {
  const updatedAt = row?.updated_at || row?.created_at;
  if (!updatedAt) return false;
  const timestamp = new Date(updatedAt).getTime();
  return Number.isFinite(timestamp) && Date.now() - timestamp < ttlMs;
}

function parseLyricsPayload(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

function isUsableLyricsCache(row, trackName = '', artistName = '') {
  if (!row) return false;
  const source = String(row.source || '');
  const isApproved = source === LYRICS_APPROVED_CACHE_SOURCE;
  const isProvider = source === LYRICS_PROVIDER_CACHE_SOURCE && isFreshLyricsCache(row);
  if (!isApproved && !isProvider) return false;
  if (normalizeLyricsText(row.track || '') !== normalizeLyricsText(trackName)) return false;
  if (normalizeArtistName(row.artist || '') !== normalizeArtistName(artistName)) return false;

  const payload = parseLyricsPayload(row.lyrics_payload);
  if (!payload || (!payload.plainLyrics && !payload.syncedLyrics)) return false;
  if (!isApproved && Number(row.confidence || payload.confidence || 0) < MIN_LYRICS_CONFIDENCE) return false;
  return true;
}

function getCachedLyricsPayload(row) {
  const payload = parseLyricsPayload(row?.lyrics_payload);
  if (!payload) return null;
  return {
    ...payload,
    cached: true,
    cacheSource: row.source,
    confidence: Number(row.confidence || payload.confidence || 0)
  };
}

function isLocalRequest(req) {
  const ip = String(req.ip || req.connection?.remoteAddress || '');
  return ip === '127.0.0.1' || ip === '::1' || ip.includes('127.0.0.1') || ip.includes('::ffff:127.0.0.1');
}

function canWriteApprovedLyricsCache(req, env = process.env) {
  const configuredToken = env.LYRICS_ADMIN_TOKEN;
  const authorization = String(req.headers.authorization || '');
  const bearerToken = authorization.toLowerCase().startsWith('bearer ')
    ? authorization.slice(7).trim()
    : '';

  if (configuredToken && bearerToken === configuredToken) return true;
  return env.NODE_ENV !== 'production' && isLocalRequest(req);
}

function parseYouTubeMusicTitle(title = '', author = '') {
  const originalTitle = String(title || '').trim();
  const originalAuthor = String(author || '').trim();
  let track = originalTitle;
  let artist = '';

  const dashMatch = originalTitle.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dashMatch) {
    artist = dashMatch[1].trim();
    track = dashMatch[2].trim();
  }

  track = track
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/\b(official|music|video|lyrics?|lyric|audio|visualizer|remaster(?:ed)?|hd|4k)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!artist && originalAuthor) {
    artist = originalAuthor;
  }

  artist = artist
    .replace(/\b(official|channel|music|records|recordings|vevo|topic)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    trackOriginal: track,
    artistOriginal: artist,
    track: normalizeLyricsText(track),
    artist: normalizeArtistName(artist)
  };
}

function parseYouTubeDuration(duration = '') {
  const match = String(duration).match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

function isValidYouTubeId(value = '') {
  return /^[a-zA-Z0-9_-]{11}$/.test(String(value || ''));
}

function buildMusicYouTubeSearchUrl(searchQuery, apiKey) {
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    q: `${searchQuery} official music video`,
    maxResults: '8',
    videoEmbeddable: 'true',
    safeSearch: 'none',
    relevanceLanguage: 'en',
    regionCode: 'US',
    key: apiKey
  });

  return `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;
}

function buildMusicYouTubeVideosUrl(videoIds, apiKey) {
  const params = new URLSearchParams({
    part: 'snippet,contentDetails,status',
    id: videoIds.join(','),
    key: apiKey
  });

  return `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`;
}

function scoreMusicVideoCandidate(candidate = {}, query = '') {
  const title = String(candidate.title || '');
  const author = String(candidate.author || '');
  const normalizedQuery = normalizeLyricsText(query);
  const normalizedTitle = normalizeLyricsText(title);
  const normalizedAuthor = normalizeArtistName(author);
  const duration = Number(candidate.durationSeconds || 0);
  let score = 0;

  if (normalizedTitle.includes(normalizedQuery)) score += 90;
  score += overlapRatio(normalizedQuery, `${normalizedTitle} ${normalizedAuthor}`) * 80;
  if (/\bofficial\b/i.test(title)) score += 22;
  if (/\b(audio|lyrics?|visualizer|music video)\b/i.test(title)) score += 12;
  if (/\bvevo|official artist channel|topic\b/i.test(author)) score += 10;
  if (duration >= 90 && duration <= 480) score += 28;
  if (duration > 900 || duration < 45) score -= 60;
  if (MUSIC_VIDEO_REJECT_PATTERN.test(title)) score -= 80;

  return score;
}

async function searchYouTubeMusicByName(searchQuery, apiKey) {
  const candidates = await searchYouTubeMusicCandidates(searchQuery, apiKey);
  return candidates[0] || null;
}

async function searchYouTubeMusicCandidates(searchQuery, apiKey, ignoredVideoIds = []) {
  const query = String(searchQuery || '').trim();
  const ignored = new Set((ignoredVideoIds || []).map(String));
  if (!query || !apiKey) return [];

  const searchUrl = buildMusicYouTubeSearchUrl(query, apiKey);
  const searchResult = await fetchJsonWithTimeout(searchUrl, 10000);
  if (!searchResult.response.ok || !Array.isArray(searchResult.data?.items)) {
    return [];
  }

  const videoIds = [...new Set(searchResult.data.items
    .map((item) => item?.id?.videoId)
    .filter(isValidYouTubeId))];
  if (!videoIds.length) return [];

  const videosUrl = buildMusicYouTubeVideosUrl(videoIds, apiKey);
  const videosResult = await fetchJsonWithTimeout(videosUrl, 10000);
  if (!videosResult.response.ok || !Array.isArray(videosResult.data?.items)) {
    return [];
  }

  return videosResult.data.items
    .map((item) => {
      const candidate = {
        videoId: item?.id || '',
        title: item?.snippet?.title || '',
        author: item?.snippet?.channelTitle || '',
        thumbnail: item?.snippet?.thumbnails?.high?.url || item?.snippet?.thumbnails?.medium?.url || null,
        durationSeconds: parseYouTubeDuration(item?.contentDetails?.duration || ''),
        embeddable: item?.status?.embeddable !== false,
        privacyStatus: item?.status?.privacyStatus || 'public'
      };
      return { ...candidate, score: scoreMusicVideoCandidate(candidate, query) };
    })
    .filter((item) => isValidYouTubeId(item.videoId)
      && item.embeddable
      && item.privacyStatus === 'public'
      && !ignored.has(item.videoId))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

function tokenSet(text = '') {
  return normalizeLyricsText(text)
    .split(/\s+/)
    .filter((word) => word.length > 1);
}

function overlapRatio(expected = '', candidate = '') {
  const expectedTokens = tokenSet(expected);
  const candidateTokens = new Set(tokenSet(candidate));
  if (!expectedTokens.length || !candidateTokens.size) return 0;
  const matched = expectedTokens.filter((token) => candidateTokens.has(token)).length;
  return matched / expectedTokens.length;
}

function twoWayOverlap(expected = '', candidate = '') {
  return Math.min(overlapRatio(expected, candidate), overlapRatio(candidate, expected));
}

function hasWholeNormalizedPhrase(needle = '', haystack = '') {
  const normalizedNeedle = normalizeLyricsText(needle);
  const normalizedHaystack = normalizeLyricsText(haystack);
  if (!normalizedNeedle || !normalizedHaystack) return false;
  const escapedNeedle = normalizedNeedle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`(^|\\s)${escapedNeedle}(?=\\s|$)`).test(normalizedHaystack);
}

function hasDisallowedLyricsVariant(candidateTrack = '', expectedTrack = '') {
  const candidateHasVariant = LYRICS_VARIANT_PATTERN.test(String(candidateTrack || ''));
  const expectedHasVariant = LYRICS_VARIANT_PATTERN.test(String(expectedTrack || ''));
  return candidateHasVariant && !expectedHasVariant;
}

function getLyricsMatchDetails(candidate = {}, expectedTrack = '', expectedArtist = '') {
  const candidateTrack = candidate.trackName || candidate.name || '';
  const candidateArtist = candidate.artistName || candidate.artist || '';
  const expectedTrackNorm = normalizeLyricsText(expectedTrack);
  const expectedArtistNorm = normalizeArtistName(expectedArtist);
  const candidateTrackNorm = normalizeLyricsText(candidateTrack);
  const candidateArtistNorm = normalizeArtistName(candidateArtist);
  const hasLyrics = Boolean(candidate.plainLyrics || candidate.syncedLyrics);

  if (!expectedTrackNorm || !candidateTrackNorm) {
    return {
      score: -1000,
      trackAccepted: false,
      artistAccepted: false,
      hasLyrics,
      variantRejected: false,
      trackOverlap: 0,
      artistOverlap: 0
    };
  }

  const trackOverlap = twoWayOverlap(expectedTrackNorm, candidateTrackNorm);
  const artistOverlap = expectedArtistNorm ? twoWayOverlap(expectedArtistNorm, candidateArtistNorm) : 1;
  const exactTrack = candidateTrackNorm === expectedTrackNorm;
  const exactArtist = expectedArtistNorm ? candidateArtistNorm === expectedArtistNorm : true;
  const trackContains = hasWholeNormalizedPhrase(expectedTrackNorm, candidateTrackNorm)
    || hasWholeNormalizedPhrase(candidateTrackNorm, expectedTrackNorm);
  const variantRejected = hasDisallowedLyricsVariant(candidateTrack, expectedTrack);

  let score = 0;
  if (exactTrack) score += 140;
  else if (trackContains && trackOverlap >= MIN_TRACK_OVERLAP) score += 105;
  else score += trackOverlap * 90;

  if (expectedArtistNorm) {
    if (exactArtist) score += 105;
    else score += artistOverlap * 75;
  }

  if (candidate.syncedLyrics) score += 10;
  if (candidate.plainLyrics) score += 6;
  if (candidate.duration) score += 2;
  if (!hasLyrics || variantRejected) score = -1000;

  const trackAccepted = exactTrack || (trackContains && trackOverlap >= MIN_TRACK_OVERLAP) || trackOverlap >= MIN_TRACK_OVERLAP;
  const artistAccepted = !expectedArtistNorm || exactArtist || artistOverlap >= MIN_ARTIST_OVERLAP;

  return {
    score,
    exactTrack,
    exactArtist,
    trackAccepted,
    artistAccepted,
    hasLyrics,
    variantRejected,
    trackOverlap,
    artistOverlap
  };
}

function scoreLyricsMatch(candidate = {}, expectedTrack = '', expectedArtist = '') {
  return getLyricsMatchDetails(candidate, expectedTrack, expectedArtist).score;
}

function isReliableLyricsMatch(candidate = {}, expectedTrack = '', expectedArtist = '') {
  const match = getLyricsMatchDetails(candidate, expectedTrack, expectedArtist);
  return match.hasLyrics
    && !match.variantRejected
    && match.trackAccepted
    && match.artistAccepted
    && match.score >= MIN_LYRICS_CONFIDENCE;
}

function normalizeLyricsResult(candidate, expectedTrack, expectedArtist) {
  if (!candidate || !isReliableLyricsMatch(candidate, expectedTrack, expectedArtist)) {
    return null;
  }

  const match = getLyricsMatchDetails(candidate, expectedTrack, expectedArtist);

  return {
    source: 'LRCLIB',
    synced: Boolean(candidate.syncedLyrics),
    syncedLyrics: candidate.syncedLyrics || null,
    plainLyrics: candidate.plainLyrics || null,
    duration: candidate.duration || null,
    trackName: candidate.trackName || candidate.name || '',
    artistName: candidate.artistName || candidate.artist || '',
    confidence: match.score,
    match: {
      trackOverlap: match.trackOverlap,
      artistOverlap: match.artistOverlap,
      exactTrack: match.exactTrack,
      exactArtist: match.exactArtist
    }
  };
}

async function findReliableLyrics(trackName, artistName) {
  const candidates = buildLyricsLookupCandidates(trackName, artistName);
  if (!candidates.length) return null;

  for (const candidate of candidates) {
    const { track, artist } = candidate;
    const getUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(track)}`;
    const getResult = await fetchJsonWithTimeout(getUrl);
    if (getResult.response.ok) {
      const normalized = normalizeLyricsResult(getResult.data, track, artist);
      if (normalized) return { ...normalized, searchedVariant: candidate };
    }

    const searchUrl = `https://lrclib.net/api/search?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(track)}`;
    const searchResult = await fetchJsonWithTimeout(searchUrl);
    if (!searchResult.response.ok || !Array.isArray(searchResult.data)) {
      continue;
    }

    const ranked = searchResult.data
      .map((item) => ({
        item,
        score: scoreLyricsMatch(item, track, artist)
      }))
      .sort((a, b) => b.score - a.score);

    for (const rankedCandidate of ranked) {
      const normalized = normalizeLyricsResult(rankedCandidate.item, track, artist);
      if (normalized) return { ...normalized, searchedVariant: candidate };
    }
  }

  return null;
}

async function findGeniusMetadataCandidates(trackName, artistName, accessToken) {
  const token = String(accessToken || '').trim();
  if (!token) return [];

  const query = [trackName, artistName].filter(Boolean).join(' ').trim();
  if (!query) return [];

  const url = `https://api.genius.com/search?q=${encodeURIComponent(query)}`;
  const { response, data } = await fetchJsonWithTimeout(url, 10000, {
    Authorization: `Bearer ${token}`
  });

  if (!response.ok || !Array.isArray(data?.response?.hits)) {
    return [];
  }

  return data.response.hits
    .map((hit) => hit?.result)
    .filter(Boolean)
    .map((result) => ({
      track: result.title || result.full_title || '',
      artist: result.primary_artist?.name || artistName || ''
    }))
    .filter((candidate) => candidate.track && candidate.artist)
    .slice(0, 5);
}

async function findLyricsWithFallbacks(trackName, artistName, env = process.env) {
  const primary = await findReliableLyrics(trackName, artistName);
  if (primary) return { ...primary, fallbackSource: 'lrclib' };

  const geniusCandidates = await findGeniusMetadataCandidates(trackName, artistName, env.GENIUS_ACCESS_TOKEN);
  for (const candidate of geniusCandidates) {
    const lyrics = await findReliableLyrics(candidate.track, candidate.artist);
    if (lyrics) {
      return {
        ...lyrics,
        fallbackSource: 'genius-metadata',
        geniusCandidate: candidate
      };
    }
  }

  return null;
}

// Proxy for YouTube oEmbed - avoids CORS issues in browser
async function fetchYouTubeOEmbed(url) {
  const youtubeOembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;

  try {
    const response = await fetch(youtubeOembedUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      // Try noembed fallback
      const noembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(url)}`;
      const noembedResponse = await fetch(noembedUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000)
      });

      if (noembedResponse.ok) {
        return await noembedResponse.json();
      }
      return null;
    }

    return await response.json();
  } catch (error) {
    return null;
  }
}

function registerLyricsRoutes(app, deps = {}) {
  const {
    logger = console,
    supabaseGetLyricsCache = async () => null,
    supabaseUpsertLyricsCache = async () => {},
    supabaseGetWorkingMusicVideo = async () => null,
    supabaseGetBadMusicVideos = async () => [],
    supabaseSaveWorkingMusicVideo = async () => {},
    supabaseSaveBadMusicVideo = async () => {},
    YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || ''
  } = deps;
  // YouTube oEmbed proxy - avoids CORS in browser
  app.get('/api/youtube/oembed', async (req, res) => {
    const url = String(req.query.url || '').trim();

    if (!url) {
      return res.status(400).json({ error: 'url parameter required' });
    }

    // Basic URL validation
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      return res.status(400).json({ error: 'Must be a YouTube URL' });
    }

    const data = await fetchYouTubeOEmbed(url);

    if (!data || !data.title) {
      return res.status(404).json({ error: 'Could not fetch video metadata' });
    }

    res.json({
      title: data.title,
      author: data.author_name || '',
      thumbnail: data.thumbnail_url || null
    });
  });

  app.get('/api/music/search', async (req, res) => {
    const query = String(req.query.q || '').trim();

    if (!query || normalizeLyricsText(query).length < 2) {
      return res.status(400).json({ success: false, reason: 'Digite o nome da música.' });
    }

    if (!YOUTUBE_API_KEY) {
      return res.status(503).json({
        success: false,
        reason: 'Busca por nome ainda não está configurada. Adicione YOUTUBE_API_KEY no Render.'
      });
    }

    try {
      const initialCandidates = await searchYouTubeMusicCandidates(query, YOUTUBE_API_KEY);
      if (!initialCandidates.length) {
        return res.status(404).json({
          success: false,
          reason: `Não encontrei um vídeo musical confiável para "${query}". Tente música + artista.`
        });
      }

      const firstCandidate = initialCandidates[0];
      const firstParsed = parseYouTubeMusicTitle(firstCandidate.title, firstCandidate.author);
      const trackKey = buildMusicTrackKey(
        firstParsed.trackOriginal || firstCandidate.title,
        firstParsed.artistOriginal || firstCandidate.author
      );
      const knownBadIds = trackKey ? await supabaseGetBadMusicVideos(trackKey) : [];
      const candidatesWithoutKnownBad = initialCandidates.filter((candidate) => !knownBadIds.includes(candidate.videoId));
      const cachedWorkingVideo = trackKey ? await supabaseGetWorkingMusicVideo(trackKey) : null;
      const cachedCandidate = cachedWorkingVideo?.video_id && !knownBadIds.includes(cachedWorkingVideo.video_id)
        ? {
            ...firstCandidate,
            videoId: cachedWorkingVideo.video_id,
            title: cachedWorkingVideo.track || firstCandidate.title,
            author: cachedWorkingVideo.artist || firstCandidate.author,
            cached: true,
            score: firstCandidate.score + 1000
          }
        : null;
      const candidates = [
        ...(cachedCandidate ? [cachedCandidate] : []),
        ...candidatesWithoutKnownBad.filter((candidate) => candidate.videoId !== cachedCandidate?.videoId)
      ];
      const video = candidates[0];

      if (!video) {
        return res.status(404).json({
          success: false,
          reason: `Os vídeos encontrados para "${query}" já falharam no player. Tente música + artista ou outra versão.`
        });
      }

      const parsed = parseYouTubeMusicTitle(video.title, video.author);
      const track = parsed.trackOriginal || video.title;
      const artist = parsed.artistOriginal || video.author || 'YouTube';
      return res.json({
        success: true,
        videoId: video.videoId,
        title: track,
        artist,
        videoTitle: video.title,
        channelName: video.author,
        thumbnail: video.thumbnail,
        durationSeconds: video.durationSeconds,
        score: video.score,
        trackKey,
        candidates: candidates.map((candidate) => ({
          videoId: candidate.videoId,
          title: candidate.title,
          channelName: candidate.author,
          thumbnail: candidate.thumbnail,
          durationSeconds: candidate.durationSeconds,
          score: candidate.score,
          cached: Boolean(candidate.cached)
        })),
        lyricsFound: false
      });
    } catch (error) {
      logger.warn?.('Music search failed', { error });
      return res.status(502).json({
        success: false,
        reason: 'Falha ao pesquisar música no YouTube agora.'
      });
    }
  });

  app.post('/api/music/video-status', async (req, res) => {
    const body = req.body || {};
    const track = String(body.track || '').trim();
    const artist = String(body.artist || '').trim();
    const videoId = String(body.videoId || '').trim();
    const status = String(body.status || '').trim();
    const reason = String(body.reason || '').trim() || 'embed_failed';
    const trackKey = String(body.trackKey || buildMusicTrackKey(track, artist)).trim();

    if (!trackKey || !isValidYouTubeId(videoId)) {
      return res.status(400).json({ success: false, reason: 'Dados do vídeo incompletos.' });
    }

    try {
      if (status === 'working') {
        const result = await supabaseSaveWorkingMusicVideo(trackKey, { track, artist, videoId });
        if (result?.error) return res.status(202).json({ success: false, reason: result.error });
        return res.json({ success: true });
      }

      const result = await supabaseSaveBadMusicVideo(trackKey, videoId, reason);
      if (result?.error) return res.status(202).json({ success: false, reason: result.error });
      return res.json({ success: true });
    } catch (error) {
      logger.warn?.('Music video status write failed', { error });
      return res.status(202).json({ success: false, reason: 'Status não salvo.' });
    }
  });

  app.get('/api/lyrics/lrclib/get', async (req, res) => {
    const artistName = String(req.query.artist_name || '').trim();
    const trackName = String(req.query.track_name || '').trim();

    if (!trackName) {
      return res.status(400).json({ error: 'track_name obrigatorio' });
    }

    try {
      const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artistName)}&track_name=${encodeURIComponent(trackName)}`;
      const { response, data } = await fetchJsonWithTimeout(url);
      return res.status(response.status).json(data);
    } catch (error) {
      return res.status(502).json({ error: 'Falha ao consultar LRCLIB', detail: error.message });
    }
  });

  app.get('/api/lyrics/lrclib/search', async (req, res) => {
    const artistName = String(req.query.artist_name || '').trim();
    const trackName = String(req.query.track_name || '').trim();

    if (!trackName) {
      return res.status(400).json({ error: 'track_name obrigatorio' });
    }

    try {
      const url = `https://lrclib.net/api/search?artist_name=${encodeURIComponent(artistName)}&track_name=${encodeURIComponent(trackName)}`;
      const { response, data } = await fetchJsonWithTimeout(url);
      return res.status(response.status).json(data);
    } catch (error) {
      return res.status(502).json({ error: 'Falha ao pesquisar LRCLIB', detail: error.message });
    }
  });

  app.get('/api/lyrics/find', async (req, res) => {
    const trackName = String(req.query.track_name || '').trim();
    const artistName = String(req.query.artist_name || '').trim();
    const videoTitle = String(req.query.video_title || '').trim();
    const channelName = String(req.query.channel_name || '').trim();

    const parsed = videoTitle
      ? parseYouTubeMusicTitle(videoTitle, channelName)
      : {
          trackOriginal: trackName,
          artistOriginal: artistName,
          track: normalizeLyricsText(trackName),
          artist: normalizeArtistName(artistName)
        };

    const finalTrack = parsed.trackOriginal || trackName;
    const finalArtist = parsed.artistOriginal || artistName;

    if (!finalTrack || normalizeLyricsText(finalTrack).length < 2) {
      return res.status(400).json({
        success: false,
        reason: 'não consegui identificar o nome da música'
      });
    }

    if (!finalArtist || normalizeArtistName(finalArtist).length < 2) {
      return res.status(422).json({
        success: false,
        reason: 'não consegui identificar artista e música com confiança',
        track: finalTrack,
        artist: finalArtist || ''
      });
    }

    try {
      const cacheKey = buildLyricsCacheKey(finalTrack, finalArtist);
      const cached = await supabaseGetLyricsCache(cacheKey);
      if (isUsableLyricsCache(cached, finalTrack, finalArtist)) {
        const payload = getCachedLyricsPayload(cached);
        return res.json({
          success: true,
          ...payload,
          searchedTrack: finalTrack,
          searchedArtist: finalArtist,
          mode: payload?.synced ? 'synced' : 'plain'
        });
      }

      const lyrics = await findLyricsWithFallbacks(finalTrack, finalArtist);
      if (!lyrics) {
        logger.info?.('Lyrics not found after strict match', {
          trackLength: normalizeLyricsText(finalTrack).length,
          artistLength: normalizeArtistName(finalArtist).length
        });
        return res.status(404).json({
          success: false,
          reason: `Não encontramos letra para "${finalTrack}" de ${finalArtist}. Tente a versão oficial, música + artista, ou outra gravação sem remix/live.`,
          track: finalTrack,
          artist: finalArtist
        });
      }

      await supabaseUpsertLyricsCache(cacheKey, {
        track: finalTrack,
        artist: finalArtist,
        lyrics,
        source: LYRICS_PROVIDER_CACHE_SOURCE,
        confidence: lyrics.confidence
      });

      return res.json({
        success: true,
        ...lyrics,
        cached: false,
        searchedTrack: finalTrack,
        searchedArtist: finalArtist,
        fallbackSource: lyrics.fallbackSource || 'lrclib',
        mode: lyrics.synced ? 'synced' : 'plain'
      });
    } catch (error) {
      logger.warn?.('Lyrics provider failed', { error });
      return res.status(502).json({
        success: false,
        reason: 'falha ao consultar provedor de letras',
        detail: error.message
      });
    }
  });

  app.post('/api/lyrics/approved', async (req, res) => {
    if (!canWriteApprovedLyricsCache(req)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const body = req.body || {};
    const track = String(body.track || body.trackName || '').trim();
    const artist = String(body.artist || body.artistName || '').trim();
    const plainLyrics = String(body.plainLyrics || '').trim();
    const syncedLyrics = body.syncedLyrics ? String(body.syncedLyrics) : null;

    if (!track) return res.status(400).json({ error: 'track obrigatorio' });
    if (!artist) return res.status(400).json({ error: 'artist obrigatorio' });
    if (!plainLyrics && !syncedLyrics) return res.status(400).json({ error: 'plainLyrics ou syncedLyrics obrigatorio' });

    try {
      const cacheKey = buildLyricsCacheKey(track, artist);
      const lyrics = {
        source: 'APPROVED',
        synced: Boolean(syncedLyrics),
        syncedLyrics,
        plainLyrics: plainLyrics || null,
        duration: body.duration || null,
        trackName: track,
        artistName: artist,
        confidence: 999,
        match: {
          trackOverlap: 1,
          artistOverlap: 1,
          exactTrack: true,
          exactArtist: true
        }
      };

      await supabaseUpsertLyricsCache(cacheKey, {
        track,
        artist,
        lyrics,
        source: LYRICS_APPROVED_CACHE_SOURCE,
        confidence: 999
      });

      return res.json({
        success: true,
        cacheKey,
        source: LYRICS_APPROVED_CACHE_SOURCE
      });
    } catch (_error) {
      return res.status(500).json({ error: 'Erro ao salvar letra aprovada' });
    }
  });

  app.get('/api/translate', async (req, res) => {
    const text = String(req.query.q || '').trim();
    const from = String(req.query.from || 'en').trim();
    const to = String(req.query.to || 'pt-BR').trim();

    if (!text || text.length > 3000) {
      return res.status(400).json({ error: 'Texto obrigatorio com ate 3000 caracteres' });
    }

    try {
      let result = await translateTextSmart(text, from, to);
      if (result && !hasMatchingTranslationBlockShape(text, result.translated)) {
        result = null;
      }
      if (!result && hasTranslationBlock(text)) {
        const translatedBlock = await translateBlockByLines(text, from, to);
        if (translatedBlock) {
          result = {
            provider: 'line-fallback',
            translated: translatedBlock
          };
        }
      }
      if (!result) {
        return res.status(502).json({
          responseStatus: 502,
          error: 'Falha ao traduzir texto'
        });
      }

      return res.json(asTranslationResponse(result.translated, result.provider));
    } catch (error) {
      return res.status(502).json({
        responseStatus: 502,
        error: 'Falha ao traduzir texto',
        detail: error.message
      });
    }
  });
}

module.exports = {
  registerLyricsRoutes,
  LYRICS_APPROVED_CACHE_SOURCE,
  LYRICS_CACHE_VERSION,
  LYRICS_PROVIDER_CACHE_SOURCE,
  buildLyricsCacheKey,
  buildLyricsLookupCandidates,
  canWriteApprovedLyricsCache,
  isUsableLyricsCache,
  normalizeLyricsText,
  parseYouTubeMusicTitle,
  buildMusicTrackKey,
  scoreMusicVideoCandidate,
  searchYouTubeMusicByName,
  searchYouTubeMusicCandidates,
  getLyricsMatchDetails,
  MIN_LYRICS_CONFIDENCE,
  scoreLyricsMatch,
  isReliableLyricsMatch
};
