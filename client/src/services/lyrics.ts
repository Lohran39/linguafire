import type { LyricLine } from '../data/music';

type LyricsApiLine = string | { text?: string; time?: number };

type LyricsFindResponse = {
  success?: boolean;
  reason?: string;
  source?: string;
  fallbackSource?: string;
  mode?: 'synced' | 'plain';
  synced?: boolean;
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
  trackName?: string;
  artistName?: string;
};

type YouTubeOEmbedResponse = {
  title: string;
  author: string;
  thumbnail?: string | null;
};

type MusicSearchResponse = {
  success?: boolean;
  reason?: string;
  videoId: string;
  title: string;
  artist: string;
  videoTitle: string;
  channelName: string;
  thumbnail?: string | null;
  durationSeconds?: number;
  synced?: boolean;
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
  source?: string;
  fallbackSource?: string;
  trackKey?: string;
  candidates?: {
    videoId: string;
    title: string;
    channelName: string;
    thumbnail?: string | null;
    durationSeconds?: number;
    score?: number;
    cached?: boolean;
  }[];
};

const translationCache = new Map<string, string>();
const YOUTUBE_TITLE_SUFFIX_PATTERN = /\b(official|music|video|lyrics?|lyric|audio|visualizer|remaster(?:ed)?|hd|4k|vevo|topic)\b/gi;
const TRANSLATION_SEPARATOR = '\nLF_LINE_BREAK\n';

type LyricsLoadOptions = {
  signal?: AbortSignal;
  onProgress?: (lines: LyricLine[]) => void;
};

type MusicStage = 'video-search' | 'video-metadata' | 'lyrics' | 'translation';

// Timings stay in the browser; queries, lyrics and user identifiers are not recorded.
async function requestMusicJson<T>(url: string, stage: MusicStage, signal?: AbortSignal, init: RequestInit = {}): Promise<T> {
  signal?.throwIfAborted();
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(new DOMException('Tempo de espera esgotado.', 'TimeoutError')), stage === 'translation' ? 30000 : 20000);
  const start = performance.now();
  let outcome = 'error';
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const data = await response.json();
    controller.signal.throwIfAborted();
    if (!response.ok) throw new Error(data?.reason || data?.error || 'Não foi possível concluir a busca.');
    outcome = 'success';
    return data as T;
  } catch (error) {
    if (controller.signal.aborted) {
      outcome = signal?.aborted ? 'cancelled' : 'timeout';
      if (signal?.aborted) throw signal.reason;
      throw new Error('A resposta demorou demais. Tente novamente.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
    const name = `linguafire:music:${stage}`;
    if (performance.getEntriesByName(name).length >= 30) performance.clearMeasures(name);
    performance.measure(name, { start, end: performance.now(), detail: { outcome } });
  }
}

function parseSyncedLyrics(value: string): LyricsApiLine[] {
  return value.split('\n').flatMap(line => {
    const tags = [...line.matchAll(/\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]/g)];
    if (!tags.length) return []; // Ignore LRC metadata instead of treating it as a verse.
    const text = line.replace(/\[[^\]]*\]/g, '').trim();
    if (!text) return [];
    return tags.map(tag => ({ text, time: Number(tag[1]) * 60 + Number(tag[2]) + Number((tag[3] || '0').padEnd(3, '0')) / 1000 }));
  }).sort((a, b) => a.time - b.time);
}

