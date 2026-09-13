-- Apply after 20260912-ai-plan-quotas.sql and before publishing the updated server.
-- Applies the new quotas to every account; preserves subscriptions, payments and usage counters.
BEGIN;
UPDATE public.users SET ai_policy_version=2, ai_daily_limit=CASE
 WHEN subscription_active=1 AND subscription_expires>(extract(epoch FROM now())*1000)::BIGINT
 THEN CASE plan WHEN 'max' THEN 150 WHEN 'pro' THEN 50 ELSE 10 END ELSE 10 END;
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
 legacy := false;
 quota := CASE current_plan WHEN 'max' THEN 150 WHEN 'pro' THEN 50 ELSE 10 END;
 monthly := CASE current_plan WHEN 'max' THEN 3000 WHEN 'pro' THEN 1000 ELSE 100 END;
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
REVOKE ALL ON FUNCTION public.consume_ai_use_v2(UUID,UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_use_v2(UUID,UUID) TO service_role;
COMMIT;
