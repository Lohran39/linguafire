-- Apply before deploying the server. No browser access to session data.
BEGIN;
CREATE TABLE IF NOT EXISTS public.http_sessions (
  sid_hash TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS http_sessions_expiry_idx ON public.http_sessions(expires_at);
ALTER TABLE public.http_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.http_sessions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.http_sessions TO service_role;
COMMIT;
