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
  google_linked?: boolean;
  theme?: string;
  subscription_active?: boolean;
  subscription_expires?: number;
  ai_uses_today?: number;
  favorites?: FavoriteSong[];
  achievements?: string[];
  lives?: number;
  has_free_hint?: number | boolean;
  xp_multiplier?: number;
  xp_multiplier_until?: number;
  titles?: string[];
};

export type FavoriteSong = {
  key: string;
  title: string;
  artist: string;
  ytId: string;
  level: string;
};

export type RegisterResult = {
  requiresEmailVerification: boolean;
  message: string;
  verificationLink?: string | null;
  user?: UserProfile;
};

type ApiErrorBody = {
  error?: string;
  message?: string;
};

const PASSWORD_RESET_TIMEOUT_MS = 20000;

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & ApiErrorBody;

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Erro ao processar a solicitação');
  }

  return data;
}

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

export async function register(name: string, email: string, password: string): Promise<RegisterResult> {
  const data = await parseJson<RegisterResult>(
    await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, email, password })
    })
  );

  if (data.user) persistUserId(String(data.user.id));
  return data;
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

export async function getProfile(): Promise<UserProfile> {
  const data = await parseJson<{ user: UserProfile }>(
    await fetch(`${API_BASE}/profile`, {
      credentials: 'include'
    })
  );

  persistUserId(String(data.user.id));
  return data.user;
}

export async function updateProfile(updates: Partial<UserProfile>): Promise<void> {
  await parseJson<{ success: boolean }>(
    await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates)
    })
  );
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

export async function getSubscriptionStatus(): Promise<{ active: boolean; expires: number; plan: string | null; price: number }> {
  return parseJson<{ active: boolean; expires: number; plan: string | null; price: number }>(
    await fetch(`${API_BASE}/subscription/status`, { credentials: 'include' })
  );
}

export async function createSubscription(): Promise<{ active: boolean; expires: number; plan: string; price: number }> {
  const data = await parseJson<{
    checkoutUrl?: string;
    subscription?: { active: boolean; expires: number; plan: string; price: number };
  }>(
    await fetch(`${API_BASE}/subscription/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ plan: 'monthly' })
    })
  );

  if (data.checkoutUrl) {
    window.location.href = data.checkoutUrl;
    return { active: false, expires: 0, plan: 'monthly', price: 15 };
  }

  if (!data.subscription) {
    throw new Error('Resposta de assinatura inválida');
  }

  return data.subscription;
}

export async function cancelSubscription(): Promise<void> {
  await parseJson<{ success: boolean }>(
    await fetch(`${API_BASE}/subscription/cancel`, {
      method: 'POST',
      credentials: 'include'
    })
  );
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
