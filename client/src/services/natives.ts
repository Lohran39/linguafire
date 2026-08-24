export type NativesLanguage =
  | 'english'
  | 'english-us'
  | 'english-uk'
  | 'english-au'
  | 'spanish'
  | 'french'
  | 'german'
  | 'italian'
  | 'portuguese';

export type NativesSearchResult = {
  videoIds: string[];
  message?: string;
  reason?: string;
  searchUrl?: string;
  cached?: boolean;
  curated?: boolean;
};

export const nativeSuggestions = [
  'look forward to',
  'give up',
  'break down',
  'make up your mind',
  'nevertheless',
  'take for granted',
  'turn out',
  'go ahead',
  'come up with',
  'on the other hand',
  'work out',
  'figure out'
];

export const nativeLanguages: Array<{ value: NativesLanguage; label: string }> = [
  { value: 'english', label: 'English' },
  { value: 'english-us', label: 'American English' },
  { value: 'english-uk', label: 'British English' },
  { value: 'english-au', label: 'Australian English' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'french', label: 'French' },
  { value: 'german', label: 'German' },
  { value: 'italian', label: 'Italian' },
  { value: 'portuguese', label: 'Portuguese' }
];

export async function searchNatives(query: string, lang: NativesLanguage): Promise<NativesSearchResult> {
  const params = new URLSearchParams({
    q: query,
    lang,
    strict: '1',
    shorts: '1'
  });
  const response = await fetch(`/api/natives/search?${params.toString()}`);
  const data = (await response.json().catch(() => ({}))) as NativesSearchResult & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || 'Erro ao buscar videos');
  }
  return data;
}

export function buildNativesFallbackUrl(query: string, lang: NativesLanguage) {
  const labels: Record<NativesLanguage, string> = {
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
  const searchQuery = `"${query}" ${labels[lang]} shorts native speaker -lyrics -song`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}&sp=EgIYAQ%253D%253D`;
}

export function buildRetryVariants(query: string) {
  const stopwords = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'from', 'in', 'into', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'to', 'with', 'you', 'your']);
  const cleaned = query.trim().replace(/\s+/g, ' ');
  const words = cleaned.split(' ').filter(Boolean);
  const significant = words.filter((word) => !stopwords.has(word.toLowerCase()));
  const variants = [cleaned];

  if (significant.length >= 2) variants.push(significant.slice(0, 3).join(' '));

  const keyword = [...significant, ...words].sort((a, b) => b.length - a.length)[0];
  if (keyword) variants.push(keyword);

  return [...new Set(variants)].slice(0, 3);
}
