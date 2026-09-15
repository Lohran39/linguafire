export type MusicReward = {
  run: string;
  xp_base: number;
  correct_answers_base: number;
  xp: number;
  correct_answers: number;
};

export function createMusicReward(run: string, xp: number, correct: number, gainedXp: number, gainedCorrect: number): MusicReward {
  return { run, xp_base: xp, correct_answers_base: correct, xp: xp + gainedXp, correct_answers: correct + gainedCorrect };
}

export function isMusicReward(value: unknown): value is MusicReward | null {
  if (value === null) return true;
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return typeof data.run === 'string' && ['xp_base', 'correct_answers_base', 'xp', 'correct_answers']
    .every(key => Number.isSafeInteger(data[key]) && Number(data[key]) >= 0);
}
