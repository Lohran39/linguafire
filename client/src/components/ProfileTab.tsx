import { FormEvent, useEffect, useState } from 'react';
import {
  cancelSubscription,
  changePassword,
  createSubscription,
  deleteAccount,
  getSubscriptionStatus,
  loginWithGoogle,
  updateProfile,
  type UserProfile
} from '../services/auth';
import { getPushStatus, subscribeToPush, supportsPushNotifications, unsubscribeFromPush } from '../services/notifications';
import { applyTheme, normalizeTheme, themeOptions, type Theme } from '../theme';

type ProfileTabProps = {
  user: UserProfile;
  onProfileRefresh: (user: UserProfile) => void;
};

export function ProfileTab({ user, onProfileRefresh }: ProfileTabProps) {
  const [name, setName] = useState(user.name || '');
  const [theme, setTheme] = useState<Theme>(normalizeTheme(user.theme));
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [notice, setNotice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [subscription, setSubscription] = useState({
    active: Boolean(user.subscription_active),
    expires: Number(user.subscription_expires || 0),
    plan: user.subscription_active ? 'monthly' : null as string | null,
    price: 15
  });
  const [subscriptionBusy, setSubscriptionBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    setName(user.name || '');
  }, [user.id]);

  useEffect(() => {
    setTheme(applyTheme(user.theme));
  }, [user.id, user.theme]);

  useEffect(() => {
    let isMounted = true;

    async function loadAccountStatus() {
      if (!supportsPushNotifications()) return;
      try {
        const subscribed = await getPushStatus();
        if (isMounted) setPushSubscribed(subscribed);
      } catch {
        if (isMounted) setPushSubscribed(false);
      }
    }

    async function loadSubscription() {
      try {
        const status = await getSubscriptionStatus();
        if (isMounted) setSubscription(status);
      } catch {
        if (isMounted) {
          setSubscription({
            active: Boolean(user.subscription_active),
            expires: Number(user.subscription_expires || 0),
            plan: user.subscription_active ? 'monthly' : null,
            price: 15
          });
        }
      }
    }

    loadAccountStatus();
    loadSubscription();
    return () => {
      isMounted = false;
    };
  }, [user.subscription_active, user.subscription_expires]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');

    if (!name.trim()) {
      setNotice('Digite um nome.');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({ name: name.trim() });
      onProfileRefresh({ ...user, name: name.trim() });
      setNotice('Perfil atualizado.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Erro ao atualizar perfil.');
    } finally {
      setIsSaving(false);
    }
  }

  async function selectTheme(nextTheme: Theme) {
    if (nextTheme === theme || isSavingTheme) return;

    const previousTheme = theme;
    setNotice('');
    setTheme(nextTheme);
    applyTheme(nextTheme);
    onProfileRefresh({ ...user, theme: nextTheme });

    try {
      setIsSavingTheme(true);
      await updateProfile({ theme: nextTheme });
      setNotice('Tema atualizado.');
    } catch (error) {
      setTheme(previousTheme);
      applyTheme(previousTheme);
      onProfileRefresh({ ...user, theme: previousTheme });
      setNotice(error instanceof Error ? error.message : 'Erro ao atualizar tema.');
    } finally {
      setIsSavingTheme(false);
    }
  }

  async function togglePush() {
    setNotice('');
    setPushBusy(true);

    try {
      if (pushSubscribed) {
        await unsubscribeFromPush();
        setPushSubscribed(false);
        setNotice('Notificacoes desativadas.');
      } else {
        await subscribeToPush();
        setPushSubscribed(true);
        setNotice('Notificacoes ativadas.');
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Erro ao alterar notificacoes.');
    } finally {
      setPushBusy(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');

    if (newPassword.length < 6) {
      setNotice('A nova senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setNotice('A confirmacao da nova senha nao confere.');
      return;
    }

    try {
      setIsChangingPassword(true);
      const message = await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotice(message);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Erro ao alterar senha.');
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function toggleSubscription() {
    setNotice('');
    setSubscriptionBusy(true);

    try {
      if (subscription.active) {
        await cancelSubscription();
        setSubscription({ active: false, expires: 0, plan: null, price: 15 });
        onProfileRefresh({ ...user, subscription_active: false, subscription_expires: 0 });
        setNotice('Assinatura cancelada.');
      } else {
        const nextSubscription = await createSubscription();
        setSubscription(nextSubscription);
        onProfileRefresh({ ...user, subscription_active: true, subscription_expires: nextSubscription.expires });
        setNotice('Assinatura ativada.');
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Erro ao atualizar assinatura.');
    } finally {
      setSubscriptionBusy(false);
    }
  }

  async function handleDeleteAccount() {
    setNotice('');
    if (deleteConfirm !== user.email) {
      setNotice('Digite seu email para confirmar exclusao da conta.');
      return;
    }

    try {
      setDeleteBusy(true);
      await deleteAccount();
      window.location.reload();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Erro ao excluir conta.');
      setDeleteBusy(false);
    }
  }

  const subscriptionExpires = subscription.expires
    ? new Intl.DateTimeFormat('pt-BR').format(new Date(subscription.expires))
    : 'Sem assinatura ativa';

  return (
    <section className="profile-layout" aria-label="Perfil">
      <header className="profile-hero">
        <p className="kicker">Perfil</p>
        <h1>{user.name || 'Estudante'}</h1>
        <p className="lead">Gerencie sua conta e confira o progresso principal ja vindo do backend.</p>
      </header>

      <section className="profile-grid">
        <div>
          <span>Email</span>
          <strong>{user.email}</strong>
        </div>
        <div>
          <span>Nivel de ingles</span>
          <strong>{user.english_level || 'A1'}</strong>
        </div>
        <div>
          <span>XP</span>
          <strong>{user.xp || 0}</strong>
        </div>
        <div>
          <span>Sequencia</span>
          <strong>{user.streak || 0}</strong>
        </div>
        <div>
          <span>Acertos</span>
          <strong>{user.correct_answers || 0}</strong>
        </div>
        <div>
          <span>Licoes</span>
          <strong>{user.lessons_completed || 0}</strong>
        </div>
      </section>

      <form className="profile-settings" onSubmit={handleSubmit}>
        <div className="panel-heading">
          <h2>Conta</h2>
          <span>{isSavingTheme ? 'salvando' : themeOptions.find((option) => option.id === theme)?.label || 'Fogo'}</span>
        </div>

        <label>
          <span>Nome</span>
          <input className="field" maxLength={20} value={name} onChange={(event) => setName(event.target.value)} />
        </label>

        <div className="theme-picker" role="radiogroup" aria-label="Tema">
          {themeOptions.map((option) => (
            <button
              aria-checked={theme === option.id}
              className={theme === option.id ? 'theme-option active' : 'theme-option'}
              disabled={isSavingTheme}
              key={option.id}
              role="radio"
              type="button"
              onClick={() => selectTheme(option.id)}
            >
              <span className={`theme-swatch theme-swatch-${option.id}`} aria-hidden="true" />
              <span>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
            </button>
          ))}
        </div>

        <div className="profile-actions">
          <button className="secondary-button" type="button" onClick={() => loginWithGoogle('link')}>
            {user.google_linked ? 'Google vinculado' : 'Vincular Google'}
          </button>
          <button className="secondary-button" disabled={pushBusy || !supportsPushNotifications()} type="button" onClick={togglePush}>
            {pushSubscribed ? 'Desativar notificacoes' : 'Ativar notificacoes'}
          </button>
          <button className="primary-button" disabled={isSaving} type="submit">
            {isSaving ? 'Salvando...' : 'Salvar perfil'}
          </button>
        </div>

        {notice && <div className="form-success">{notice}</div>}
      </form>

      <section className="profile-settings">
        <div className="panel-heading">
          <h2>Assinatura</h2>
          <span>{subscription.active ? 'pro' : 'free'}</span>
        </div>
        <div className="profile-subscription">
          <strong>{subscription.active ? 'Plano mensal ativo' : 'Plano gratuito'}</strong>
          <span>{subscription.active ? `Renova ate ${subscriptionExpires}` : `Plano Pro: R$ ${subscription.price}/mes`}</span>
        </div>
        <div className="profile-actions">
          <button className="primary-button" disabled={subscriptionBusy} type="button" onClick={toggleSubscription}>
            {subscriptionBusy ? 'Atualizando...' : subscription.active ? 'Cancelar assinatura' : 'Ativar Pro'}
          </button>
        </div>
      </section>

      <form className="profile-settings" onSubmit={handlePasswordSubmit}>
        <div className="panel-heading">
          <h2>Seguranca</h2>
          <span>senha</span>
        </div>
        <label>
          <span>Senha atual</span>
          <input
            className="field"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </label>
        <label>
          <span>Nova senha</span>
          <input
            className="field"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </label>
        <label>
          <span>Confirmar nova senha</span>
          <input
            className="field"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </label>
        <div className="profile-actions">
          <button className="primary-button" disabled={isChangingPassword || !currentPassword || !newPassword} type="submit">
            {isChangingPassword ? 'Alterando...' : 'Alterar senha'}
          </button>
        </div>
      </form>

      <section className="profile-settings danger-zone">
        <div className="panel-heading">
          <h2>Excluir conta</h2>
          <span>permanente</span>
        </div>
        <p>Digite seu email para confirmar a exclusao da conta e dos dados de progresso.</p>
        <input className="field" value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} />
        <div className="profile-actions">
          <button className="secondary-button danger-button" disabled={deleteBusy} type="button" onClick={handleDeleteAccount}>
            {deleteBusy ? 'Excluindo...' : 'Excluir conta'}
          </button>
        </div>
      </section>
    </section>
  );
}
