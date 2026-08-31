export type Flashcard = {
  word: string;
  translation: string;
  level: string;
  category?: string;
  example?: string;
  note?: string;
  ease_factor?: number;
  interval_days?: number;
  next_review?: string;
  repetitions?: number;
  isNew?: boolean;
};

export type FlashcardStats = {
  due: number;
  total: number;
};

const FLASHCARD_TIMEOUT_MS = 10000;

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), FLASHCARD_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('A conexão demorou demais. Tente novamente em alguns segundos.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || 'Erro ao carregar flashcards');
  }
  return data;
}

export async function getFlashcardStats(): Promise<FlashcardStats> {
  return parseJson<FlashcardStats>(await fetchWithTimeout('/api/flashcards/stats', { credentials: 'include' }));
}

export async function getAvailableFlashcards(): Promise<Flashcard[]> {
  const data = await parseJson<{ cards: Flashcard[] }>(
    await fetchWithTimeout('/api/flashcards/available', { credentials: 'include' })
  );
  return data.cards || [];
}

export async function reviewFlashcard(card: Flashcard, quality: number): Promise<{ interval: number }> {
  return parseJson<{ interval: number }>(
    await fetchWithTimeout('/api/flashcards/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        word: card.word,
        translation: card.translation,
        quality
      })
    })
  );
}
