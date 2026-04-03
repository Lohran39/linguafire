// ==================== LYRICS SERVICE ====================
// LRCLIB + Musixmatch fallback - sem IA para gerar letras

const LRCLIB_BASE = 'https://lrclib.net/api/get';
const LRCLIB_SEARCH = 'https://lrclib.net/api/search';

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
  
  // Tenta padrão "Artist - Track (Official Video)"
  const dashMatch = title.match(/^(.+?)\s*-\s*(.+?)\s*[\(\[]/);
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

/**
 * Busca letra no LRCLIB por track e artist
 */
async function fetchLyricsFromLRCLIB(track, artist = '') {
  try {
    // Primeiro tenta busca por track + artist
    let url = `${LRCLIB_BASE}?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(track)}`;
    
    let response = await fetch(url);
    let data = null;
    
    // Se não encontrou, tenta só track
    if (!response.ok) {
      url = `${LRCLIB_SEARCH}?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(track)}`;
      response = await fetch(url);
      
      if (response.ok) {
        const results = await response.json();
        if (results && results.length > 0) {
          // Pega o primeiro resultado com maior similaridade
          data = results[0];
        }
      }
    } else {
      data = await response.json();
    }
    
    if (data && data.syncedLyrics) {
      return {
        source: 'LRCLIB',
        synced: true,
        syncedLyrics: data.syncedLyrics,
        plainLyrics: data.plainLyrics || null,
        duration: data.duration
      };
    } else if (data && data.plainLyrics) {
      return {
        source: 'LRCLIB',
        synced: false,
        syncedLyrics: null,
        plainLyrics: data.plainLyrics,
        duration: data.duration
      };
    }
    
    return null;
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
async function fetchLyricsForYouTube(youtubeId, videoTitle) {
  const { track, artist } = parseYouTubeTitle(videoTitle);
  
  if (!track) {
    return {
      success: false,
      reason: 'não consegui extrair o nome da música do título'
    };
  }
  
  const result = await fetchLyrics(track, artist, youtubeId);
  
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
    reason: `letra não encontrada para "${track}"${artist ? ` de ${artist}` : ''}`,
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
    const response = await fetch(`https://api.mymemory.translated.net/get?q=${encoded}&langpair=${from}|${to}`);
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
        explain: `<em>Fonte: ${lyricsResult.source}</em>`
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
        explain: `<em>Fonte: ${lyricsResult.source}</em>`
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
  normalizeForSearch,
  convertToAppLyrics,
  convertToAppLyricsSync,
  parseSyncedLyrics,
  parsePlainLyrics,
  translateLine
};
