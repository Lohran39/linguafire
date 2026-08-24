// ==================== LYRICS SERVICE ====================
// LRCLIB + Musixmatch fallback - sem IA para gerar letras

const LRCLIB_BASE = '/api/lyrics/lrclib/get';
const LRCLIB_SEARCH = '/api/lyrics/lrclib/search';
const LYRICS_FIND = '/api/lyrics/find';
const MIN_BACKEND_LYRICS_CONFIDENCE = 190;

/**
 * Normaliza texto para busca (remove acentos, caracteres especiais, etc)
 */
function normalizeForSearch(text = '') {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ') // remove (feat), [Live], etc
    .replace(/official video|official music video|official lyric video|lyrics video|lyric video|audio|video oficial|letra|legendado|tradu[cç][aã]o|feat\.?|ft\.?|live|remix|acoustic/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrai track name e artist de um título de vídeo YouTube
 * Mantém case original para busca na API
 */
function parseYouTubeTitle(title) {
  if (!title) return { track: '', artist: '', trackOriginal: '', artistOriginal: '' };
  
  let track = title;
  let artist = '';
  
  // Tenta padrão "Artist - Track" com ou sem sufixos
  const dashMatch = title.match(/^(.+?)\s*-\s*(.+)$/);
  if (dashMatch) {
    artist = dashMatch[1].trim();
    track = dashMatch[2].trim();
  }
  
  // Tenta "Track (with Artist)"
  const featMatch = title.match(/^(.+?)\s*\((?:with|feat\.?|ft\.?)\s*([^)]+)\)/i);
  if (featMatch && !artist) {
    track = featMatch[1].trim();
    artist = featMatch[2].trim();
  }
  
  // Remove tudo entre parênteses/colchetes do track
  track = track.replace(/\([^)]*\)|\[[^\]]*\]/g, '').trim();
  
  return {
    track: normalizeForSearch(track),
    artist: normalizeForSearch(artist),
    trackOriginal: track,
    artistOriginal: artist
  };
}

