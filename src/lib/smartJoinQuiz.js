// Smart join helper to reduce 400 errors from early join attempts.
// Handles timing windows, pre-join fallback, scheduled precise retry near start boundary,
// and deduplicates concurrent join attempts for the same quiz id.
// Supports both legacy quizzes (quiz_id) and slot-based quizzes (slot_id).
// Returns a result object { status, scheduledAt?, error? }.
// Possible status values:
//   'joined'          -> join_quiz/join_slot succeeded (or already joined/completed treated as joined)
//   'pre_joined'      -> pre_join_quiz/pre_join_slot succeeded
//   'scheduled_retry' -> pre-joined and scheduled a precise future join attempt
//   'already'         -> user already joined/completed (no further action)
//   'error'           -> unrecoverable error

import { logger } from '@/lib/logger';

const scheduledMap = new Map(); // quizId/slotId -> timeout id

// Helper to call the appropriate RPC based on quiz type
async function callPreJoin(supabase, quiz) {
  // If this is a slot-based quiz (has slotId and no isLegacy flag)
  if (quiz.slotId && !quiz.isLegacy) {
    return supabase.rpc('pre_join_slot', { p_slot_id: quiz.slotId });
  }
  // Legacy quiz - use quiz_id
  return supabase.rpc('pre_join_quiz', { p_quiz_id: quiz.id });
}

async function callJoin(supabase, quiz) {
  // If this is a slot-based quiz (has slotId and no isLegacy flag)
  if (quiz.slotId && !quiz.isLegacy) {
    return supabase.rpc('join_slot', { p_slot_id: quiz.slotId });
  }
  // Legacy quiz - use quiz_id
  return supabase.rpc('join_quiz', { p_quiz_id: quiz.id });
}

export async function smartJoinQuiz({ supabase, quiz, user }) {
  // Accept either quiz.id (legacy) or quiz.slotId (slot-based)
  const quizIdentifier = quiz?.slotId || quiz?.id;
  if (!supabase || !quiz || !quizIdentifier)
    return { status: 'error', error: new Error('Missing quiz or supabase client') };
  if (!user || !user.id) return { status: 'error', error: new Error('Not authenticated') };

  try {
    const startMs = quiz.start_time ? new Date(quiz.start_time).getTime() : null;
    const endMs = quiz.end_time ? new Date(quiz.end_time).getTime() : null;
    const now = Date.now();
    if (!startMs || !endMs) {
      // Fallback: treat as pre-joinable
      const { error: pjErr } = await callPreJoin(supabase, quiz);
      if (pjErr) return { status: 'error', error: pjErr };
      return { status: 'pre_joined' };
    }

    const graceMs = 5000; // server grace before start
    const active = now >= startMs - graceMs && now < endMs;
    const veryEarlyThreshold = startMs - (graceMs + 1500); // far before grace

    // Far before start: just pre-join once
    if (now < veryEarlyThreshold) {
      const { error: pjErr } = await callPreJoin(supabase, quiz);
      if (pjErr) return { status: 'error', error: pjErr };
      return { status: 'pre_joined' };
    }

    // Borderline window: close to start but not yet within active detection
    if (!active && now >= veryEarlyThreshold && now < startMs - 300) {
      // Pre-join then schedule precise join attempt just inside grace
      const { error: pjErr } = await callPreJoin(supabase, quiz);
      if (pjErr) return { status: 'error', error: pjErr };
      if (!scheduledMap.has(quizIdentifier)) {
        const delay = Math.max(50, startMs - (graceMs - 100) - Date.now()); // aim slightly before grace start
        const tid = setTimeout(async () => {
          scheduledMap.delete(quizIdentifier);
          try {
            const { error } = await callJoin(supabase, quiz);
            if (error) {
              const msg = String(error.message || '').toLowerCase();
              if (msg.includes('already') || msg.includes('completed')) {
                logger.debug('Scheduled join: already joined/completed', quizIdentifier);
                return;
              }
              if (msg.includes('not active')) {
                logger.debug('Scheduled join: still not active, giving up this cycle', quizIdentifier);
                return;
              }
              logger.error('Scheduled join error', error.message || error);
            } else {
              logger.debug('Scheduled join success', quizIdentifier);
            }
          } catch (e) {
            logger.error('Scheduled join throw', e?.message || e);
          }
        }, delay);
        scheduledMap.set(quizIdentifier, tid);
        return { status: 'scheduled_retry', scheduledAt: Date.now() + delay };
      }
      return { status: 'scheduled_retry', scheduledAt: null }; // already scheduled
    }

    // Active window: attempt join directly
    if (active) {
      const { error } = await callJoin(supabase, quiz);
      if (!error) return { status: 'joined' };
      const msg = String(error.message || '').toLowerCase();
      if (msg.includes('already') || msg.includes('completed')) return { status: 'already' };
      if (msg.includes('not active')) {
        // Schedule a retry very near start boundary (final chance)
        if (!scheduledMap.has(quizIdentifier)) {
          const delay = 600; // small fixed backoff
          const tid = setTimeout(async () => {
            scheduledMap.delete(quizIdentifier);
            try {
              const { error: err2 } = await callJoin(supabase, quiz);
              if (
                err2 &&
                !String(err2.message || '')
                  .toLowerCase()
                  .includes('already')
              ) {
                logger.error('Final join retry failed', err2.message || err2);
              }
            } catch (e) {
              logger.error('Final join retry throw', e?.message || e);
            }
          }, delay);
          scheduledMap.set(quizIdentifier, tid);
          return { status: 'scheduled_retry', scheduledAt: Date.now() + delay };
        }
        return { status: 'scheduled_retry', scheduledAt: null };
      }
      return { status: 'error', error };
    }

    // After end time or outside window: pre-join fallback (so user tracked) if not completed
    const { error: pjErr2 } = await callPreJoin(supabase, quiz);
    if (pjErr2) return { status: 'error', error: pjErr2 };
    return { status: 'pre_joined' };
  } catch (e) {
    return { status: 'error', error: e };
  }
}

export function cancelScheduledSmartJoin(quizId) {
  if (scheduledMap.has(quizId)) {
    clearTimeout(scheduledMap.get(quizId));
    scheduledMap.delete(quizId);
  }
}
