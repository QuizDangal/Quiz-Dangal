-- =============================================================
-- Fix remaining is_admin SECURITY DEFINER advisor warnings
-- Date: 2026-05-01
-- =============================================================
-- is_admin() is used inside many RLS policies. Revoking EXECUTE from anon or
-- authenticated can break those policies, so keep it callable but run it as
-- SECURITY INVOKER. It only returns the caller's own admin status and remains
-- service_role-aware for Edge Functions.
-- =============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    OR current_user = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND lower(coalesce(p.role, '')) = 'admin'
    );
$function$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;
