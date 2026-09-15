export type Draft = { version: number; [key: string]: unknown };
export type ActivityEntry = { activity: string; state: Draft; revision: number; updated_at?: string };
const activities = new Set(['navigation', 'lessons', 'flashcard', 'conversation', 'music', 'natives', 'placement']);
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

// Persisted JSON is untrusted at runtime, even when callers provide a TypeScript type.
export function restoreActivityValue<T>(value: unknown, fallback: T, validate?: (value: unknown) => boolean): T {
  if (validate) return validate(value) ? value as T : fallback;
  if (value === undefined) return fallback;
  if (Array.isArray(fallback)) return Array.isArray(value) ? value as T : fallback;
  if (typeof fallback === 'number') return typeof value === 'number' && Number.isFinite(value) ? value as T : fallback;
  if (fallback === null) return value === null || typeof value === 'number' || typeof value === 'string' || record(value) ? value as T : fallback;
  if (record(fallback)) return record(value) ? value as T : fallback;
  return typeof value === typeof fallback ? value as T : fallback;
}

export function isActivityEntry(value: unknown): value is ActivityEntry {
  return record(value) && typeof value.activity === 'string' && activities.has(value.activity)
    && Number.isSafeInteger(value.revision) && Number(value.revision) >= 0 && Number(value.revision) <= 2147483647
    && record(value.state) && value.state.version === 1;
}

// JSON objects are unordered; array order still matters for exercises and messages.
export function sameDraft(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) return left.length === right.length && left.every((item, index) => sameDraft(item, right[index]));
  if (!record(left) || !record(right)) return false;
  // JSON serialization omits undefined object fields, including optional music settings.
  const keys = Object.keys(left).filter(key => left[key] !== undefined);
  return keys.length === Object.keys(right).filter(key => right[key] !== undefined).length
    && keys.every(key => Object.hasOwn(right, key) && sameDraft(left[key], right[key]));
}

export function readPendingDrafts(raw: string | null): Record<string, ActivityEntry> {
  try {
    const value: unknown = JSON.parse(raw || '{}');
    if (!record(value)) return {};
    const pending: Record<string, ActivityEntry> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (isActivityEntry(entry) && entry.activity === key) pending[key] = entry;
    }
    return pending;
  } catch { return {}; }
}

export function reconcileDrafts(remote: ActivityEntry[], pending: Record<string, ActivityEntry>) {
  const entries = Object.fromEntries(remote.map(entry => [entry.activity, entry]));
  const dirty = new Set<string>();
  const conflicts: ActivityEntry[] = [];
  for (const [activity, local] of Object.entries(pending)) {
    const cloud = entries[activity];
    if (cloud && sameDraft(cloud.state, local.state)) continue;
    const revision = cloud?.revision || 0;
    if (revision !== local.revision && activity !== 'navigation') {
      conflicts.push(local);
      continue;
    }
    entries[activity] = { ...local, revision };
    dirty.add(activity);
  }
  return { entries, dirty, conflicts };
}

export async function loadActivities(): Promise<ActivityEntry[]> {
  const response = await fetch('/api/activities', { credentials: 'include', signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('Não foi possível carregar suas atividades. Tente novamente para continuar com segurança.');
  const result: unknown = await response.json();
  if (!record(result) || !Array.isArray(result.activities) || !result.activities.every(isActivityEntry)) {
    throw new Error('Não foi possível validar suas atividades. Tente novamente.');
  }
  return result.activities;
}

export async function saveActivity(activity: string, state: Draft, revision: number): Promise<number | null> {
  const response = await fetch(`/api/activities/${encodeURIComponent(activity)}`, {
    method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, revision }), signal: AbortSignal.timeout(12000)
  });
  if (response.status === 409) return null;
  if (!response.ok) throw new Error('Sem sincronização. Suas alterações aguardam envio neste dispositivo.');
  const result: unknown = await response.json();
  if (!record(result) || result.revision !== revision + 1) throw new Error('Não foi possível confirmar o salvamento. Tente novamente.');
  return result.revision as number;
}
