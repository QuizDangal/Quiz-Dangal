-- =============================================================
-- Security Hardening: Revoke anon EXECUTE on SECURITY DEFINER functions
-- Date: 2026-05-01
-- Fixes: Supabase advisor lint 0028 (anon) and 0029 (authenticated)
-- =============================================================
-- Strategy per function group:
--   TRIGGER functions  → revoke anon+authenticated (can't be called via RPC anyway)
--   CRON/internal      → revoke anon+authenticated, keep service_role only
--   ADMIN functions    → revoke anon, keep authenticated (internal is_admin() guard)
--   USER functions     → revoke anon, keep authenticated
--   PUBLIC READ        → keep anon (intentionally public: leaderboard, quiz counts etc.)
-- =============================================================

-- ---------------------------------------------------------------
-- GROUP 1: TRIGGER functions — revoke all external access
-- These are called only by triggers, never via REST RPC.
-- ---------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.tr_award_coins_on_results() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tr_update_counters_on_participants() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tr_update_counters_on_referrals() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tr_update_counters_on_results() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_push_subscriptions_sync() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;

-- ---------------------------------------------------------------
-- GROUP 2: CRON / internal maintenance functions
-- Only the tick-slots edge function (service_role) calls these.
-- ---------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.run_tick_quiz_slots() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.run_purge_old_quiz_slots() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_old_quiz_slots() FROM anon, authenticated;

-- ---------------------------------------------------------------
-- GROUP 3: ADMIN-only functions
-- Revoke anon. Authenticated is allowed because the function body
-- calls is_admin() and raises 'forbidden' for non-admins.
-- ---------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.admin_approve_redemption(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_reject_redemption(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_seed_quiz_day_multi(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_seed_quiz_day_single(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.toggle_category_auto(text, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_scheduler_status() FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_result_push_sent(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_start_push_sent(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_profile_counters(uuid) FROM anon;
-- approve_redemption is an older alias — revoke anon too
REVOKE EXECUTE ON FUNCTION public.approve_redemption(uuid) FROM anon;

-- ---------------------------------------------------------------
-- GROUP 4: USER functions — signed-in users only, not anon
-- ---------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.join_quiz(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.join_slot(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pre_join_quiz(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pre_join_slot(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.redeem_from_catalog(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.redeem_from_catalog_with_details(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_daily_login(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_referral_bonus(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.save_push_subscription(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_push_subscription(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_joined_quiz_for_question(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_username_available(text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.refresh_notifications_enabled(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_profile_complete_if_ready() FROM anon;

-- ---------------------------------------------------------------
-- GROUP 5: PUBLIC READ functions — keep anon EXECUTE intentionally
-- These power the public leaderboard, category page, quiz counts.
-- No data mutation possible, no user-private data exposed.
-- ---------------------------------------------------------------
-- public.get_leaderboard(text, integer, integer, integer)           → keep anon
-- public.get_leaderboard_v2(text, integer, integer, integer)        → keep anon
-- public.get_all_time_leaderboard(integer, integer, integer)        → keep anon
-- public.get_all_time_leaderboard_v2(integer, integer, integer)     → keep anon
-- public.get_current_and_upcoming_quiz(text)                        → keep anon
-- public.get_engagement_counts(uuid)                                → keep anon
-- public.get_engagement_counts_many(uuid[])                         → keep anon
-- public.profiles_public_by_ids(uuid[])                             → keep anon
-- (No REVOKE needed — these are intentionally public)
