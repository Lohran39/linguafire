-- Apply BEFORE deploying the new server. Does not change prices or existing paid entitlements.
BEGIN;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ai_policy_version INTEGER;
UPDATE public.users SET ai_policy_version = CASE WHEN subscription_active = 1 AND subscription_expires > (extract(epoch FROM now()) * 1000)::BIGINT AND plan IN ('pro','max') THEN 1 ELSE 2 END WHERE ai_policy_version IS NULL;
ALTER TABLE public.users ALTER COLUMN ai_policy_version SET DEFAULT 2;
ALTER TABLE public.users ALTER COLUMN ai_policy_version SET NOT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ai_uses_month INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ai_month_key TEXT NOT NULL DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ai_rate_minute TEXT NOT NULL DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ai_rate_count INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS public.ai_use_reservations (
 id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
 day_key TEXT NOT NULL, month_key TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','completed','refunded')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_use_reservations_created ON public.ai_use_reservations(created_at);
ALTER TABLE public.ai_use_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_use_reservations FROM PUBLIC, anon, authenticated;
-- A separate v2 RPC avoids breaking the old server during rollout.
CREATE OR REPLACE FUNCTION public.consume_ai_use_v2(p_user_id UUID, p_request_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
 u public.users%ROWTYPE; d TEXT := to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD');
 m TEXT := to_char(now() AT TIME ZONE 'UTC','YYYY-MM'); minute_key TEXT := to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI');
 used INTEGER; month_used INTEGER; quota INTEGER; monthly INTEGER; current_plan TEXT; reason TEXT := ''; legacy BOOLEAN;
BEGIN
 SELECT * INTO u FROM public.users WHERE id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
 -- Internal retry of the same reservation cannot debit twice.
 IF EXISTS (SELECT 1 FROM public.ai_use_reservations WHERE id=p_request_id) THEN
   RETURN jsonb_build_object('allowed',false,'reason','duplicate_request');
 END IF;
 current_plan := CASE WHEN u.subscription_active=1 AND u.subscription_expires>(extract(epoch FROM now())*1000)::BIGINT AND u.plan IN ('pro','max') THEN u.plan ELSE 'free' END;
 legacy := current_plan<>'free' AND u.ai_policy_version=1;
 quota := CASE WHEN legacy THEN CASE current_plan WHEN 'max' THEN 1000 ELSE 300 END ELSE CASE current_plan WHEN 'max' THEN 150 WHEN 'pro' THEN 50 ELSE 10 END END;
 monthly := CASE WHEN legacy THEN NULL ELSE CASE current_plan WHEN 'max' THEN 3000 WHEN 'pro' THEN 1000 ELSE 100 END END;
 used := CASE WHEN u.ai_uses_date IN (d,to_char(now() AT TIME ZONE 'UTC','Dy Mon DD YYYY')) THEN greatest(coalesce(u.ai_uses_today,0),0) ELSE 0 END;
 month_used := CASE WHEN u.ai_month_key=m THEN greatest(u.ai_uses_month,0) ELSE 0 END;
 IF used>=quota THEN reason:='daily_limit';
 ELSIF monthly IS NOT NULL AND month_used>=monthly THEN reason:='monthly_limit';
 ELSIF u.ai_rate_minute=minute_key AND u.ai_rate_count>=30 THEN reason:='rate_limit'; END IF;
 IF reason='' THEN
   INSERT INTO public.ai_use_reservations(id,user_id,day_key,month_key) VALUES(p_request_id,p_user_id,d,m);
   used:=used+1; month_used:=month_used+1;
   UPDATE public.users SET ai_uses_today=used, ai_uses_date=d, ai_uses_month=month_used, ai_month_key=m,
    ai_rate_count=CASE WHEN ai_rate_minute=minute_key THEN ai_rate_count+1 ELSE 1 END, ai_rate_minute=minute_key WHERE id=p_user_id;
 END IF;
 RETURN jsonb_build_object('allowed',reason='', 'reason',reason,'used',used,'limit',quota,'remaining',greatest(quota-used,0),
   'monthlyUsed',month_used,'monthlyLimit',monthly,'monthlyRemaining',CASE WHEN monthly IS NULL THEN NULL ELSE greatest(monthly-month_used,0) END,
   'resetsAt',(date_trunc('day',now() AT TIME ZONE 'UTC')+interval '1 day') AT TIME ZONE 'UTC',
   'monthlyResetsAt',(date_trunc('month',now() AT TIME ZONE 'UTC')+interval '1 month') AT TIME ZONE 'UTC',
   'plan',current_plan,'legacy',legacy,'timezone','UTC');
END; $$;
CREATE OR REPLACE FUNCTION public.finish_ai_use(p_request_id UUID,p_success BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.ai_use_reservations%ROWTYPE; uid UUID;
BEGIN
 SELECT user_id INTO uid FROM public.ai_use_reservations WHERE id=p_request_id;
 IF uid IS NULL THEN RETURN; END IF;
 -- Same lock order as reservation to prevent deadlocks.
 PERFORM 1 FROM public.users WHERE id=uid FOR UPDATE;
 SELECT * INTO r FROM public.ai_use_reservations WHERE id=p_request_id FOR UPDATE;
 IF r.status<>'reserved' THEN RETURN; END IF;
 UPDATE public.ai_use_reservations SET status=CASE WHEN p_success THEN 'completed' ELSE 'refunded' END WHERE id=p_request_id;
 IF NOT p_success THEN
   UPDATE public.users SET ai_uses_today=CASE WHEN ai_uses_date=r.day_key THEN greatest(ai_uses_today-1,0) ELSE ai_uses_today END,
    ai_uses_month=CASE WHEN ai_month_key=r.month_key THEN greatest(ai_uses_month-1,0) ELSE ai_uses_month END WHERE id=r.user_id;
 END IF;
END; $$;
REVOKE ALL ON FUNCTION public.consume_ai_use_v2(UUID,UUID),public.finish_ai_use(UUID,BOOLEAN) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_use_v2(UUID,UUID),public.finish_ai_use(UUID,BOOLEAN) TO service_role;

CREATE TABLE IF NOT EXISTS public.ai_provider_daily (
 day DATE NOT NULL, plan TEXT NOT NULL, model TEXT NOT NULL, requests BIGINT NOT NULL DEFAULT 0, failures BIGINT NOT NULL DEFAULT 0,
 input_tokens BIGINT NOT NULL DEFAULT 0, output_tokens BIGINT NOT NULL DEFAULT 0, thinking_tokens BIGINT NOT NULL DEFAULT 0,
 cached_tokens BIGINT NOT NULL DEFAULT 0, unknown_usage BIGINT NOT NULL DEFAULT 0, estimated_usd NUMERIC NOT NULL DEFAULT 0,
 duration_ms BIGINT NOT NULL DEFAULT 0, PRIMARY KEY(day,plan,model)
);
ALTER TABLE public.ai_provider_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_provider_daily FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.ai_provider_daily TO service_role;
CREATE OR REPLACE FUNCTION public.record_ai_provider_usage(p_event JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.ai_provider_daily(day,plan,model,requests,failures,input_tokens,output_tokens,thinking_tokens,cached_tokens,unknown_usage,estimated_usd,duration_ms)
 VALUES((now() AT TIME ZONE 'UTC')::date,left(coalesce(p_event->>'plan','operation'),20),left(coalesce(p_event->>'model','unknown'),100),1,
 CASE WHEN coalesce((p_event->>'failed')::boolean,false) THEN 1 ELSE 0 END,
 greatest(coalesce((p_event->>'inputTokens')::bigint,0),0),greatest(coalesce((p_event->>'outputTokens')::bigint,0),0),
 greatest(coalesce((p_event->>'thinkingTokens')::bigint,0),0),greatest(coalesce((p_event->>'cachedTokens')::bigint,0),0),
 CASE WHEN p_event->>'estimatedUsd' IS NULL THEN 1 ELSE 0 END,greatest(coalesce((p_event->>'estimatedUsd')::numeric,0),0),greatest(coalesce((p_event->>'durationMs')::bigint,0),0))
 ON CONFLICT(day,plan,model) DO UPDATE SET requests=ai_provider_daily.requests+1,failures=ai_provider_daily.failures+EXCLUDED.failures,
 input_tokens=ai_provider_daily.input_tokens+EXCLUDED.input_tokens,output_tokens=ai_provider_daily.output_tokens+EXCLUDED.output_tokens,
 thinking_tokens=ai_provider_daily.thinking_tokens+EXCLUDED.thinking_tokens,cached_tokens=ai_provider_daily.cached_tokens+EXCLUDED.cached_tokens,
 unknown_usage=ai_provider_daily.unknown_usage+EXCLUDED.unknown_usage,estimated_usd=ai_provider_daily.estimated_usd+EXCLUDED.estimated_usd,duration_ms=ai_provider_daily.duration_ms+EXCLUDED.duration_ms;
END; $$;
REVOKE ALL ON FUNCTION public.record_ai_provider_usage(JSONB) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_ai_provider_usage(JSONB) TO service_role;
-- Explicit maintenance RPC; run daily from a scheduler. No chat text is stored.
CREATE OR REPLACE FUNCTION public.cleanup_ai_usage() RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 DELETE FROM public.ai_use_reservations WHERE created_at<now()-interval '35 days';
 DELETE FROM public.ai_provider_daily WHERE day<(now() AT TIME ZONE 'UTC')::date-90;
END; $$;
REVOKE ALL ON FUNCTION public.cleanup_ai_usage() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_ai_usage() TO service_role;
COMMIT;
