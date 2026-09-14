const { fetchJsonWithTimeout } = require('./provider-http');

const MIN_LYRICS_CONFIDENCE = 190;
const MIN_TRACK_OVERLAP = 0.92;
const MIN_ARTIST_OVERLAP = 0.82;
const LYRICS_CACHE_VERSION = 'lyrics-strict-v1';
const LYRICS_PROVIDER_CACHE_SOURCE = 'lrclib-strict-v1';
const LYRICS_APPROVED_CACHE_SOURCE = 'approved-lyrics-v1';
const LYRICS_VARIANT_PATTERN = /\b(remix|cover|karaoke|instrumental|live|acoustic|sped up|slowed|nightcore|edit|version)\b/i;
const LYRICS_FEATURE_PATTERN = /\s*(?:\(|\[)?\b(?:feat|ft|featuring|with)\b\.?\s+[^()[\]-]+(?:\)|\])?/gi;
const MUSIC_VIDEO_REJECT_PATTERN = /\b(karaoke|instrumental|cover|reaction|tutorial|lesson|playlist|mix|sped up|slowed|nightcore|remix|loop|hour|extended)\b/i;
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

function stripFeaturedArtistsFromTrack(value = '') {
  return String(value || '')
    .replace(LYRICS_FEATURE_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripParentheticalInfo(value = '') {
  return String(value || '')
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitArtistAliases(value = '') {
  const clean = String(value || '')
    .replace(/\s*(?:,|&|\+|\bx\b|\band\b)\s*/gi, '|')
    .replace(/\b(feat|ft|featuring|with)\b\.?/gi, '|');

  return clean
    .split('|')
    .map((part) => part.trim())
    .filter((part) => normalizeArtistName(part).length > 1);
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
  add(stripFeaturedArtistsFromTrack(stripParentheticalInfo(track)), artist);
  add(stripParentheticalInfo(track), artist);
  add(stripFeaturedArtistsFromTrack(track), artist);

  const artistWithoutFeatures = stripFeaturedArtistsFromTrack(artist);
  if (artistWithoutFeatures !== artist) {
    add(track, artistWithoutFeatures);
    add(stripFeaturedArtistsFromTrack(stripParentheticalInfo(track)), artistWithoutFeatures);
    add(stripParentheticalInfo(track), artistWithoutFeatures);
    add(stripFeaturedArtistsFromTrack(track), artistWithoutFeatures);
  }

  const artistAliases = splitArtistAliases(artist);
  for (const artistAlias of artistAliases) {
    add(track, artistAlias);
    add(stripFeaturedArtistsFromTrack(stripParentheticalInfo(track)), artistAlias);
    add(stripParentheticalInfo(track), artistAlias);
    add(stripFeaturedArtistsFromTrack(track), artistAlias);
  }

  add(track, '');
  add(stripFeaturedArtistsFromTrack(stripParentheticalInfo(track)), '');
  add(stripParentheticalInfo(track), '');
  add(stripFeaturedArtistsFromTrack(track), '');

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

  return (await fetchMusicVideoMetadata(videoIds, apiKey, query))
    .filter(item => isValidYouTubeId(item.videoId) && item.embeddable && item.privacyStatus === 'public' && !ignored.has(item.videoId))
    .sort((a, b) => b.score - a.score).slice(0, 6);
}

async function fetchMusicVideoMetadata(videoIds, apiKey, query) {
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
    });
}

function isSingleTrackVideo(candidate, query, expectedDuration = 0) {
  const title = String(candidate.title || '');
  if (/\b(compilation|medley|mashup|playlist|full album|full mixtape|full concert|non[ -]?stop|two songs|2 songs|2 in 1)\b/i.test(title)) return false;
  if (!candidate.embeddable || candidate.privacyStatus !== 'public') return false;
  if (overlapRatio(normalizeLyricsText(query), `${normalizeLyricsText(title)} ${normalizeArtistName(candidate.author)}`) < 0.8) return false;
  if (expectedDuration > 0) {
    const seconds = Number(candidate.durationSeconds || 0);
    if (!seconds || Math.abs(seconds - expectedDuration) > Math.max(30, expectedDuration * 0.15)) return false;
  }
  return true;
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
  const expectedArtistNorm = normalizeArtistName(expectedArtist);
  const minConfidence = expectedArtistNorm ? MIN_LYRICS_CONFIDENCE : 145;
  return match.hasLyrics
    && !match.variantRejected
    && match.trackAccepted
    && match.artistAccepted
    && (expectedArtistNorm || match.exactTrack)
    && match.score >= minConfidence;
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
  // Video uploads may use "Track - Artist | Clean Version", including saved drafts.
  // Confirm BOTH fields with the provider before accepting the reversed identity.
  const cleanUploadLabel = value => String(value || '').replace(/\s*[|]\s*clean(?:\s+version)?\s*$/i, '').trim();
  const directTrack = cleanUploadLabel(trackName), directArtist = cleanUploadLabel(artistName);
  const exactCandidates = [{ track: directTrack, artist: directArtist }, { track: directArtist, artist: directTrack }];
  for (const candidate of exactCandidates) {
    if (!candidate.track || !candidate.artist) continue;
    const url = `https://lrclib.net/api/get?${new URLSearchParams({ track_name: candidate.track, artist_name: candidate.artist })}`;
    const result = await fetchJsonWithTimeout(url);
    if (result.response.ok) {
      const match = getLyricsMatchDetails(result.data, candidate.track, candidate.artist);
      const normalized = normalizeLyricsResult(result.data, candidate.track, candidate.artist);
      if (normalized && match.exactTrack && match.exactArtist) return { ...normalized, searchedVariant: candidate };
    }
  }
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

module.exports = {
  MIN_LYRICS_CONFIDENCE,
  LYRICS_CACHE_VERSION,
  LYRICS_PROVIDER_CACHE_SOURCE,
  LYRICS_APPROVED_CACHE_SOURCE,
  normalizeLyricsText,
  normalizeArtistName,
  buildLyricsLookupCandidates,
  buildLyricsCacheKey,
  buildMusicTrackKey,
  isUsableLyricsCache,
  getCachedLyricsPayload,
  canWriteApprovedLyricsCache,
  parseYouTubeMusicTitle,
  isValidYouTubeId,
  scoreMusicVideoCandidate,
  searchYouTubeMusicCandidates,
  fetchMusicVideoMetadata,
  isSingleTrackVideo,
  getLyricsMatchDetails,
  scoreLyricsMatch,
  isReliableLyricsMatch,
  findReliableLyrics,
  findLyricsWithFallbacks,
  fetchYouTubeOEmbed
};