function parsePlainLyrics(value: string): LyricsApiLine[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeForCompare(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&(?:amp|quot|#39|lt|gt);/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtmlEntities(text: string) {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

function isUsefulTranslation(original: string, translated: string) {
  const cleanTranslated = decodeHtmlEntities(translated).trim();
  if (!cleanTranslated) return false;
  if (cleanTranslated === fallbackTranslateText(original)) return false;
  if (normalizeForCompare(original) === normalizeForCompare(cleanTranslated)) return false;
  if (cleanTranslated === TRANSLATION_SEPARATOR.trim()) return false;
  return true;
}

function fallbackTranslateText(text: string) {
  const normalized = normalizeForCompare(text);
  if (!normalized) return '';

  const exact: Record<string, string> = {
    'one two three four': 'um, dois, tres, quatro',
    'one two three': 'um, dois, tres',
    'yeah yeah': 'sim, sim',
    'yeah yeah uh uh uh uh': 'sim, sim, uh-uh, uh-uh',
    'uh uh yeah yeah yeah yeah': 'uh-uh, sim, sim, sim, sim',
    'uh uh yeah yeah': 'uh-uh, sim, sim',
    'doo doo doo doo doo doo doo doo doo doo doo': 'Expressão sonora de refrão, sem tradução literal.',
    'skrrt skrrt': 'Efeito sonoro usado em música, sem tradução literal.'
  };
  if (exact[normalized]) return exact[normalized];

  const soundTokens = new Set(['yeah', 'yea', 'uh', 'ooh', 'oh', 'ah', 'la', 'na', 'doo', 'skrrt', 'hmm', 'mm']);
  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length && tokens.every((token) => soundTokens.has(token))) {
    return 'Expressão sonora de música, sem tradução literal.';
  }

  return 'Tradução em revisão. Tente recarregar a letra em alguns segundos.';
}

function isTemporaryTranslationFallback(text: string) {
  return text.includes('Tradução em revisão.')
    || text.includes('Tradução automática indisponível');
}

async function translateText(text: string, signal?: AbortSignal) {
  signal?.throwIfAborted();
  const cacheKey = text.toLowerCase().trim();
  if (translationCache.has(cacheKey)) return translationCache.get(cacheKey) || text;

  let translated = '';
  try {
    const data = await requestMusicJson<{ responseStatus?: number; responseData?: { translatedText?: string } }>('/api/translate', 'translation', signal, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, from: 'en', to: 'pt-BR' })
    });
    translated = data?.responseStatus === 200 && data?.responseData?.translatedText
      ? decodeHtmlEntities(String(data.responseData.translatedText))
      : '';
  } catch (error) {
    signal?.throwIfAborted();
    console.error('Falha na tradução:', error instanceof Error ? error.message : error);
    translated = '';
  }

  if (!isUsefulTranslation(text, translated)) {
    translated = fallbackTranslateText(text);
  }

  if (!isTemporaryTranslationFallback(translated)) {
    translationCache.set(cacheKey, translated);
  }
  return translated;
}

function chunkLinesForTranslation(lines: string[], maxChars = 9000) {
  const chunks: string[][] = [];
  let current: string[] = [];
  let currentSize = 0;

  for (const line of lines) {
    const nextSize = currentSize + line.length + TRANSLATION_SEPARATOR.length;
    if (current.length && nextSize > maxChars) {
      chunks.push(current);
      current = [];
      currentSize = 0;
    }
    current.push(line);
    currentSize += line.length + TRANSLATION_SEPARATOR.length;
  }

  if (current.length) chunks.push(current);
  return chunks;
}

async function translateLines(lines: string[], signal?: AbortSignal) {
  const chunks = chunkLinesForTranslation(lines);
  const translatedChunks: string[][] = [];

  for (const chunk of chunks) {
    signal?.throwIfAborted();
    const missingIndexes: number[] = [];
    const missingLines: string[] = [];
    const cachedChunk = chunk.map((line, index) => {
      const cacheKey = line.toLowerCase().trim();
      const cached = translationCache.get(cacheKey);
      if (cached) return cached;
      missingIndexes.push(index);
      missingLines.push(line);
      return '';
    });

    if (missingLines.length) {
      const joinedOriginal = missingLines.join(TRANSLATION_SEPARATOR);
      const joinedTranslated = await translateText(joinedOriginal, signal);
      const splitTranslated = joinedTranslated.split(/(?:\n)?LF_LINE_BREAK(?:\n)?/);
      if (splitTranslated.length !== missingLines.length) translationCache.delete(joinedOriginal.toLowerCase().trim());

      missingLines.forEach((line, index) => {
        const candidate = splitTranslated.length === missingLines.length ? splitTranslated[index] : '';
        const translated = isUsefulTranslation(line, candidate) ? decodeHtmlEntities(candidate).trim() : fallbackTranslateText(line);
        if (!isTemporaryTranslationFallback(translated)) {
          translationCache.set(line.toLowerCase().trim(), translated);
        }
        cachedChunk[missingIndexes[index]] = translated;
      });
    }

    translatedChunks.push(cachedChunk);
  }

  return translatedChunks.flat();
}

export function extractYouTubeId(value: string) {
  const text = value.trim();
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?[^#]*v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /^[a-zA-Z0-9_-]{11}$/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
    if (match?.[0] && match[0].length === 11) return match[0];
  }

  return '';
}

