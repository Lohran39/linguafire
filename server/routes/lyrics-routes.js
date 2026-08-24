async function fetchJsonWithTimeout(url, timeoutMs = 12000) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'LinguaFire/1.0'
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

const MIN_LYRICS_CONFIDENCE = 190;
const MIN_TRACK_OVERLAP = 0.92;
const MIN_ARTIST_OVERLAP = 0.82;
const LYRICS_CACHE_VERSION = 'lyrics-strict-v1';
const LYRICS_PROVIDER_CACHE_SOURCE = 'lrclib-strict-v1';
const LYRICS_APPROVED_CACHE_SOURCE = 'approved-lyrics-v1';
const LYRICS_VARIANT_PATTERN = /\b(remix|cover|karaoke|instrumental|live|acoustic|sped up|slowed|nightcore|edit|version)\b/i;

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

function normalizeArtistName(value = '') {
  return normalizeLyricsText(value)
    .replace(/\b(channel|records|recordings|official artist channel)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildLyricsCacheKey(trackName = '', artistName = '') {
  return `${LYRICS_CACHE_VERSION}::${normalizeArtistName(artistName)}::${normalizeLyricsText(trackName)}`;
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
  const track = String(trackName || '').trim();
  const artist = String(artistName || '').trim();
  if (!track) return null;

  const getUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(track)}`;
  const getResult = await fetchJsonWithTimeout(getUrl);
  if (getResult.response.ok) {
    const normalized = normalizeLyricsResult(getResult.data, track, artist);
    if (normalized) return normalized;
  }

  const searchUrl = `https://lrclib.net/api/search?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(track)}`;
  const searchResult = await fetchJsonWithTimeout(searchUrl);
  if (!searchResult.response.ok || !Array.isArray(searchResult.data)) {
    return null;
  }

  const ranked = searchResult.data
    .map((item) => ({
      item,
      score: scoreLyricsMatch(item, track, artist)
    }))
    .sort((a, b) => b.score - a.score);

  for (const candidate of ranked) {
    const normalized = normalizeLyricsResult(candidate.item, track, artist);
    if (normalized) return normalized;
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
    supabaseUpsertLyricsCache = async () => {}
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
        return res.json({
          success: true,
          ...getCachedLyricsPayload(cached),
          searchedTrack: finalTrack,
          searchedArtist: finalArtist
        });
      }

      const lyrics = await findReliableLyrics(finalTrack, finalArtist);
      if (!lyrics) {
        logger.info?.('Lyrics not found after strict match', {
          trackLength: normalizeLyricsText(finalTrack).length,
          artistLength: normalizeArtistName(finalArtist).length
        });
        return res.status(404).json({
          success: false,
          reason: `letra não encontrada para "${normalizeLyricsText(finalTrack)}" de ${normalizeArtistName(finalArtist)}`,
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
        searchedArtist: finalArtist
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
    const to = String(req.query.to || 'pt').trim();

    if (!text || text.length > 500) {
      return res.status(400).json({ error: 'Texto obrigatorio com ate 500 caracteres' });
    }

    try {
      const langPair = encodeURIComponent(`${from}|${to}`);
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
      const { response, data } = await fetchJsonWithTimeout(url);
      return res.status(response.status).json(data);
    } catch (error) {
      return res.status(502).json({ error: 'Falha ao traduzir texto', detail: error.message });
    }
  });
}

module.exports = {
  registerLyricsRoutes,
  LYRICS_APPROVED_CACHE_SOURCE,
  LYRICS_CACHE_VERSION,
  LYRICS_PROVIDER_CACHE_SOURCE,
  buildLyricsCacheKey,
  canWriteApprovedLyricsCache,
  isUsableLyricsCache,
  normalizeLyricsText,
  parseYouTubeMusicTitle,
  getLyricsMatchDetails,
  MIN_LYRICS_CONFIDENCE,
  scoreLyricsMatch,
  isReliableLyricsMatch
};
