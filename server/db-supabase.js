const { createClient } = require('@supabase/supabase-js');
const { hashToken } = require('./utils/auth-security');

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios para iniciar o backend. Nao use SUPABASE_ANON_KEY no servidor.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// User operations with Supabase
async function supabaseGetUserByEmail(email) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
  if (error) return null;
  return data;
}

async function supabaseGetUserById(id) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

async function supabaseFindUserByGoogleOrEmail(googleId, email) {
  let query = supabase.from('users').select('*');

  if (googleId && email) {
    query = query.or(`google_id.eq.${googleId},email.eq.${email}`);
  } else if (googleId) {
    query = query.eq('google_id', googleId);
  } else if (email) {
    query = query.eq('email', email);
  } else {
    return null;
  }

  const { data, error } = await query.limit(1).maybeSingle();
  if (error) return null;
  return data || null;
}

async function supabaseCreateUser(userData) {
  const { data, error } = await supabase
    .from('users')
    .insert([{
      name: userData.name,
      email: userData.email,
      password: userData.password,
      google_id: userData.google_id || null,
      level: userData.level ?? 1,
      xp: userData.xp ?? 0,
      streak: userData.streak ?? 0,
      correct_answers: userData.correct_answers ?? 0,
      lessons_completed: userData.lessons_completed ?? 0,
      english_level: userData.english_level ?? 'A1',
      placement_completed: userData.placement_completed ?? 0,
      role: userData.role || 'user',
      achievements: userData.achievements ?? '[]',
      favorites: userData.favorites ?? '[]',
      theme: userData.theme ?? 'default',
      lives: userData.lives ?? 10,
      xp_multiplier: userData.xp_multiplier ?? 1,
      xp_multiplier_until: userData.xp_multiplier_until ?? 0,
      last_quest_reset: userData.last_quest_reset ?? '',
      subscription_active: userData.subscription_active ?? 0,
      subscription_expires: userData.subscription_expires ?? 0,
      plan: userData.plan || 'free',
      ai_daily_limit: userData.ai_daily_limit ?? 10,
      stripe_customer_id: userData.stripe_customer_id ?? '',
      stripe_subscription_id: userData.stripe_subscription_id ?? '',
      ai_uses_today: userData.ai_uses_today ?? 0,
      ai_uses_date: userData.ai_uses_date ?? '',
      titles: userData.titles ?? '[]',
      active_title: userData.active_title ?? '',
      streak_freeze_active: userData.streak_freeze_active ?? 0,
      has_free_hint: userData.has_free_hint ?? 0,
      password_reset_token: userData.password_reset_token ?? '',
      password_reset_expires: userData.password_reset_expires ?? 0,
      email_verified: userData.email_verified ?? 0,
      email_verified_at: userData.email_verified_at ?? 0,
      email_verification_token: userData.email_verification_token ? hashToken(userData.email_verification_token) : '',
      email_verification_expires: userData.email_verification_expires ?? 0
    }])
    .select()
    .single();

  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return { error: 'UNIQUE constraint failed' };
    }
    return { error: error.message };
  }
  return { data };
}

async function supabaseUpdateGoogleLink(id, googleId) {
  return supabaseUpdateUser(id, { google_id: googleId });
}

async function supabaseCompletePendingGoogleUser(user, googleUser) {
  const { data, error } = await supabase.from('users').update({
    google_id: googleUser.googleId,
    name: String(googleUser.name || user.name || 'Estudante').slice(0, 20),
    password: '',
    email_verified: 1,
    email_verified_at: Date.now(),
    email_verification_token: '', email_verification_expires: 0,
    password_reset_token: '', password_reset_expires: 0,
    auth_version: Math.max(Date.now(), Number(user.auth_version || 0) + 1)
  }).eq('id', user.id).eq('email', user.email).eq('email_verified', 0)
    .select('*').maybeSingle();
  return { data, error: error?.message || (!data ? 'Cadastro alterado. Tente entrar novamente.' : null) };
}

async function supabaseSetPasswordResetToken(id, token, expiresAt) {
  return supabaseUpdateUser(id, {
    password_reset_token: hashToken(token),
    password_reset_expires: expiresAt
  });
}

