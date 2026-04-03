// ==================== SERVIÇO DE AUTENTICAÇÃO ====================
const API_BASE = '/api';

// Armazenar token e userId
let authToken = localStorage.getItem('linguafire_token');
let currentUserId = localStorage.getItem('linguafire_userId');

// Headers para requests autenticados
function getAuthHeaders() {
  return authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
}

// Verificar se está logado
function isLoggedIn() {
  return !!authToken;
}

// Login com email/senha
async function login(email, password) {
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao fazer login');
    }
    
    // Salvar token
    authToken = data.token;
    currentUserId = data.user.id;
    localStorage.setItem('linguafire_token', authToken);
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
      body: JSON.stringify({ name, email, password })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao criar conta');
    }
    
    // Salvar token
    authToken = data.token;
    currentUserId = data.user.id;
    localStorage.setItem('linguafire_token', authToken);
    localStorage.setItem('linguafire_userId', currentUserId);
    
    return data.user;
  } catch (error) {
    throw error;
  }
}

// Login com Google
function loginWithGoogle() {
  window.location.href = '/auth/google';
}

// Logout
function logout() {
  authToken = null;
  currentUserId = null;
  localStorage.removeItem('linguafire_token');
  localStorage.removeItem('linguafire_userId');
  localStorage.removeItem('linguafire_v2');
  window.location.reload();
}

// Buscar perfil do usuário
async function getProfile() {
  try {
    const res = await fetch(`${API_BASE}/profile`, {
      headers: getAuthHeaders()
    });
    
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
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
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
  if (!isLoggedIn()) return;
  
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
      favorites: state.favorites
    });
  } catch (e) {
    console.log('Erro ao sincronizar:', e);
  }
}

// Carregar estado do servidor
async function loadStateFromServer() {
  if (!isLoggedIn()) return false;
  
  try {
    const user = await getProfile();
    
    state.name = user.name || '';
    state.level = user.level || 1;
    state.xp = user.xp || 0;
    state.streak = user.streak || 0;
    state.totalCorrect = user.correct_answers || 0;
    state.totalLessons = user.lessons_completed || 0;
    state.englishLevel = user.english_level || '';
    state.achievements = user.achievements || [];
    state.favorites = user.favorites || [];
    
    saveState();
    return true;
  } catch (e) {
    console.log('Erro ao carregar do servidor:', e);
    return false;
  }
}

// Verificar callback do Google OAuth pela URL
function checkGoogleCallback() {
  const params = new URLSearchParams(window.location.search);
  
  if (params.get('auth') === 'success') {
    const token = params.get('token');
    const userId = params.get('userId');
    
    if (token && userId) {
      authToken = token;
      currentUserId = userId;
      localStorage.setItem('linguafire_token', authToken);
      localStorage.setItem('linguafire_userId', currentUserId);
      
      // Limpar URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      return true;
    }
  }
  
  if (params.get('error') === 'auth_failed') {
    alert('Falha na autenticação com Google. Tente novamente.');
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  
  return false;
}