-- =============================================================
-- Performance indexes round 2
-- Date: 2026-05-01
-- =============================================================
-- Adds targeted indexes for the hottest frontend/backend query paths seen in
-- pg_stat_user_tables and app SQL usage. Avoids broad/random indexes.
-- =============================================================

-- Questions are repeatedly loaded/updated by quiz and ordered by position.
CREATE INDEX IF NOT EXISTS idx_questions_quiz_position
  ON public.questions (quiz_id, position, id);

-- Options are loaded by question_id through nested selects and result compute joins.
CREATE INDEX IF NOT EXISTS idx_options_question_id
  ON public.options (question_id, id);

CREATE INDEX IF NOT EXISTS idx_options_question_correct
  ON public.options (question_id, is_correct)
  WHERE is_correct = true;

-- Participant status is frequently checked by current user + quiz/slot.
CREATE INDEX IF NOT EXISTS idx_qp_user_quiz_status
  ON public.quiz_participants (user_id, quiz_id, status);

CREATE INDEX IF NOT EXISTS idx_qp_user_slot_status
  ON public.quiz_participants (user_id, slot_id, status)
  WHERE slot_id IS NOT NULL;

-- Scheduler/category dashboards filter date/category/status together.
CREATE INDEX IF NOT EXISTS idx_quiz_slots_date_category_status
  ON public.quiz_slots (target_date, category, status);

CREATE INDEX IF NOT EXISTS idx_quiz_slots_status_start
  ON public.quiz_slots (status, start_timestamp);

-- Common quiz listing path by status/category/start time.
CREATE INDEX IF NOT EXISTS idx_quizzes_status_category_start
  ON public.quizzes (status, category, start_time DESC);

-- Unique quiz_results(quiz_id) already backs quiz_id lookups; remove redundant non-unique index.
DROP INDEX IF EXISTS public.idx_quiz_results_quiz_id;
