-- =============================================================
-- Lock prediction question editing after quiz start
-- Date: 2026-04-20
-- =============================================================
-- Requirement:
-- - IPL prediction quiz ke questions/options start_time ke baad edit nahi hone chahiye.
-- - Exception: official result finalization ke liye options.is_correct update allowed rahe.

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
BEGIN
  IF TG_TABLE_NAME = 'questions' THEN
    v_quiz_id := COALESCE(NEW.quiz_id, OLD.quiz_id);

  ELSIF TG_TABLE_NAME = 'options' THEN
    v_question_id := COALESCE(NEW.question_id, OLD.question_id);
    SELECT q.quiz_id INTO v_quiz_id
    FROM public.questions q
    WHERE q.id = v_question_id;

    -- For updates in options table, allow official answer finalization after start
    -- when only is_correct flag is changed.
    IF TG_OP = 'UPDATE' THEN
      IF NEW.question_id IS NOT DISTINCT FROM OLD.question_id
         AND NEW.option_text IS NOT DISTINCT FROM OLD.option_text
         AND NEW.is_correct IS DISTINCT FROM OLD.is_correct THEN
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

DROP TRIGGER IF EXISTS trg_prediction_question_window_on_questions ON public.questions;
CREATE TRIGGER trg_prediction_question_window_on_questions
BEFORE INSERT OR UPDATE OR DELETE ON public.questions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_prediction_question_mutation_window();

DROP TRIGGER IF EXISTS trg_prediction_question_window_on_options ON public.options;
CREATE TRIGGER trg_prediction_question_window_on_options
BEFORE INSERT OR UPDATE OR DELETE ON public.options
FOR EACH ROW
EXECUTE FUNCTION public.enforce_prediction_question_mutation_window();
