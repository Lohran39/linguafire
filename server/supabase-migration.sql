-- ============================================
-- LINGUAFIRE - SUPABASE MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  lessons_completed INTEGER DEFAULT 0,
  english_level TEXT DEFAULT 'A1',
  placement_completed INTEGER DEFAULT 1,
  role TEXT DEFAULT 'user',
  achievements TEXT DEFAULT '[]',
  favorites TEXT DEFAULT '[]',
  google_id TEXT,
  theme TEXT DEFAULT 'default',
  lives INTEGER DEFAULT 10,
  xp_multiplier INTEGER DEFAULT 1,
  xp_multiplier_until BIGINT DEFAULT 0,
  last_quest_reset TEXT DEFAULT '',
  subscription_active INTEGER DEFAULT 0,
  subscription_expires BIGINT DEFAULT 0,
  plan TEXT DEFAULT 'free',
  ai_daily_limit INTEGER DEFAULT 10,
  stripe_customer_id TEXT DEFAULT '',
  stripe_subscription_id TEXT DEFAULT '',
  ai_uses_today INTEGER DEFAULT 0,
  ai_uses_date TEXT DEFAULT '',
  titles TEXT DEFAULT '[]',
  active_title TEXT DEFAULT '',
  streak_freeze_active INTEGER DEFAULT 0,
  has_free_hint INTEGER DEFAULT 0,
  password_reset_token TEXT DEFAULT '',
  password_reset_expires BIGINT DEFAULT 0,
  email_verified INTEGER DEFAULT 0,
  auth_version BIGINT NOT NULL DEFAULT 0,
  email_verified_at BIGINT DEFAULT 0,
  email_verification_token TEXT DEFAULT '',
  email_verification_expires BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS google_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'default';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS lives INTEGER DEFAULT 10;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS xp_multiplier INTEGER DEFAULT 1;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS xp_multiplier_until BIGINT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_quest_reset TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_active INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_expires BIGINT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ai_daily_limit INTEGER DEFAULT 10;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ai_uses_today INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ai_uses_date TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS titles TEXT DEFAULT '[]';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS active_title TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS streak_freeze_active INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS has_free_hint INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_reset_token TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_reset_expires BIGINT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified_at BIGINT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verification_token TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verification_expires BIGINT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS placement_completed INTEGER DEFAULT 1;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
UPDATE public.users SET plan = 'free' WHERE plan IS NULL OR plan = '';
UPDATE public.users SET ai_daily_limit = 10 WHERE ai_daily_limit IS NULL OR ai_daily_limit < 1;
UPDATE public.users SET ai_daily_limit = 300 WHERE plan = 'pro';
UPDATE public.users SET ai_daily_limit = 1000 WHERE plan = 'max';
UPDATE public.users SET placement_completed = 1 WHERE placement_completed IS NULL;
UPDATE public.users
SET placement_completed = 1
WHERE placement_completed = 0
  AND created_at < TIMESTAMPTZ '2026-08-30 15:20:32-03';

ALTER TABLE public.users ALTER COLUMN xp_multiplier_until TYPE BIGINT USING xp_multiplier_until::BIGINT;
ALTER TABLE public.users ALTER COLUMN subscription_expires TYPE BIGINT USING subscription_expires::BIGINT;
ALTER TABLE public.users ALTER COLUMN password_reset_expires TYPE BIGINT USING password_reset_expires::BIGINT;
ALTER TABLE public.users ALTER COLUMN email_verified_at TYPE BIGINT USING email_verified_at::BIGINT;
ALTER TABLE public.users ALTER COLUMN email_verification_expires TYPE BIGINT USING email_verification_expires::BIGINT;

