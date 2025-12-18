/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { smartJoinQuiz } from '@/lib/smartJoinQuiz';
import { logger } from '@/lib/logger';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { isDocumentHidden } from '@/lib/visibility';
import { safeComputeResultsIfDue, formatSupabaseError } from '@/lib/utils';
import { QUIZ_ENGAGEMENT_POLL_INTERVAL_MS } from '@/constants';

/**
 * useQuizEngine
 * Encapsulates quiz lifecycle: loading quiz, joining/pre-joining, questions, answers, timers, submission.
 * Includes resilient answer upsert retry queue for offline / transient failures (exponential backoff capped at 30s).
 */
export function useQuizEngine(quizId, navigate, options = {}) {
  const { slotId = null } = options;
  const { toast } = useToast();
  const { user } = useAuth();
  const { isSubscribed, subscribeToPush } = usePushNotifications();

  // Core state
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [quizState, setQuizState] = useState('loading'); // loading, waiting, active, finished, completed
  const [timeLeft, setTimeLeft] = useState(0);
  // Slot integration state
  const [slotMeta, setSlotMeta] = useState(null); // raw slot row
  const [slotPaused, setSlotPaused] = useState(false);
  const [slotLoading, setSlotLoading] = useState(!!slotId);

  const normalizeEngagementFromSlotRow = useCallback((row) => {
    const joined = Number(row?.participants_joined ?? row?.joined_count ?? row?.joined ?? 0);
    const pre = Number(row?.participants_pre ?? row?.pre_joined_count ?? row?.pre_joined ?? 0);
    return {
      joined: Number.isFinite(joined) ? joined : 0,
      pre_joined: Number.isFinite(pre) ? pre : 0,
    };
  }, []);

  const fetchSlotMeta = useCallback(async () => {
    if (!slotId || !supabase) return;
    try {
      const { data, error } = await supabase
        .from('quiz_slots_view')
        .select('*')
        .eq('id', slotId)
        .maybeSingle();
      if (!error && data) {
        setSlotMeta(data);
        setSlotPaused(data.status === 'paused');
        // Keep joined/pre-joined counts accurate for slot-based quizzes
        setEngagement(normalizeEngagementFromSlotRow(data));
      }
    } catch (e) {
      // silent fail
    } finally {
      setSlotLoading(false);
    }
  }, [slotId, normalizeEngagementFromSlotRow]);

  useEffect(() => {
    fetchSlotMeta();
    // Slot meta polling - 30s interval for free tier optimization (was 15s)
    const id = slotId ? setInterval(fetchSlotMeta, 30000) : null;
    return () => {
      if (id) clearInterval(id);
    };
  }, [fetchSlotMeta, slotId]);
  const [submitting, setSubmitting] = useState(false);
  const [engagement, setEngagement] = useState({ joined: 0, pre_joined: 0 });
  const [joined, setJoined] = useState(false);
  const [participantStatus, setParticipantStatus] = useState(null); // 'pre_joined' | 'joined' | 'completed' | null

  // Internal refs
  const redirectTimeoutRef = useRef(null);
  const mountedRef = useRef(true);
  const retryQueueRef = useRef([]); // { questionId, optionId, attempt }
  const retryTimerRef = useRef(null);

  useEffect(
    () => () => {
      mountedRef.current = false;
      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    },
    [],
  );

  // Finalize (partial submit) on route unmount if user leaves mid-quiz without submitting
  // Only mark completed if user actually answered at least 1 question
  const answersRef = useRef({});
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  
  useEffect(() => {
    return () => {
      try {
        const hasAnswers = Object.keys(answersRef.current).length > 0;
        if (quiz && quizState === 'active' && participantStatus !== 'completed' && user?.id && hasAnswers) {
          // Mark completed with whatever answers were saved so far
          // Use slot_id for slots, quiz_id for legacy
          let query = supabase
            .from('quiz_participants')
            .update({ status: 'completed' })
            .eq('user_id', user.id);
          if (slotId) {
            query = query.eq('slot_id', slotId);
          } else {
            query = query.eq('quiz_id', quizId);
          }
          query
            .then(() => {
              /* noop */
            })
            .catch(() => {
              /* ignore */
            });
        }
      } catch {
        /* ignore */
      }
    };
  }, [quiz, quizId, quizState, participantStatus, user?.id]);

  // Retry queue helpers
  const scheduleRetry = useCallback(() => {
    if (retryTimerRef.current || retryQueueRef.current.length === 0) return;
    // compute next delay based on first item's attempt (simple heuristic)
    const next = retryQueueRef.current[0];
    const base = 2000 * Math.pow(2, (next.attempt || 1) - 1); // 2s,4s,8s...
    const delay = Math.min(base, 30000); // cap 30s
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      flushRetryQueue();
    }, delay);
    // Intentionally not depending on flushRetryQueue to avoid recreation loops; flushRetryQueue re-schedules itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flushRetryQueue = useCallback(async () => {
    if (retryQueueRef.current.length === 0) return;
    const batch = [...retryQueueRef.current];
    retryQueueRef.current = [];
    for (const entry of batch) {
      if (!user || participantStatus === 'completed') continue;
      try {
        const { error } = await supabase
          .from('user_answers')
          .upsert(
            { user_id: user.id, question_id: entry.questionId, selected_option_id: entry.optionId },
            { onConflict: 'user_id,question_id' },
          );
        if (error) throw error;
        setAnswers((prev) => ({ ...prev, [entry.questionId]: entry.optionId }));
      } catch (err) {
        const nextAttempt = (entry.attempt || 1) + 1;
        if (nextAttempt <= 6) {
          // attempts limit (~ up to 64s raw before cap)
          retryQueueRef.current.push({ ...entry, attempt: nextAttempt });
        } else {
          toast({
            title: 'Answer not saved',
            description: 'One answer failed to sync after multiple retries.',
            variant: 'destructive',
          });
        }
      }
    }
    if (retryQueueRef.current.length > 0) scheduleRetry();
  }, [participantStatus, user, toast, scheduleRetry]);

  // Flush on network online or when tab becomes visible
  useEffect(() => {
    const onlineHandler = () => flushRetryQueue();
    const visibilityHandler = () => {
      if (!isDocumentHidden()) flushRetryQueue();
    };
    window.addEventListener('online', onlineHandler);
    document.addEventListener('visibilitychange', visibilityHandler);
    return () => {
      window.removeEventListener('online', onlineHandler);
      document.removeEventListener('visibilitychange', visibilityHandler);
    };
  }, [flushRetryQueue]);

  const totalJoined = (engagement.joined || 0) + (engagement.pre_joined || 0);
  // Display rule: when active, show only actually joined (joined+completed); when upcoming, show interested (pre+joined)
  const displayJoined = (() => {
    if (quizState === 'active') return engagement.joined || 0;
    return totalJoined;
  })();

  const loadQuestions = useCallback(async (actualQuizId = null) => {
    // Use passed actualQuizId, or fall back to quiz state, or URL params
    const effectiveId = actualQuizId || quiz?.id || quizId || slotId;
    if (!effectiveId) return;
    
    try {
      // Always fetch from questions table (tick_quiz_slots populates it before quiz starts)
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select(`id, question_text, options ( id, option_text )`)
        .eq('quiz_id', effectiveId)
        .order('id');
      
      if (questionsError) {
        console.error('Questions fetch error:', questionsError);
        logger.error('Failed to load questions', questionsError.message);
        // Set empty array but don't show error toast - quiz might not be ready yet
        setQuestions([]);
        return;
      }
      
      if (!questionsData || questionsData.length === 0) {
        logger.warn('No questions found for quiz', effectiveId);
        setQuestions([]);
        return;
      }
      
      setQuestions(questionsData);
    } catch (err) {
      console.error('Questions load exception:', err);
      setQuestions([]);
    }
  }, [quiz?.id, quizId, slotId]);

  const refreshEngagement = useCallback(async () => {
    // Slot-based quizzes: engagement is tracked by slot_id; prefer slot meta/view.
    if (slotId) {
      // If we already have slot meta, update from it (no network).
      if (slotMeta) {
        setEngagement(normalizeEngagementFromSlotRow(slotMeta));
        return;
      }
      // Otherwise fetch once.
      await fetchSlotMeta();
      return;
    }

    // Legacy quizzes: engagement tracked by quiz_id via RPC.
    if (!quizId) {
      setEngagement({ joined: 0, pre_joined: 0 });
      return;
    }
    try {
      const { data: engagementData, error: engagementError } = await supabase.rpc(
        'get_engagement_counts',
        { p_quiz_id: quizId },
      );
      if (engagementError) {
        console.warn('Engagement counts fetch failed:', engagementError);
        setEngagement({ joined: 0, pre_joined: 0 });
      } else {
        const rec = Array.isArray(engagementData) ? engagementData[0] : engagementData;
        const j = Number(rec?.joined ?? 0);
        const pj = Number(rec?.pre_joined ?? 0);
        setEngagement({ joined: isNaN(j) ? 0 : j, pre_joined: isNaN(pj) ? 0 : pj });
      }
    } catch (e) {
      console.warn('Engagement refresh failed', e);
    }
  }, [quizId, slotId, slotMeta, fetchSlotMeta, normalizeEngagementFromSlotRow]);

  const fetchQuizData = useCallback(async () => {
    try {
      let quizData = null;
      
      // If slotId is provided, fetch from quiz_slots_view instead of quizzes table
      if (slotId) {
        const { data: slotData, error: slotError } = await supabase
          .from('quiz_slots_view')
          .select('*')
          .eq('id', slotId)
          .maybeSingle();
        if (slotError || !slotData) {
          toast({ title: 'Error', description: 'Quiz slot not found.', variant: 'destructive' });
          navigate('/');
          return;
        }
        // Map slot data to quiz-like structure
        // quiz_id is the actual quiz ID from quizzes table (for loading questions)
        // slotData.id is the slot ID (for participation tracking)
        quizData = {
          id: slotData.quiz_id || slotData.id, // Use actual quiz_id for questions loading
          slotId: slotData.id, // Keep slot ID for participation
          title: slotData.quiz_title,
          category: slotData.category,
          start_time: slotData.start_time,
          end_time: slotData.end_time,
          status: slotData.status,
          prizes: slotData.prizes,
          prize_type: 'coins',
          questions: slotData.questions,
        };
        setSlotMeta(slotData);
      } else {
        // Legacy: fetch from quizzes table
        const { data, error: quizError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .single();
        if (quizError || !data) {
          toast({ title: 'Error', description: 'Quiz not found.', variant: 'destructive' });
          navigate('/');
          return;
        }
        quizData = data;
      }
      
      setQuiz(quizData);

      // Use the actual quiz ID from loaded data (slot.id = quiz.id)
      const effectiveQuizId = quizData?.id || quizId;

      let participant = null;
      if (user && user.id && effectiveQuizId) {
        // For slots, check by slot_id; for legacy, check by quiz_id
        let pData = null;
        let pError = null;
        if (slotId) {
          const result = await supabase
            .from('quiz_participants')
            .select('status')
            .eq('user_id', user.id)
            .eq('slot_id', slotId)
            .maybeSingle();
          pData = result.data;
          pError = result.error;
        } else {
          const result = await supabase
            .from('quiz_participants')
            .select('status')
            .eq('user_id', user.id)
            .eq('quiz_id', effectiveQuizId)
            .maybeSingle();
          pData = result.data;
          pError = result.error;
        }
        if (!pError && pData) {
          participant = pData;
          setJoined(true);
          setParticipantStatus(pData.status || null);
          if (participant.status === 'completed') setQuizState('completed');
        } else {
          setJoined(false);
          setParticipantStatus(null);
        }
      } else {
        setJoined(false);
        setParticipantStatus(null);
      }

      if (participant && participant.status !== 'completed') await loadQuestions(quizData?.id);
      await refreshEngagement();
    } catch (error) {
      console.error('Error fetching quiz data:', error);
      toast({ title: 'Error', description: 'Failed to load quiz.', variant: 'destructive' });
      navigate('/');
    }
  }, [quizId, slotId, user, navigate, toast, loadQuestions, refreshEngagement]); // slotId included

  useEffect(() => {
    fetchQuizData();
  }, [fetchQuizData]);

  // Timer / phase management
  useEffect(() => {
    if (!quiz || quizState === 'completed') return;
    const update = () => {
      const now = new Date();
      // Prefer slot times if slotMeta available
      const st = slotMeta?.start_time
        ? new Date(slotMeta.start_time)
        : quiz.start_time
          ? new Date(quiz.start_time)
          : null;
      const et = slotMeta?.end_time
        ? new Date(slotMeta.end_time)
        : quiz.end_time
          ? new Date(quiz.end_time)
          : null;
      const isUpcoming = st && now < st;
      const isActive = st && et && now >= st && now < et;
      if (slotPaused) {
        setQuizState('waiting'); // treat paused as waiting state
        setTimeLeft(
          isUpcoming && st
            ? Math.max(0, Math.round((st.getTime() - now.getTime()) / 1000))
            : isActive && et
              ? Math.max(0, Math.round((et.getTime() - now.getTime()) / 1000))
              : 0,
        );
        return;
      }
      if (isUpcoming) {
        setQuizState('waiting');
        setTimeLeft(Math.max(0, Math.round((st.getTime() - now.getTime()) / 1000)));
        return;
      }
      if (isActive) {
        setQuizState('active');
        setTimeLeft(Math.max(0, Math.round((et.getTime() - now.getTime()) / 1000)));
        return;
      }
      setQuizState('finished');
      setTimeLeft(0);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [quiz, quizState, slotMeta, slotPaused]);

  // Engagement polling, skip hidden
  useEffect(() => {
    if (!quiz) return;
    if (!(quizState === 'waiting' || quizState === 'active')) return;
    const tick = () => {
      if (isDocumentHidden()) return;
      refreshEngagement();
    };
    const id = setInterval(tick, QUIZ_ENGAGEMENT_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [quiz, quizState, refreshEngagement]);

  // Transition to active: join & load questions
  useEffect(() => {
    const run = async () => {
      if (!quiz) return;
      if (quizState !== 'active') return;
      if (!user) return;
      if (slotId && slotPaused) return;

      try {
        if (!joined || participantStatus === 'pre_joined') {
          let joinOk = false;
          let lastErr = null;
          for (let attempt = 0; attempt < 2 && !joinOk; attempt++) {
            // Use slot-specific RPC if this is a slot-based quiz
            const { error } = slotId 
              ? await supabase.rpc('join_slot', { p_slot_id: slotId })
              : await supabase.rpc('join_quiz', { p_quiz_id: quizId });
            if (!error) {
              joinOk = true;
              break;
            }
            lastErr = error;
            const msg = String(error.message || '').toLowerCase();
            if (msg.includes('not active') || msg.includes('not ready')) {
              // Grace: wait briefly and retry once
              await new Promise((r) => setTimeout(r, 1500));
              continue;
            }
            if (msg.includes('already') || msg.includes('completed')) {
              joinOk = true;
              break;
            }
            if (msg.includes('ended') || msg.includes('has ended')) {
              // Quiz has ended, don't retry
              setQuizState('finished');
              break;
            }
            break; // other errors: do not loop
          }
          if (joinOk) {
            setJoined(true);
            setParticipantStatus('joined');
          } else if (lastErr) {
            // As a fallback, pre-join so the user is tracked and reminded
            const { error: pjErr } = slotId
              ? await supabase.rpc('pre_join_slot', { p_slot_id: slotId })
              : await supabase.rpc('pre_join_quiz', { p_quiz_id: quizId });
            if (!pjErr) {
              setJoined(true);
              setParticipantStatus('pre_joined');
            } else {
              throw lastErr;
            }
          }
        }
        if (questions.length === 0) await loadQuestions(quiz?.id);
      } catch (e) {
        // Only show error if it's not a duplicate join attempt
        if (!e?.message?.includes('already') && !e?.message?.includes('completed')) {
          const msg = formatSupabaseError(e);
          console.error('Quiz join error:', msg, e);
          // Don't show toast to user, just log it
        }
      }
    };
    run();
  }, [
    quiz,
    quizState,
    user,
    joined,
    participantStatus,
    quizId,
    slotId,
    slotPaused,
    loadQuestions,
    questions.length,
    toast,
  ]);

  // Auto-submit on finish (if the user answered anything and was actively participating)
  useEffect(() => {
    // Only auto-submit if:
    // 1. Quiz just finished
    // 2. User has answered at least 1 question
    // 3. User was in 'joined' status (actually playing)
    // 4. Not already submitting
    const hasAnswers = Object.keys(answers).length > 0;
    const wasPlaying = participantStatus === 'joined';
    if (quizState === 'finished' && hasAnswers && wasPlaying && !submitting) {
      handleSubmit();
    }
    // Only react to quizState transitions; answers/submitting handled internally by handleSubmit side effects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizState]);

  // After finish/completion: Wait for timer to complete, then redirect to Results
  useEffect(() => {
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }

    // Safety checks
    if (!quiz) return;
    if (!quiz.end_time) return;
    if (!(quizState === 'finished' || quizState === 'completed')) return;

    const navigateToResults = () => {
      (async () => {
        try {
          await safeComputeResultsIfDue(supabase, quizId);
        } catch {
          /* ignore */
        }
        navigate(`/results/${quizId}`);
      })();
    };

    // Calculate time until quiz end_time
    try {
      const endTime = new Date(quiz.end_time).getTime();
      const now = Date.now();
      const timeUntilEnd = Math.max(0, endTime - now);

      // If quiz has already ended, redirect immediately
      if (timeUntilEnd === 0) {
        navigateToResults();
      } else {
        // Wait until timer completes, then redirect
        redirectTimeoutRef.current = setTimeout(() => {
          redirectTimeoutRef.current = null;
          navigateToResults();
        }, timeUntilEnd);
      }
    } catch (error) {
      console.error('Error calculating redirect time:', error);
      // Fallback: redirect after 5 seconds
      redirectTimeoutRef.current = setTimeout(() => {
        redirectTimeoutRef.current = null;
        navigateToResults();
      }, 5000);
    }

    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
  }, [quiz, quizId, quizState, navigate]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleJoinOrPrejoin = useCallback(async () => {
    if (!quiz) return;
    if (!user) {
      toast({
        title: 'Login required',
        description: 'Please sign in to join the quiz.',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }
    if (participantStatus === 'completed') {
      logger.info('User already completed this quiz');
      return;
    }

    try {
      if (
        typeof Notification !== 'undefined' &&
        Notification.permission !== 'granted' &&
        !isSubscribed
      ) {
        await subscribeToPush();
      }
    } catch {
      /* ignore */
    }

    try {
      const result = await smartJoinQuiz({ supabase, quiz, user });
      if (result.status === 'error') throw result.error;
      if (result.status === 'already') {
        setJoined(true);
        setParticipantStatus('joined');
        toast({ title: 'Already Joined', description: 'Starting shortly.' });
      } else if (result.status === 'joined') {
        setJoined(true);
        setParticipantStatus('joined');
        toast({ title: 'Joined!', description: 'Starting now.' });
      } else if (result.status === 'pre_joined') {
        // Pre-join acts like join in UI - user is in the quiz
        setJoined(true);
        setParticipantStatus('joined'); // Show as joined, not pre_joined
        toast({ title: 'Joined!', description: 'Quiz starts soon. Stay tuned!' });
      } else if (result.status === 'scheduled_retry') {
        setJoined(true);
        setParticipantStatus('joined'); // Show as joined
        toast({ title: 'Joined!', description: 'Quiz starts soon. Stay tuned!' });
      }
      if (quiz.status === 'active' && (result.status === 'joined' || result.status === 'already')) {
        await loadQuestions(quiz?.id);
        setQuizState('active');
      }
      refreshEngagement();
    } catch (err) {
      if (!err?.message?.includes('already') && !err?.message?.includes('completed')) {
        const msg = formatSupabaseError(err);
        console.error('Join quiz error:', msg, err);
        toast({
          title: 'Error',
          description: msg || 'Could not join quiz. Please try again.',
          variant: 'destructive',
        });
      }
    }
    // quizId intentionally excluded (stable id used inside smartJoinQuiz via quiz object); supabase stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    quiz,
    user,
    participantStatus,
    isSubscribed,
    subscribeToPush,
    toast,
    navigate,
    refreshEngagement,
    loadQuestions,
    setQuizState,
  ]);

  const handleAnswerSelect = useCallback(
    async (questionId, optionId) => {
      if (submitting || quizState !== 'active' || participantStatus === 'completed') return;
      if (!user?.id) return; // Guard against null user
      try {
        const { error } = await supabase
          .from('user_answers')
          .upsert(
            { user_id: user.id, question_id: questionId, selected_option_id: optionId },
            { onConflict: 'user_id,question_id' },
          );
        if (error) throw error;
        setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
        if (currentQuestionIndex < questions.length - 1) {
          if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => setCurrentQuestionIndex((prev) => prev + 1));
          } else {
            setTimeout(() => setCurrentQuestionIndex((prev) => prev + 1), 250);
          }
        }
      } catch (error) {
        console.error('Error saving answer:', error);
        // Queue silently; inform user first time only for this question
        const alreadyQueued = retryQueueRef.current.some((e) => e.questionId === questionId);
        if (!alreadyQueued) {
          toast({
            title: 'Sync delayed',
            description: 'Network issue. Will retry automatically.',
            variant: 'destructive',
          });
        }
        retryQueueRef.current.push({ questionId, optionId, attempt: 1 });
        scheduleRetry();
      }
    },
    [
      submitting,
      quizState,
      participantStatus,
      user?.id,
      currentQuestionIndex,
      questions.length,
      toast,
      scheduleRetry,
    ],
  );

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      // Use slot_id for slots, quiz_id for legacy
      let query = supabase
        .from('quiz_participants')
        .update({ status: 'completed' })
        .eq('user_id', user.id);
      if (slotId) {
        query = query.eq('slot_id', slotId);
      } else {
        query = query.eq('quiz_id', quizId);
      }
      const { error } = await query;
      if (error) throw error;
      toast({
        title: 'Quiz Completed!',
        description: 'Your answers have been submitted. Results will be announced soon!',
      });
      setQuizState('completed');
      try {
        // For slots, pass slotId for results computation
        await safeComputeResultsIfDue(supabase, slotId || quizId);
      } catch {
        /* ignore */
      }
      // Navigate to results - use slot path for slots
      navigate(slotId ? `/results/slot/${slotId}` : `/results/${quizId}`);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast({
        title: 'Submission Failed',
        description: 'Could not submit your answers. Please try again.',
        variant: 'destructive',
      });
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  }, [submitting, user?.id, quizId, toast, navigate]);

  const formatTime = useCallback((seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    // state
    quiz,
    questions,
    currentQuestionIndex,
    answers,
    quizState,
    timeLeft,
    submitting,
    engagement,
    joined,
    participantStatus,
    totalJoined,
    displayJoined,
    slotMeta,
    slotPaused,
    slotLoading,
    // setters
    setCurrentQuestionIndex,
    // actions
    handleJoinOrPrejoin,
    handleAnswerSelect,
    handleSubmit,
    // utils
    formatTime,
  };
}
