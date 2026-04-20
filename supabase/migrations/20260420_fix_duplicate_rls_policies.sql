-- =============================================================
-- Fix: duplicate permissive RLS policies (Supabase linter 0006)
-- Date: 2026-04-20
-- =============================================================
-- Context:
-- Existing DB may already contain legacy policy names from older SQL:
--   quizzes_select, quizzes_admin_ins/upd/del
--   questions_select, questions_admin_ins/upd/del
--   options_select, options_admin_ins/upd/del
-- New canonical policies are already:
--   *_read_public, *_insert_admin, *_update_admin, *_delete_admin
-- This migration removes only legacy duplicates to avoid multi-policy warnings.

-- quizzes
DROP POLICY IF EXISTS "quizzes_select" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes_admin_ins" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes_admin_upd" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes_admin_del" ON public.quizzes;

-- questions
DROP POLICY IF EXISTS "questions_select" ON public.questions;
DROP POLICY IF EXISTS "questions_admin_ins" ON public.questions;
DROP POLICY IF EXISTS "questions_admin_upd" ON public.questions;
DROP POLICY IF EXISTS "questions_admin_del" ON public.questions;

-- options
DROP POLICY IF EXISTS "options_select" ON public.options;
DROP POLICY IF EXISTS "options_admin_ins" ON public.options;
DROP POLICY IF EXISTS "options_admin_upd" ON public.options;
DROP POLICY IF EXISTS "options_admin_del" ON public.options;
