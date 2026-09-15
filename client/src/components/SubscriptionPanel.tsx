import { useCallback, useEffect, useRef, useState } from 'react';
import { createSubscription, getSubscriptionStatus, openBillingPortal, type SubscriptionStatus } from '../services/subscription';
import { type UserProfile } from '../services/auth';
import { useSaveBeforeLeave } from '../hooks/activity-progress';

const billingLabels: Record<string, string> = {
  active: 'Ativa', trialing: 'Período de teste', past_due: 'Pagamento pendente',
  unpaid: 'Pagamento pendente', incomplete: 'Pagamento incompleto', incomplete_expired: 'Pagamento expirado',
  paused: 'Pausada', canceled: 'Cancelada', none: 'Plano gratuito'
};
function localDate(value: number | string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export function SubscriptionPanel({ user, onProfileRefresh }: { user: UserProfile; onProfileRefresh: (user: UserProfile) => void }) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const current = useRef({ user, onProfileRefresh });
  current.current = { user, onProfileRefresh };
  const mounted = useRef(false);
  const inFlight = useRef(false);
  const saveBeforeLeave = useSaveBeforeLeave();
  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const next = await getSubscriptionStatus();
      if (!mounted.current) return;
      setStatus(next);
      setError('');
      const { user: profile, onProfileRefresh: update } = current.current;
      update({ ...profile, subscription_active: next.active, subscription_expires: next.expires,
        plan: next.plan || 'free', ai_daily_limit: next.aiDailyLimit,
        ai_uses_today: next.aiUsage?.used ?? profile.ai_uses_today,
        ai_monthly_limit: next.aiUsage?.monthlyLimit, ai_uses_month: next.aiUsage?.monthlyUsed, ai_month_resets_at: next.aiUsage?.monthlyResetsAt, ai_legacy: next.aiUsage?.legacy,
        ai_limit_resets_at: next.aiUsage?.resetsAt });
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'Não foi possível consultar sua assinatura.');
    } finally {
      inFlight.current = false;
      if (mounted.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const onVisible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(onVisible, 60000);
    return () => { mounted.current = false; clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [refresh]);
  useEffect(() => {
    if (!status?.aiUsage?.resetsAt) return;
    const delay = new Date(status.aiUsage.resetsAt).getTime() - Date.now();
    if (delay < 0) return;
    const timer = window.setTimeout(() => void refresh(), Math.min(delay + 1000, 86400000));
    return () => clearTimeout(timer);
  }, [status?.aiUsage?.resetsAt, refresh]);

  async function manage(plan?: 'pro' | 'max') {
    setBusy(true); setError(''); setNotice('');
    try {
      if (!await saveBeforeLeave()) throw new Error('Seu progresso ainda não foi sincronizado. Confira a conexão e tente novamente.');
      if (!plan) await openBillingPortal();
      else {
        const activated = await createSubscription(plan);
        if (activated) { await refresh(); setNotice('Assinatura ativada.'); }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível abrir o pagamento. Tente novamente.');
    } finally { setBusy(false); }
  }

  const usage = status?.aiUsage;
  return <section className="profile-settings subscription-panel" aria-label="Assinatura e consumo de IA">
    <div className="panel-heading"><h2>Assinatura</h2></div>
    {status && <>
      <div className="profile-subscription">
        <strong>{status.active ? `Plano ${status.plan?.toUpperCase()} ativo` : 'Plano gratuito'}</strong>
        {!['none', 'active'].includes(status.billingStatus) && <span>{billingLabels[status.billingStatus] || status.billingStatus}</span>}
        {status.active && status.expires > 0 && <span>{status.cancelAtPeriodEnd ? 'Renovação cancelada. Acesso até' : status.billingStatus === 'trialing' ? 'Teste até' : 'Próxima renovação em'} {localDate(status.expires)}.</span>}
        {['past_due', 'unpaid', 'incomplete'].includes(status.billingStatus) && <p>Atualize o pagamento no portal para recuperar os benefícios do plano.</p>}
      </div>
      {usage && <p className="subscription-remaining"><strong>{usage.remaining} usos de IA disponíveis hoje</strong>{usage.monthlyRemaining != null && <span> · {usage.monthlyRemaining} restantes no mês</span>}</p>}
      {status.hasBillingAccount && <button className="primary-button" disabled={busy || !status.portalAvailable} onClick={() => void manage()}>{busy ? 'Abrindo...' : 'Gerenciar plano'}</button>}
      <details className="subscription-details"><summary>Detalhes do plano e consumo</summary>
      {usage && <div className="subscription-usage">
        <h3>Seu uso de IA</h3>
        <p><strong>{usage.used} de {usage.limit} usos</strong> · {usage.remaining} disponíveis</p>
        <progress aria-label="Consumo diário de IA" max={usage.limit} value={Math.min(usage.used, usage.limit)} />
        <p>O limite diário renova em {localDate(usage.resetsAt)} ({Intl.DateTimeFormat().resolvedOptions().timeZone}).</p>
        {usage.monthlyLimit != null && <><p><strong>{usage.monthlyUsed ?? 0} de {usage.monthlyLimit} usos neste mês</strong></p><progress aria-label="Consumo mensal de IA" max={usage.monthlyLimit} value={Math.min(usage.monthlyUsed ?? 0,usage.monthlyLimit)} />{usage.monthlyResetsAt && <p>Franquia mensal renova em {localDate(usage.monthlyResetsAt)}. Mês-calendário em UTC, separado da cobrança.</p>}</>}
        <details><summary>Como os usos funcionam</summary><p>Enviar mensagem, formular resposta e analisar erros são usos separados. Pedidos inválidos e falhas devolvidas pelo servidor não descontam usos.</p><p>Ao atingir a franquia, as atividades que não precisam de IA continuam disponíveis.</p></details>
      </div>}
      {status.hasBillingAccount && <p>Consulte cobranças e recibos, atualize o cartão e gerencie Pro ou Max no portal de pagamentos da Stripe.</p>}
      <div className="profile-actions">
        {status.canSubscribe && <>
          <button className="primary-button" disabled={busy || loading || Boolean(error)} onClick={() => void manage('pro')}>Ativar Pro</button>
          <button className="secondary-button" disabled={busy || loading || Boolean(error)} onClick={() => void manage('max')}>Ativar Max</button>
        </>}
      </div>
      {status.canSubscribe && <p>Pro: R$45/mês · 1.000 usos/mês, até 50/dia. Max: R$85/mês · 3.000 usos/mês, até 150/dia. O limite diário faz parte da franquia mensal.</p>}
      <button className="secondary-button" disabled={loading || busy} onClick={() => void refresh()}>Atualizar dados da assinatura</button>
      </details>
      {status.hasBillingAccount && !status.portalAvailable && <p role="status">A gestão de pagamentos está temporariamente indisponível.</p>}
      {!status.active && !status.checkoutConfigured && <p role="status">Assinaturas temporariamente indisponíveis.</p>}
      {user.role === 'admin' && status.checkoutIssues?.length ? <p className="form-error">{status.checkoutIssues.join(' ')}</p> : null}
      {status.syncWarning && <p role="status">{status.syncWarning}</p>}
    </>}
    {loading && <p role="status">Consultando assinatura...</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {notice && <p className="form-success" role="status">{notice}</p>}
    {!status && !loading && <button className="secondary-button" onClick={() => void refresh()}>Tentar novamente</button>}
  </section>;
}
