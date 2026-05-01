-- =============================================================
-- Fix: compute_quiz_results must use admin-marked correct answers
--       for IPL prediction quizzes (is_prediction = true) instead
--       of the legacy opinion majority-vote scoring.
-- Date: 2026-05-04
-- =============================================================
-- Bug: The prod DB still had the old compute_quiz_results body from
-- 20251231_security_hardening (no is_prediction branch). The newer
-- 20260420_ipl_prediction_quiz.sql migration that introduced the
-- prediction branch never reached prod because several migration
-- files shared the same YYYYMMDD prefix and Supabase CLI treated
-- them as the same version. Result:
--   1. Admin marks official correct answers via admin_update_correct_answers.
--   2. admin_finalize_prediction_quiz calls compute_quiz_results.
--   3. Old compute_quiz_results ignores is_correct and falls into the
--      opinion majority-vote branch, so the leaderboard is built from
--      whichever option the crowd picked most, not the official answer.
--   4. award_coin_prizes then hands rank-1/2/3 prizes to the wrong users
--      and award_prediction_consolation_coins rewards the wrong "losers".
--
-- Fix: Re-create compute_quiz_results with a dedicated prediction
-- branch (time-decay scoring across options flagged is_correct=true)
-- while preserving regular-quiz and opinion-majority branches.
-- =============================================================

