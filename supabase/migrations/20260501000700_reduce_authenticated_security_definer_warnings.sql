-- =============================================================
-- Reduce authenticated SECURITY DEFINER warnings safely
-- Date: 2026-05-01
-- =============================================================
-- These functions do not need elevated privileges because table RLS already
-- permits the intended operation for either the row owner or admins.
-- Converting them to SECURITY INVOKER removes Supabase advisor warnings
-- without breaking frontend flows.
-- =============================================================

-- User quiz participation RPCs: RLS permits users to insert/update their own rows.
ALTER FUNCTION public.join_quiz(uuid) SECURITY INVOKER;
ALTER FUNCTION public.join_slot(uuid) SECURITY INVOKER;
ALTER FUNCTION public.pre_join_quiz(uuid) SECURITY INVOKER;
ALTER FUNCTION public.pre_join_slot(uuid) SECURITY INVOKER;
ALTER FUNCTION public.has_joined_quiz_for_question(uuid) SECURITY INVOKER;

-- Redemption RPCs: RLS permits active reward reads, own redemptions, and own transaction inserts.
ALTER FUNCTION public.redeem_from_catalog(uuid) SECURITY INVOKER;
ALTER FUNCTION public.redeem_from_catalog_with_details(uuid, text, text) SECURITY INVOKER;

-- Push notification cleanup: users only affect their own subscription/profile rows under RLS.
ALTER FUNCTION public.delete_push_subscription(text) SECURITY INVOKER;
ALTER FUNCTION public.refresh_notifications_enabled(uuid) SECURITY INVOKER;

-- Admin scheduler read/write: RLS admin policies enforce access.
ALTER FUNCTION public.get_scheduler_status() SECURITY INVOKER;
ALTER FUNCTION public.toggle_category_auto(text, boolean) SECURITY INVOKER;

-- Simple admin redemption approval: RLS admin policy enforces update permission.
ALTER FUNCTION public.admin_approve_redemption(uuid) SECURITY INVOKER;
ALTER FUNCTION public.approve_redemption(uuid) SECURITY INVOKER;

-- Trigger-only function: should never be callable through REST RPC.
REVOKE EXECUTE ON FUNCTION public.set_profile_complete_if_ready() FROM authenticated, anon, PUBLIC;

-- Keep expected grants for app usage.
GRANT EXECUTE ON FUNCTION public.join_quiz(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.join_slot(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pre_join_quiz(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pre_join_slot(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_joined_quiz_for_question(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.redeem_from_catalog(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.redeem_from_catalog_with_details(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_push_subscription(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refresh_notifications_enabled(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_scheduler_status() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.toggle_category_auto(text, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_approve_redemption(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_redemption(uuid) TO authenticated, service_role;
