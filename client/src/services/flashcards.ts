export type Flashcard = {
  word: string;
  translation: string;
  level: string;
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

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || 'Erro ao carregar flashcards');
  }
  return data;
}

export async function getFlashcardStats(): Promise<FlashcardStats> {
  return parseJson<FlashcardStats>(await fetch('/api/flashcards/stats', { credentials: 'include' }));
}

export async function getAvailableFlashcards(): Promise<Flashcard[]> {
  const data = await parseJson<{ cards: Flashcard[] }>(
    await fetch('/api/flashcards/available', { credentials: 'include' })
  );
  return data.cards || [];
}

export async function reviewFlashcard(card: Flashcard, quality: number): Promise<{ interval: number }> {
  return parseJson<{ interval: number }>(
    await fetch('/api/flashcards/review', {
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
