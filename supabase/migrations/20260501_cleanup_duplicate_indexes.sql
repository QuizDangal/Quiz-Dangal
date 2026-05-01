-- =============================================================
-- Cleanup: Remove duplicate / redundant indexes on transactions
-- Date: 2026-05-01
-- =============================================================
-- uniq_quiz_reward_once is superseded by uniq_tx_quiz_reward_once
-- (the newer index adds reference_id IS NOT NULL filter which is stricter and correct)
-- uniq_referral_tx is superseded by uniq_tx_referral_once
-- (uniq_tx_referral_once uses reference_id which is the correct dedup key)
-- =============================================================

DROP INDEX IF EXISTS public.uniq_quiz_reward_once;
DROP INDEX IF EXISTS public.uniq_referral_tx;