CREATE OR REPLACE FUNCTION public.compute_quiz_results(p_quiz_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET work_mem TO '256MB'
AS $$
DECLARE
  v_board         jsonb := '[]'::jsonb;
  v_now           timestamptz := now();
  v_category      text;
  v_is_prediction boolean := false;
  v_lock_key      bigint;
  v_q_count       int;
  v_uid           uuid := (SELECT auth.uid());
  v_status        text;
  v_end_time      timestamptz;
BEGIN
  -- Security: only admins OR internal service_role callers (auth.uid() IS NULL)
  IF v_uid IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT q.status, q.end_time, q.category, COALESCE(q.is_prediction, false)
    INTO v_status, v_end_time, v_category, v_is_prediction
  FROM public.quizzes q
  WHERE q.id = p_quiz_id;

  IF v_status IS NULL THEN
    RETURN;
  END IF;

  IF v_end_time IS NOT NULL AND v_end_time > v_now THEN
    RAISE EXCEPTION 'results_not_ready';
  END IF;

  -- Advisory lock to prevent concurrent computation
  SELECT (('x' || substr(md5(p_quiz_id::text), 1, 16))::bit(64))::bigint INTO v_lock_key;
  IF NOT pg_try_advisory_xact_lock(v_lock_key) THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_q_count FROM public.questions WHERE quiz_id = p_quiz_id;
  IF v_q_count = 0 THEN
    RETURN;
  END IF;

  IF v_is_prediction THEN
    -- IPL / prediction quizzes: admin marks the official correct option
    -- via admin_update_correct_answers. Score = sum of question points
    -- weighted by speed of answer. Only users with correct picks score.
    WITH correct_answers AS (
      SELECT
        ua.user_id,
        ua.question_id,
        GREATEST(COALESCE(q.points, 1), 1)::numeric AS question_points,
        ua.answered_at,
        MIN(ua.answered_at) OVER (PARTITION BY ua.question_id) AS first_correct_at,
        MAX(ua.answered_at) OVER (PARTITION BY ua.question_id) AS last_correct_at
      FROM public.user_answers ua
      INNER JOIN public.questions q ON q.id = ua.question_id AND q.quiz_id = p_quiz_id
      INNER JOIN public.options   o ON o.id = ua.selected_option_id AND o.is_correct = true
    ),
    scored_answers AS (
      SELECT
        user_id,
        answered_at,
        ROUND(
          question_points * 0.8 +
          question_points * 0.2 *
            CASE
              WHEN first_correct_at IS NULL THEN 0::numeric
              WHEN last_correct_at IS NULL OR last_correct_at = first_correct_at THEN 1::numeric
              ELSE GREATEST(
                0::numeric,
                LEAST(
                  1::numeric,
                  (EXTRACT(EPOCH FROM (last_correct_at - answered_at)) / NULLIF(EXTRACT(EPOCH FROM (last_correct_at - first_correct_at)), 0))::numeric
                )
              )
            END,
          2
        ) AS earned_score
      FROM correct_answers
    ),
    user_scores AS (
      SELECT
        user_id,
        ROUND(COALESCE(SUM(earned_score), 0), 2) AS score,
        MAX(answered_at) AS last_correct_at
      FROM scored_answers
      GROUP BY user_id
    ),
    ranked AS (
      SELECT
        user_id,
        score,
        ROW_NUMBER() OVER (
          ORDER BY score DESC, last_correct_at ASC NULLS LAST, user_id
        ) AS rk
      FROM user_scores
      WHERE score > 0
    )
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'user_id', user_id,
        'score',   score,
        'rank',    rk
      ) ORDER BY rk
    ), '[]'::jsonb)
      INTO v_board
    FROM ranked;

  ELSIF COALESCE(v_category, '') NOT ILIKE 'opinion%' THEN
    -- Regular quizzes: score based on is_correct flags (fixed points per Q)
    WITH user_scores AS (
      SELECT
        ua.user_id,
        COALESCE(SUM(CASE WHEN o.is_correct THEN GREATEST(COALESCE(q.points, 1), 1) ELSE 0 END), 0)::int AS score,
        MAX(CASE WHEN o.is_correct THEN ua.answered_at ELSE NULL END) AS last_correct_at
      FROM public.user_answers ua
      INNER JOIN public.questions q ON q.id = ua.question_id AND q.quiz_id = p_quiz_id
      INNER JOIN public.options   o ON o.id = ua.selected_option_id
      GROUP BY ua.user_id
    ),
    ranked AS (
      SELECT
        user_id,
        score,
        ROW_NUMBER() OVER (
          ORDER BY score DESC, last_correct_at ASC NULLS LAST, user_id
        ) AS rk
      FROM user_scores
    )
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'user_id', user_id,
        'score',   score,
        'rank',    rk
      ) ORDER BY rk
    ), '[]'::jsonb)
      INTO v_board
    FROM ranked;

  ELSE
    -- Opinion quizzes (non-prediction): crowd majority picks the "winning" option.
    WITH
    q_ids AS MATERIALIZED (
      SELECT id AS qid FROM public.questions WHERE quiz_id = p_quiz_id
    ),
    vote_counts AS MATERIALIZED (
      SELECT
        ua.question_id,
        ua.selected_option_id,
        COUNT(*) AS cnt
      FROM public.user_answers ua
      WHERE ua.question_id IN (SELECT qid FROM q_ids)
      GROUP BY ua.question_id, ua.selected_option_id
    ),
    winners AS MATERIALIZED (
      SELECT DISTINCT ON (question_id)
        question_id,
        selected_option_id AS win_opt
      FROM vote_counts
      ORDER BY question_id, cnt DESC, selected_option_id
    ),
    user_scores AS (
      SELECT
        ua.user_id,
        COALESCE(SUM(CASE WHEN ua.selected_option_id = w.win_opt THEN GREATEST(COALESCE(q.points, 1), 1) ELSE 0 END), 0)::int AS score,
        AVG(EXTRACT(EPOCH FROM ua.answered_at)) FILTER (WHERE ua.selected_option_id = w.win_opt) AS avg_t
      FROM public.user_answers ua
      INNER JOIN q_ids ON ua.question_id = q_ids.qid
      INNER JOIN public.questions q ON q.id = ua.question_id
      LEFT JOIN winners w ON ua.question_id = w.question_id
      GROUP BY ua.user_id
    ),
    ranked AS (
      SELECT
        user_id,
        score,
        ROW_NUMBER() OVER (ORDER BY score DESC, avg_t ASC NULLS LAST, user_id) AS rk
      FROM user_scores
      WHERE score > 0
    )
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'user_id', user_id,
        'score',   score,
        'rank',    rk
      ) ORDER BY rk
    ), '[]'::jsonb)
      INTO v_board
    FROM ranked;
  END IF;

  INSERT INTO public.quiz_results AS qr
    (quiz_id, leaderboard, created_at, result_shown_at, updated_at)
  VALUES
    (p_quiz_id, v_board, v_now, NULL, v_now)
  ON CONFLICT (quiz_id)
  DO UPDATE SET
    leaderboard = EXCLUDED.leaderboard,
    updated_at  = v_now;
END;
$$;

REVOKE ALL ON FUNCTION public.compute_quiz_results(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.compute_quiz_results(uuid) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.compute_quiz_results(uuid) TO service_role;

-- Refresh PostgREST schema cache so freshly defined/replaced RPCs
-- (admin_delete_quiz etc.) are visible without a pg restart.
NOTIFY pgrst, 'reload schema';
