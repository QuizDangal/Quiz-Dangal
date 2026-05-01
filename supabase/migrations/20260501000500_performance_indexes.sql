-- =============================================================
-- Performance: Add missing indexes for slow queries
-- Date: 2026-05-01
-- =============================================================

-- quiz_participants: engagement count queries filter by quiz_id + status
CREATE INDEX IF NOT EXISTS idx_qp_quiz_status
  ON public.quiz_participants (quiz_id, status);

-- quiz_participants: admin panel loads all participants for a quiz
CREATE INDEX IF NOT EXISTS idx_qp_quiz_joined
  ON public.quiz_participants (quiz_id, joined_at DESC);

-- profiles: admin user list sorted by created_at
CREATE INDEX IF NOT EXISTS idx_profiles_created_at
  ON public.profiles (created_at DESC);

-- profiles: admin user search by username
CREATE INDEX IF NOT EXISTS idx_profiles_username
  ON public.profiles (username text_pattern_ops);

-- profiles: admin filter by role (find admins)
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles (role) WHERE role IS NOT NULL;

-- redemptions: admin panel sorts by created_at, filters by status
CREATE INDEX IF NOT EXISTS idx_redemptions_status_created
  ON public.redemptions (status, requested_at DESC);

-- redemptions: admin panel needs status+user lookup
CREATE INDEX IF NOT EXISTS idx_redemptions_user_status
  ON public.redemptions (user_id, status, requested_at DESC);

-- quizzes: category + status + start_time is the most common filter pattern
CREATE INDEX IF NOT EXISTS idx_quizzes_category_status_start
  ON public.quizzes (category, status, start_time DESC);

-- quizzes: admin panel lists all quizzes ordered by start_time
CREATE INDEX IF NOT EXISTS idx_quizzes_start_time
  ON public.quizzes (start_time DESC);

-- transactions: admin panel wallet view per user
CREATE INDEX IF NOT EXISTS idx_transactions_user_type
  ON public.transactions (user_id, type, created_at DESC);
