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
  lives INTEGER DEFAULT 5,
  xp_multiplier INTEGER DEFAULT 1,
  xp_multiplier_until BIGINT DEFAULT 0,
  last_quest_reset TEXT DEFAULT '',
  subscription_active INTEGER DEFAULT 0,
  subscription_expires BIGINT DEFAULT 0,
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
  email_verified INTEGER DEFAULT 1,
  email_verified_at BIGINT DEFAULT 0,
  email_verification_token TEXT DEFAULT '',
  email_verification_expires BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS google_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'default';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS lives INTEGER DEFAULT 5;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS xp_multiplier INTEGER DEFAULT 1;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS xp_multiplier_until BIGINT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_quest_reset TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_active INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_expires BIGINT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ai_uses_today INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ai_uses_date TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS titles TEXT DEFAULT '[]';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS active_title TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS streak_freeze_active INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS has_free_hint INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_reset_token TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_reset_expires BIGINT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified INTEGER DEFAULT 1;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified_at BIGINT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verification_token TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verification_expires BIGINT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS placement_completed INTEGER DEFAULT 1;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
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
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- O frontend não usa Supabase direto. O backend usa SUPABASE_SERVICE_ROLE_KEY,
-- então anon/authenticated não precisam ler nem escrever dados privados.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_review ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grammar_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.natives_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lyrics_cache ENABLE ROW LEVEL SECURITY;
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

-- ============================================
-- FUNCTION FOR ANON AUTH (if needed)
-- ============================================
-- For Supabase auth integration, you'll need to set up Auth helpers
-- This is a placeholder for the auth integration
