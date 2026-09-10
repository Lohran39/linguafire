const PLAN_LIMITS = { free: 10, pro: 300, max: 1000 };
const SUBSCRIPTION_PLANS = { pro: { price: 45, aiDailyLimit: 300 }, max: { price: 85, aiDailyLimit: 1000 } };
const idOf = value => typeof value === 'string' ? value : value?.id || '';
function effectivePlan(user, now = Date.now()) {
  return user.subscription_active && Number(user.subscription_expires) > now && ['pro', 'max'].includes(user.plan) ? user.plan : 'free';
}
function aiUsage(user, now = Date.now()) {
  const date = new Date(now), day = date.toISOString().slice(0, 10);
  const legacy = `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getUTCDay()]} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][date.getUTCMonth()]} ${String(date.getUTCDate()).padStart(2, '0')} ${date.getUTCFullYear()}`;
  const used = [day, legacy].includes(user.ai_uses_date) ? Math.max(0, Number(user.ai_uses_today) || 0) : 0;
  const plan = effectivePlan(user, now), limit = PLAN_LIMITS[plan];
  return { used, limit, remaining: Math.max(0, limit - used), resetsAt: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1)).toISOString(), timezone: 'UTC', plan };
}
function subscriptionUpdates(subscription, resolvePricePlan, syncStarted = Date.now()) {
  const items = subscription.items?.data || [];
  const item = items.length === 1 ? items[0] : null;
  const plan = resolvePricePlan(idOf(item?.price) || idOf(item?.plan));
  const periodEnd = Number(item?.current_period_end || subscription.current_period_end || subscription.trial_end || 0) * 1000;
  const cancelAt = Number(subscription.cancel_at || 0) * 1000;
  const expires = cancelAt > 0 && periodEnd > 0 ? Math.min(cancelAt, periodEnd) : periodEnd;
  const active = Boolean(plan && ['active', 'trialing'].includes(subscription.status) && expires > Date.now());
  return {
    stripe_customer_id: idOf(subscription.customer), stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status, stripe_cancel_at_period_end: Boolean(subscription.cancel_at_period_end || cancelAt > Date.now()),
    stripe_cancel_at: cancelAt, stripe_synced_at: syncStarted,
    subscription_active: active ? 1 : 0, subscription_expires: expires,
    plan: active ? plan : 'free', ai_daily_limit: PLAN_LIMITS[active ? plan : 'free']
  };
}
function hasLiveSubscription(subscription) { return !['canceled', 'incomplete_expired'].includes(subscription.status); }
module.exports = { PLAN_LIMITS, SUBSCRIPTION_PLANS, idOf, effectivePlan, aiUsage, subscriptionUpdates, hasLiveSubscription };
