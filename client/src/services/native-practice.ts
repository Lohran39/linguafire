export function normalizePracticeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function comparePracticeText(expectedValue: string, receivedValue: string) {
  const expectedWords = normalizePracticeText(expectedValue).split(' ').filter(Boolean);
  const receivedWords = normalizePracticeText(receivedValue).split(' ').filter(Boolean);
  const remaining = [...receivedWords];
  const matched = expectedWords.filter((word) => {
    const index = remaining.indexOf(word);
    if (index === -1) return false;
    remaining.splice(index, 1);
    return true;
  });
  const missing = expectedWords.filter((word) => !matched.includes(word));
  const score = expectedWords.length ? Math.round((matched.length / expectedWords.length) * 100) : 0;

  return {
    score,
    missing: [...new Set(missing)].slice(0, 6),
    extra: [...new Set(remaining)].slice(0, 6)
  };
}

export function buildNativeEmbedUrl(videoId: string) {
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    enablejsapi: '1',
    origin: window.location.origin
  });

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

