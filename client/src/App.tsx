import { FormEvent, useEffect, useState } from 'react';
import {
  getProfile,
  getSession,
  login,
  loginWithGoogle,
  logout,
  register,
  requestPasswordReset,
  resetPassword,
  type UserProfile
} from './services/auth';
import { HomeDashboard } from './components/HomeDashboard';
import { MusicTab } from './components/MusicTab';
import { FlashcardTab } from './components/FlashcardTab';
import { ConversationTab } from './components/ConversationTab';
import { ProfileTab } from './components/ProfileTab';
import { NativesTab } from './components/NativesTab';
import { ShopTab } from './components/ShopTab';
import { PlacementTab } from './components/PlacementTab';
import { LessonTab } from './components/LessonTab';

type Screen = 'splash' | 'login' | 'register' | 'forgot' | 'reset' | 'app';
type AppTab = 'home' | 'lessons' | 'music' | 'flashcard' | 'conversation' | 'natives' | 'shop' | 'placement' | 'profile';

const highlights = [
  { icon: '♪', title: 'Musicas', copy: 'Letra, traducao e quiz' },
  { icon: '*', title: 'Palavra do dia', copy: 'Vocabulario novo todo dia' },
  { icon: '"', title: 'Nativos', copy: 'Expressoes em contexto real' },
  { icon: '+', title: 'Progresso', copy: 'Sua conta guarda tudo' }
];