-- ============================================
-- DAILY PROGRESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.daily_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  xp_earned INTEGER DEFAULT 0,
  lessons_done INTEGER DEFAULT 0,
  streak_maintained INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- FLASHCARD REVIEW TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.flashcard_review (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  translation TEXT NOT NULL,
  ease_factor REAL DEFAULT 2.5,
  interval_days INTEGER DEFAULT 1,
  next_review TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  repetitions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_flashcard_review_user_word
  ON public.flashcard_review(user_id, word);

-- ============================================
-- QUESTS SEED TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.quests_seed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default quests if not exists
INSERT INTO public.quests_seed (data)
SELECT '[{"id":"daily_1","type":"daily","title":"Complete 2 lições","desc":"Estude por pelo menos 2 vezes hoje","quest":"lessons","target":2,"reward":100},{"id":"daily_2","type":"daily","title":"Acerte 10 respostas","desc":"Acerte 10 exercícios corretos","quest":"correct","target":10,"reward":80},{"id":"daily_3","type":"daily","title":"Faça 1 quiz de música","desc":"Complete um quiz de música","quest":"music_quiz","target":1,"reward":60},{"id":"weekly_1","type":"weekly","title":"Mantenha streak 5 dias","desc":"Não perca sua sequência por 5 dias","quest":"streak","target":5,"reward":200},{"id":"weekly_2","type":"weekly","title":"Acumule 500 XP","desc":"Ganhe 500 XP na semana","quest":"xp","target":500,"reward":300},{"id":"weekly_3","type":"weekly","title":"Complete 8 lições","desc":"Faça 8 lições na semana","quest":"lessons","target":8,"reward":250}]'
WHERE NOT EXISTS (SELECT 1 FROM public.quests_seed LIMIT 1);

-- ============================================
-- USER REWARDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reward_id TEXT NOT NULL,
  reward_type TEXT NOT NULL,
  reward_data TEXT DEFAULT '{}',
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PUSH SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- GRAMMAR ERRORS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.grammar_errors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  topic TEXT DEFAULT '',
  error_type TEXT DEFAULT '',
  user_sentence TEXT DEFAULT '',
  correct_form TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- NATIVES CACHE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.natives_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key TEXT UNIQUE NOT NULL,
  query TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'english',
  video_ids TEXT NOT NULL DEFAULT '[]',
  source TEXT DEFAULT 'provider',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- NATIVE SAVED VIDEOS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.native_saved_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  query TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'english',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, video_id)
);

-- ============================================
-- LYRICS CACHE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.lyrics_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key TEXT UNIQUE NOT NULL,
  track TEXT NOT NULL,
  artist TEXT NOT NULL,
  lyrics_payload TEXT NOT NULL DEFAULT '{}',
  source TEXT DEFAULT 'provider',
  confidence INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TRANSLATION CACHE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.translation_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key TEXT UNIQUE NOT NULL,
  from_lang TEXT NOT NULL DEFAULT 'en',
  to_lang TEXT NOT NULL DEFAULT 'pt-BR',
  original_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  provider TEXT DEFAULT 'provider',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- MUSIC VIDEO CACHE TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS public.working_music_videos (
  track_key TEXT PRIMARY KEY,
  track TEXT NOT NULL DEFAULT '',
  artist TEXT NOT NULL DEFAULT '',
  video_id TEXT NOT NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.bad_music_videos (
  track_key TEXT NOT NULL,
  video_id TEXT NOT NULL,
  reason TEXT DEFAULT 'embed_failed',
  failed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (track_key, video_id)
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- O frontend não usa Supabase direto. O backend usa SUPABASE_SERVICE_ROLE_KEY,
-- então anon/authenticated não precisam ler nem escrever dados privados.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_review ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.working_music_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bad_music_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grammar_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.natives_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lyrics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quests_seed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_anon" ON public.users;
DROP POLICY IF EXISTS "users_insert_anon" ON public.users;
DROP POLICY IF EXISTS "users_update_anon" ON public.users;
DROP POLICY IF EXISTS "users_delete_anon" ON public.users;
DROP POLICY IF EXISTS "daily_progress_all_anon" ON public.daily_progress;
DROP POLICY IF EXISTS "flashcard_all_anon" ON public.flashcard_review;
DROP POLICY IF EXISTS "user_rewards_all_anon" ON public.user_rewards;
DROP POLICY IF EXISTS "push_subscriptions_all_anon" ON public.push_subscriptions;
DROP POLICY IF EXISTS "grammar_errors_all_anon" ON public.grammar_errors;
DROP POLICY IF EXISTS "Natives cache is public readable" ON public.natives_cache;
DROP POLICY IF EXISTS "Natives cache write authenticated" ON public.natives_cache;
DROP POLICY IF EXISTS "Quests seed is public" ON public.quests_seed;
DROP POLICY IF EXISTS "Quests seed public read" ON public.quests_seed;

CREATE POLICY "Quests seed public read"
  ON public.quests_seed FOR SELECT
  TO authenticated, anon
  USING (true);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_daily_progress_user_date ON public.daily_progress(user_id, date);
CREATE INDEX IF NOT EXISTS idx_flashcard_review_user_next ON public.flashcard_review(user_id, next_review);
CREATE INDEX IF NOT EXISTS idx_user_rewards_user ON public.user_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_grammar_errors_user ON public.grammar_errors(user_id);
CREATE INDEX IF NOT EXISTS idx_natives_cache_key ON public.natives_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_natives_cache_updated ON public.natives_cache(updated_at);
CREATE INDEX IF NOT EXISTS idx_native_saved_videos_user ON public.native_saved_videos(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lyrics_cache_key ON public.lyrics_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_lyrics_cache_track_artist ON public.lyrics_cache(track, artist);
CREATE INDEX IF NOT EXISTS idx_translation_cache_key ON public.translation_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_translation_cache_updated ON public.translation_cache(updated_at);

-- ============================================
-- FUNCTION FOR ANON AUTH (if needed)
-- ============================================
-- For Supabase auth integration, you'll need to set up Auth helpers
-- This is a placeholder for the auth integration

-- Rascunhos para retomada entre dispositivos
-- Execute no SQL Editor do Supabase antes de publicar esta versão.
CREATE TABLE IF NOT EXISTS public.activity_progress (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  activity TEXT NOT NULL CHECK (activity IN ('navigation','lessons','flashcard','conversation','music','natives','placement')),
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, activity)
);
ALTER TABLE public.activity_progress ENABLE ROW LEVEL SECURITY;
-- Acesso somente pelas rotas autenticadas do servidor com service_role.
REVOKE ALL ON public.activity_progress FROM anon, authenticated;

-- Aprendizado e revisão de conteúdo
-- Execute no SQL Editor do Supabase antes de publicar esta versão.
CREATE TABLE IF NOT EXISTS public.learning_events (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  activity TEXT NOT NULL CHECK (activity IN ('lesson','flashcard','music_quiz','native_coach','dictation')),
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_id)
);
CREATE INDEX IF NOT EXISTS learning_events_period ON public.learning_events(user_id, occurred_at);
CREATE TABLE IF NOT EXISTS public.content_curations (
  kind TEXT NOT NULL CHECK (kind IN ('music','native')),
  content_key TEXT NOT NULL,
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT '',
  lang TEXT NOT NULL DEFAULT 'english',
  status TEXT NOT NULL CHECK (status IN ('verified','rejected')),
  video_matches BOOLEAN NOT NULL DEFAULT false,
  text_matches BOOLEAN NOT NULL DEFAULT false,
  translation TEXT NOT NULL CHECK (translation IN ('available','partial','missing')),
  notes TEXT NOT NULL DEFAULT '',
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, content_key, video_id)
);
CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('music','native')),
  content_key TEXT NOT NULL,
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT '',
  lang TEXT NOT NULL DEFAULT 'english',
  reason TEXT NOT NULL CHECK (reason IN ('wrong_video','wrong_text','translation','unavailable','other')),
  detail TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, content_key, video_id, reason)
);
ALTER TABLE public.learning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_curations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.learning_events, public.content_curations, public.content_reports FROM anon, authenticated;
-- Gestão de assinatura e consumo diário de IA (UTC).
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT NOT NULL DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_cancel_at_period_end BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_cancel_at BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_synced_at BIGINT NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS users_stripe_subscription ON public.users(stripe_subscription_id) WHERE stripe_subscription_id <> '';
CREATE INDEX IF NOT EXISTS users_stripe_customer ON public.users(stripe_customer_id) WHERE stripe_customer_id <> '';

