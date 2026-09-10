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
