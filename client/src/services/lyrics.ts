import type { LyricLine } from '../data/music';

type LyricsApiLine = string | { text?: string; time?: number };

type LyricsFindResponse = {
  success?: boolean;
  reason?: string;
  source?: string;
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

const translationCache = new Map<string, string>();

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

async function translateText(text: string) {
  const cacheKey = text.toLowerCase().trim();
  if (translationCache.has(cacheKey)) return translationCache.get(cacheKey) || text;

  const params = new URLSearchParams({ q: text, from: 'en', to: 'pt' });
  const response = await fetch(`/api/translate?${params.toString()}`);
  const data = await response.json().catch(() => null);
  const translated = data?.responseStatus === 200 && data?.responseData?.translatedText
    ? String(data.responseData.translatedText)
    : text;

  translationCache.set(cacheKey, translated);
  return translated;
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

export async function fetchSongLyrics(track: string, artist: string, maxLines = 80): Promise<LyricLine[]> {
  const params = new URLSearchParams({
    track_name: track,
    artist_name: artist
  });
  const response = await fetch(`/api/lyrics/find?${params.toString()}`);
  const data = (await response.json().catch(() => null)) as LyricsFindResponse | null;

  if (!response.ok || !data?.success) {
    throw new Error(data?.reason || 'Letra não encontrada automaticamente.');
  }

  const rawLines = data.synced && data.syncedLyrics
    ? parseSyncedLyrics(data.syncedLyrics)
    : parsePlainLyrics(data.plainLyrics || '');

  const usableLines = rawLines
    .map((line) => (typeof line === 'string' ? line : line.text || ''))
    .map((line) => line.trim())
    .filter((line) => line.length > 1)
    .slice(0, maxLines);

  const translated = await Promise.all(
    usableLines.map(async (line) => ({
      en: line,
      pt: await translateText(line),
      explain: `Fonte: ${data.source || 'letras'}`
    }))
  );

  return translated;
}
