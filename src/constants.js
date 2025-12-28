// Centralized constants for timeouts, intervals, polling etc.
// Adjust here instead of hunting magic numbers across the codebase.
// NOTE: Optimized for Supabase free tier (reduced polling = less API calls & bandwidth)

export const STREAK_CLAIM_DELAY_MS = 1500; // Header daily streak claim delay
export const QUIZ_ENGAGEMENT_POLL_INTERVAL_MS = 30000; // Quiz engagement refresh (was 15s, now 30s for free tier)
