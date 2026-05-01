-- =============================================================
-- Fix: Create missing award_coin_prizes + fix consolation coins
-- Date: 2026-05-03
-- =============================================================
-- Root cause of 400 Bad Request on finalize:
--   admin_finalize_prediction_quiz calls award_coin_prizes(uuid)
--   but this function was never defined, causing a runtime error.
--
-- Also fixes award_prediction_consolation_coins which referenced
--   a non-existent quiz_prizes table.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. award_coin_prizes: awards coins to top-ranked players
--    based on the quizzes.prizes JSONB array
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.award_coin_prizes(p_quiz_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_title text;
  v_lock_key bigint;
  v_bypass text;
BEGIN
  -- Auth check: admin OR internal auto-award bypass
  v_bypass := current_setting('qd.allow_auto_award', true);

  IF NOT public.is_admin() THEN
    IF COALESCE(v_bypass, '0') <> '1' THEN
      IF (SELECT auth.uid()) IS NOT NULL THEN
        RAISE EXCEPTION 'forbidden';
      END IF;
    END IF;
  END IF;

  -- Advisory lock to prevent double-award
  SELECT (('x' || substr(md5((p_quiz_id::text || ':coin_prizes')), 1, 16))::bit(64))::bigint
    INTO v_lock_key;
  IF NOT pg_try_advisory_xact_lock(v_lock_key) THEN
    RETURN;
  END IF;

  SELECT q.title INTO v_title
  FROM public.quizzes q
  WHERE q.id = p_quiz_id;

  -- prizes is a JSONB array like ['121','71','51']
  -- index 0 = rank 1, index 1 = rank 2, etc.
  -- leaderboard is a JSONB array of {user_id, score, rank}
  WITH prize_map AS (
    SELECT
      ordinality::int AS rank_pos,
      CASE
        WHEN COALESCE(prize_text, '') ~ '^[0-9]+$' THEN GREATEST(prize_text::int, 0)
        ELSE 0
      END AS prize_coins
    FROM public.quizzes q
    CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(q.prizes, '[]'::jsonb))
      WITH ORDINALITY AS prizes(prize_text, ordinality)
    WHERE q.id = p_quiz_id
  ),
  leaderboard_entries AS (
    SELECT
      (elem->>'user_id')::uuid AS user_id,
      (elem->>'rank')::int AS rk
    FROM public.quiz_results r
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(r.leaderboard, '[]'::jsonb)) elem
    WHERE r.quiz_id = p_quiz_id
  )
  INSERT INTO public.transactions (user_id, type, amount, status, reference_id, description)
  SELECT
    le.user_id,
    'quiz_reward',
    pm.prize_coins,
    'success',
    p_quiz_id,
    concat('Rank #', le.rk, ' prize for ', COALESCE(v_title, 'quiz'))
  FROM leaderboard_entries le
  INNER JOIN prize_map pm ON pm.rank_pos = le.rk
  WHERE pm.prize_coins > 0
  ON CONFLICT (user_id, reference_id)
    WHERE (reference_id IS NOT NULL AND type='quiz_reward')
  DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.award_coin_prizes(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_coin_prizes(uuid) TO service_role;

-- ─────────────────────────────────────────────────────────────
-- 2. Fix award_prediction_consolation_coins: remove quiz_prizes
--    table dependency, use only quizzes.prizes array
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.award_prediction_consolation_coins(p_quiz_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_title text;
  v_amt int := 0;
  v_lock_key bigint;
  v_bypass text;
BEGIN
  v_bypass := current_setting('qd.allow_auto_award', true);

  IF NOT public.is_admin() THEN
    IF COALESCE(v_bypass, '0') <> '1' THEN
      IF (SELECT auth.uid()) IS NOT NULL THEN
        RAISE EXCEPTION 'forbidden';
      END IF;
    END IF;
  END IF;

  SELECT
    q.title,
    CASE
      WHEN COALESCE(q.meta->>'consolation_coins', '') ~ '^[0-9]+$' THEN GREATEST((q.meta->>'consolation_coins')::int, 0)
      ELSE 0
    END
  INTO v_title, v_amt
  FROM public.quizzes q
  WHERE q.id = p_quiz_id
    AND COALESCE(q.is_prediction, false) = true;

  IF COALESCE(v_amt, 0) <= 0 THEN
    RETURN;
  END IF;

  -- Advisory lock to prevent double-award
  SELECT (('x' || substr(md5((p_quiz_id::text || ':prediction_consolation')), 1, 16))::bit(64))::bigint
    INTO v_lock_key;
  PERFORM pg_try_advisory_xact_lock(v_lock_key);

  -- Determine winner ranks purely from quizzes.prizes array
  -- (no dependency on quiz_prizes table)
  WITH prize_ranks AS (
    SELECT ordinality::int AS rank_pos
    FROM public.quizzes q
    CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(q.prizes, '[]'::jsonb))
      WITH ORDINALITY AS prizes(prize_text, ordinality)
    WHERE q.id = p_quiz_id
      AND COALESCE(prize_text, '') ~ '^[0-9]+$'
      AND prize_text::int > 0
  ),
  winner_user_ids AS (
    SELECT DISTINCT (elem->>'user_id')::uuid AS user_id
    FROM public.quiz_results r
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(r.leaderboard, '[]'::jsonb)) elem
    INNER JOIN prize_ranks pr
      ON (elem->>'rank')::int = pr.rank_pos
    WHERE r.quiz_id = p_quiz_id
  ),
  eligible_users AS (
    SELECT DISTINCT user_id
    FROM (
      SELECT qp.user_id
      FROM public.quiz_participants qp
      WHERE qp.quiz_id = p_quiz_id
        AND qp.status = 'completed'
      UNION ALL
      SELECT ua.user_id
      FROM public.user_answers ua
      INNER JOIN public.questions q
        ON q.id = ua.question_id
       AND q.quiz_id = p_quiz_id
    ) src
    WHERE user_id IS NOT NULL
  )
  INSERT INTO public.transactions (user_id, type, amount, status, reference_id, description)
  SELECT eu.user_id,
         'quiz_reward',
         v_amt,
         'success',
         p_quiz_id,
         concat('Prediction participation reward for ', COALESCE(v_title, 'quiz'))
  FROM eligible_users eu
  LEFT JOIN winner_user_ids wu
    ON wu.user_id = eu.user_id
  WHERE wu.user_id IS NULL
  ON CONFLICT (user_id, reference_id)
    WHERE (reference_id IS NOT NULL AND type='quiz_reward')
  DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.award_prediction_consolation_coins(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_prediction_consolation_coins(uuid) TO service_role;
