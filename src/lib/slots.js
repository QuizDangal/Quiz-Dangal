// slots.js
// Frontend adapter for slot-based daily scheduler.
// Provides graceful fallback to legacy quiz list if slot view or RPCs are missing.

import { logger } from '@/lib/logger';
import { getSupabase } from '@/lib/customSupabaseClient';

// ── Slot data prefetch cache ──
// Allows starting the data fetch before the CategoryQuizzes component mounts.
const _prefetchCache = new Map(); // category -> { promise, ts }
const PREFETCH_TTL_MS = 30_000; // cache valid for 30 seconds
const SLOT_SNAPSHOT_CACHE_KEY = 'qd_slot_snapshot_v1';
const SLOT_SNAPSHOT_TTL_MS = 90_000;

function readSlotSnapshotStore() {
  try {
    const raw = sessionStorage.getItem(SLOT_SNAPSHOT_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeSlotSnapshotStore(store) {
  try {
    sessionStorage.setItem(SLOT_SNAPSHOT_CACHE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage write failures.
  }
}

function cacheSlotSnapshot(category, result) {
  if (!category || !result || !Array.isArray(result.slots)) return;
  const nextStore = readSlotSnapshotStore();
  nextStore[category] = {
    ts: Date.now(),
    value: {
      slots: result.slots,
      mode: result.mode,
      auto: result.auto,
    },
  };
  writeSlotSnapshotStore(nextStore);
}

export function getCachedSlotSnapshot(category) {
  if (!category) return null;
  const store = readSlotSnapshotStore();
  const cached = store[category];
  if (!cached || !cached.value) return null;
  if (Date.now() - Number(cached.ts || 0) > SLOT_SNAPSHOT_TTL_MS) {
    delete store[category];
    writeSlotSnapshotStore(store);
    return null;
  }
  return cached.value;
}

/**
 * Start fetching slot data for a category in the background.
 * Call this on navigation click so data is already in-flight when the page mounts.
 * MUST set cache synchronously so consumePrefetchedSlotData() can find it.
 */
export function prefetchSlotData(category) {
  if (!category) return;
  const existing = _prefetchCache.get(category);
  if (existing && Date.now() - existing.ts < PREFETCH_TTL_MS) return; // already cached/in-flight

  const cachedSnapshot = getCachedSlotSnapshot(category);
  if (cachedSnapshot) {
    _prefetchCache.set(category, { promise: Promise.resolve(cachedSnapshot), ts: Date.now() });
    return;
  }

  // Set cache entry synchronously with a deferred promise.
  // The actual fetch starts as soon as getSupabase resolves.
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  _prefetchCache.set(category, { promise, ts: Date.now() });

  // Fire the fetch chain — use fast RPC first, fallback to full fetch
  getSupabase().then(async (sb) => {
    if (!sb) return resolve(null);
    try {
      const { current, upcoming, is_paused } = await getCurrentAndUpcomingQuiz(sb, category);
      const fastSlots = [current, upcoming].filter(Boolean);
      if (fastSlots.length > 0) {
        const fastResult = { slots: fastSlots, mode: 'slots', auto: !is_paused };
        return resolve(fastResult);
      }
    } catch { /* RPC unavailable — fall through */ }
    return fetchSlotsForCategory(sb, category).then(resolve, () => resolve(null));
  }).catch(() => resolve(null));
}

/**
 * Consume the prefetched data if available and still fresh. Returns null if no valid cache.
 */
export function consumePrefetchedSlotData(category) {
  const cached = _prefetchCache.get(category);
  if (!cached) return null;
  _prefetchCache.delete(category);
  if (Date.now() - cached.ts > PREFETCH_TTL_MS) return null;
  return cached.promise;
}

// Normalizes a raw slot row from quiz_slots_view
function normalizeSlot(row) {
  if (!row) return null;
  const joined = Number(row.participants_joined ?? row.joined_count ?? row.joined ?? 0);
  const pre = Number(row.participants_pre ?? row.pre_joined_count ?? row.pre_joined ?? 0);
  const total = Number(row.participants_total ?? joined + pre);
  
  // Primary slot ID - prefer 'id' from view, fallback to common aliases
  const slotId = row.id || row.slot_id || row.quiz_slot_id || null;
  const quizId = row.quiz_id || row.quizid || null;
  
  return {
    slotId,
    quizId,
    category: row.category || null,
    title: row.quiz_title || row.title || row.slot_title || null,
    start_time: row.start_time || row.slot_start || row.starts_at || null,
    end_time: row.end_time || row.slot_end || row.ends_at || null,
    status: row.status || 'scheduled', // scheduled | active | finished | paused | skipped
    prizes: Array.isArray(row.prizes)
      ? row.prizes
      : Array.isArray(row.quiz_prizes)
        ? row.quiz_prizes
        : [],
    questions: Array.isArray(row.questions) ? row.questions : [],
    prize_type: row.prize_type || row.quiz_prize_type || 'coins',
    participants_joined: joined,
    participants_pre: pre,
    participants_total: total,
    questions_count: Number(row.questions_count ?? row.question_count ?? row.q_count ?? 0),
    auto_enabled: typeof row.auto_enabled === 'boolean' ? row.auto_enabled : undefined,
    stop_override: !!row.stop_override,
  };
}

// Fetch slots for a category for today + next 3 days.
// Merges both slot-based quizzes AND legacy quizzes from quizzes table.
export async function fetchSlotsForCategory(supabase, category) {
  if (!supabase) return { slots: [], mode: 'none', auto: true };
  
  let slotsFromView = [];
  let legacySlots = [];
  let autoEnabled = true;

  // Only fetch recent past + upcoming slots (1 hour ago to 24 hours ahead)
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  
  // Fire all three queries in parallel
  const [slotsResult, legacyResult, overrideResult] = await Promise.allSettled([
    supabase
      .from('quiz_slots_view')
      .select('*')
      .eq('category', category)
      .gte('start_time', windowStart)
      .lte('start_time', windowEnd)
      .order('start_time', { ascending: true })
      .limit(20),
    supabase
      .from('quizzes')
      .select('id,title,start_time,end_time,status,prizes,prize_type,slot_id,questions(count)')
      .eq('category', category)
      .gte('start_time', windowStart)
      .lte('start_time', windowEnd)
      .order('start_time', { ascending: true })
      .limit(20),
    supabase
      .from('category_runtime_overrides')
      .select('category,auto_enabled:is_auto')
      .eq('category', category)
      .maybeSingle(),
  ]);

  // Process slots view result
  if (slotsResult.status === 'fulfilled') {
    const { data, error } = slotsResult.value;
    if (!error && data) {
      slotsFromView = data.map(normalizeSlot);
    }
  }

  // Process legacy quizzes result
  if (legacyResult.status === 'fulfilled') {
    const { data, error } = legacyResult.value;
    if (!error && data) {
      const now = Date.now();
      const legacyQuizzes = (data || []).filter(q => !q.slot_id);

      // Build legacy slots immediately with 0 counts — don't block on RPC
      legacySlots = legacyQuizzes.map((q) => ({
        slotId: q.id,
        quizId: q.id,
        category,
        title: q.title,
        quiz_title: q.title,
        start_time: q.start_time,
        end_time: q.end_time,
        status: deriveLegacyStatus(q, now),
        prizes: Array.isArray(q.prizes) ? q.prizes : [],
        prize_type: q.prize_type || 'coins',
        participants_joined: 0,
        participants_total: 0,
        questions_count: q.questions?.[0]?.count || 0,
        auto_enabled: true,
        isLegacy: true,
      }));
    }
  }

  // Process runtime override result
  if (overrideResult.status === 'fulfilled') {
    const { data: over, error: overErr } = overrideResult.value;
    if (!overErr && over) autoEnabled = !!over.auto_enabled;
  }
  
  // Merge and deduplicate (slots take priority if same quiz_id exists)
  const slotQuizIds = new Set(slotsFromView.map(s => s.quizId).filter(Boolean));
  const uniqueLegacy = legacySlots.filter(l => !slotQuizIds.has(l.quizId));
  const allSlots = [...slotsFromView, ...uniqueLegacy];
  
  // Sort by start_time
  allSlots.sort((a, b) => {
    const ta = a.start_time ? new Date(a.start_time).getTime() : 0;
    const tb = b.start_time ? new Date(b.start_time).getTime() : 0;
    return ta - tb;
  });
  
  const mode = slotsFromView.length > 0 ? 'slots' : (uniqueLegacy.length > 0 ? 'legacy' : 'none');
  const result = { slots: allSlots, mode, auto: autoEnabled };
  cacheSlotSnapshot(category, result);
  return result;
}

function deriveLegacyStatus(q, nowMs) {
  const st = q.start_time ? new Date(q.start_time).getTime() : null;
  const et = q.end_time ? new Date(q.end_time).getTime() : null;
  if (st && et && nowMs >= st && nowMs < et) return 'active';
  if (st && nowMs < st) return 'scheduled';
  if (et && nowMs >= et) return 'finished';
  return 'scheduled';
}

// Toggle auto enabled flag for a category (admin action).
// Calls RPC toggle_category_auto(category, enabled). Falls back to direct table update if RPC missing.
export async function toggleCategoryAuto(supabase, category, enabled) {
  if (!supabase) return { ok: false, error: new Error('No supabase client') };
  try {
    const { error } = await supabase.rpc('toggle_category_auto', { category, enabled });
    if (!error) return { ok: true };
    // If RPC exists but failed with other reason, fallback only for missing function keywords
    const msg = String(error.message || '').toLowerCase();
    if (!msg.includes('function') && !msg.includes('rpc') && !msg.includes('not found')) {
      return { ok: false, error };
    }
  } catch (e) {
    // swallow and attempt table path
    logger.debug('RPC toggle_category_auto failed, attempting table fallback', e.message || e);
  }
  // Table fallback: upsert runtime overrides row
  try {
    const { error: upErr } = await supabase
      .from('category_runtime_overrides')
      .upsert({ category, is_auto: !!enabled }, { onConflict: 'category' });
    if (upErr) return { ok: false, error: upErr };
    return { ok: true };
  } catch (e2) {
    return { ok: false, error: e2 };
  }
}

export function classifyThreeSlots(slots) {
  // Returns { live, next, queued } based on status & start times.
  const now = Date.now();
  const live = slots.find((s) => {
    const st = s?.start_time ? new Date(s.start_time).getTime() : null;
    const et = s?.end_time ? new Date(s.end_time).getTime() : null;
    return st && et && now >= st && now < et;
  });
  const upcoming = slots.filter((s) => {
    const st = s?.start_time ? new Date(s.start_time).getTime() : null;
    if (!st) return false;
    return now < st;
  });
  upcoming.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const next = upcoming[0] || null;
  const queued = upcoming[1] || null;
  return { live, next, queued };
}

// Get current active and next upcoming quiz for a category
// Uses the optimized RPC function that respects is_auto flag
export async function getCurrentAndUpcomingQuiz(supabase, category) {
  if (!supabase) return { current: null, upcoming: null, is_paused: false };
  try {
    const { data, error } = await supabase.rpc('get_current_and_upcoming_quiz', { p_category: category });
    if (error) {
      logger.debug('get_current_and_upcoming_quiz RPC error', error.message);
      throw error;
    }
    return {
      current: data?.current ? normalizeSlot(data.current) : null,
      upcoming: data?.upcoming ? normalizeSlot(data.upcoming) : null,
      is_paused: !!data?.is_paused,
    };
  } catch {
    // Fallback to fetchSlotsForCategory and classify
    const { slots, auto } = await fetchSlotsForCategory(supabase, category);
    const { live, next } = classifyThreeSlots(slots);
    return {
      current: live || null,
      upcoming: next || null,
      is_paused: !auto,
    };
  }
}
