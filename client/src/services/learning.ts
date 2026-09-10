import { createJsonParser } from './http';
export type LearningActivity = 'lesson' | 'flashcard' | 'music_quiz' | 'native_coach' | 'dictation';
export type LearningEvent = { eventId: string; activity: LearningActivity; score: number; occurredAt: string };
export type LearningSummary = {
  consolidatedWords: number; reviewedWords: number;
  words: { word: string; translation: string }[];
  recurringErrors: { type: string; count: number; examples: { incorrect: string; correct: string }[] }[];
  skills: { activity: LearningActivity; label: string; attempts: number; previousAttempts: number; score: number | null; change: number | null }[];
};
const parseJson = createJsonParser('Não foi possível carregar seu aprendizado.');
const sending = new Map<string, Promise<void>>();
const queues = new Map<string, LearningEvent[]>();
function queue(userId: string) {
  if (!queues.has(userId)) {
    try {
      const stored = JSON.parse(localStorage.getItem(`learning-events:${userId}`) || '[]');
      queues.set(userId, Array.isArray(stored) ? stored.filter(event => event?.eventId && Number.isFinite(event.score) && Date.parse(event.occurredAt) >= Date.now() - 90 * 86400000) : []);
    } catch { queues.set(userId, []); }
  }
  return queues.get(userId)!;
}
function cache(userId: string) {
  try { localStorage.setItem(`learning-events:${userId}`, JSON.stringify(queue(userId))); } catch { /* Keep pending events in memory. */ }
}
export function flushLearningEvents(userId: string): Promise<void> {
  const existing = sending.get(userId);
  if (existing) return existing;
  const pending = queue(userId);
  if (!pending.length) return Promise.resolve();
  const job = (async () => {
    try {
      while (pending.length) {
        const response = await fetch('/api/learning/events', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...pending[0], userId }), signal: AbortSignal.timeout(8000) });
        if (!response.ok) break;
        pending.shift(); cache(userId);
      }
    } catch { /* Retry on the next exercise or dashboard visit. */ }
    finally { sending.delete(userId); }
  })();
  sending.set(userId, job);
  return job;
}

export function recordLearning(userId: string, activity: LearningActivity, score: number, eventId = crypto.randomUUID()) {
  const pending = queue(userId);
  if (!pending.some(event => event.eventId === eventId)) pending.push({ eventId, activity, score: Math.round(score), occurredAt: new Date().toISOString() });
  cache(userId);
  void flushLearningEvents(userId);
}
export function pendingLearningEvents(userId: string) { return queue(userId).length; }
export async function getLearningSummary(): Promise<LearningSummary> {
  const result = await parseJson<LearningSummary>(await fetch('/api/learning/summary', { credentials: 'include', signal: AbortSignal.timeout(10000) }));
  if (!Array.isArray(result.skills) || !Array.isArray(result.words) || !Array.isArray(result.recurringErrors) || typeof result.consolidatedWords !== 'number') throw new Error('Os indicadores recebidos estão incompletos. Tente novamente.');
  return result;
}
