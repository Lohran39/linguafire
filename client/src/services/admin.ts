export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  xp: number;
  level: number;
  streak?: number;
  english_level?: string;
  email_verified?: number;
  placement_completed?: number;
  created_at?: string;
};

export type AdminSummary = {
  stats: {
    totalUsers: number;
    verifiedUsers: number;
    googleUsers: number;
    passwordUsers: number;
  };
  topUsers: AdminUserRow[];
  recentUsers: AdminUserRow[];
};

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || 'Erro ao carregar painel admin');
  return data;
}

export async function getAdminSummary(): Promise<AdminSummary> {
  return parseJson<AdminSummary>(
    await fetch('/api/admin/summary', {
      credentials: 'include'
    })
  );
}

export async function saveCuratedNativeVideos(payload: {
  query: string;
  lang: string;
  videoIds: string[];
}): Promise<{ cacheKey: string; videoIds: string[] }> {
  return parseJson<{ cacheKey: string; videoIds: string[] }>(
    await fetch('/api/natives/curated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    })
  );
}
