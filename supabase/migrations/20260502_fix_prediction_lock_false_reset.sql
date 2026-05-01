-- =============================================================
-- Fix: prediction_questions_locked_after_start false-positive
-- Date: 2026-05-02
-- =============================================================
-- Bug:
--   admin_update_correct_answers() bulk-resets all options for affected
--   questions with `UPDATE options SET is_correct = false` before
--   marking the chosen option TRUE. For rows already false, OLD.is_correct
--   IS NOT DISTINCT FROM NEW.is_correct, so the previous trigger's
--   early-return branch (which required is_correct to ACTUALLY change)
--   was skipped. The lock block then raised
--   `prediction_questions_locked_after_start` even though the caller was
--   only finalizing official answers.
--
-- Fix:
--   Allow any UPDATE on options that leaves question_id and option_text
--   unchanged — regardless of whether is_correct value changed. This
--   still blocks text/structure edits after match start (the real intent
--   of the lock) while permitting answer finalization.
-- =============================================================

CREATE OR REPLACE FUNCTION public.enforce_prediction_question_mutation_window()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_quiz_id uuid;
  v_question_id uuid;
  v_is_prediction boolean := false;
  v_start_time timestamptz;
  v_bypass text;
BEGIN
  -- Admin-initiated cascade operations (e.g. delete quiz) can set this GUC
  -- to bypass the post-start lock. Only admins can set it via SECURITY DEFINER
  -- helper functions, so it cannot be abused by ordinary users.
  v_bypass := current_setting('qd.allow_prediction_mutation', true);
  IF COALESCE(v_bypass, '0') = '1' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_TABLE_NAME = 'questions' THEN
    v_quiz_id := COALESCE(NEW.quiz_id, OLD.quiz_id);

  ELSIF TG_TABLE_NAME = 'options' THEN
    v_question_id := COALESCE(NEW.question_id, OLD.question_id);
    SELECT q.quiz_id INTO v_quiz_id
    FROM public.questions q
    WHERE q.id = v_question_id;

    -- For UPDATE on options: allow any change that leaves question_id and
    -- option_text unchanged. This covers both real is_correct flips AND
    -- bulk resets (where is_correct ends up unchanged on already-false rows).
    IF TG_OP = 'UPDATE' THEN
      IF NEW.question_id IS NOT DISTINCT FROM OLD.question_id
         AND NEW.option_text IS NOT DISTINCT FROM OLD.option_text THEN
        RETURN NEW;
      END IF;
    END IF;
  END IF;

  IF v_quiz_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(is_prediction, false), start_time
    INTO v_is_prediction, v_start_time
  FROM public.quizzes
  WHERE id = v_quiz_id;

  IF v_is_prediction
     AND v_start_time IS NOT NULL
     AND v_start_time <= now() THEN
    RAISE EXCEPTION 'prediction_questions_locked_after_start';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- =============================================================
-- Admin helper: fully delete a quiz (used by IPL manager)
-- =============================================================
-- Safely removes all dependent rows in the correct order. Bypasses
-- the prediction-lock trigger via the qd.allow_prediction_mutation GUC
-- so the admin can clean up wrongly scheduled matches.
-- =============================================================

CREATE OR REPLACE FUNCTION public.admin_delete_quiz(p_quiz_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  PERFORM set_config('qd.allow_prediction_mutation', '1', true);

  -- User answers first (references questions+options)
  DELETE FROM public.user_answers
   WHERE question_id IN (
     SELECT id FROM public.questions WHERE quiz_id = p_quiz_id
   );

  -- Participants & results
  DELETE FROM public.quiz_participants WHERE quiz_id = p_quiz_id;
  DELETE FROM public.quiz_results      WHERE quiz_id = p_quiz_id;

  -- Options → questions → quiz
  DELETE FROM public.options
   WHERE question_id IN (
     SELECT id FROM public.questions WHERE quiz_id = p_quiz_id
   );
  DELETE FROM public.questions WHERE quiz_id = p_quiz_id;
  DELETE FROM public.quizzes   WHERE id = p_quiz_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_quiz(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_quiz(uuid) TO service_role;
