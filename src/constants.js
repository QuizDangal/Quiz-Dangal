// Centralized constants for timeouts, intervals, polling etc.
// Adjust here instead of hunting magic numbers across the codebase.
// NOTE: Optimized for Supabase free tier (reduced polling = less API calls & bandwidth)

export const STREAK_CLAIM_DELAY_MS = 1500; // Header daily streak claim delay
export const QUIZ_ENGAGEMENT_POLL_INTERVAL_MS = 30000; // Quiz engagement refresh (was 15s, now 30s for free tier)

// Retry and timing constants
export const ANSWER_RETRY_BASE_DELAY_MS = 2000; // Base delay for exponential backoff
export const ANSWER_RETRY_MAX_DELAY_MS = 30000; // Max retry delay cap (30 seconds)
export const ANSWER_RETRY_MAX_ATTEMPTS = 6; // Max retry attempts before giving up

// Slot and polling intervals
export const SLOT_META_POLL_INTERVAL_MS = 30000; // Slot metadata polling (30s)
export const AUTH_WARM_UP_DELAY_MS = 8000; // Auth warmup delay for anonymous users

// Cache and session timeouts
export const LEADERBOARD_CACHE_TTL_MS = 180000; // 3 minutes cache for leaderboard
export const RATE_LIMIT_DEFAULT_WINDOW_MS = 8000; // Default rate limit window
export const RATE_LIMIT_DEFAULT_MAX_ATTEMPTS = 5; // Default max attempts in window

// Password security
export const PASSWORD_MIN_LENGTH = 8; // Minimum password length

// Queue limits
export const MAX_RETRY_QUEUE_SIZE = 50; // Max size of answer retry queue
