// ==================== SERVIÇO DE AUTENTICAÇÃO ====================
const API_BASE = '/api';

// Armazenar userId (o token agora fica no cookie HttpOnly)
let authToken = null; // não mais usado para auth
let currentUserId = localStorage.getItem('linguafire_userId');

function clearAuthSession() {
  authToken = null;
  currentUserId = null;
  localStorage.removeItem('linguafire_userId');
  // Limpa o cookie chamando logout no servidor
  fetch(`${API_BASE}/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
}

// Headers para requests autenticados. O cookie HttpOnly é enviado automaticamente.
function getAuthHeaders() {
  return {};
}

// Verificar se está logado via chamada ao servidor
async function isLoggedIn() {
  try {
    const res = await fetch(`${API_BASE}/auth/session`, { credentials: 'include' });
    if (!res.ok) {
      currentUserId = null;
      localStorage.removeItem('linguafire_userId');
      return false;
    }

    const session = await res.json();
    currentUserId = String(session.userId || currentUserId || '');
    if (currentUserId) {
      localStorage.setItem('linguafire_userId', currentUserId);
    }

    return true;
  } catch {
    currentUserId = null;
    localStorage.removeItem('linguafire_userId');
    return false;
  }
}

// Login com email/senha
async function login(email, password) {
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Erro ao fazer login');
    }

    // O token agora está no cookie HttpOnly
    currentUserId = data.user.id;
    localStorage.setItem('linguafire_userId', currentUserId);

    return data.user;
  } catch (error) {
    throw error;
  }
}

// Registro com email/senha
async function register(name, email, password) {
  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Erro ao criar conta');
    }

    // O token agora está no cookie HttpOnly
    currentUserId = data.user.id;
    localStorage.setItem('linguafire_userId', currentUserId);

    return data.user;
  } catch (error) {
    throw error;
  }
}

// Login com Google
function loginWithGoogle(mode = 'login') {
  // Para mode='link', o cookie HttpOnly é enviado automaticamente na requisição
  const params = new URLSearchParams();
  if (mode === 'link') {
    params.set('mode', 'link');
  }

  const query = params.toString();
  window.location.href = query ? `/auth/google?${query}` : '/auth/google';
}

async function linkGoogleAccount() {
  if (!await isLoggedIn()) {
    throw new Error('Faça login antes de vincular o Google');
  }

  loginWithGoogle('link');
}

// Logout
function logout() {
  clearAuthSession();
  localStorage.removeItem('linguafire_v2');
  window.location.reload();
}

// Buscar perfil do usuário
async function getProfile() {
  try {
    const res = await fetch(`${API_BASE}/profile`, {
      credentials: 'include'
    });

    if (res.status === 403 || res.status === 401) {
      // Sessão inválida/expirada — limpa sessão
      clearAuthSession();
      window.location.reload();
      throw new Error('Sessão expirada');
    }

    if (!res.ok) {
      throw new Error('Erro ao buscar perfil');
    }

    const data = await res.json();
    return data.user;
  } catch (error) {
    throw error;
  }
}

// Atualizar perfil
async function updateProfile(updates) {
  try {
    const res = await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(updates)
    });

    if (!res.ok) {
      throw new Error('Erro ao atualizar perfil');
    }

    return await res.json();
  } catch (error) {
    throw error;
  }
}

// Verificar se Google OAuth está configurado
async function isGoogleOAuthConfigured() {
  try {
    const res = await fetch(`${API_BASE}/auth/google/configured`);
    const data = await res.json();
    return data.configured;
  } catch {
    return false;
  }
}

// Sincronizar estado local com servidor
async function syncStateToServer() {
  if (!await isLoggedIn()) return;
  
  try {
    await updateProfile({
      name: state.name,
      level: state.level,
      xp: state.xp,
      streak: state.streak,
      correct_answers: state.totalCorrect,
      lessons_completed: state.totalLessons,
      english_level: state.englishLevel,
      achievements: state.achievements,
      favorites: state.favorites,
      theme: state.theme
    });
  } catch (e) {
    console.log('Erro ao sincronizar:', e);
  }
}

// Carregar estado do servidor
async function loadStateFromServer() {
  if (!await isLoggedIn()) return false;
  
  try {
    isHydratingFromServer = true;
    const user = await getProfile();
    currentUserId = String(user.id || currentUserId || '');
    if (currentUserId) {
      localStorage.setItem('linguafire_userId', currentUserId);
    }
    
    state.name = user.name || '';
    state.level = user.level || 1;
    state.xp = user.xp || 0;
    state.streak = user.streak || 0;
    state.totalCorrect = user.correct_answers || 0;
    state.totalLessons = user.lessons_completed || 0;
    state.englishLevel = user.english_level || '';
    state.achievements = user.achievements || [];
    state.favorites = user.favorites || [];
    state.googleLinked = !!user.google_linked;
    state.theme = user.theme || state.theme || 'default';
    state.subscriptionActive = !!user.subscription_active;
    state.subscriptionExpires = user.subscription_expires || 0;
    state.aiUsesToday = user.ai_uses_today || 0;
    
    if (typeof applyTheme === 'function') {
      applyTheme(state.theme, false);
    }

    saveState(false);
    return true;
  } catch (e) {
    console.log('Erro ao carregar do servidor:', e);
    return false;
  } finally {
    isHydratingFromServer = false;
  }
}

// Verificar callback do Google OAuth pela URL
async function checkGoogleCallback() {
  const params = new URLSearchParams(window.location.search);

  if (params.get('auth') === 'success') {
    const userId = params.get('userId');

    if (!userId) {
      // Token agora está no cookie HttpOnly - buscar sessão
      try {
        const res = await fetch(`${API_BASE}/auth/session`, { credentials: 'include' });
        if (res.ok) {
          const session = await res.json();
          currentUserId = String(session.userId);
        }
      } catch (_e) {}
    } else {
      currentUserId = userId;
    }

    if (currentUserId) {
      localStorage.setItem('linguafire_userId', currentUserId);
    }

    window.history.replaceState({}, document.title, window.location.pathname);
    return true;
  }

  if (params.get('google') === 'linked') {
    window.sessionStorage.setItem('linguafire_google_linked', '1');
    window.history.replaceState({}, document.title, window.location.pathname);
    return false;
  }

  if (params.get('error') === 'auth_failed') {
    alert('Falha na autenticação com Google. Tente novamente.');
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  if (params.get('error') === 'google_link_failed') {
    alert('Nao foi possivel vincular sua conta com Google.');
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  if (params.get('error') === 'google_already_linked') {
    alert('Essa conta Google ja esta vinculada a outro usuario.');
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  if (params.get('error') === 'google_oauth_not_configured') {
    alert('Login com Google indisponível no momento.');
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  return false;
}
