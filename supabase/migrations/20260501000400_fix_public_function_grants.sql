-- =============================================================
-- Security Hardening: Revoke PUBLIC (=X) EXECUTE on SECURITY DEFINER functions
-- Date: 2026-05-01 (follow-up to fix_anon_function_grants.sql)
-- =============================================================
-- `=X/postgres` in proacl means PUBLIC has EXECUTE (covers anon + everyone).
-- Previous migration only revoked explicit `anon` grants but PUBLIC remains.
-- This migration does REVOKE FROM PUBLIC then re-grants only the correct roles.
-- =============================================================

-- ---------------------------------------------------------------
-- GROUP 0: Internal utility / trigger helper functions with PUBLIC grants
-- ---------------------------------------------------------------
REVOKE ALL ON FUNCTION public.quiz_lock_key(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_slot_to_quizzes() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------
-- GROUP 1: TRIGGER functions — revoke all external access
-- These are called only by triggers, never via REST RPC.
-- ---------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.tr_award_coins_on_results() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.tr_update_counters_on_participants() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tr_update_counters_on_referrals() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tr_update_counters_on_results() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_push_subscriptions_sync() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC;

-- ---------------------------------------------------------------
-- CRON / internal maintenance (service_role only)
-- ---------------------------------------------------------------
REVOKE ALL ON FUNCTION public.run_tick_quiz_slots() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.run_purge_old_quiz_slots() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_old_quiz_slots() FROM PUBLIC;

-- ---------------------------------------------------------------
-- ADMIN-only: revoke PUBLIC, re-grant authenticated+service_role
-- (internal is_admin() guard blocks non-admins)
-- ---------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_approve_redemption(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_redemption(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_reject_redemption(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reject_redemption(uuid, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_seed_quiz_day_multi(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_seed_quiz_day_single(jsonb) FROM PUBLIC;

-- get_scheduler_status: admin UI only
REVOKE ALL ON FUNCTION public.get_scheduler_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_scheduler_status() TO authenticated, service_role;

-- mark_* push sent: called by edge function (service_role), not users
REVOKE ALL ON FUNCTION public.mark_result_push_sent(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_start_push_sent(uuid) FROM PUBLIC;

-- update_profile_counters: internal, called by triggers/service
REVOKE ALL ON FUNCTION public.update_profile_counters(uuid) FROM PUBLIC;

-- register_schema_migration: internal utility
REVOKE ALL ON FUNCTION public.register_schema_migration(p_version text, p_checksum text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.register_schema_migration(p_version text, p_checksum text) FROM anon, authenticated;

-- refresh_notifications_enabled: revoke PUBLIC, keep authenticated
REVOKE ALL ON FUNCTION public.refresh_notifications_enabled(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_notifications_enabled(uuid) TO authenticated, service_role;

-- set_profile_complete_if_ready: revoke PUBLIC, keep authenticated
REVOKE ALL ON FUNCTION public.set_profile_complete_if_ready() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_profile_complete_if_ready() TO authenticated, service_role;

-- redeem_from_catalog_with_details: revoke PUBLIC (had =X), keep authenticated
REVOKE ALL ON FUNCTION public.redeem_from_catalog_with_details(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_from_catalog_with_details(uuid, text, text) TO authenticated, service_role;

-- reward_referral: internal
REVOKE ALL ON FUNCTION public.reward_referral() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reward_referral() FROM anon, authenticated;

-- ---------------------------------------------------------------
-- USER functions: revoke PUBLIC, re-grant authenticated+service_role
-- ---------------------------------------------------------------
REVOKE ALL ON FUNCTION public.join_quiz(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_quiz(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.join_slot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_slot(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.pre_join_quiz(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pre_join_quiz(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.pre_join_slot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pre_join_slot(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.redeem_from_catalog(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_from_catalog(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.handle_daily_login(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_daily_login(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.handle_referral_bonus(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_referral_bonus(uuid, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.save_push_subscription(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_push_subscription(jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.delete_push_subscription(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_push_subscription(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.has_joined_quiz_for_question(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_joined_quiz_for_question(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_username_available(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_username_available(text, uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------
-- PUBLIC READ functions: revoke PUBLIC, re-grant anon+authenticated+service_role
-- These are intentionally accessible to unauthenticated visitors.
-- ---------------------------------------------------------------
REVOKE ALL ON FUNCTION public.get_leaderboard(text, integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, integer, integer, integer) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_leaderboard_v2(text, integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_v2(text, integer, integer, integer) TO anon, authenticated, service_role;


REVOKE ALL ON FUNCTION public.get_all_time_leaderboard(integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_all_time_leaderboard(integer, integer, integer) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_all_time_leaderboard_v2(integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_all_time_leaderboard_v2(integer, integer, integer) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_current_and_upcoming_quiz(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_and_upcoming_quiz(text) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_engagement_counts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_engagement_counts(uuid) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_engagement_counts_many(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_engagement_counts_many(uuid[]) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.profiles_public_by_ids(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profiles_public_by_ids(uuid[]) TO anon, authenticated, service_role;