function AuthForm({
  mode,
  onAuthenticated,
  onBack,
  onForgot,
  onSwitch
}: {
  mode: 'login' | 'register';
  onAuthenticated: (user: UserProfile) => void;
  onBack: () => void;
  onForgot: () => void;
  onSwitch: () => void;
}) {
  const isLogin = mode === 'login';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Preencha email e senha.');
      return;
    }

    if (!isLogin && !name.trim()) {
      setError('Digite seu nome.');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('As senhas nao coincidem.');
      return;
    }

    try {
      setIsSubmitting(true);
      const user = isLogin
        ? await login(email.trim(), password)
        : await register(name.trim(), email.trim(), password);
      onAuthenticated(user);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Erro ao autenticar.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-screen">
      <div className="orb orb-one" />
      <div className="orb orb-two" />
      <form className="auth-panel" aria-label={isLogin ? 'Entrar na conta' : 'Criar conta'} onSubmit={handleSubmit}>
        <div className="brand-mark">LF</div>
        <h1>LinguaFire</h1>
        <p>{isLogin ? 'Entrar na sua conta' : 'Criar sua conta'}</p>

        {!isLogin && (
          <input
            className="field"
            type="text"
            placeholder="Seu nome"
            autoComplete="name"
            maxLength={20}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        )}
        <input
          className="field"
          type="email"
          placeholder="Seu email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <input
          className="field"
          type="password"
          placeholder={isLogin ? 'Sua senha' : 'Senha (min. 6 caracteres)'}
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {!isLogin && (
          <input
            className="field"
            type="password"
            placeholder="Confirmar senha"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        )}

        {error && <div className="form-error">{error}</div>}

        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Aguarde...' : isLogin ? 'Entrar' : 'Criar conta'}
        </button>
        {isLogin && (
          <button className="text-button" type="button" onClick={onForgot}>
            Esqueci minha senha
          </button>
        )}
        <button className="google-button" type="button" onClick={() => loginWithGoogle('login')}>
          <span>G</span>
          Entrar com Google
        </button>
        <button className="secondary-button" type="button" onClick={onSwitch}>
          {isLogin ? 'Criar conta gratuita' : 'Ja tenho conta'}
        </button>
        <button className="ghost-button" type="button" onClick={onBack}>
          Voltar
        </button>
      </form>
    </main>
  );
}

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [devResetLink, setDevResetLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setDevResetLink('');

    if (!email.trim()) {
      setError('Digite seu email.');
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await requestPasswordReset(email.trim());
      setMessage(result.message);
      setDevResetLink(result.resetLink || '');
      setEmail('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Erro ao enviar recuperacao.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-screen">
      <div className="orb orb-one" />
      <div className="orb orb-two" />
      <form className="auth-panel" aria-label="Recuperar senha" onSubmit={handleSubmit}>
        <div className="brand-mark">LF</div>
        <h1>LinguaFire</h1>
        <p>Recuperar senha</p>
        <input
          className="field"
          type="email"
          placeholder="Seu email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        {error && <div className="form-error">{error}</div>}
        {message && <div className="form-success">{message}</div>}
        {devResetLink && (
          <a className="dev-link" href={devResetLink}>
            Abrir link de desenvolvimento
          </a>
        )}
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Enviando...' : 'Enviar link'}
        </button>
        <button className="secondary-button" type="button" onClick={onBack}>
          Voltar ao login
        </button>
      </form>
    </main>
  );
}

function ResetPasswordForm({ token, onDone }: { token: string; onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!token) {
      setError('Token invalido. Solicite um novo link.');
      return;
    }

    if (password.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas nao coincidem.');
      return;
    }

    try {
      setIsSubmitting(true);
      await resetPassword(token, password);
      window.history.replaceState({}, '', '/');
      onDone();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Erro ao redefinir senha.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-screen">
      <div className="orb orb-one" />
      <div className="orb orb-two" />
      <form className="auth-panel" aria-label="Nova senha" onSubmit={handleSubmit}>
        <div className="brand-mark">LF</div>
        <h1>LinguaFire</h1>
        <p>Nova senha</p>
        <input
          className="field"
          type="password"
          placeholder="Nova senha"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <input
          className="field"
          type="password"
          placeholder="Confirmar nova senha"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
        {error && <div className="form-error">{error}</div>}
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Alterando...' : 'Alterar senha'}
        </button>
      </form>
    </main>
  );
}

const appTabs: Array<{ id: AppTab; label: string }> = [
  { id: 'home', label: 'Inicio' },
  { id: 'lessons', label: 'Licoes' },
  { id: 'music', label: 'Musica' },
  { id: 'flashcard', label: 'Flash' },
  { id: 'conversation', label: 'Conversar' },
  { id: 'natives', label: 'Nativos' },
  { id: 'shop', label: 'Loja' },
  { id: 'placement', label: 'Nível' },
  { id: 'profile', label: 'Perfil' }
];

function AppHome({
  user,
  onLogout,
  onProfileRefresh,
  onLoadProfile
}: {
  user: UserProfile;
  onLogout: () => void;
  onProfileRefresh: (user: UserProfile) => void;
  onLoadProfile: () => Promise<UserProfile>;
}) {
  const [activeTab, setActiveTab] = useState<AppTab>('home');

  return (
    <main className="app-screen">
      <nav className="topbar">
        <strong>LinguaFire</strong>
        <div className="app-nav" aria-label="Navegacao principal">
          {appTabs.map((tab) => (
            <button
              className={activeTab === tab.id ? 'active' : ''}
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button className="compact-button" type="button" onClick={onLogout}>
          Sair
        </button>
      </nav>

      {activeTab === 'home' && (
        <HomeDashboard user={user} onLoadProfile={onLoadProfile} onProfileRefresh={onProfileRefresh} />
      )}
      {activeTab === 'lessons' && (
        <LessonTab user={user} onProfileRefresh={onProfileRefresh} />
      )}
      {activeTab === 'music' && (
        <MusicTab user={user} onProfileRefresh={onProfileRefresh} />
      )}
      {activeTab === 'flashcard' && (
        <FlashcardTab user={user} onProfileRefresh={onProfileRefresh} />
      )}
      {activeTab === 'conversation' && (
        <ConversationTab user={user} onProfileRefresh={onProfileRefresh} />
      )}
      {activeTab === 'natives' && <NativesTab />}
      {activeTab === 'shop' && <ShopTab user={user} onProfileRefresh={onProfileRefresh} />}
      {activeTab === 'placement' && <PlacementTab user={user} onProfileRefresh={onProfileRefresh} />}
      {activeTab === 'profile' && <ProfileTab user={user} onProfileRefresh={onProfileRefresh} />}
    </main>
  );
}

export function App() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [resetToken, setResetToken] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function boot() {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token') || '';
        const isResetRoute = window.location.pathname.replace(/\/+$/, '').endsWith('/reset-password');
        if (token && isResetRoute) {
          setResetToken(token);
          setScreen('reset');
          return;
        }

        const session = await getSession();
        if (!session) return;

        const profile = await getProfile();
        if (!isMounted) return;
        setUser(profile);
        setScreen('app');
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsBooting(false);
        }
      }
    }

    boot();
    return () => {
      isMounted = false;
    };
  }, []);

  function handleAuthenticated(nextUser: UserProfile) {
    setUser(nextUser);
    setScreen('app');
  }

  async function handleLogout() {
    await logout();
    setUser(null);
    setScreen('splash');
  }

  if (isBooting) {
    return (
      <main className="splash-screen">
        <section className="hero">
          <div className="brand-mark">LF</div>
          <h1>LinguaFire</h1>
          <p className="lead">Carregando sua sessao...</p>
        </section>
      </main>
    );
  }

  if (screen === 'app' && user) {
    return (
      <AppHome
        user={user}
        onLogout={handleLogout}
        onLoadProfile={getProfile}
        onProfileRefresh={(nextUser) => setUser(nextUser)}
      />
    );
  }

  if (screen === 'forgot') {
    return <ForgotPasswordForm onBack={() => setScreen('login')} />;
  }

  if (screen === 'reset') {
    return <ResetPasswordForm token={resetToken} onDone={() => setScreen('login')} />;
  }

  if (screen === 'login') {
    return (
      <AuthForm
        mode="login"
        onAuthenticated={handleAuthenticated}
        onBack={() => setScreen('splash')}
        onForgot={() => setScreen('forgot')}
        onSwitch={() => setScreen('register')}
      />
    );
  }

  if (screen === 'register') {
    return (
      <AuthForm
        mode="register"
        onAuthenticated={handleAuthenticated}
        onBack={() => setScreen('splash')}
        onForgot={() => setScreen('forgot')}
        onSwitch={() => setScreen('login')}
      />
    );
  }

  return (
    <main className="splash-screen">
      <div className="orb orb-one" />
      <div className="orb orb-two" />
      <div className="orb orb-three" />

      <section className="hero" aria-labelledby="hero-title">
        <div className="brand-mark">LF</div>
        <h1 id="hero-title">LinguaFire</h1>
        <p className="kicker">Ingles que vicia</p>
        <h2>
          Aprenda ingles com <span>musica</span>, contexto real e pratica diaria
        </h2>
        <p className="lead">
          Uma experiencia em React + TypeScript para estudar com licoes curtas, musica, flashcards, conversas e contexto real.
        </p>

        <div className="highlight-grid">
          {highlights.map((item) => (
            <article className="highlight-card" key={item.title}>
              <span>{item.icon}</span>
              <strong>{item.title}</strong>
              <small>{item.copy}</small>
            </article>
          ))}
        </div>

        <div className="actions">
          <button className="primary-button" type="button" onClick={() => setScreen('login')}>
            Comecar agora
          </button>
          <button className="secondary-button" type="button" onClick={() => setScreen('register')}>
            Criar conta
          </button>
        </div>
      </section>
    </main>
  );
}