async function supabaseGetUserByResetToken(token) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('password_reset_token', hashToken(token))
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data || null;
}

async function supabaseResetPassword(id, hashedPassword, token) {
  const { data, error } = await supabase.from('users').update({
    password: hashedPassword,
    auth_version: Date.now(),
    password_reset_token: '',
    password_reset_expires: 0
  }).eq('id', id).eq('password_reset_token', hashToken(token))
    .gt('password_reset_expires', Date.now()).select('id').maybeSingle();
  return { data, error: error?.message || (!data ? 'Token inválido ou expirado' : null) };
}

async function supabaseGetUserByEmailVerificationToken(token) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email_verification_token', hashToken(token))
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data || null;
}

async function supabaseSetEmailVerificationToken(id, token, expiresAt) {
  const { data, error } = await supabase.from('users').update({
    email_verification_token: hashToken(token),
    email_verification_expires: expiresAt
  }).eq('id', id).eq('email_verified', 0).select('id').maybeSingle();
  return { data, error: error?.message || (!data ? 'Conta não está pendente' : null) };
}

async function supabaseRestoreEmailVerificationToken(id, failedToken, previous) {
  return supabase.from('users').update({
    email_verification_token: previous.email_verification_token || '',
    email_verification_expires: previous.email_verification_expires || 0
  }).eq('id', id).eq('email_verified', 0).eq('email_verification_token', hashToken(failedToken));
}

async function supabaseVerifyUserEmail(id, token, password) {
  const { data, error } = await supabase.from('users').update({
    email_verified: 1,
    password,
    auth_version: Date.now(),
    password_reset_token: '',
    password_reset_expires: 0,
    email_verified_at: Date.now(),
    email_verification_token: '',
    email_verification_expires: 0
  }).eq('id', id).eq('email_verified', 0)
    .eq('email_verification_token', hashToken(token))
    .gt('email_verification_expires', Date.now()).select('id').maybeSingle();
  return { data, error: error?.message || (!data ? 'Token inválido ou expirado' : null) };
}

async function supabaseUpdateUser(id, updates) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}

async function supabaseRecordChallengeAnswer(userId, attemptId, correct) {
  const { data, error } = await supabase.rpc('record_challenge_answer', { p_user_id: userId, p_attempt_id: attemptId, p_correct: correct });
  return { data, error: error?.message };
}

async function supabaseCompareUpdateUser(id, updates, expected) {
  let query = supabase.from('users').update(updates).eq('id', id);
  const fields = new Set(['xp', ...Object.keys(updates)]);
  for (const key of fields) {
    query = expected[key] == null ? query.is(key, null) : query.eq(key, expected[key]);
  }
  const { data, error } = await query.select().maybeSingle();
  return { data, error: error?.message };
}

async function supabaseUpdateUserXP(id, xpToAdd) {
  const user = await supabaseGetUserById(id);
  if (!user) return { error: 'User not found' };

  const newXp = (user.xp || 0) + xpToAdd;
  const newLevel = Math.floor(newXp / 1000) + 1;

  return supabaseUpdateUser(id, { xp: newXp, level: newLevel });
}

