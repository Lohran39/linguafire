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
