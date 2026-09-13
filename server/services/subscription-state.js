const PLAN_LIMITS = { free: 10, pro: 50, max: 150 };
const MONTHLY_LIMITS = { free: 100, pro: 1000, max: 3000 };
const LEGACY_LIMITS = { pro: 300, max: 1000 };
const SUBSCRIPTION_PLANS = { pro: { price: 45, aiDailyLimit: 50, aiMonthlyLimit: 1000 }, max: { price: 85, aiDailyLimit: 150, aiMonthlyLimit: 3000 } };
const idOf = value => typeof value === 'string' ? value : value?.id || '';
function effectivePlan(user, now = Date.now()) {
  return user.subscription_active && Number(user.subscription_expires) > now && ['pro', 'max'].includes(user.plan) ? user.plan : 'free';
}
function aiUsage(user, now = Date.now()) {
  const date = new Date(now), day = date.toISOString().slice(0, 10);
  const legacyDay = `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getUTCDay()]} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][date.getUTCMonth()]} ${String(date.getUTCDate()).padStart(2, '0')} ${date.getUTCFullYear()}`;
  const used = [day, legacyDay].includes(user.ai_uses_date) ? Math.max(0, Number(user.ai_uses_today) || 0) : 0;
  const plan = effectivePlan(user, now), legacy = plan !== 'free' && Number(user.ai_policy_version ?? 1) === 1;
  const limit = legacy ? LEGACY_LIMITS[plan] : PLAN_LIMITS[plan];
  const monthlyUsed = user.ai_month_key === day.slice(0,7) ? Math.max(0, Number(user.ai_uses_month) || 0) : 0;
  const monthlyLimit = legacy ? null : MONTHLY_LIMITS[plan];
  return { used, limit, remaining: Math.max(0, limit - used), resetsAt: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1)).toISOString(), timezone: 'UTC', plan, legacy, monthlyUsed, monthlyLimit, monthlyRemaining: monthlyLimit === null ? null : Math.max(0, monthlyLimit-monthlyUsed), monthlyResetsAt: new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1)).toISOString() };
}
function subscriptionUpdates(subscription, resolvePricePlan, syncStarted = Date.now()) {
  const items = subscription.items?.data || [];
  const item = items.length === 1 ? items[0] : null;
  const plan = resolvePricePlan(idOf(item?.price) || idOf(item?.plan));
  const periodEnd = Number(item?.current_period_end || subscription.current_period_end || subscription.trial_end || 0) * 1000;
  const cancelAt = Number(subscription.cancel_at || 0) * 1000;
  const expires = cancelAt > 0 && periodEnd > 0 ? Math.min(cancelAt, periodEnd) : periodEnd;
  const active = Boolean(plan && ['active', 'trialing'].includes(subscription.status) && expires > Date.now());
  const policyVersion = subscription.metadata?.ai_policy_version === '2' ? 2 : 1;
  return {
    ai_policy_version: policyVersion,
    stripe_customer_id: idOf(subscription.customer), stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status, stripe_cancel_at_period_end: Boolean(subscription.cancel_at_period_end || cancelAt > Date.now()),
    stripe_cancel_at: cancelAt, stripe_synced_at: syncStarted,
    subscription_active: active ? 1 : 0, subscription_expires: expires,
    plan: active ? plan : 'free', ai_daily_limit: active && policyVersion === 1 ? LEGACY_LIMITS[plan] : PLAN_LIMITS[active ? plan : 'free']
  };
}
function hasLiveSubscription(subscription) { return !['canceled', 'incomplete_expired'].includes(subscription.status); }
module.exports = { PLAN_LIMITS, SUBSCRIPTION_PLANS, idOf, effectivePlan, aiUsage, subscriptionUpdates, hasLiveSubscription };
