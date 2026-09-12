-- Limite de 10 vidas. Mantém os saldos existentes válidos.
BEGIN;
ALTER TABLE public.users ALTER COLUMN lives SET DEFAULT 10;
UPDATE public.users SET lives = LEAST(10, GREATEST(0, COALESCE(lives, 10)));
ALTER TABLE public.users ALTER COLUMN lives SET NOT NULL;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_lives_range;
ALTER TABLE public.users ADD CONSTRAINT users_lives_range CHECK (lives BETWEEN 0 AND 10);

-- Uma resposta por tentativa: reenvio/reconexão não desconta duas vezes.
CREATE TABLE IF NOT EXISTS public.challenge_answers (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  attempt_id TEXT NOT NULL CHECK (length(attempt_id) BETWEEN 1 AND 160),
  correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, attempt_id)
);
ALTER TABLE public.challenge_answers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.challenge_answers FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_challenge_answer(p_user_id UUID, p_attempt_id TEXT, p_correct BOOLEAN)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE balance INTEGER; previous_correct BOOLEAN;
BEGIN
  IF p_attempt_id IS NULL OR length(p_attempt_id) NOT BETWEEN 1 AND 160 OR p_correct IS NULL THEN
    RAISE EXCEPTION 'invalid_attempt';
  END IF;
  SELECT COALESCE(lives, 10) INTO balance FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown_user'; END IF;
  SELECT correct INTO previous_correct FROM public.challenge_answers WHERE user_id = p_user_id AND attempt_id = p_attempt_id;
  IF FOUND THEN RETURN jsonb_build_object('lives', balance, 'correct', previous_correct, 'replayed', true); END IF;
  IF balance <= 0 THEN RETURN jsonb_build_object('lives', 0, 'blocked', true); END IF;
  INSERT INTO public.challenge_answers(user_id, attempt_id, correct) VALUES (p_user_id, p_attempt_id, p_correct);
  IF NOT p_correct THEN
    balance := balance - 1;
    UPDATE public.users SET lives = balance WHERE id = p_user_id;
  END IF;
  RETURN jsonb_build_object('lives', balance, 'correct', p_correct, 'replayed', false);
END;
$$;
REVOKE ALL ON FUNCTION public.record_challenge_answer(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_challenge_answer(UUID, TEXT, BOOLEAN) TO service_role;
COMMIT;
