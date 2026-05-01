-- =============================================================
-- Convert public-read SECURITY DEFINER functions → SECURITY INVOKER
-- Date: 2026-05-01
-- =============================================================
-- These functions only read from tables that have open SELECT RLS policies.
-- SECURITY DEFINER is not needed and causes Supabase advisor warnings.
-- Converting to SECURITY INVOKER is safe and removes the lint warnings.
-- =============================================================

-- ── get_engagement_counts ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_engagement_counts(p_quiz_id uuid)
RETURNS TABLE(quiz_id uuid, pre_joined integer, joined integer)
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    p_quiz_id AS quiz_id,
    COALESCE(SUM(CASE WHEN qp.status = 'pre_joined' THEN 1 ELSE 0 END), 0)::integer AS pre_joined,
    COALESCE(SUM(CASE WHEN qp.status IN ('joined','completed') THEN 1 ELSE 0 END), 0)::integer AS joined
  FROM public.quiz_participants qp
  WHERE qp.quiz_id = p_quiz_id;
$function$;

-- ── get_engagement_counts_many ────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_engagement_counts_many(p_quiz_ids uuid[])
RETURNS TABLE(quiz_id uuid, pre_joined integer, joined integer)
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    qp.quiz_id,
    COALESCE(SUM(CASE WHEN qp.status = 'pre_joined' THEN 1 ELSE 0 END), 0)::integer AS pre_joined,
    COALESCE(SUM(CASE WHEN qp.status IN ('joined','completed') THEN 1 ELSE 0 END), 0)::integer AS joined
  FROM public.quiz_participants qp
  WHERE qp.quiz_id = ANY(p_quiz_ids)
  GROUP BY qp.quiz_id;
$function$;

-- ── profiles_public_by_ids ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.profiles_public_by_ids(p_ids uuid[])
RETURNS TABLE(id uuid, username text, avatar_url text, referral_code text, level integer, current_streak integer, max_streak integer)
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT p.id, p.username, p.avatar_url, p.referral_code, p.level, p.current_streak, p.max_streak
  FROM public.profiles p
  WHERE (p_ids IS NULL OR array_length(p_ids, 1) IS NULL OR p.id = ANY(p_ids));
$function$;

-- ── Leaderboard functions: ALTER to SECURITY INVOKER ─────────
-- These only read from profiles/quiz_results which have open SELECT RLS.
ALTER FUNCTION public.get_leaderboard(text, integer, integer, integer) SECURITY INVOKER;
ALTER FUNCTION public.get_leaderboard_v2(text, integer, integer, integer) SECURITY INVOKER;
ALTER FUNCTION public.get_all_time_leaderboard(integer, integer, integer) SECURITY INVOKER;
ALTER FUNCTION public.get_all_time_leaderboard_v2(integer, integer, integer) SECURITY INVOKER;
ALTER FUNCTION public.get_current_and_upcoming_quiz(text) SECURITY INVOKER;

-- Re-grant anon+authenticated after CREATE OR REPLACE resets grants
GRANT EXECUTE ON FUNCTION public.get_engagement_counts(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_engagement_counts_many(uuid[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.profiles_public_by_ids(uuid[]) TO anon, authenticated, service_role;
