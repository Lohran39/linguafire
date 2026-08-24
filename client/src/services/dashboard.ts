export type DailyWord = {
  word: string;
  translation: string;
  level: string;
  context: string;
};

export type LeaderboardUser = {
  id?: string;
  name: string;
  xp: number;
  level?: number;
  streak?: number;
};

export type StreakReward = {
  id: string;
  type: string;
  streak: number;
  message: string;
  available: boolean;
  claimed: boolean;
  canClaim: boolean;
};

export type Quest = {
  id: string;
  type: 'daily' | 'weekly';
  title: string;
  desc: string;
  quest: 'lessons' | 'correct' | 'music_quiz' | 'streak' | 'xp';
  target: number;
  reward: number;
};

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || 'Erro ao carregar dados');
  }
  return data;
}

export async function getDailyWord(): Promise<DailyWord> {
  return parseJson<DailyWord>(await fetch('/api/daily/word'));
}

export async function getLeaderboard(): Promise<LeaderboardUser[]> {
  const data = await parseJson<{ leaderboard: LeaderboardUser[] }>(await fetch('/api/leaderboard'));
  return data.leaderboard || [];
}

export async function getRank(): Promise<number | null> {
  const response = await fetch('/api/rank', { credentials: 'include' });
  if (response.status === 401 || response.status === 403) return null;
  const data = await parseJson<{ rank: number }>(response);
  return data.rank;
}

export async function getStreakRewards(): Promise<StreakReward[]> {
  const response = await fetch('/api/streak/rewards', { credentials: 'include' });
  if (response.status === 401 || response.status === 403) return [];
  const data = await parseJson<{ rewards: StreakReward[] }>(response);
  return data.rewards || [];
}

export async function getQuests(): Promise<Quest[]> {
  const response = await fetch('/api/quests', { credentials: 'include' });
  if (response.status === 401 || response.status === 403) return [];
  const data = await parseJson<{ quests: Quest[] }>(response);
  return data.quests || [];
}

export async function claimStreakReward(rewardId: string): Promise<string> {
  const data = await parseJson<{ message: string }>(
    await fetch('/api/streak/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ rewardId })
    })
  );
  return data.message;
}
