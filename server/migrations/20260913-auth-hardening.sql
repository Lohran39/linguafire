BEGIN;

-- Apply before deploying the authentication update. Existing verified accounts
-- stay active; newly inserted accounts must explicitly confirm ownership.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified_at BIGINT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verification_token TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verification_expires BIGINT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.users ALTER COLUMN email_verified SET DEFAULT 0;
UPDATE public.users SET email_verified = 0 WHERE email_verified IS NULL;

-- Invalidate outstanding plaintext links once. Re-running is safe.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'auth_tokens_hashed') THEN
    ALTER TABLE public.users ADD COLUMN auth_tokens_hashed BOOLEAN NOT NULL DEFAULT TRUE;
    UPDATE public.users SET email_verification_token = '', email_verification_expires = 0,
      password_reset_token = '', password_reset_expires = 0;
  END IF;
END $$;

COMMIT;
