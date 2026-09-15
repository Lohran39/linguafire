import { AuthForm, ForgotPasswordForm, ResetPasswordForm } from './components/AuthForms';
import { StudyGuide } from './components/StudyGuide';
import { TabContent } from './components/TabContent';
const AdminTab = lazy(() => import('./components/AdminTab').then(module => ({ default: module.AdminTab })));
import { ActivityProgress, useActivityState, useSaveBeforeLeave } from './hooks/activity-progress';
import { lazy, useEffect, useState } from 'react';
import { getProfile } from './services/profile';
import { getSession, logout, type UserProfile } from './services/auth';
import { HomeDashboard } from './components/HomeDashboard';
const MusicTab = lazy(() => import('./components/MusicTab').then(module => ({ default: module.MusicTab })));
const FlashcardTab = lazy(() => import('./components/FlashcardTab').then(module => ({ default: module.FlashcardTab })));
const ConversationTab = lazy(() => import('./components/ConversationTab').then(module => ({ default: module.ConversationTab })));
const ProfileTab = lazy(() => import('./components/ProfileTab').then(module => ({ default: module.ProfileTab })));
const NativesTab = lazy(() => import('./components/NativesTab').then(module => ({ default: module.NativesTab })));
const ShopTab = lazy(() => import('./components/ShopTab').then(module => ({ default: module.ShopTab })));
const PlacementTab = lazy(() => import('./components/PlacementTab').then(module => ({ default: module.PlacementTab })));
const LessonTab = lazy(() => import('./components/LessonTab').then(module => ({ default: module.LessonTab })));

type Screen = 'splash' | 'login' | 'register' | 'forgot' | 'reset' | 'verify' | 'app';
type AppTab = 'home' | 'lessons' | 'music' | 'flashcard' | 'conversation' | 'natives' | 'shop' | 'placement' | 'profile' | 'admin';

const highlights = [
  { icon: '♪', title: 'Musicas', copy: 'Letra, traducao e quiz' },
  { icon: '*', title: 'Palavra do dia', copy: 'Vocabulario novo todo dia' },
  { icon: '"', title: 'Nativos', copy: 'Expressoes em contexto real' },
  { icon: '+', title: 'Progresso', copy: 'Sua conta guarda tudo' }
];

const appTabs: Array<{ id: AppTab; label: string }> = [
  { id: 'home', label: 'Início' },
  { id: 'lessons', label: 'Lições' },
  { id: 'music', label: 'Música' },
  { id: 'flashcard', label: 'Revisão' },
  { id: 'conversation', label: 'Conversar' },
  { id: 'natives', label: 'Nativos' },
  { id: 'shop', label: 'Loja' },
  { id: 'placement', label: 'Nível' },
  { id: 'profile', label: 'Perfil' },
  { id: 'admin', label: 'Admin' }
];