// Daily progress operations
async function supabaseGetDailyProgress(userId, date) {
  const { data, error } = await supabase
    .from('daily_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .single();
  if (error && error.code !== 'PGRST116') return null; // Not found
  return data;
}

async function supabaseUpsertDailyProgress(userId, date, updates) {
  const { data, error } = await supabase
    .from('daily_progress')
    .upsert([{ user_id: userId, date, ...updates }], { returning: 'representation' })
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

// Push subscription operations
async function supabaseGetPushSubscription(userId) {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .limit(1);
  if (error) return null;
  return data?.[0] || null;
}

async function supabaseGetAllPushSubscriptions() {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*');
  if (error) return [];
  return data || [];
}

async function supabaseSavePushSubscription(userId, subscription) {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .upsert([{ user_id: userId, ...subscription }], { returning: 'representation' })
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

async function supabaseDeletePushSubscription(userId) {
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId);
  if (error) return { error: error.message };
  return { success: true };
}

// User rewards operations
async function supabaseGetUserRewards(userId) {
  const { data, error } = await supabase
    .from('user_rewards')
    .select('*')
    .eq('user_id', userId);
  if (error) return [];
  return data || [];
}

async function supabaseAwardReward(userId, rewardId, rewardType, rewardData = {}) {
  const { data, error } = await supabase
    .from('user_rewards')
    .insert([{ user_id: userId, reward_id: rewardId, reward_type: rewardType, reward_data: JSON.stringify(rewardData) }])
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

// Grammar errors operations
async function supabaseGetGrammarErrors(userId) {
  const { data, error } = await supabase
    .from('grammar_errors')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

async function supabaseAddGrammarError(userId, errorData) {
  const { data, error } = await supabase
    .from('grammar_errors')
    .insert([{ user_id: userId, ...errorData }])
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

// Flashcard operations
async function supabaseGetFlashcards(userId) {
  const { data, error } = await supabase
    .from('flashcard_review')
    .select('*')
    .eq('user_id', userId);
  if (error) return [];
  return data || [];
}

async function supabaseUpsertFlashcard(userId, word, translation, updates) {
  const { data, error } = await supabase
    .from('flashcard_review')
    .upsert([{ user_id: userId, word, translation, ...updates }], { onConflict: 'user_id,word', returning: 'representation' })
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

// Natives cache operations
async function supabaseGetNativesCache(cacheKey) {
  const { data, error } = await supabase
    .from('natives_cache')
    .select('*')
    .eq('cache_key', cacheKey)
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data || null;
}

async function supabaseUpsertNativesCache(cacheKey, payload) {
  const { data, error } = await supabase
    .from('natives_cache')
    .upsert([{
      cache_key: cacheKey,
      query: payload.query,
      lang: payload.lang,
      video_ids: JSON.stringify(payload.videoIds || []),
      source: payload.source || 'provider',
      updated_at: new Date().toISOString()
    }], { onConflict: 'cache_key', returning: 'representation' })
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

async function supabaseGetNativeSavedVideos(userId) {
  const { data, error } = await supabase
    .from('native_saved_videos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(80);
  if (error) return [];
  return data || [];
}

async function supabaseSaveNativeVideo(userId, payload) {
  const { data, error } = await supabase
    .from('native_saved_videos')
    .upsert([{
      user_id: userId,
      video_id: payload.videoId,
      query: payload.query,
      lang: payload.lang || 'english',
      created_at: new Date().toISOString()
    }], { onConflict: 'user_id,video_id', returning: 'representation' })
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

async function supabaseDeleteNativeVideo(userId, videoId) {
  const { error } = await supabase
    .from('native_saved_videos')
    .delete()
    .eq('user_id', userId)
    .eq('video_id', videoId);
  if (error) return { error: error.message };
  return { success: true };
}

// Lyrics cache operations
async function supabaseGetLyricsCache(cacheKey) {
  const { data, error } = await supabase
    .from('lyrics_cache')
    .select('*')
    .eq('cache_key', cacheKey)
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data || null;
}

async function supabaseUpsertLyricsCache(cacheKey, payload) {
  const { data, error } = await supabase
    .from('lyrics_cache')
    .upsert([{
      cache_key: cacheKey,
      track: payload.track,
      artist: payload.artist,
      lyrics_payload: JSON.stringify(payload.lyrics || {}),
      source: payload.source || 'provider',
      confidence: Number(payload.confidence || 0),
      updated_at: new Date().toISOString()
    }], { onConflict: 'cache_key', returning: 'representation' })
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

async function supabaseGetTranslationCache(cacheKey) {
  const { data, error } = await supabase
    .from('translation_cache')
    .select('*')
    .eq('cache_key', cacheKey)
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data || null;
}

async function supabaseUpsertTranslationCache(cacheKey, payload) {
  const { data, error } = await supabase
    .from('translation_cache')
    .upsert([{
      cache_key: cacheKey,
      from_lang: payload.fromLang || 'en',
      to_lang: payload.toLang || 'pt-BR',
      original_text: payload.originalText || '',
      translated_text: payload.translatedText || '',
      provider: payload.provider || 'provider',
      updated_at: new Date().toISOString()
    }], { onConflict: 'cache_key', returning: 'representation' })
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

async function supabaseGetWorkingMusicVideo(trackKey) {
  const { data, error } = await supabase
    .from('working_music_videos')
    .select('*')
    .eq('track_key', trackKey)
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data || null;
}

async function supabaseGetBadMusicVideos(trackKey) {
  const { data, error } = await supabase
    .from('bad_music_videos')
    .select('video_id')
    .eq('track_key', trackKey);
  if (error) return [];
  return (data || []).map((row) => row.video_id).filter(Boolean);
}

async function supabaseSaveWorkingMusicVideo(trackKey, payload) {
  const { data, error } = await supabase
    .from('working_music_videos')
    .upsert([{
      track_key: trackKey,
      track: payload.track || '',
      artist: payload.artist || '',
      video_id: payload.videoId,
      confirmed_at: new Date().toISOString()
    }], { onConflict: 'track_key', returning: 'representation' })
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

async function supabaseSaveBadMusicVideo(trackKey, videoId, reason = 'embed_failed') {
  const { data, error } = await supabase
    .from('bad_music_videos')
    .upsert([{
      track_key: trackKey,
      video_id: videoId,
      reason,
      failed_at: new Date().toISOString()
    }], { onConflict: 'track_key,video_id', returning: 'representation' })
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

async function supabaseFindUserByStripe(subscriptionId, customerId) {
  for (const [column, value] of [['stripe_subscription_id', subscriptionId], ['stripe_customer_id', customerId]]) {
    if (!value) continue;
    const { data, error } = await supabase.from('users').select('*').eq(column, value).maybeSingle();
    if (error) throw error;
    if (data) return data;
  }
  return null;
}

async function supabaseSyncSubscription(userId, updates) {
  const { data, error } = await supabase.from('users').update(updates).eq('id', userId)
    .lte('stripe_synced_at', updates.stripe_synced_at).select('*').maybeSingle();
  if (error) return { error: error.message };
  return { data: data || await supabaseGetUserById(userId) };
}

// Delete user (cascade should handle related tables)
async function supabaseDeleteUser(id) {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);
  if (error) return { error: error.message };
  return { success: true };
}

module.exports = {
  supabase,
  supabaseGetUserByEmail,
  supabaseGetUserById,
  supabaseFindUserByGoogleOrEmail,
  supabaseCreateUser,
  supabaseUpdateUser,
  supabaseCompareUpdateUser,
  supabaseRecordChallengeAnswer,
  supabaseUpdateGoogleLink,
  supabaseCompletePendingGoogleUser,
  supabaseSetPasswordResetToken,
  supabaseGetUserByResetToken,
  supabaseResetPassword,
  supabaseGetUserByEmailVerificationToken,
  supabaseSetEmailVerificationToken,
  supabaseRestoreEmailVerificationToken,
  supabaseVerifyUserEmail,
  supabaseUpdateUserXP,
  supabaseGetDailyProgress,
  supabaseUpsertDailyProgress,
  supabaseGetPushSubscription,
  supabaseGetAllPushSubscriptions,
  supabaseSavePushSubscription,
  supabaseDeletePushSubscription,
  supabaseGetUserRewards,
  supabaseAwardReward,
  supabaseGetGrammarErrors,
  supabaseAddGrammarError,
  supabaseGetFlashcards,
  supabaseUpsertFlashcard,
  supabaseGetNativesCache,
  supabaseUpsertNativesCache,
  supabaseGetNativeSavedVideos,
  supabaseSaveNativeVideo,
  supabaseDeleteNativeVideo,
  supabaseGetLyricsCache,
  supabaseUpsertLyricsCache,
  supabaseGetTranslationCache,
  supabaseUpsertTranslationCache,
  supabaseGetWorkingMusicVideo,
  supabaseGetBadMusicVideos,
  supabaseSaveWorkingMusicVideo,
  supabaseSaveBadMusicVideo,
  supabaseDeleteUser,
  supabaseFindUserByStripe,
  supabaseSyncSubscription
};
