// slots.js
// Frontend adapter for slot-based daily scheduler.
// Provides graceful fallback to legacy quiz list if slot view or RPCs are missing.

import { logger } from '@/lib/logger';

// Normalizes a raw slot row from quiz_slots_view
function normalizeSlot(row) {
  if (!row) return null;
  const joined = Number(row.participants_joined ?? row.joined_count ?? row.joined ?? 0);
  const pre = Number(row.participants_pre ?? row.pre_joined_count ?? row.pre_joined ?? 0);
  const total = Number(row.participants_total ?? joined + pre);
  return {
    slotId:
      row.id ||
      row.slot_id ||
      row.slotid ||
      row.slotID ||
      row.slot_uuid ||
      row.slot_uuid_id ||
      row.slot_uuid_ref ||
      row.quiz_slot_id ||
      row.quiz_slot_uuid ||
      row.slot_uuid_value ||
      row.slot_ref ||
      row.slot_reference ||
      row.slot ||
      null,
    quizId: row.quiz_id || row.quizid || row.quiz_uuid || row.quiz_uuid_id || row.quiz || null,
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
// If view is unavailable, fallback to quizzes table (legacy) and synthesize slot objects.
export async function fetchSlotsForCategory(supabase, category) {
  if (!supabase) return { slots: [], mode: 'none', auto: true };
  try {
    const { data, error } = await supabase
      .from('quiz_slots_view')
      .select('*')
      .eq('category', category)
      .order('start_time', { ascending: true });
    if (error) {
      // If the view doesn't exist yet (PGRST codes vary), log and fallback
      logger.debug('quiz_slots_view error; fallback to quizzes', error.message || error);
      throw error;
    }
    const slots = (data || []).map(normalizeSlot);
    // Fetch runtime override (optional). If table missing, assume enabled.
    let autoEnabled = true;
    try {
      const { data: over, error: overErr } = await supabase
        .from('category_runtime_overrides')
        .select('category,auto_enabled:is_auto')
        .eq('category', category)
        .maybeSingle();
      if (!overErr && over) autoEnabled = !!over.auto_enabled;
    } catch (e) {
      /* ignore missing override table */
    }
    return { slots, mode: 'slots', auto: autoEnabled };
  } catch {
    // Fallback legacy quiz mode
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('id,title,start_time,end_time,status,prizes,prize_type')
        .eq('category', category)
        .order('start_time', { ascending: true });
      if (error) throw error;
      const now = Date.now();
      const slots = (data || []).map((q) => ({
        slotId: q.id,
        quizId: q.id,
        category,
        start_time: q.start_time,
        end_time: q.end_time,
        status: deriveLegacyStatus(q, now),
        prizes: Array.isArray(q.prizes) ? q.prizes : [],
        prize_type: q.prize_type || 'coins',
        participants_joined: 0,
        participants_total: 0,
        auto_enabled: true,
      }));
      return { slots, mode: 'legacy', auto: true };
    } catch (err2) {
      logger.error('Legacy fallback failed', err2.message || err2);
      return { slots: [], mode: 'error', auto: true };
    }
  }
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