function normalizeYouTubeAuthorName(author = '') {
  return String(author)
    .replace(/\b(official|channel|music|records|vevo|topic)\b/gi, ' ')
    .replace(/[-–—|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildReliableYouTubeMetadata(title = '', author = '') {
  const parsed = parseYouTubeTitle(title);
  const fallbackArtist = normalizeYouTubeAuthorName(author);

  if (!parsed.artistOriginal && fallbackArtist) {
    parsed.artistOriginal = fallbackArtist;
    parsed.artist = normalizeForSearch(fallbackArtist);
  }

  return parsed;
}

function hasReliableYouTubeMetadata(parsed = {}) {
  const track = normalizeForSearch(parsed.trackOriginal || parsed.track || '');
  const artist = normalizeForSearch(parsed.artistOriginal || parsed.artist || '');

  if (!track || !artist) return false;
  if (artist.length < 3) return false;
  if (/(unknown|topic|various artists)/i.test(artist)) return false;
  if (track.length < 3) return false;
  return true;
}

function overlapScore(baseText = '', candidateText = '') {
  const baseWords = normalizeForSearch(baseText).split(' ').filter(Boolean);
  const candidateWords = normalizeForSearch(candidateText).split(' ').filter(Boolean);
  if (!baseWords.length || !candidateWords.length) return 0;
  const matched = baseWords.filter(word => candidateWords.includes(word)).length;
  return matched / baseWords.length;
}

function scoreLyricsCandidate(result, track, artist = '') {
  const resultTrack = result?.trackName || result?.name || '';
  const resultArtist = result?.artistName || result?.artist || '';
  const normalizedTrack = normalizeForSearch(track);
  const normalizedArtist = normalizeForSearch(artist);
  const candidateTrack = normalizeForSearch(resultTrack);
  const candidateArtist = normalizeForSearch(resultArtist);

  let score = 0;

  if (candidateTrack === normalizedTrack) score += 100;
  else if (candidateTrack.includes(normalizedTrack) || normalizedTrack.includes(candidateTrack)) score += 70;
  else score += overlapScore(normalizedTrack, candidateTrack) * 60;

  if (normalizedArtist) {
    if (candidateArtist === normalizedArtist) score += 80;
    else if (candidateArtist.includes(normalizedArtist) || normalizedArtist.includes(candidateArtist)) score += 45;
    else score += overlapScore(normalizedArtist, candidateArtist) * 35;
  }

  if (result?.syncedLyrics) score += 8;
  if (result?.duration) score += 2;

  return score;
}

function isReliableLyricsMatch(result, track, artist = '') {
  const resultTrack = result?.trackName || result?.name || '';
  const resultArtist = result?.artistName || result?.artist || '';
  const normalizedTrack = normalizeForSearch(track);
  const normalizedArtist = normalizeForSearch(artist);
  const candidateTrack = normalizeForSearch(resultTrack);
  const candidateArtist = normalizeForSearch(resultArtist);

  const trackOverlap = overlapScore(normalizedTrack, candidateTrack);
  const artistOverlap = normalizedArtist ? overlapScore(normalizedArtist, candidateArtist) : 1;

  if (!candidateTrack || !normalizedTrack) return false;

  const exactTrack =
    candidateTrack === normalizedTrack ||
    candidateTrack.includes(normalizedTrack) ||
    normalizedTrack.includes(candidateTrack);

  if (exactTrack && artistOverlap >= 0.65) return true;
  if (trackOverlap >= 0.9 && artistOverlap >= 0.65) return true;
  if (!normalizedArtist && trackOverlap >= 0.95) return true;

  return false;
}

function normalizeLyricsPayload(data) {
  if (!data) return null;

  if (data.success === true) {
    const confidence = Number(data.confidence || 0);
    if (confidence < MIN_BACKEND_LYRICS_CONFIDENCE || !data.trackName || !data.artistName) {
      return null;
    }
  }

  if (data.syncedLyrics) {
    return {
      source: 'LRCLIB',
      synced: true,
      syncedLyrics: data.syncedLyrics,
      plainLyrics: data.plainLyrics || null,
      duration: data.duration,
      trackName: data.trackName || '',
      artistName: data.artistName || '',
      confidence: Number(data.confidence || 0)
    };
  }

  if (data.plainLyrics) {
    return {
      source: 'LRCLIB',
      synced: false,
      syncedLyrics: null,
      plainLyrics: data.plainLyrics,
      duration: data.duration,
      trackName: data.trackName || '',
      artistName: data.artistName || '',
      confidence: Number(data.confidence || 0)
    };
  }

  return null;
}

/**
 * Busca letra no LRCLIB por track e artist
 */
async function fetchLyricsFromLRCLIB(track, artist = '') {
  try {
    const url = `${LYRICS_FIND}?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(track)}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data?.success) return null;

    return normalizeLyricsPayload(data);
  } catch (err) {
    console.warn('LRCLIB error:', err);
    return null;
  }
}

/**
 * Tenta buscar no Musixmatch (se disponível via CORS proxy ou API)
 * Nota: Musixmatch requer token de API, então é mais um placeholder
 */
async function fetchLyricsFromMusixmatch(track, artist = '') {
  // Musixmatch não tem API pública gratuita, mas podemos tentar
  // usando um CORS proxy ou indicando que precisa da letra manual
  // Por enquanto, apenas retornamos null - a letra será marcada como não encontrada
  return null;
}

/**
 * Converte letras sincronizadas do LRC format para array usável
 */
function parseSyncedLyrics(lrcText) {
  if (!lrcText) return [];
  
  const lines = lrcText.split('\n');
  const result = [];
  
  // Regex para linhas LRC: [mm:ss.xx]lyrics
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
  
  for (const line of lines) {
    const match = line.match(timeRegex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const ms = parseInt(match[3].padEnd(3, '0'), 10);
      const timeMs = (minutes * 60 + seconds) * 1000 + ms;
      const text = match[4].trim();
      
      if (text) {
        result.push({ time: timeMs, text });
      }
    }
  }
  
  return result;
}

/**
 * Quebra letra plain em linhas
 */
function parsePlainLyrics(plainText) {
  if (!plainText) return [];
  return plainText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

/**
 * Função principal: busca letra para uma música
 * Retorna letra real ou null (NÃO usa IA para gerar)
 */
async function fetchLyrics(track, artist = '', youtubeId = null) {
  // 1. Tenta LRCLIB
  let result = await fetchLyricsFromLRCLIB(track, artist);
  
  if (result) {
    return result;
  }
  
  // 2. Fallback para Musixmatch (se disponível)
  result = await fetchLyricsFromMusixmatch(track, artist);
  
  if (result) {
    return result;
  }
  
  // 3. Não encontrou - NÃO gera com IA, retorna null
  return null;
}

/**
 * Wrapper para buscar letra de um vídeo YouTube
 */
async function fetchLyricsForYouTube(youtubeId, videoTitle, channelName = '') {
  const parsed = buildReliableYouTubeMetadata(videoTitle, channelName);
  const { track, artist } = parsed;
  
  if (!track) {
    return {
      success: false,
      reason: 'não consegui extrair o nome da música do título'
    };
  }

  if (!hasReliableYouTubeMetadata(parsed)) {
    return {
      success: false,
      reason: 'não consegui identificar com confiança artista e música pelo título do vídeo',
      track,
      artist
    };
  }
  
  let result = null;
  let backendReason = '';

  try {
    const url = `${LYRICS_FIND}?video_title=${encodeURIComponent(videoTitle || '')}&channel_name=${encodeURIComponent(channelName || '')}`;
    const response = await fetch(url);
    const data = await response.json().catch(() => null);
    if (response.ok) {
      if (data?.success) {
        result = normalizeLyricsPayload(data);
      }
    } else if (data?.reason) {
      backendReason = data.reason;
    }
  } catch (error) {
    console.warn('Backend lyrics lookup error:', error);
  }

  if (!result) {
    result = await fetchLyrics(track, artist, youtubeId);
  }
  
  if (result) {
    return {
      success: true,
      source: result.source,
      synced: result.synced,
      lyrics: result.synced ? parseSyncedLyrics(result.syncedLyrics) : parsePlainLyrics(result.plainLyrics),
      rawSynced: result.syncedLyrics,
      duration: result.duration
    };
  }
  
  return {
    success: false,
    reason: backendReason || `letra não encontrada para "${track}"${artist ? ` de ${artist}` : ''}`,
    track,
    artist
  };
}

/**
 * Traduz texto usando MyMemory API (gratuito, sem key necessária)
 */
async function translateText(text, from = 'en', to = 'pt') {
  if (!text || text.length > 500) return text;
  try {
    const encoded = encodeURIComponent(text);
    const response = await fetch(`/api/translate?q=${encoded}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    if (response.ok) {
      const data = await response.json();
      if (data.responseStatus === 200 && data.responseData) {
        return data.responseData.translatedText;
      }
    }
  } catch (err) {
    console.warn('Translation error:', err);
  }
  return text; // Retorna original se falhar
}

/**
 * Converte letra da API para formato do app (en, pt, explain)
 */
async function convertToAppLyrics(lyricsResult, maxLines = 100) {
  const lyrics = Array.isArray(lyricsResult.lyrics) 
    ? lyricsResult.lyrics 
    : [];
  
  const lines = lyrics
    .slice(0, maxLines)
    .map(line => {
      const text = typeof line === 'string' ? line : (line.text || '');
      return {
        en: text,
        pt: '', // Será preenchido depois
        explain: `<em>Fonte: ${lyricsResult.source}</em>`,
        time: typeof line === 'object' && typeof line.time === 'number' ? line.time : null
      };
    });
  
  // Traduzir em batch (limitado para não sobrecarregar API)
  const BATCH_SIZE = 5;
  for (let i = 0; i < lines.length; i += BATCH_SIZE) {
    const batch = lines.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (line, idx) => {
      if (line.en && line.en.length > 2) {
        line.pt = await translateText(line.en);
      }
    }));
  }
  
  return lines;
}

// Versão síncrona para uso imediato (sem tradução)
function convertToAppLyricsSync(lyricsResult, maxLines = 100) {
  const lyrics = Array.isArray(lyricsResult.lyrics) 
    ? lyricsResult.lyrics 
    : [];
  
  return lyrics
    .slice(0, maxLines)
    .map(line => {
      const text = typeof line === 'string' ? line : (line.text || '');
      return {
        en: text,
        pt: '', // Tradução será carregada depois
        explain: `<em>Fonte: ${lyricsResult.source}</em>`,
        time: typeof line === 'object' && typeof line.time === 'number' ? line.time : null
      };
    });
}

// Cache de traduções
const translationCache = {};

async function translateLine(line) {
  const cacheKey = line.en.toLowerCase().trim();
  if (translationCache[cacheKey]) {
    return translationCache[cacheKey];
  }
  const translation = await translateText(line.en);
  translationCache[cacheKey] = translation;
  return translation;
}

// Exporta para uso global
window.LyricsService = {
  fetchLyrics,
  fetchLyricsForYouTube,
  parseYouTubeTitle,
  buildReliableYouTubeMetadata,
  normalizeForSearch,
  convertToAppLyrics,
  convertToAppLyricsSync,
  parseSyncedLyrics,
  parsePlainLyrics,
  translateLine
};
