import { useState, type FormEvent } from 'react';
import { login, register, loginWithGoogle, requestPasswordReset, resetPassword, confirmEmail, type UserProfile } from '../services/auth';

export function AuthForm({
  mode,
  notice = '',
  onAuthenticated,
  onBack,
  onForgot,
  onSwitch
}: {
  mode: 'login' | 'register';
  notice?: string;
  onAuthenticated: (user: UserProfile, openPlacement?: boolean) => void;
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
      onAuthenticated(user, !isLogin);
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
        <p>{isLogin ? 'Vamos nessa! Entra na tua conta' : 'Vamos nessa! Cria tua conta'}</p>

        {!isLogin && (
          <input
            className="field"
            type="text"
            placeholder="Nome"
            autoComplete="name"
            maxLength={20}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        )}
        <input
          className="field"
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <input
          className="field"
          type="password"
          placeholder={isLogin ? 'Senha' : 'Senha (min. 6 caracteres)'}
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

        {notice && <p className="auth-message" role="status">{notice}</p>}
        {error && <div className="form-error" role="alert">{error}</div>}

        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Aguarde...' : isLogin ? 'Entrar' : 'Criar conta'}
        </button>
        {isLogin && (
          <button className="text-button" type="button" onClick={onForgot}>
            Esqueci minha senha
          </button>
        )}
        {isLogin && <button className="google-button" type="button" onClick={() => loginWithGoogle('login')}>
          <img src="/assets/google-g.svg" alt="" aria-hidden="true" />
          Entrar com Google
        </button>}
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

export function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
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

export function ResetPasswordForm({ token, onDone, verifying = false }: { token: string; onDone: () => void; verifying?: boolean }) {
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
      if (verifying) await confirmEmail(token, password);
      else await resetPassword(token, password);
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
      <form className={verifying ? 'auth-panel confirmation-panel' : 'auth-panel'} aria-label="Nova senha" onSubmit={handleSubmit}>
        <div className="brand-mark">LF</div>
        <h1>{verifying ? 'Confirmar e-mail' : 'LinguaFire'}</h1>
        <p>{verifying ? 'Confirme seu e-mail e defina sua senha de acesso. Pode usar a mesma do cadastro.' : 'Nova senha'}</p>
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
          {isSubmitting ? 'Aguarde...' : verifying ? 'Confirmar e-mail e senha' : 'Alterar senha'}
        </button>
        {verifying && <button className="text-button" type="button" onClick={() => { window.history.replaceState({}, '', '/'); onDone(); }}>Voltar ao login</button>}
      </form>
    </main>
  );
}

