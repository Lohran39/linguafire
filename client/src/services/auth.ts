import { createJsonParser } from './http';

const API_BASE = '/api';
const USER_ID_KEY = 'linguafire_userId';

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  level: number;
  xp: number;
  streak: number;
  correct_answers: number;
  lessons_completed: number;
  english_level: string;
  placement_completed?: number;
  role?: 'user' | 'admin' | string;
  google_linked?: boolean;
  has_password?: boolean;
  theme?: string;
  subscription_active?: boolean;
  subscription_expires?: number;
  plan?: 'free' | 'pro' | 'max' | string;
  ai_daily_limit?: number;
  ai_monthly_limit?: number | null;
  ai_uses_month?: number;
  ai_month_resets_at?: string;
  ai_legacy?: boolean;
  ai_uses_today?: number;
  ai_limit_resets_at?: string;
  favorites?: FavoriteSong[];
  achievements?: string[];
  lives?: number;
  streak_freeze_active?: number;
  has_free_hint?: number | boolean;
  xp_multiplier?: number;
  xp_multiplier_until?: number;
  titles?: string[];
  avatar_url?: string | null;
};

export type FavoriteSong = {
  key: string;
  title: string;
  artist: string;
  ytId: string;
  level: string;
};

const PASSWORD_RESET_TIMEOUT_MS = 20000;

const parseJson = createJsonParser('Erro ao processar a solicitação');

function persistUserId(userId: string) {
  localStorage.setItem(USER_ID_KEY, userId);
}

function clearUserId() {
  localStorage.removeItem(USER_ID_KEY);
}

export async function login(email: string, password: string): Promise<UserProfile> {
  const data = await parseJson<{ user: UserProfile }>(
    await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    })
  );

  persistUserId(String(data.user.id));
  return data.user;
}

export async function register(name: string, email: string, password: string): Promise<UserProfile> {
  const data = await parseJson<{ user: UserProfile }>(
    await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, email, password })
    })
  );

  persistUserId(String(data.user.id));
  return data.user;
}

export async function confirmEmail(token: string, newPassword: string): Promise<{ message: string }> {
  return parseJson<{ message: string }>(await fetch(`${API_BASE}/auth/verify-email`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(20000), body: JSON.stringify({ token, newPassword })
  }));
}

export async function getSession(): Promise<{ userId: string; email: string } | null> {
  const response = await fetch(`${API_BASE}/auth/session`, { credentials: 'include' });

  if (response.status === 401 || response.status === 403) {
    clearUserId();
    return null;
  }

  const data = await parseJson<{ userId: string; email: string }>(response);
  persistUserId(String(data.userId));
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<string> {
  const data = await parseJson<{ message: string }>(
    await fetch(`${API_BASE}/change-password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ currentPassword, newPassword })
    })
  );

  return data.message;
}

export async function deleteAccount(): Promise<void> {
  await parseJson<{ success: boolean }>(
    await fetch(`${API_BASE}/account`, {
      method: 'DELETE',
      credentials: 'include'
    })
  );
  clearUserId();
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/logout`, {
    method: 'POST',
    credentials: 'include'
  }).catch(() => {});

  clearUserId();
}

export async function requestPasswordReset(email: string): Promise<{ message: string; resetLink?: string | null }> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), PASSWORD_RESET_TIMEOUT_MS);

  try {
    const data = await parseJson<{ message: string; resetLink?: string | null }>(
      await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ email })
      })
    );

    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('O envio demorou demais. Confira a configuração SMTP no Render e tente novamente.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  return parseJson<{ message: string }>(
    await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    })
  );
}

export function loginWithGoogle(mode: 'login' | 'link' = 'login') {
  const params = new URLSearchParams();
  if (mode === 'link') params.set('mode', 'link');
  const query = params.toString();
  window.location.href = query ? `/auth/google?${query}` : '/auth/google';
}
