import { createJsonParser } from './http';
import type { UserProfile } from './auth';
const API_BASE = '/api';
const PROFILE_UPDATE_TIMEOUT_MS = 15000;
const parseJson = createJsonParser('Erro ao atualizar perfil.');

export async function getProfile(): Promise<UserProfile> {
  const data = await parseJson<{ user: UserProfile }>(
    await fetch(`${API_BASE}/profile`, {
      credentials: 'include', signal: AbortSignal.timeout(10000)
    })
  );

  return data.user;
}

export async function updateProfile(updates: Partial<UserProfile> & { lesson_xp?: number; xp_base?: number; correct_answers_base?: number }): Promise<Partial<UserProfile>> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), PROFILE_UPDATE_TIMEOUT_MS);

  try {
    const result = await parseJson<{ success: boolean; updates?: Partial<UserProfile> }>(
      await fetch(`${API_BASE}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify(updates)
      })
    );
    return result.updates || {};
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('O salvamento demorou demais. Tente novamente em alguns segundos.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function uploadProfileAvatar(avatar: Blob): Promise<string> {
  const data = await parseJson<{ avatarUrl: string }>(await fetch(`${API_BASE}/profile/avatar`, {
    method: 'PUT', credentials: 'include', headers: { 'Content-Type': avatar.type }, body: avatar,
    signal: AbortSignal.timeout(20000)
  }));
  return data.avatarUrl;
}

export async function removeProfileAvatar(): Promise<void> {
  await parseJson<{ success: boolean }>(await fetch(`${API_BASE}/profile/avatar`, {
    method: 'DELETE', credentials: 'include', signal: AbortSignal.timeout(20000)
  }));
}
