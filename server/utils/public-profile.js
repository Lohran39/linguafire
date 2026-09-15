const { aiUsage } = require('../services/subscription-state');
// Explicit allowlist: new database columns never become browser data by default.
function publicProfile(user, parseJsonField = (value, fallback) => fallback) {
  const fields = ['id', 'name', 'email', 'level', 'xp', 'streak', 'correct_answers',
    'lessons_completed', 'english_level', 'placement_completed', 'role', 'theme',
    'subscription_active', 'subscription_expires', 'plan', 'ai_daily_limit',
    'ai_uses_today', 'ai_uses_date', 'lives', 'has_free_hint', 'streak_freeze_active',
    'xp_multiplier', 'xp_multiplier_until', 'active_title', 'last_study_date'];
  const usage = aiUsage(user);
  return {
    level: 1, xp: 0, streak: 0, correct_answers: 0, lessons_completed: 0,
    english_level: 'A1', placement_completed: 0, role: 'user', theme: 'default',
    lives: 10, has_free_hint: 0, streak_freeze_active: 0, xp_multiplier: 1, xp_multiplier_until: 0,
    ...Object.fromEntries(fields.filter(key => user[key] !== undefined).map(key => [key, user[key]])),
    subscription_active: usage.plan !== 'free', subscription_expires: user.subscription_expires || 0,
    plan: usage.plan, ai_daily_limit: usage.limit, ai_monthly_limit: usage.monthlyLimit,
    ai_uses_today: usage.used, ai_uses_month: usage.monthlyUsed, ai_legacy: usage.legacy,
    ai_limit_resets_at: usage.resetsAt, ai_month_resets_at: usage.monthlyResetsAt,
    ai_uses_date: user.ai_uses_date || '',
    achievements: parseJsonField(user.achievements, []),
    favorites: parseJsonField(user.favorites, []),
    titles: parseJsonField(user.titles, []),
    google_linked: Boolean(user.google_id),
    has_password: typeof user.password === 'string' && user.password.length > 0
  };
}
module.exports = { publicProfile };
