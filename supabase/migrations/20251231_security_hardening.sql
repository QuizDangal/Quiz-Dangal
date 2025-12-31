-- 2025-12-31 Security hardening
--
-- Goals:
-- 1) Remove public/anonymous/authenticated ability to invoke SECURITY DEFINER maintenance writers.
-- 2) Add guardrails so accidental exposure cannot be abused.
--
-- NOTE: Apply via Supabase migrations (CLI) to keep DB state reproducible.

-- ============================================================
-- compute_quiz_results (hardened)
-- ============================================================

CREATE OR REPLACE FUNCTION public.compute_quiz_results(p_quiz_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET work_mem = '256MB'
AS $$
DECLARE
  v_board    jsonb := '[]'::jsonb;
  v_now      timestamptz := now();
  v_category text;
  v_lock_key bigint;
  v_q_count  int;
  v_uid      uuid := (SELECT auth.uid());
  v_status   text;
  v_end_time timestamptz;
BEGIN
  -- SECURITY: Do not allow arbitrary authenticated users to compute results.
  -- Allow internal callers (triggers/cron) where auth.uid() is NULL, and allow admins.
  IF v_uid IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Results should only be computed after the quiz has ended.
  SELECT q.status, q.end_time
  INTO v_status, v_end_time
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

  -- Get quiz category and question count in one query
  SELECT q.category, (SELECT COUNT(*) FROM public.questions WHERE quiz_id = p_quiz_id)
  INTO v_category, v_q_count
  FROM public.quizzes q
  WHERE q.id = p_quiz_id;

  IF v_category IS NULL OR v_q_count = 0 THEN
    RETURN;
  END IF;

  IF COALESCE(v_category, '') NOT ILIKE 'opinion%' THEN
    WITH user_scores AS (
      SELECT 
        ua.user_id,
        SUM(CASE WHEN o.is_correct THEN 1 ELSE 0 END)::int AS score,
        MAX(CASE WHEN o.is_correct THEN ua.answered_at ELSE NULL END) AS last_correct_at
      FROM public.user_answers ua
      INNER JOIN public.questions q ON q.id = ua.question_id AND q.quiz_id = p_quiz_id
      INNER JOIN public.options o ON o.id = ua.selected_option_id
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
        'score', score,
        'rank', rk
      ) ORDER BY rk
    ), '[]'::jsonb)
    INTO v_board
    FROM ranked;
  ELSE
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
        COUNT(*) FILTER (WHERE ua.selected_option_id = w.win_opt)::int AS score,
        AVG(EXTRACT(EPOCH FROM ua.answered_at)) FILTER (WHERE ua.selected_option_id = w.win_opt) AS avg_t
      FROM public.user_answers ua
      INNER JOIN q_ids ON ua.question_id = q_ids.qid
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
        'score', score,
        'rank', rk
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
    updated_at = v_now;
END;
$$;

REVOKE ALL ON FUNCTION public.compute_quiz_results(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.compute_quiz_results(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.compute_quiz_results(uuid) TO service_role;

-- ============================================================
-- finalize_due_quizzes permissions tightening
-- ============================================================

REVOKE ALL ON FUNCTION public.finalize_due_quizzes(int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finalize_due_quizzes(int) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_due_quizzes(int) TO service_role;
