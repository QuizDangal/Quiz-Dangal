-- =============================================================
-- Revert: Remove authenticated role permission from admin_delete_quiz
-- Date: 2026-05-05
-- =============================================================
-- Issue:
--   Previous migration incorrectly granted EXECUTE to authenticated role
--   for admin_delete_quiz, causing security warning:
--   "authenticated_security_definer_function_executable"
--
-- Root Cause:
--   Edge function (admin-rpc) already uses service_role key to call
--   admin_delete_quiz. The authenticated role should NOT have direct
--   access to SECURITY DEFINER functions.
--
-- Solution:
--   Revoke EXECUTE from authenticated. Keep only service_role.
--   Edge function flow remains: 
--   Frontend (JWT) → Edge Function (validates admin) → DB (service_role)
-- =============================================================

-- Revoke the incorrectly granted permission
REVOKE EXECUTE ON FUNCTION public.admin_delete_quiz(uuid) FROM authenticated;

-- Ensure only service_role can execute (this was already set, but being explicit)
REVOKE ALL ON FUNCTION public.admin_delete_quiz(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_quiz(uuid) TO service_role;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
