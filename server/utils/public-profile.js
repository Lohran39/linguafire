// Explicit allowlist: new database columns never become browser data by default.
function publicProfile(user, parseJsonField = (value, fallback) => fallback) {
  const fields = ['id', 'name', 'email', 'level', 'xp', 'streak', 'correct_answers',
    'lessons_completed', 'english_level', 'placement_completed', 'role', 'theme',
    'subscription_active', 'subscription_expires', 'plan', 'ai_daily_limit',
    'ai_uses_today', 'ai_uses_date', 'lives', 'has_free_hint', 'streak_freeze_active',
    'xp_multiplier', 'xp_multiplier_until', 'active_title', 'last_study_date'];
  return {
    ...Object.fromEntries(fields.filter(key => user[key] !== undefined).map(key => [key, user[key]])),
    achievements: parseJsonField(user.achievements, []),
    favorites: parseJsonField(user.favorites, []),
    titles: parseJsonField(user.titles, []),
    google_linked: Boolean(user.google_id),
    has_password: typeof user.password === 'string' && user.password.length > 0
  };
}
module.exports = { publicProfile };
