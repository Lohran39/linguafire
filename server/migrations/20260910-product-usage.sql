BEGIN;
CREATE TABLE IF NOT EXISTS public.product_usage (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day DATE NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  feature TEXT NOT NULL CHECK (feature IN ('home','lessons','music','flashcard','conversation','natives','shop','placement','profile')),
  PRIMARY KEY(user_id, day, feature)
);
CREATE INDEX IF NOT EXISTS product_usage_day_idx ON public.product_usage(day);
ALTER TABLE public.product_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_usage FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.product_usage TO service_role;
CREATE OR REPLACE FUNCTION public.product_usage_summary()
RETURNS JSONB LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
WITH today AS (SELECT (now() AT TIME ZONE 'UTC')::date AS day),
visits AS (SELECT DISTINCT user_id, day FROM public.product_usage),
cohorts AS (SELECT user_id, min(day) AS first_day FROM visits GROUP BY user_id),
retention AS (
 SELECT n,
   count(*) FILTER (WHERE c.first_day <= t.day - n AND c.first_day >= t.day - 90) AS eligible,
   count(*) FILTER (WHERE c.first_day <= t.day - n AND c.first_day >= t.day - 90 AND EXISTS
     (SELECT 1 FROM visits v WHERE v.user_id=c.user_id AND v.day=c.first_day+n)) AS returned
 FROM cohorts c CROSS JOIN today t CROSS JOIN (VALUES (1),(7)) days(n) GROUP BY n
), features AS (
 SELECT feature, count(DISTINCT user_id) AS users, count(*) AS active_days
 FROM public.product_usage, today WHERE product_usage.day >= today.day - 27 GROUP BY feature
)
SELECT jsonb_build_object(
 'activeToday', (SELECT count(DISTINCT user_id) FROM visits,today WHERE visits.day=today.day),
 'active28Days', (SELECT count(DISTINCT user_id) FROM visits,today WHERE visits.day>=today.day-27),
 'retention', coalesce((SELECT jsonb_agg(jsonb_build_object('day',n,'eligible',eligible,'returned',returned) ORDER BY n) FROM retention),'[]'::jsonb),
 'features', coalesce((SELECT jsonb_agg(jsonb_build_object('feature',feature,'users',users,'activeDays',active_days) ORDER BY users DESC) FROM features),'[]'::jsonb)
);
$$;
REVOKE ALL ON FUNCTION public.product_usage_summary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.product_usage_summary() TO service_role;
COMMIT;