export async function fetchYouTubeMetadata(youtubeId: string, signal?: AbortSignal) {
  const url = `https://www.youtube.com/watch?v=${youtubeId}`;
  const params = new URLSearchParams({ url });
  return requestMusicJson<YouTubeOEmbedResponse>(`/api/youtube/oembed?${params.toString()}`, 'video-metadata', signal);
}

export async function searchMusicByName(query: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ q: query });
  const data = await requestMusicJson<MusicSearchResponse>(`/api/music/search?${params.toString()}`, 'video-search', signal);

  if (!data?.success) {
    throw new Error(data?.reason || 'Não encontrei essa música. Tente música + artista.');
  }

  return data;
}

export function reportMusicVideoStatus(payload: {
  trackKey?: string;
  track: string;
  artist: string;
  videoId: string;
  status: 'working' | 'bad';
  reason?: string;
}) {
  void fetch('/api/music/video-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true
  }).catch(() => {});
}

export async function lyricsResponseToLines(data: LyricsFindResponse, maxLines = Number.POSITIVE_INFINITY, options: LyricsLoadOptions = {}): Promise<LyricLine[]> {
  const rawLines = data.synced && data.syncedLyrics
    ? parseSyncedLyrics(data.syncedLyrics)
    : parsePlainLyrics(data.plainLyrics || '');

  const usableLines = rawLines
    .map((line) => {
      if (typeof line === 'string') return { text: line.trim(), time: undefined };
      return { text: String(line.text || '').trim(), time: line.time };
    })
    .filter((line) => line.text.length > 1)
    .slice(0, maxLines);

  const originalLines: LyricLine[] = usableLines.map((line) => ({
      en: line.text,
      pt: '',
      translationStatus: 'pending',
      explain: line.time === undefined
        ? `Fonte: ${data.fallbackSource === 'genius-metadata' ? 'Genius + LRCLIB' : data.source || 'letras'}`
        : `Legenda sincronizada em ${Math.floor(line.time / 60)}:${String(Math.floor(line.time % 60)).padStart(2, '0')}.`,
      time: line.time
    }));
  if (!originalLines.length) throw new Error('A letra encontrada está vazia.');
  return translateLyricLines(originalLines, options);
}

export async function translateLyricLines(lines: LyricLine[], options: LyricsLoadOptions = {}): Promise<LyricLine[]> {
  options.signal?.throwIfAborted();
  const pending = lines.map(line => line.translationStatus === 'unavailable'
    ? { ...line, pt: '', translationStatus: 'pending' as const }
    : line);
  options.onProgress?.(pending);
  const translated = await translateLines(pending.map(line => line.en), options.signal);
  options.signal?.throwIfAborted();
  return pending.map((line, index) => {
    const pt = translated[index] || fallbackTranslateText(line.en);
    return { ...line, pt, translationStatus: isTemporaryTranslationFallback(pt) ? 'unavailable' : 'ready' };
  });
}

export function parseYouTubeMusicMetadata(metadata: YouTubeOEmbedResponse) {
  const originalTitle = String(metadata.title || '').trim();
  const originalAuthor = String(metadata.author || '').trim();
  const cleanText = (value: string) => value
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(YOUTUBE_TITLE_SUFFIX_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let title = cleanText(originalTitle);
  let artist = cleanText(originalAuthor) || 'YouTube';
  const dashMatch = originalTitle.match(/^(.+?)\s*[-–—]\s*(.+)$/);

  if (dashMatch) {
    artist = cleanText(dashMatch[1]) || artist;
    title = cleanText(dashMatch[2]) || title;
  }

  return {
    title: title || originalTitle || 'Música do YouTube',
    artist,
    videoTitle: originalTitle,
    channelName: originalAuthor
  };
}

export async function fetchSongLyrics(
  track: string,
  artist: string,
  maxLines = Number.POSITIVE_INFINITY,
  source?: { videoTitle?: string; channelName?: string },
  options: LyricsLoadOptions = {}
): Promise<LyricLine[]> {
  const params = new URLSearchParams({
    track_name: track,
    artist_name: artist
  });
  if (source?.videoTitle) params.set('video_title', source.videoTitle);
  if (source?.channelName) params.set('channel_name', source.channelName);
  const data = await requestMusicJson<LyricsFindResponse>(`/api/lyrics/find?${params.toString()}`, 'lyrics', options.signal);

  if (!data?.success) {
    throw new Error(data?.reason || 'Letra não encontrada automaticamente.');
  }

  return lyricsResponseToLines(data, maxLines, options);
}
