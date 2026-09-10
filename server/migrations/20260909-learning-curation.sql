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
