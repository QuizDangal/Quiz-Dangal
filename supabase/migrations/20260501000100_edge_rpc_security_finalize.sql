-- =============================================================
-- Finalize SECURITY DEFINER hardening via Edge Functions
-- Date: 2026-05-01
-- =============================================================
-- Browser direct calls for privileged admin/referral/username RPCs are replaced
-- by Edge Functions that verify the user JWT and then use service_role.
-- This migration removes authenticated EXECUTE from those privileged functions.
-- =============================================================

-- Make is_admin() true for trusted service_role callers used by Edge Functions.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    OR current_user = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND lower(coalesce(p.role, '')) = 'admin'
    );
$function$;

-- User self-service: safe as invoker because RLS permits own rows only.
CREATE OR REPLACE FUNCTION public.handle_daily_login(user_uuid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_today date := current_date;
  v_yesterday date := current_date - 1;
  v_prev int := 0;
  v_is_new boolean := false;
  v_streak int := 1;
  v_coins int := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF user_uuid IS NOT NULL AND user_uuid <> v_user THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM public.daily_streaks WHERE user_id = v_user AND login_date = v_today) THEN
    SELECT streak_day, coalesce(coins_earned, 0)
      INTO v_streak, v_coins
    FROM public.daily_streaks
    WHERE user_id = v_user AND login_date = v_today;
    RETURN json_build_object('is_new_login', false, 'streak_day', v_streak, 'coins_earned', v_coins);
  END IF;

  SELECT streak_day INTO v_prev
  FROM public.daily_streaks
  WHERE user_id = v_user AND login_date = v_yesterday;

  v_streak := coalesce(v_prev, 0) + 1;
  v_is_new := true;
  v_coins := least(50, 10 + greatest(v_streak - 1, 0) * 5);

  INSERT INTO public.daily_streaks(user_id, login_date, streak_day, coins_earned)
  VALUES (v_user, v_today, v_streak, v_coins);

  UPDATE public.profiles
  SET current_streak = v_streak,
      max_streak = greatest(coalesce(max_streak, 0), v_streak),
      last_login_date = v_today,
      updated_at = now()
  WHERE id = v_user;

  RETURN json_build_object('is_new_login', v_is_new, 'streak_day', v_streak, 'coins_earned', v_coins);
END;
$function$;

-- Push subscription save: own endpoint only, safe as invoker under RLS.
CREATE OR REPLACE FUNCTION public.save_push_subscription(p_subscription_object jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_endpoint text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  v_endpoint := NULLIF(COALESCE(p_subscription_object->>'endpoint', ''), '');
  IF v_endpoint IS NULL OR LENGTH(v_endpoint) < 10 THEN
    RAISE EXCEPTION 'invalid endpoint';
  END IF;

  INSERT INTO public.push_subscriptions(user_id, subscription_object)
  VALUES (v_user, p_subscription_object)
  ON CONFLICT (user_id, endpoint)
  DO UPDATE SET subscription_object = EXCLUDED.subscription_object,
                updated_at = now();

  UPDATE public.profiles
  SET notifications_enabled = true
  WHERE id = v_user;
END;
$function$;

-- App-required user grants for invoker functions.
GRANT EXECUTE ON FUNCTION public.handle_daily_login(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_push_subscription(jsonb) TO authenticated, service_role;

-- These now run only through Edge Function user-rpc (service_role after JWT check).
REVOKE EXECUTE ON FUNCTION public.handle_referral_bonus(uuid, text) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_username_available(text, uuid) FROM authenticated, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_referral_bonus(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_username_available(text, uuid) TO service_role;

-- Privileged admin functions now run only through Edge Function admin-rpc.
REVOKE EXECUTE ON FUNCTION public.admin_reject_redemption(uuid, text) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_seed_quiz_day_multi(jsonb) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_seed_quiz_day_single(jsonb) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_update_correct_answers(uuid, jsonb) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_finalize_prediction_quiz(uuid) FROM authenticated, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reject_redemption(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_seed_quiz_day_multi(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_seed_quiz_day_single(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_correct_answers(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_finalize_prediction_quiz(uuid) TO service_role;
