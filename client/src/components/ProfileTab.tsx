import { FormEvent, useEffect, useRef, useState } from 'react';
import { changePassword, deleteAccount, loginWithGoogle, requestPasswordReset, updateProfile, type UserProfile } from '../services/auth';
import { getPushStatus, subscribeToPush, supportsPushNotifications, unsubscribeFromPush } from '../services/notifications';
import { applyTheme, normalizeTheme, themeOptions, type Theme } from '../theme';
import { SubscriptionPanel } from './SubscriptionPanel';

type Section = 'name' | 'theme' | 'push' | 'password' | 'delete';
type Notice = { kind: 'success' | 'error'; text: string };
type Props = { user: UserProfile; onProfileRefresh: (user: UserProfile) => void; onPlacement: () => void };
function Feedback({ notice }: { notice?: Notice }) {
  return notice ? <p className={`form-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.text}</p> : null;
}

export function ProfileTab({ user, onProfileRefresh, onPlacement }: Props) {
  const latest = useRef(user); latest.current = user;
  const [name, setName] = useState(user.name || '');
  const [theme, setTheme] = useState<Theme>(normalizeTheme(user.theme));
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [notices, setNotices] = useState<Partial<Record<Section, Notice>>>({});
  const [busy, setBusy] = useState<Partial<Record<Section, boolean>>>({});
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushState, setPushState] = useState<'loading' | 'ready' | 'error'>('loading');
  const pushSupported = supportsPushNotifications();
  const passwordless = user.has_password === false;
  const setNotice = (section: Section, kind: Notice['kind'], text: string) => setNotices(previous => ({ ...previous, [section]: { kind, text } }));
  const begin = (section: Section) => {
    setNotices(previous => ({ ...previous, [section]: undefined }));
    setBusy(previous => ({ ...previous, [section]: true }));
  };
  const end = (section: Section) => setBusy(previous => ({ ...previous, [section]: false }));
  const fail = (section: Section, error: unknown, fallback: string) => setNotice(section, 'error', error instanceof Error ? error.message : fallback);

  useEffect(() => { setName(user.name || ''); setNotices({}); }, [user.id]);
  useEffect(() => { setTheme(applyTheme(user.theme)); }, [user.id, user.theme]);
  useEffect(() => {
    let active = true;
    if (!pushSupported) { setPushState('ready'); return; }
    setPushState('loading');
    getPushStatus().then(subscribed => {
      if (active) { setPushSubscribed(subscribed); setPushState('ready'); }
    }).catch(() => { if (active) setPushState('error'); });
    return () => { active = false; };
  }, [user.id, pushSupported]);

  async function saveName(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) { setNotice('name', 'error', 'Digite um nome.'); return; }
    begin('name');
    try {
      await updateProfile({ name: name.trim() });
      onProfileRefresh({ ...latest.current, name: name.trim() });
      setNotice('name', 'success', 'Nome atualizado.');
    } catch (error) { fail('name', error, 'Não foi possível salvar o nome.'); }
    finally { end('name'); }
  }

  async function selectTheme(next: Theme) {
    if (next === theme || busy.theme) return;
    const previous = theme;
    begin('theme'); setTheme(next); applyTheme(next);
    try {
      await updateProfile({ theme: next });
      onProfileRefresh({ ...latest.current, theme: next });
      setNotice('theme', 'success', 'Aparência atualizada.');
    } catch (error) { setTheme(previous); applyTheme(previous); fail('theme', error, 'Não foi possível salvar a aparência.'); }
    finally { end('theme'); }
  }

  async function togglePush() {
    begin('push');
    try {
      if (pushState === 'error') {
        setPushSubscribed(await getPushStatus()); setPushState('ready'); return;
      }
      if (pushSubscribed) await unsubscribeFromPush();
      else await subscribeToPush();
      setPushSubscribed(!pushSubscribed);
      setNotice('push', 'success', pushSubscribed ? 'Notificações desativadas.' : 'Notificações ativadas.');
    } catch (error) { fail('push', error, 'Não foi possível alterar as notificações.'); }
    finally { end('push'); }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    if (newPassword.length < 6) { setNotice('password', 'error', 'Use pelo menos 6 caracteres.'); return; }
    if (newPassword !== confirmPassword) { setNotice('password', 'error', 'A confirmação da nova senha não confere.'); return; }
    begin('password');
    try {
      setNotice('password', 'success', await changePassword(currentPassword, newPassword));
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (error) { fail('password', error, 'Não foi possível alterar a senha.'); }
    finally { end('password'); }
  }

  async function createPassword() {
    begin('password');
    try {
      const result = await requestPasswordReset(user.email);
      setNotice('password', 'success', result.message + ' Abra o link para definir sua senha.');
    } catch (error) { fail('password', error, 'Não foi possível enviar o link.'); }
    finally { end('password'); }
  }

  async function removeAccount(event: FormEvent) {
    event.preventDefault();
    if (deleteConfirm !== user.email || busy.delete) return;
    begin('delete');
    try { await deleteAccount(); window.location.reload(); }
    catch (error) { fail('delete', error, 'Não foi possível excluir a conta.'); end('delete'); }
  }

  return <section className="profile-layout profile-compact" aria-label="Perfil">
    <header className="profile-hero profile-identity">
      <span className="profile-avatar" aria-hidden="true">{user.name?.trim().slice(0, 1).toUpperCase() || 'L'}</span>
      <div><p className="kicker">Meu perfil</p><h1>{user.name || 'Estudante'}</h1><p className="profile-email">{user.email}</p></div>
      {user.placement_completed ? <span className="profile-level">Inglês {user.english_level}</span>
        : <button className="secondary-button" onClick={onPlacement}>Descobrir meu nível</button>}
    </header>

    <dl className="profile-study-summary" aria-label="Resumo de estudo">
      <div><dt>Lições</dt><dd>{user.lessons_completed || 0}</dd></div>
      <div><dt>Dias de sequência</dt><dd>{user.streak || 0}</dd></div>
      <div><dt>XP</dt><dd>{(user.xp || 0).toLocaleString('pt-BR')}</dd></div>
    </dl>

    <SubscriptionPanel user={user} onProfileRefresh={onProfileRefresh} />

    <div className="profile-preferences">
      <details className="profile-disclosure">
        <summary>Meus dados</summary>
        <form className="profile-section-body" onSubmit={saveName}>
          <label>Nome<input className="field" autoComplete="name" maxLength={20} value={name} onChange={event => setName(event.target.value)} /></label>
          <button className="primary-button" disabled={busy.name || name.trim() === user.name} type="submit">{busy.name ? 'Salvando...' : 'Salvar nome'}</button>
          <Feedback notice={notices.name} />
        </form>
      </details>

      <details className="profile-disclosure">
        <summary>Aparência</summary>
        <div className="profile-section-body">
          <fieldset className="profile-theme-options" disabled={busy.theme}>
            <legend>Escolha seu tema</legend>
            {themeOptions.map(option => <label className={`profile-theme-choice${theme === option.id ? ' selected' : ''}`} key={option.id}>
              <input type="radio" name="profile-theme" value={option.id} checked={theme === option.id} onChange={() => void selectTheme(option.id)} />
              <span className={`theme-swatch theme-swatch-${option.id}`} aria-hidden="true" />
              <span><strong>{option.label}</strong><small>{option.description}</small></span>
            </label>)}
          </fieldset>
          <Feedback notice={notices.theme} />
        </div>
      </details>

      <details className="profile-disclosure">
        <summary>Notificações</summary>
        <div className="profile-section-body">
          <p>{!pushSupported ? 'Este navegador não oferece notificações. Tente usar um navegador compatível ou o site instalado na Tela de Início.'
            : pushState === 'loading' ? 'Consultando suas notificações...'
            : pushState === 'error' ? 'Não foi possível consultar suas notificações.'
            : pushSubscribed ? 'As notificações estão ativadas.' : 'Ative para receber lembretes de estudo.'}</p>
          {pushSupported && <button className="secondary-button" disabled={busy.push || pushState === 'loading'} onClick={togglePush}>
            {busy.push ? 'Aguarde...' : pushState === 'error' ? 'Tentar novamente' : pushSubscribed ? 'Desativar notificações' : 'Ativar notificações'}
          </button>}
          <Feedback notice={notices.push} />
        </div>
      </details>

      <details className="profile-disclosure">
        <summary>Segurança</summary>
        <div className="profile-section-body">
          {user.google_linked ? <p className="profile-connected">Google conectado</p>
            : <button className="secondary-button" onClick={() => loginWithGoogle('link')}>Vincular Google</button>}
          {passwordless ? <div>
            <p>Sua conta ainda não tem senha. Receba um link por e-mail para definir uma e também entrar com e-mail e senha.</p>
            <button className="secondary-button" disabled={busy.password} onClick={createPassword}>{busy.password ? 'Enviando...' : 'Criar senha por e-mail'}</button>
          </div> : <form className="profile-password-form" onSubmit={savePassword}>
            <label>Senha atual<input className="field" type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} /></label>
            <label>Nova senha<input className="field" type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} /></label>
            <label>Confirmar nova senha<input className="field" type="password" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} /></label>
            <button className="primary-button" disabled={busy.password || !currentPassword || !newPassword} type="submit">{busy.password ? 'Alterando...' : 'Alterar senha'}</button>
          </form>}
          <Feedback notice={notices.password} />
        </div>
      </details>

      <details className="profile-disclosure profile-delete">
        <summary>Excluir conta</summary>
        <form className="profile-section-body" onSubmit={removeAccount}>
          <p>A exclusão da conta e do progresso é permanente. Para confirmar, digite seu e-mail: <strong>{user.email}</strong>.</p>
          <label>E-mail de confirmação<input className="field" autoComplete="off" type="email" value={deleteConfirm} onChange={event => setDeleteConfirm(event.target.value)} /></label>
          <button className="secondary-button danger-button" disabled={busy.delete || deleteConfirm !== user.email} type="submit">{busy.delete ? 'Excluindo...' : 'Excluir minha conta'}</button>
          <Feedback notice={notices.delete} />
        </form>
      </details>
    </div>
  </section>;
}
