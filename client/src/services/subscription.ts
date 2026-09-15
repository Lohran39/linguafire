import { createJsonParser } from './http';
const API_BASE = '/api';
const parseJson = createJsonParser('Erro ao consultar assinatura.');

export type SubscriptionStatus = {
  active: boolean; expires: number; plan: string | null; price: number;
  aiDailyLimit: number; checkoutConfigured: boolean; checkoutIssues?: string[];
  aiUsage: { used: number; limit: number; remaining: number; resetsAt: string; monthlyUsed?: number; monthlyLimit?: number | null; monthlyRemaining?: number | null; monthlyResetsAt?: string; legacy?: boolean };
  billingStatus: string; managed: boolean; cancelAtPeriodEnd: boolean; cancelAt: number;
  portalAvailable: boolean; hasBillingAccount: boolean; canSubscribe: boolean; syncWarning?: string;
};

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  return parseJson<SubscriptionStatus>(await fetch(`${API_BASE}/subscription/status`, {
    credentials: 'include', cache: 'no-store', signal: AbortSignal.timeout(20000)
  }));
}

function redirectToStripe(value: string, host: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== host || url.username || url.password) {
    throw new Error('Endereço de pagamento inválido.');
  }
  window.location.assign(url.href);
}

export async function openBillingPortal(): Promise<void> {
  const data = await parseJson<{ portalUrl: string }>(await fetch(`${API_BASE}/subscription/portal`, {
    method: 'POST', credentials: 'include', signal: AbortSignal.timeout(20000)
  }));
  redirectToStripe(data.portalUrl, 'billing.stripe.com');
}

export async function createSubscription(plan: 'pro' | 'max' = 'pro') {
  const data = await parseJson<{
    checkoutUrl?: string;
    subscription?: { active: boolean; expires: number; plan: string; price: number; aiDailyLimit?: number };
  }>(await fetch(`${API_BASE}/subscription/create`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    body: JSON.stringify({ plan }), signal: AbortSignal.timeout(20000)
  }));
  if (data.checkoutUrl) {
    redirectToStripe(data.checkoutUrl, 'checkout.stripe.com');
    return null;
  }
  if (!data.subscription) throw new Error('Resposta de assinatura inválida');
  return data.subscription;
}