function AppHome({
  user,
  initialTab = 'home',
  onLogout,
  onProfileRefresh,
  onLoadProfile
}: {
  user: UserProfile;
  initialTab?: AppTab;
  onLogout: () => void;
  onProfileRefresh: (user: UserProfile) => void;
  onLoadProfile: () => Promise<UserProfile>;
}) {
  const [activeTab, setActiveTab] = useActivityState<AppTab>('navigation', 'activeTab', initialTab);
  const [lastStudyTab, setLastStudyTab] = useActivityState<AppTab>('navigation', 'lastStudyTab', 'lessons');
  useEffect(() => {
    if (['lessons', 'music', 'flashcard', 'conversation', 'natives', 'placement'].includes(activeTab)) setLastStudyTab(activeTab);
  }, [activeTab, setLastStudyTab]);
  useEffect(() => {
    if (user.role === 'admin') return;
    const record = () => {
      if (document.visibilityState !== 'visible') return;
      void fetch('/api/product/usage', { method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feature: activeTab }) }).catch(() => {});
    };
    record();
    document.addEventListener('visibilitychange', record);
    return () => document.removeEventListener('visibilitychange', record);
  }, [activeTab, user.id, user.role]);
  useEffect(() => {
    document.querySelector('.app-nav [aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeTab]);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('billing') !== 'return') return;
    setActiveTab('profile');
    url.searchParams.delete('billing');
    url.searchParams.delete('checkout');
    window.history.replaceState({}, '', url);
  }, [setActiveTab]);

  const saveBeforeLeave = useSaveBeforeLeave();
  const visibleTabs = appTabs.filter(tab => tab.id !== 'admin' || user.role === 'admin');
  function navigate(tab: AppTab) {
    setActiveTab(tab);
    requestAnimationFrame(() => document.getElementById('activity-content')?.focus());
  }

  return (
    <main className="app-screen">
      <a className="skip-link" href="#activity-content">Pular para a atividade</a>
      <nav className="topbar">
        <strong>LinguaFire</strong>
        <div className="app-nav" aria-label="Navegacao principal">
          {visibleTabs.map((tab) => (
            <button
              className={activeTab === tab.id ? 'active' : ''}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              key={tab.id}
              type="button"
              onClick={() => navigate(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button className="compact-button" type="button" onClick={async () => { if (await saveBeforeLeave()) onLogout(); }}>
          Sair
        </button>
      </nav>

      <div id="activity-content" tabIndex={-1}>
      <StudyGuide key={`guide-${activeTab}`} tab={activeTab} level={user.english_level || 'A1'} assessed={Boolean(user.placement_completed)} />
      <TabContent key={activeTab} label={appTabs.find(tab => tab.id === activeTab)?.label || activeTab}>
      {activeTab === 'home' && (
        <HomeDashboard user={user} onLoadProfile={onLoadProfile} onProfileRefresh={onProfileRefresh} onNavigate={navigate} lastStudyTab={lastStudyTab} />
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
      {activeTab === 'natives' && <NativesTab user={user} onProfileRefresh={onProfileRefresh} />}
      {activeTab === 'shop' && <ShopTab user={user} onProfileRefresh={onProfileRefresh} />}
      {activeTab === 'placement' && (
        <PlacementTab user={user} onProfileRefresh={onProfileRefresh} onContinue={() => setActiveTab('lessons')} />
      )}
      {activeTab === 'admin' && (user.role === 'admin' ? <AdminTab /> : <p role="alert">Acesso restrito ao administrador.</p>)}
      {activeTab === 'profile' && <ProfileTab user={user} onProfileRefresh={onProfileRefresh} onPlacement={() => navigate('placement')} />}
      </TabContent>
      </div>
    </main>
  );
}

export function App() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [initialAppTab, setInitialAppTab] = useState<AppTab>('home');
  const [resetToken, setResetToken] = useState('');
  const [authNotice, setAuthNotice] = useState('');

  useEffect(() => {
    function openConfirmation() {
      const token = new URLSearchParams(window.location.hash.slice(1)).get('confirm-email');
      if (token) { setResetToken(token); setScreen('verify'); }
    }
    window.addEventListener('hashchange', openConfirmation);
    return () => window.removeEventListener('hashchange', openConfirmation);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function boot() {
      try {
        const params = new URLSearchParams(window.location.search);
        const confirmationToken = new URLSearchParams(window.location.hash.slice(1)).get('confirm-email');
        if (confirmationToken) {
          setResetToken(confirmationToken);
          setScreen('verify');
          return;
        }
        const token = params.get('token') || '';
        const isResetRoute = window.location.pathname.replace(/\/+$/, '').endsWith('/reset-password');
        if (token && isResetRoute) {
          setResetToken(token);
          setScreen('reset');
          return;
        }

        const authError = params.get('error') || '';
        const confirmationMessages: Record<string, string> = {
          email_verification_invalid: 'Link inválido ou já utilizado. Entre ou solicite uma nova confirmação.',
          email_verification_expired: 'O link expirou. Digite seu e-mail e solicite uma nova confirmação.',
          email_verification_failed: 'Não foi possível confirmar. Tente entrar ou solicite um novo link.',
          email_confirmation_required: 'Confirme seu e-mail antes de entrar. Se não criou esta conta, redefina sua senha também.'
        };
        if (confirmationMessages[authError] || params.get('auth') === 'email_verified') {
          setAuthNotice(confirmationMessages[authError] || 'E-mail confirmado! Entre com sua senha para começar.');
          setScreen('login');
          window.history.replaceState({}, '', '/');
        } else if (authError === 'google_oauth_not_configured') {
          setAuthNotice('Login com Google ainda nao esta configurado.');
          window.history.replaceState({}, '', '/');
        } else if (authError === 'auth_failed') {
          setAuthNotice('Nao foi possivel entrar com Google.');
          window.history.replaceState({}, '', '/');
        } else if (authError === 'google_link_failed') {
          setAuthNotice('Nao foi possivel vincular sua conta Google.');
          window.history.replaceState({}, '', '/');
        } else if (authError === 'google_already_linked') {
          setAuthNotice('Esta conta Google ja esta vinculada a outro usuario.');
          window.history.replaceState({}, '', '/');
        } else if (params.get('auth') === 'success') {
          if (params.get('placement') === '1') {
            setInitialAppTab('placement');
          }
          window.history.replaceState({}, '', '/');
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

  function handleAuthenticated(nextUser: UserProfile, openPlacement = false) {
    setUser(nextUser);
    setInitialAppTab(openPlacement ? 'placement' : 'home');
    setScreen('app');
  }

  async function handleLogout() {
    await logout();
    setUser(null);
    setInitialAppTab('home');
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
      <ActivityProgress key={user.id} userId={user.id}>
      <AppHome
        user={user}
        initialTab={initialAppTab}
        onLogout={handleLogout}
        onLoadProfile={getProfile}
        onProfileRefresh={(nextUser) => setUser(nextUser)}
      />
      </ActivityProgress>
    );
  }

  if (screen === 'forgot') {
    return <ForgotPasswordForm onBack={() => setScreen('login')} />;
  }

  if (screen === 'reset') {
    return <ResetPasswordForm token={resetToken} onDone={() => setScreen('login')} />;
  }

  if (screen === 'verify') {
    return <ResetPasswordForm verifying token={resetToken} onDone={() => { setAuthNotice('Entre com sua senha. Se o link expirou, solicite uma nova confirmação.'); setScreen('login'); }} />;
  }

  if (screen === 'login') {
    return (
      <AuthForm
        mode="login"
        notice={authNotice}
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
      <div className="splash-flag splash-flag-uk" aria-hidden="true">
        <span />
      </div>
      <div className="splash-flag splash-flag-us" aria-hidden="true">
        <span />
      </div>

      <section className="hero" aria-labelledby="hero-title">
        <div className="brand-mark">LF</div>
        <h1 id="hero-title">LinguaFire</h1>
        <p className="kicker">Inglês que vicia</p>
        <h2>
          Aprenda inglês com <span>música</span>, contexto real e prática diária
        </h2>
        <p className="lead">
          Uma experiência interativa de aprendizado: estude através de lições curtas, recursos musicais, flashcards e diálogos reais.
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
            Começar agora
          </button>
        </div>
        {authNotice && <div className="form-error">{authNotice}</div>}
      </section>
    </main>
  );
}
