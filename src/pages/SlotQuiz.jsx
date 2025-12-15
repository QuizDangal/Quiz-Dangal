import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useQuizEngine } from '@/hooks/useQuizEngine';
import SEO from '@/components/SEO';
import { formatTimeOnly } from '@/lib/utils';
import { fetchSlotsForCategory } from '@/lib/slots';

// SlotQuiz: lobby wrapper around normal quiz engine using slot metadata.
// If slot not active yet -> countdown lobby. If paused -> overlay. If finished -> redirect to results.
// When active we simply render the existing /quiz/:id engine through local invocation of useQuizEngine.

function LobbyCountdown({ seconds }) {
  return (
    <div className="text-center mt-6 text-indigo-300 font-semibold text-xl" aria-live="polite">
      Starts in{' '}
      {Math.floor(seconds / 60)
        .toString()
        .padStart(2, '0')}
      :{(seconds % 60).toString().padStart(2, '0')}
    </div>
  );
}

export default function SlotQuiz() {
  const { slotId } = useParams();
  const navigate = useNavigate();
  const { user: _user } = useAuth();
  const [slot, setSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState('loading'); // loading | pre-slot | live | paused | finished | error

  const loadSlot = useCallback(async () => {
    if (!supabase) {
      setError('Supabase not configured');
      setLoading(false);
      return;
    }
    try {
      const { data, error: err } = await supabase
        .from('quiz_slots_view')
        .select('*')
        .eq('id', slotId)
        .maybeSingle();
      if (err) throw err;
      if (!data) throw new Error('Slot not found');
      setSlot(data);
      setLoading(false);
    } catch (e) {
      setError(e.message || 'Failed');
      setLoading(false);
    }
  }, [slotId]);

  useEffect(() => {
    loadSlot();
  }, [loadSlot]);

  // derive phase from slot meta directly
  useEffect(() => {
    if (!slot) return;
    if (error) return;
    const now = Date.now();
    const st = slot.start_time ? new Date(slot.start_time).getTime() : null;
    const et = slot.end_time ? new Date(slot.end_time).getTime() : null;
    if (slot.status === 'paused') {
      setPhase('paused');
      return;
    }
    if (st && et && now >= st && now < et) {
      setPhase('live');
      return;
    }
    if (st && now < st) {
      setPhase('pre-slot');
      return;
    }
    if (et && now >= et) {
      setPhase('finished');
      return;
    }
    setPhase('error');
  }, [slot, error]);

  // Redirect finished to results
  useEffect(() => {
    if (phase !== 'finished' || !slot?.quiz_id || !slot?.category) return;
    let cancelled = false;
    (async () => {
      try {
        // Fetch future slots for same category, pick the earliest after current end
        const { slots: list, mode: _mode } = await fetchSlotsForCategory(supabase, slot.category);
        const endMs = slot.end_time ? new Date(slot.end_time).getTime() : Date.now();
        const future = (list || [])
          .filter((s) => {
            if (!s.start_time) return false;
            const st = new Date(s.start_time).getTime();
            return st > endMs; // strictly after current slot end
          })
          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        if (!cancelled && future[0]) {
          navigate(`/quiz/slot/${future[0].slotId}`);
        } else if (!cancelled) {
          navigate(`/results/${slot.quiz_id}`);
        }
      } catch {
        if (!cancelled) navigate(`/results/${slot.quiz_id}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, slot?.quiz_id, slot?.category, slot?.end_time, navigate]);

  // If live, use quiz engine directly
  const engine = useQuizEngine(slot?.quiz_id, navigate, { slotId });

  return (
    <div className="container mx-auto px-4 py-4 text-foreground">
      <SEO title="Slot Lobby – Quiz Dangal" description="Live quiz slot lobby" />
      {loading && <div className="text-center py-24">Loading slot…</div>}
      {!loading && error && <div className="text-center py-24 text-red-400">{error}</div>}
      {!loading && !error && (
        <div className="max-w-xl mx-auto">
          <h1 className="text-xl font-bold mb-2">Quiz Slot</h1>
          <div className="text-sm text-slate-400 mb-4">
            Start: {slot.start_time ? formatTimeOnly(slot.start_time) : '—'} • End:{' '}
            {slot.end_time ? formatTimeOnly(slot.end_time) : '—'}
          </div>
          {phase === 'paused' && (
            <div className="p-4 rounded-lg bg-amber-700/30 border border-amber-600 text-amber-200 text-sm mb-4">
              Slot paused by admin. Please wait…
            </div>
          )}
          {phase === 'pre-slot' && engine.timeLeft > 0 && (
            <LobbyCountdown seconds={engine.timeLeft} />
          )}
          {phase === 'live' && <LiveQuizInner quizEngine={engine} />}
          {phase === 'error' && <div className="text-center text-red-400">Invalid slot state.</div>}
        </div>
      )}
    </div>
  );
}

function LiveQuizInner({ quizEngine }) {
  const engine = quizEngine;
  if (!engine) return null;
  if (engine.quizState === 'loading') return <div className="mt-6">Quiz loading…</div>;
  if (engine.quizState === 'waiting') return <div className="mt-6">Preparing…</div>;
  return (
    <div className="mt-4 border border-slate-700 rounded-xl p-4 bg-slate-900/60">
      <div className="text-sm text-slate-300 mb-2">Live Quiz</div>
      {engine.questions && engine.questions.length > 0 ? (
        <div>
          <div className="font-semibold mb-2">
            Q{engine.currentQuestionIndex + 1}.{' '}
            {engine.questions[engine.currentQuestionIndex]?.question_text}
          </div>
          <div className="space-y-2">
            {engine.questions[engine.currentQuestionIndex]?.options?.map((opt) => (
              <button
                key={opt.id}
                onClick={() =>
                  engine.handleAnswerSelect(
                    engine.questions[engine.currentQuestionIndex].id,
                    opt.id,
                  )
                }
                className="w-full text-left px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm"
              >
                {opt.option_text}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>No questions loaded yet.</div>
      )}
      {engine.quizState === 'finished' && (
        <div className="mt-4 text-indigo-300 text-sm">Finished – redirecting…</div>
      )}
    </div>
  );
}
