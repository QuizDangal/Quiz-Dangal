-- =============================================================
-- Security hardening for IPL prediction admin functions + RLS
-- Date: 2026-04-20
-- =============================================================
-- Goals:
--   1. Restrict privileged DB functions to service_role / admins only.
--   2. Ensure quizzes/questions/options tables have RLS with admin-write policies.
--   3. Block non-admins from using anon/authenticated role to mutate sensitive data.
-- =============================================================

-- ---------------------------------------------------------------
-- SECTION 1: REVOKE / GRANT for IPL admin functions
-- ---------------------------------------------------------------

REVOKE ALL ON FUNCTION public.admin_update_correct_answers(uuid, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_update_correct_answers(uuid, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_correct_answers(uuid, jsonb) TO authenticated;
-- Note: admin_update_correct_answers internally calls is_admin(), so authenticated role is allowed
-- but non-admins will get EXCEPTION 'forbidden'.

REVOKE ALL ON FUNCTION public.admin_finalize_prediction_quiz(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_finalize_prediction_quiz(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_finalize_prediction_quiz(uuid) TO authenticated;
-- Internally guards with is_admin().

REVOKE ALL ON FUNCTION public.award_prediction_consolation_coins(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.award_prediction_consolation_coins(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_prediction_consolation_coins(uuid) TO service_role;
-- Only called internally by admin_finalize or cron via service_role.

REVOKE ALL ON FUNCTION public.publish_prediction_results_if_due(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.publish_prediction_results_if_due(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_prediction_results_if_due(uuid) TO service_role;
-- Only called internally by admin_update_correct_answers or cron.

REVOKE ALL ON FUNCTION public.compute_results_if_due(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.compute_results_if_due(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.compute_results_if_due(uuid) TO service_role;
-- Only called by tick_quiz_slots (cron).

REVOKE ALL ON FUNCTION public.tick_quiz_slots() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tick_quiz_slots() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tick_quiz_slots() TO service_role;
-- Only called by the cron edge function with service_role key.

-- ---------------------------------------------------------------
-- SECTION 2: Ensure RLS is ENABLED on key tables
-- ---------------------------------------------------------------

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.options ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- SECTION 3: RLS policies for quizzes table
-- ---------------------------------------------------------------

-- Drop old policies if they exist (idempotent)
DROP POLICY IF EXISTS "quizzes_read_public" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes_insert_admin" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes_update_admin" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes_delete_admin" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes_select" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes_admin_ins" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes_admin_upd" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes_admin_del" ON public.quizzes;

-- Anyone can read quizzes (for category page, results, etc.)
CREATE POLICY "quizzes_read_public"
  ON public.quizzes
  FOR SELECT
  USING (true);

-- Only admins can insert new quizzes
CREATE POLICY "quizzes_insert_admin"
  ON public.quizzes
  FOR INSERT
  WITH CHECK (public.is_admin());

-- Only admins can update quizzes
CREATE POLICY "quizzes_update_admin"
  ON public.quizzes
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Only admins can delete quizzes
CREATE POLICY "quizzes_delete_admin"
  ON public.quizzes
  FOR DELETE
  USING (public.is_admin());

-- ---------------------------------------------------------------
-- SECTION 4: RLS policies for questions table
-- ---------------------------------------------------------------

DROP POLICY IF EXISTS "questions_read_public" ON public.questions;
DROP POLICY IF EXISTS "questions_insert_admin" ON public.questions;
DROP POLICY IF EXISTS "questions_update_admin" ON public.questions;
DROP POLICY IF EXISTS "questions_delete_admin" ON public.questions;
DROP POLICY IF EXISTS "questions_select" ON public.questions;
DROP POLICY IF EXISTS "questions_admin_ins" ON public.questions;
DROP POLICY IF EXISTS "questions_admin_upd" ON public.questions;
DROP POLICY IF EXISTS "questions_admin_del" ON public.questions;

-- Anyone can read questions (needed to render quiz)
CREATE POLICY "questions_read_public"
  ON public.questions
  FOR SELECT
  USING (true);

-- Only admins can insert/update/delete questions
CREATE POLICY "questions_insert_admin"
  ON public.questions
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "questions_update_admin"
  ON public.questions
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "questions_delete_admin"
  ON public.questions
  FOR DELETE
  USING (public.is_admin());

-- ---------------------------------------------------------------
-- SECTION 5: RLS policies for options table
-- ---------------------------------------------------------------

DROP POLICY IF EXISTS "options_read_public" ON public.options;
DROP POLICY IF EXISTS "options_insert_admin" ON public.options;
DROP POLICY IF EXISTS "options_update_admin" ON public.options;
DROP POLICY IF EXISTS "options_delete_admin" ON public.options;
DROP POLICY IF EXISTS "options_select" ON public.options;
DROP POLICY IF EXISTS "options_admin_ins" ON public.options;
DROP POLICY IF EXISTS "options_admin_upd" ON public.options;
DROP POLICY IF EXISTS "options_admin_del" ON public.options;

-- Anyone can read options (needed to render quiz)
CREATE POLICY "options_read_public"
  ON public.options
  FOR SELECT
  USING (true);

-- Only admins can insert/update/delete options
CREATE POLICY "options_insert_admin"
  ON public.options
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "options_update_admin"
  ON public.options
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "options_delete_admin"
  ON public.options
  FOR DELETE
  USING (public.is_admin());

-- ---------------------------------------------------------------
-- SECTION 6: Service role bypass (needed for cron/edge functions)
-- ---------------------------------------------------------------
-- service_role already bypasses RLS by default in Supabase.
-- The above policies apply only to anon and authenticated roles.
-- No additional grants needed for service_role.
