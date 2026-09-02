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

function parseSyncedLyrics(value: string): LyricsApiLine[] {
  return value
    .split('\n')
    .map((line) => {
      const match = line.match(/^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)$/);
      if (!match) return { text: line.trim() };
      const minutes = Number(match[1] || 0);
      const seconds = Number(match[2] || 0);
      const millis = Number((match[3] || '0').padEnd(3, '0'));
      return {
        text: String(match[4] || '').trim(),
        time: minutes * 60 + seconds + millis / 1000
      };
    })
    .filter((line) => typeof line === 'string' || Boolean(line.text));
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
  if (normalizeForCompare(original) === normalizeForCompare(cleanTranslated)) return false;
  if (cleanTranslated === TRANSLATION_SEPARATOR.trim()) return false;
  return true;
}

function fallbackTranslateText(text: string) {
  return text.trim() ? 'Tradução automática indisponível para esta linha.' : '';
}

async function translateText(text: string) {
  const cacheKey = text.toLowerCase().trim();
  if (translationCache.has(cacheKey)) return translationCache.get(cacheKey) || text;

  let translated = '';
  try {
    const params = new URLSearchParams({ q: text, from: 'en', to: 'pt-BR' });
    const response = await fetch(`/api/translate?${params.toString()}`);
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      console.error('Falha na tradução:', {
        status: response.status,
        error: data?.error,
        detail: data?.detail,
        textLength: text.length
      });
    }
    translated = data?.responseStatus === 200 && data?.responseData?.translatedText
      ? decodeHtmlEntities(String(data.responseData.translatedText))
      : '';
  } catch (error) {
    console.error('Falha na tradução:', error instanceof Error ? error.message : error);
    translated = '';
  }

  if (!isUsefulTranslation(text, translated)) {
    translated = fallbackTranslateText(text);
  }

  translationCache.set(cacheKey, translated);
  return translated;
}

function chunkLinesForTranslation(lines: string[], maxChars = 1400) {
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

async function translateLines(lines: string[]) {
  const translatedChunks = await Promise.all(chunkLinesForTranslation(lines).map(async (chunk) => {
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
      const joinedTranslated = await translateText(joinedOriginal);
      const splitTranslated = joinedTranslated.split(/(?:\n)?LF_LINE_BREAK(?:\n)?/);

      missingLines.forEach((line, index) => {
        const candidate = splitTranslated[index] || '';
        const translated = isUsefulTranslation(line, candidate) ? decodeHtmlEntities(candidate).trim() : fallbackTranslateText(line);
        translationCache.set(line.toLowerCase().trim(), translated);
        cachedChunk[missingIndexes[index]] = translated;
      });
    }

    return cachedChunk;
  }));

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

export async function fetchYouTubeMetadata(youtubeId: string) {
  const url = `https://www.youtube.com/watch?v=${youtubeId}`;
  const params = new URLSearchParams({ url });
  const response = await fetch(`/api/youtube/oembed?${params.toString()}`);
  if (!response.ok) throw new Error('Não consegui ler os dados do vídeo.');
  return (await response.json()) as YouTubeOEmbedResponse;
}

export async function searchMusicByName(query: string) {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`/api/music/search?${params.toString()}`);
  const data = (await response.json().catch(() => null)) as MusicSearchResponse | null;

  if (!response.ok || !data?.success) {
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

export async function lyricsResponseToLines(data: LyricsFindResponse, maxLines = 80): Promise<LyricLine[]> {
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

  const translatedLines = await translateLines(usableLines.map((line) => line.text));

  return usableLines.map((line, index) => ({
      en: line.text,
      pt: translatedLines[index] || fallbackTranslateText(line.text),
      explain: line.time === undefined
        ? `Fonte: ${data.fallbackSource === 'genius-metadata' ? 'Genius + LRCLIB' : data.source || 'letras'}`
        : `Legenda sincronizada em ${Math.floor(line.time / 60)}:${String(Math.floor(line.time % 60)).padStart(2, '0')}.`,
      time: line.time
    }));
}

export async function musicSearchToLyrics(data: MusicSearchResponse, maxLines = 80) {
  if (!data.syncedLyrics && !data.plainLyrics) return [];
  return lyricsResponseToLines(data, maxLines);
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
  maxLines = 80,
  source?: { videoTitle?: string; channelName?: string }
): Promise<LyricLine[]> {
  const params = new URLSearchParams({
    track_name: track,
    artist_name: artist
  });
  if (source?.videoTitle) params.set('video_title', source.videoTitle);
  if (source?.channelName) params.set('channel_name', source.channelName);
  const response = await fetch(`/api/lyrics/find?${params.toString()}`);
  const data = (await response.json().catch(() => null)) as LyricsFindResponse | null;

  if (!response.ok || !data?.success) {
    throw new Error(data?.reason || 'Letra não encontrada automaticamente.');
  }

  return lyricsResponseToLines(data, maxLines);
}
