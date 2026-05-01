ALTER TABLE public.quizzes
ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb NOT NULL;

ALTER TABLE public.quizzes
ADD COLUMN IF NOT EXISTS is_prediction boolean DEFAULT false;

UPDATE public.quizzes
SET is_prediction = false
WHERE is_prediction IS NULL;

ALTER TABLE public.quizzes
ALTER COLUMN is_prediction SET DEFAULT false;

ALTER TABLE public.quizzes
ALTER COLUMN is_prediction SET NOT NULL;

ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS points integer DEFAULT 1 NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'questions_points_positive'
      AND conrelid = 'public.questions'::regclass
  ) THEN
    ALTER TABLE public.questions
    ADD CONSTRAINT questions_points_positive CHECK (points > 0);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.award_prediction_consolation_coins(p_quiz_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_prediction_results_if_due(p_quiz_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_correct_answers(p_quiz_id uuid, p_answers jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  elem jsonb;
  v_is_prediction boolean := false;
  v_end_time timestamptz;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF COALESCE(jsonb_typeof(p_answers), 'null') <> 'array' THEN
    RAISE EXCEPTION 'invalid_answers_payload';
  END IF;

  SELECT COALESCE(q.is_prediction, false), q.end_time
    INTO v_is_prediction, v_end_time
  FROM public.quizzes q
  WHERE q.id = p_quiz_id;

  UPDATE public.options
     SET is_correct = false
   WHERE question_id IN (
     SELECT DISTINCT (elem->>'question_id')::uuid
     FROM jsonb_array_elements(p_answers) elem
     WHERE COALESCE(elem->>'question_id', '') <> ''
   )
     AND question_id IN (SELECT id FROM public.questions WHERE quiz_id = p_quiz_id);

  FOR elem IN SELECT * FROM jsonb_array_elements(p_answers)
  LOOP
    UPDATE public.options
       SET is_correct = true
     WHERE id = (elem->>'correct_option_id')::uuid
       AND question_id = (elem->>'question_id')::uuid;
  END LOOP;

  IF v_is_prediction AND (v_end_time IS NULL OR v_end_time <= now()) THEN
    UPDATE public.quizzes
       SET status = 'finished',
           updated_at = now()
     WHERE id = p_quiz_id
       AND status <> 'completed';

    PERFORM public.compute_quiz_results(p_quiz_id);
    PERFORM public.publish_prediction_results_if_due(p_quiz_id);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.compute_quiz_results(p_quiz_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET work_mem TO '256MB'
AS $$
DECLARE
  v_board jsonb := '[]'::jsonb;
  v_now timestamptz := now();
  v_category text;
  v_is_prediction boolean := false;
  v_lock_key bigint;
  v_q_count int;
  v_uid uuid := (SELECT auth.uid());
  v_status text;
  v_end_time timestamptz;
BEGIN
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

  SELECT (('x' || substr(md5(p_quiz_id::text), 1, 16))::bit(64))::bigint INTO v_lock_key;
  IF NOT pg_try_advisory_xact_lock(v_lock_key) THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_q_count FROM public.questions WHERE quiz_id = p_quiz_id;
  IF v_q_count = 0 THEN
    RETURN;
  END IF;

  IF v_is_prediction THEN
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
      INNER JOIN public.options o ON o.id = ua.selected_option_id AND o.is_correct = true
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
        'score', score,
        'rank', rk
      ) ORDER BY rk
    ), '[]'::jsonb)
    INTO v_board
    FROM ranked;
  ELSIF COALESCE(v_category, '') NOT ILIKE 'opinion%' THEN
    WITH user_scores AS (
      SELECT
        ua.user_id,
        COALESCE(SUM(CASE WHEN o.is_correct THEN GREATEST(COALESCE(q.points, 1), 1) ELSE 0 END), 0)::int AS score,
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

CREATE OR REPLACE FUNCTION public.compute_results_if_due(p_quiz_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_end timestamptz;
  v_type text;
  v_is_pred boolean;
BEGIN
  SELECT end_time, prize_type, COALESCE(is_prediction, false)
    INTO v_end, v_type, v_is_pred
  FROM public.quizzes
  WHERE id = p_quiz_id;

  IF v_end IS NULL OR v_end > now() THEN
    RETURN;
  END IF;

  IF v_is_pred THEN
    UPDATE public.quizzes
       SET status = 'finished',
           updated_at = now()
     WHERE id = p_quiz_id
       AND status <> 'completed';
    PERFORM public.publish_prediction_results_if_due(p_quiz_id);
    RETURN;
  END IF;

  PERFORM public.compute_quiz_results(p_quiz_id);

  IF COALESCE(v_type, 'money') = 'coins' THEN
    BEGIN
      PERFORM set_config('qd.allow_auto_award', '1', true);
      PERFORM public.award_coin_prizes(p_quiz_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'auto award failed for %: %', p_quiz_id, SQLERRM;
    END;
  END IF;

  UPDATE public.quiz_results
     SET result_shown_at = COALESCE(result_shown_at, now()),
         updated_at = now()
   WHERE quiz_id = p_quiz_id;

  UPDATE public.quizzes
     SET status = 'completed',
         updated_at = now()
   WHERE id = p_quiz_id
     AND status <> 'completed';
END;
$$;

CREATE OR REPLACE FUNCTION public.tick_quiz_slots()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now_tz timestamptz := now();
  v_activated int := 0;
  v_finished int := 0;
  v_skipped int := 0;
  v_quizzes_created int := 0;
  v_deleted int := 0;
  v_results_computed int := 0;
  v_manual_finished int := 0;
  v_expired_skipped int := 0;
  rec record;
  new_question_id uuid;
  q_rec record;
  opt_rec record;
  v_question_text text;
  v_option_text text;
  v_is_correct boolean;
  v_new_quiz_id uuid;
BEGIN
  FOR rec IN
    SELECT s.*
    FROM quiz_slots s
    LEFT JOIN quizzes q ON q.slot_id = s.id
    LEFT JOIN category_runtime_overrides o ON s.category = o.category
    WHERE s.status = 'scheduled'
      AND s.start_timestamp IS NOT NULL
      AND s.end_timestamp IS NOT NULL
      AND s.start_timestamp <= v_now_tz + interval '5 minutes'
      AND s.end_timestamp > v_now_tz
      AND (o.is_auto IS NULL OR o.is_auto = true)
      AND q.id IS NULL
  LOOP
    v_new_quiz_id := gen_random_uuid();

    INSERT INTO quizzes (id, slot_id, title, status, category, prizes, prize_type, start_time, end_time, created_at)
    VALUES (
      v_new_quiz_id,
      rec.id,
      rec.quiz_title,
      'upcoming',
      rec.category,
      rec.prizes,
      'coins',
      rec.start_timestamp,
      rec.end_timestamp,
      NOW()
    );

    IF rec.questions IS NOT NULL AND jsonb_typeof(rec.questions) = 'array' THEN
      FOR q_rec IN SELECT * FROM jsonb_array_elements(rec.questions)
      LOOP
        v_question_text := COALESCE(
          q_rec.value->>'question_text',
          q_rec.value->>'text',
          ''
        );

        IF v_question_text = '' OR length(v_question_text) < 3 THEN
          CONTINUE;
        END IF;

        new_question_id := gen_random_uuid();

        INSERT INTO questions (id, quiz_id, question_text, created_at)
        VALUES (new_question_id, v_new_quiz_id, v_question_text, now());

        IF q_rec.value->'options' IS NOT NULL AND jsonb_typeof(q_rec.value->'options') = 'array' THEN
          FOR opt_rec IN SELECT value, ordinality FROM jsonb_array_elements(q_rec.value->'options') WITH ORDINALITY
          LOOP
            v_option_text := COALESCE(
              opt_rec.value->>'option_text',
              opt_rec.value->>'text',
              opt_rec.value::text
            );

            IF v_option_text LIKE '"%"' THEN
              v_option_text := trim(both '"' from v_option_text);
            END IF;

            IF v_option_text = '' OR v_option_text = 'null' THEN
              CONTINUE;
            END IF;

            v_is_correct := COALESCE(
              (opt_rec.value->>'is_correct')::boolean,
              (opt_rec.value->>'correct')::boolean,
              false
            );

            INSERT INTO options (id, question_id, option_text, is_correct)
            VALUES (gen_random_uuid(), new_question_id, v_option_text, v_is_correct);
          END LOOP;
        END IF;
      END LOOP;
    END IF;

    v_quizzes_created := v_quizzes_created + 1;
  END LOOP;

  WITH skipped AS (
    UPDATE quiz_slots s
    SET status = 'skipped'
    FROM category_runtime_overrides o
    WHERE s.category = o.category
      AND o.is_auto = false
      AND s.status = 'scheduled'
      AND s.end_timestamp < v_now_tz
    RETURNING s.id
  )
  SELECT COUNT(*) INTO v_skipped FROM skipped;

  WITH expired_no_quiz AS (
    UPDATE quiz_slots s
    SET status = 'skipped'
    WHERE s.status = 'scheduled'
      AND s.end_timestamp IS NOT NULL
      AND s.end_timestamp <= v_now_tz
      AND NOT EXISTS (SELECT 1 FROM quizzes q WHERE q.slot_id = s.id)
    RETURNING s.id
  )
  SELECT COUNT(*) INTO v_expired_skipped FROM expired_no_quiz;
  v_skipped := v_skipped + v_expired_skipped;

  FOR rec IN
    SELECT s.*
    FROM quiz_slots s
    LEFT JOIN category_runtime_overrides o ON s.category = o.category
    WHERE s.status = 'scheduled'
      AND s.start_timestamp IS NOT NULL
      AND s.end_timestamp IS NOT NULL
      AND s.start_timestamp <= v_now_tz
      AND s.end_timestamp > v_now_tz
      AND (o.is_auto IS NULL OR o.is_auto = true)
  LOOP
    UPDATE quiz_slots SET status = 'active' WHERE id = rec.id;
    v_activated := v_activated + 1;

    UPDATE quizzes
    SET status = 'active', updated_at = now()
    WHERE slot_id = rec.id;
  END LOOP;

  FOR rec IN
    SELECT s.id as slot_id, q.id as quiz_id, COALESCE(q.is_prediction, false) AS is_prediction
    FROM quiz_slots s
    INNER JOIN quizzes q ON q.slot_id = s.id
    WHERE s.status IN ('active', 'live', 'scheduled')
      AND s.end_timestamp <= v_now_tz
  LOOP
    UPDATE quiz_slots SET status = 'finished' WHERE id = rec.slot_id;
    v_finished := v_finished + 1;

    UPDATE quizzes
    SET status = CASE WHEN rec.is_prediction THEN 'finished' ELSE 'completed' END,
        updated_at = now()
    WHERE id = rec.quiz_id
      AND status <> CASE WHEN rec.is_prediction THEN 'finished' ELSE 'completed' END;

    BEGIN
      PERFORM public.compute_results_if_due(rec.quiz_id);
      v_results_computed := v_results_computed + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Result computation failed for quiz %: %', rec.quiz_id, SQLERRM;
    END;
  END LOOP;

  UPDATE quizzes
  SET status = 'active', updated_at = now()
  WHERE slot_id IS NULL
    AND status = 'upcoming'
    AND start_time IS NOT NULL
    AND end_time IS NOT NULL
    AND start_time <= v_now_tz
    AND end_time > v_now_tz;

  FOR rec IN
    SELECT q.id as quiz_id, COALESCE(q.is_prediction, false) AS is_prediction
    FROM quizzes q
    LEFT JOIN quiz_results qr ON qr.quiz_id = q.id
    WHERE q.slot_id IS NULL
      AND q.status IN ('upcoming', 'active', 'finished')
      AND q.end_time IS NOT NULL
      AND q.end_time <= v_now_tz
  LOOP
    UPDATE quizzes
    SET status = CASE WHEN rec.is_prediction THEN 'finished' ELSE 'completed' END,
        updated_at = now()
    WHERE id = rec.quiz_id
      AND status <> CASE WHEN rec.is_prediction THEN 'finished' ELSE 'completed' END;

    v_manual_finished := v_manual_finished + 1;

    BEGIN
      PERFORM public.compute_results_if_due(rec.quiz_id);
      v_results_computed := v_results_computed + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Result computation failed for manual quiz %: %', rec.quiz_id, SQLERRM;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'quizzes_created', v_quizzes_created,
    'activated', v_activated,
    'finished', v_finished,
    'manual_finished', v_manual_finished,
    'results_computed', v_results_computed,
    'skipped', v_skipped,
    'deleted', v_deleted,
    'run_at', v_now_tz
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_prediction_results_if_due(p_quiz_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_type text;
  v_is_pred boolean := false;
  v_status text;
  v_publish_at timestamptz;
  v_missing_answers int := 0;
BEGIN
  IF v_uid IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT
    COALESCE(q.prize_type, 'money'),
    COALESCE(q.is_prediction, false),
    q.status,
    CASE
      WHEN COALESCE(q.meta->>'result_publish_at', '') <> '' THEN (q.meta->>'result_publish_at')::timestamptz
      ELSE NULL
    END
  INTO v_type, v_is_pred, v_status, v_publish_at
  FROM public.quizzes q
  WHERE q.id = p_quiz_id;

  IF NOT v_is_pred OR v_status = 'completed' THEN
    RETURN false;
  END IF;

  IF v_publish_at IS NULL OR v_publish_at > now() THEN
    RETURN false;
  END IF;

  SELECT COUNT(*)
    INTO v_missing_answers
  FROM public.questions q
  LEFT JOIN LATERAL (
    SELECT COUNT(*) FILTER (WHERE o.is_correct) AS correct_count
    FROM public.options o
    WHERE o.question_id = q.id
  ) corrects ON true
  WHERE q.quiz_id = p_quiz_id
    AND COALESCE(corrects.correct_count, 0) <> 1;

  IF v_missing_answers > 0 THEN
    RETURN false;
  END IF;

  PERFORM public.compute_quiz_results(p_quiz_id);

  IF v_type = 'coins' THEN
    PERFORM set_config('qd.allow_auto_award', '1', true);
    PERFORM public.award_coin_prizes(p_quiz_id);
  END IF;

  PERFORM public.award_prediction_consolation_coins(p_quiz_id);

  UPDATE public.quiz_results
     SET result_shown_at = COALESCE(result_shown_at, now()),
         updated_at = now()
   WHERE quiz_id = p_quiz_id;

  UPDATE public.quizzes
     SET status = 'completed',
         updated_at = now()
   WHERE id = p_quiz_id
     AND status <> 'completed';

  RETURN true;
END;
$$;

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

  SELECT (('x' || substr(md5((p_quiz_id::text || ':prediction_consolation')), 1, 16))::bit(64))::bigint
    INTO v_lock_key;
  PERFORM pg_try_advisory_xact_lock(v_lock_key);

  WITH json_prizes AS (
    SELECT prizes.ord::int AS rank_pos,
           NULLIF(prizes.prize_text, '')::numeric AS amt
    FROM public.quizzes q
    CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(q.prizes, '[]'::jsonb))
      WITH ORDINALITY AS prizes(prize_text, ord)
    WHERE q.id = p_quiz_id
  ),
  winner_ranks AS (
    SELECT rank_from, rank_to
    FROM public.quiz_prizes
    WHERE quiz_id = p_quiz_id
      AND prize_coins > 0
    UNION ALL
    SELECT jp.rank_pos, jp.rank_pos
    FROM json_prizes jp
    WHERE jp.amt IS NOT NULL
      AND jp.amt > 0
      AND NOT EXISTS (
            SELECT 1
            FROM public.quiz_prizes qp
            WHERE qp.quiz_id = p_quiz_id
              AND qp.prize_coins > 0
          )
  ),
  winner_user_ids AS (
    SELECT DISTINCT (elem->>'user_id')::uuid AS user_id
    FROM public.quiz_results r
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(r.leaderboard, '[]'::jsonb)) elem
    JOIN winner_ranks wr
      ON ((elem->>'rank')::int BETWEEN wr.rank_from AND wr.rank_to)
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

CREATE OR REPLACE FUNCTION public.admin_finalize_prediction_quiz(p_quiz_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_type text;
  v_missing_answers int := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COUNT(*)
    INTO v_missing_answers
  FROM public.questions q
  LEFT JOIN LATERAL (
    SELECT COUNT(*) FILTER (WHERE o.is_correct) AS correct_count
    FROM public.options o
    WHERE o.question_id = q.id
  ) corrects ON true
  WHERE q.quiz_id = p_quiz_id
    AND COALESCE(corrects.correct_count, 0) <> 1;

  IF v_missing_answers > 0 THEN
    RAISE EXCEPTION 'official_answers_incomplete';
  END IF;

  PERFORM public.compute_quiz_results(p_quiz_id);

  SELECT COALESCE(prize_type, 'money') INTO v_type FROM public.quizzes WHERE id = p_quiz_id;

  IF v_type = 'coins' THEN
    PERFORM set_config('qd.allow_auto_award', '1', true);
    PERFORM public.award_coin_prizes(p_quiz_id);
  END IF;

  PERFORM public.award_prediction_consolation_coins(p_quiz_id);

  UPDATE public.quiz_results
     SET result_shown_at = COALESCE(result_shown_at, now()),
         updated_at = now()
   WHERE quiz_id = p_quiz_id;

  UPDATE public.quizzes
     SET status = 'completed',
         updated_at = now()
   WHERE id = p_quiz_id
     AND status <> 'completed';
END;
$$;
