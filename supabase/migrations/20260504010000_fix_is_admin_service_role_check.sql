-- =============================================================
-- Fix: public.is_admin() must detect the service_role JWT used
--      by edge functions (admin-rpc, send-notifications, etc.).
-- Date: 2026-05-04
-- =============================================================
-- Bug: The previous is_admin() body only checked the deprecated
-- GUC `request.jwt.claim.role` and `current_user`. Inside a
-- SECURITY DEFINER function owned by `postgres` (e.g.
-- admin_finalize_prediction_quiz), `current_user` is `postgres`,
-- and modern PostgREST no longer populates the old dotted GUC,
-- so is_admin() returned FALSE even for a valid service_role JWT.
-- Result: every admin RPC (Finalize, Delete, Seed, Update answers)
-- raised EXCEPTION 'forbidden'.
--
-- Fix: Use auth.role() (which already falls back from
-- `request.jwt.claim.role` to `request.jwt.claims::jsonb->>'role'`)
-- PLUS session_user / current_user belt-and-braces. Keep the
-- profiles.role='admin' check for logged-in admin users.
-- =============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    -- Edge function / cron calls via PostgREST with the service_role JWT.
    -- auth.role() already coalesces new `request.jwt.claims->>'role'` with the
    -- legacy `request.jwt.claim.role` GUC, so this is version-proof.
    COALESCE(auth.role(), '') = 'service_role'
    -- Direct psql / migrations logged in as a Postgres superuser.
    -- session_user is immutable across SECURITY DEFINER boundaries, so this
    -- can NOT be spoofed by an authenticated user calling into a DEFINER fn.
    OR session_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin')
    -- Authenticated end-user whose profile row is flagged as admin.
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND lower(coalesce(p.role, '')) = 'admin'
    );
$function$;

-- Keep existing grants (RLS policies already reference is_admin()).
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