CREATE OR REPLACE FUNCTION public.consume_ai_use(p_user_id UUID)
RETURNS TABLE (allowed BOOLEAN, uses INTEGER, daily_limit INTEGER, plan TEXT, resets_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  student public.users%ROWTYPE;
  day_key TEXT := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD');
  legacy_day TEXT := to_char(now() AT TIME ZONE 'UTC', 'Dy Mon DD YYYY');
  used INTEGER;
  quota INTEGER;
  current_plan TEXT;
BEGIN
  SELECT * INTO student FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  current_plan := CASE WHEN student.subscription_active = 1
    AND student.subscription_expires > (extract(epoch FROM now()) * 1000)::BIGINT
    AND student.plan IN ('pro', 'max') THEN student.plan ELSE 'free' END;
  quota := CASE current_plan WHEN 'max' THEN 1000 WHEN 'pro' THEN 300 ELSE 10 END;
  used := CASE WHEN student.ai_uses_date IN (day_key, legacy_day) THEN greatest(coalesce(student.ai_uses_today, 0), 0) ELSE 0 END;
  IF used < quota THEN
    used := used + 1;
    UPDATE public.users SET ai_uses_today = used, ai_uses_date = day_key WHERE id = p_user_id;
    RETURN QUERY SELECT true, used, quota, current_plan, (date_trunc('day', now() AT TIME ZONE 'UTC') + interval '1 day') AT TIME ZONE 'UTC';
  ELSE
    RETURN QUERY SELECT false, used, quota, current_plan, (date_trunc('day', now() AT TIME ZONE 'UTC') + interval '1 day') AT TIME ZONE 'UTC';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_ai_use(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_use(UUID) TO service_role;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_study_date TEXT DEFAULT '';

-- Para bancos novos e existentes: aplicar também migration-ten-lives.sql.
