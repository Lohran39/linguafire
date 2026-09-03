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

const PROFILE_PLAN_AI_LIMITS: Record<string, number> = { pro: 300, max: 1000 };

type ProfileTabProps = {
  user: UserProfile;
  onProfileRefresh: (user: UserProfile) => void;
};

function planDefaultLimit(plan: string | null | undefined) {
  return PROFILE_PLAN_AI_LIMITS[String(plan || 'pro').toLowerCase()] || 300;
}

function planPrice(plan: string | null | undefined) {
  return String(plan || 'pro').toLowerCase() === 'max' ? 85 : 45;
}

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
    plan: user.subscription_active ? user.plan || 'pro' : null as string | null,
    price: planPrice(user.plan),
    aiDailyLimit: Math.max(planDefaultLimit(user.plan), Number(user.ai_daily_limit || 0))
  });
  const [subscriptionBusy, setSubscriptionBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  function normalizeSubscription(nextSubscription: {
    active: boolean;
    expires: number;
    plan: string | null;
    price: number;
    aiDailyLimit?: number;
  }) {
    const plan = nextSubscription.plan || 'pro';
    return {
      ...nextSubscription,
      price: nextSubscription.price || planPrice(plan),
      aiDailyLimit: Math.max(planDefaultLimit(plan), Number(nextSubscription.aiDailyLimit || 0))
    };
  }

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
        if (isMounted) setSubscription(normalizeSubscription(status));
      } catch {
        if (isMounted) {
          setSubscription({
            active: Boolean(user.subscription_active),
            expires: Number(user.subscription_expires || 0),
            plan: user.subscription_active ? user.plan || 'pro' : null,
            price: planPrice(user.plan),
            aiDailyLimit: Math.max(planDefaultLimit(user.plan), Number(user.ai_daily_limit || 0))
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
        setNotice('Notificações desativadas.');
      } else {
        await subscribeToPush();
        setPushSubscribed(true);
        setNotice('Notificações ativadas.');
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Erro ao alterar notificações.');
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
      setNotice('A confirmação da nova senha não confere.');
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

  async function toggleSubscription(plan: 'pro' | 'max' = 'pro') {
    setNotice('');
    setSubscriptionBusy(true);

    try {
      if (subscription.active) {
        await cancelSubscription();
        setSubscription({ active: false, expires: 0, plan: null, price: 45, aiDailyLimit: 300 });
        onProfileRefresh({ ...user, subscription_active: false, subscription_expires: 0, plan: 'free', ai_daily_limit: 10 });
        setNotice('Assinatura cancelada.');
      } else {
        const nextSubscription = await createSubscription(plan);
        const normalizedSubscription = normalizeSubscription(nextSubscription);
        setSubscription(normalizedSubscription);
        onProfileRefresh({
          ...user,
          subscription_active: true,
          subscription_expires: normalizedSubscription.expires,
          plan: normalizedSubscription.plan || 'pro',
          ai_daily_limit: normalizedSubscription.aiDailyLimit
        });
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
      setNotice('Digite seu email para confirmar exclusão da conta.');
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
        <p className="lead">Gerencie sua conta e confira o progresso principal já vindo do backend.</p>
      </header>

      <section className="profile-grid">
        <div>
          <span>Email</span>
          <strong>{user.email}</strong>
        </div>
        <div>
          <span>Nível de inglês</span>
          <strong>{user.english_level || 'A1'}</strong>
        </div>
        <div>
          <span>XP</span>
          <strong>{user.xp || 0}</strong>
        </div>
        <div>
          <span>Sequência</span>
          <strong>{user.streak || 0}</strong>
        </div>
        <div>
          <span>Acertos</span>
          <strong>{user.correct_answers || 0}</strong>
        </div>
        <div>
          <span>Lições</span>
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
            {pushSubscribed ? 'Desativar notificações' : 'Ativar notificações'}
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
          <span>{subscription.active ? String(subscription.plan || 'pro') : 'free'}</span>
        </div>
        <div className="profile-subscription">
          <strong>{subscription.active ? 'Plano ativo' : 'Plano gratuito'}</strong>
          <span>
            {subscription.active
              ? `Renova até ${subscriptionExpires} · ${subscription.aiDailyLimit || 300} usos de IA/dia`
              : 'Pro: R$45/mês · 300 usos de IA/dia | Max: R$85/mês · 1000 usos de IA/dia'}
          </span>
        </div>
        <div className="profile-actions">
          {subscription.active ? (
            <button className="primary-button" disabled={subscriptionBusy} type="button" onClick={() => toggleSubscription()}>
              {subscriptionBusy ? 'Atualizando...' : 'Cancelar assinatura'}
            </button>
          ) : (
            <>
              <button className="primary-button" disabled={subscriptionBusy} type="button" onClick={() => toggleSubscription('pro')}>
                {subscriptionBusy ? 'Atualizando...' : 'Ativar Pro'}
              </button>
              <button className="secondary-button" disabled={subscriptionBusy} type="button" onClick={() => toggleSubscription('max')}>
                Ativar Max
              </button>
            </>
          )}
        </div>
      </section>

      <form className="profile-settings" onSubmit={handlePasswordSubmit}>
        <div className="panel-heading">
          <h2>Segurança</h2>
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
        <p>Digite seu email para confirmar a exclusão da conta e dos dados de progresso.</p>
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
