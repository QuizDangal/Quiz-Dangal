import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { smartJoinQuiz, clearScheduledJoins } from '@/lib/smartJoinQuiz';
import { logger } from '@/lib/logger';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { isDocumentHidden } from '@/lib/visibility';
import { safeComputeResultsIfDue, formatSupabaseError } from '@/lib/utils';
import { 
  QUIZ_ENGAGEMENT_POLL_INTERVAL_MS, 
  ANSWER_RETRY_BASE_DELAY_MS,
  ANSWER_RETRY_MAX_DELAY_MS,
  ANSWER_RETRY_MAX_ATTEMPTS,
  SLOT_META_POLL_INTERVAL_MS,
  MAX_RETRY_QUEUE_SIZE
} from '@/constants';

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
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  // Slot integration state
  const [slotMeta, setSlotMeta] = useState(null); // raw slot row
  const [slotPaused, setSlotPaused] = useState(false);
  const [slotLoading, setSlotLoading] = useState(!!slotId);

  // Internal refs (declared early so async helpers can use them safely)
  const mountedRef = useRef(true);
  const slotMetaInFlightRef = useRef(false);
  const engagementPollTimeoutRef = useRef(null);
  const engagementPollDelayRef = useRef(QUIZ_ENGAGEMENT_POLL_INTERVAL_MS);

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
    if (slotMetaInFlightRef.current) return;
    slotMetaInFlightRef.current = true;
    try {
      const { data, error } = await supabase
        .from('quiz_slots_view')
        .select('*')
        .eq('id', slotId)
        .maybeSingle();
      if (!error && data) {
        if (!mountedRef.current) return;
        setSlotMeta(data);
        setSlotPaused(data.status === 'paused');
        // Keep engagement counts accurate for slot-based quizzes
        setEngagement(normalizeEngagementFromSlotRow(data));
      }
    } catch (e) {
      // silent fail
    } finally {
      slotMetaInFlightRef.current = false;
      if (mountedRef.current) setSlotLoading(false);
    }
  }, [slotId, normalizeEngagementFromSlotRow]);

  useEffect(() => {
    if (!slotId) return;

    let intervalId = null;
    const stop = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
    const start = () => {
      if (intervalId) return;
      intervalId = setInterval(() => {
        if (isDocumentHidden()) return;
        fetchSlotMeta();
      }, SLOT_META_POLL_INTERVAL_MS);
    };

    fetchSlotMeta();
    if (!isDocumentHidden()) start();

    const onVisibility = () => {
      if (isDocumentHidden()) {
        stop();
        return;
      }
      fetchSlotMeta();
      start();
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchSlotMeta, slotId]);
  const [submitting, setSubmitting] = useState(false);
  const [engagement, setEngagement] = useState({ joined: 0, pre_joined: 0 });
  const [joined, setJoined] = useState(false);
  const [participantStatus, setParticipantStatus] = useState(null); // 'pre_joined' | 'joined' | 'completed' | null

  // Internal refs
  const redirectTimeoutRef = useRef(null);
  const retryQueueRef = useRef([]); // { questionId, optionId, attempt }
  const retryTimerRef = useRef(null);
  const handleSubmitRef = useRef(null);
  const joinAttemptedRef = useRef(false); // Prevent repeated join attempts on effect re-runs
  const questionsLoadAttemptedRef = useRef(null); // Track quiz ID for which questions were already attempted

  useEffect(
    () => () => {
      mountedRef.current = false;
      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (engagementPollTimeoutRef.current) {
        clearTimeout(engagementPollTimeoutRef.current);
        engagementPollTimeoutRef.current = null;
      }
      // Clear retry queue to prevent memory leak
      retryQueueRef.current = [];
      // Cleanup scheduled join timeouts to prevent memory leaks
      const quizIdentifier = slotId || quizId;
      if (quizIdentifier) clearScheduledJoins(quizIdentifier);
    },
    [quizId, slotId],
  );

  // Retry queue helpers - using ref to avoid circular dependency
  const flushRetryQueueRef = useRef(null);
  
  const scheduleRetry = useCallback(() => {
    if (retryTimerRef.current || retryQueueRef.current.length === 0) return;
    // compute next delay based on first item's attempt (simple heuristic)
    const next = retryQueueRef.current[0];
    const base = ANSWER_RETRY_BASE_DELAY_MS * Math.pow(2, (next.attempt || 1) - 1); // 2s,4s,8s...
    const delay = Math.min(base, ANSWER_RETRY_MAX_DELAY_MS); // cap at max delay
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      if (typeof flushRetryQueueRef.current === 'function') {
        flushRetryQueueRef.current();
      }
    }, delay);
  }, []);

  const flushRetryQueue = useCallback(async () => {
    if (retryQueueRef.current.length === 0) return;
    // Limit queue size to prevent memory issues
    if (retryQueueRef.current.length > MAX_RETRY_QUEUE_SIZE) {
      retryQueueRef.current = retryQueueRef.current.slice(-MAX_RETRY_QUEUE_SIZE);
    }
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
        if (mountedRef.current) {
          setAnswers((prev) => ({ ...prev, [entry.questionId]: entry.optionId }));
        }
      } catch (err) {
        const nextAttempt = (entry.attempt || 1) + 1;
        if (nextAttempt <= ANSWER_RETRY_MAX_ATTEMPTS) {
          // attempts limit (exponential backoff)
          retryQueueRef.current.push({ ...entry, attempt: nextAttempt });
        } else {
          if (mountedRef.current) {
            toast({
              title: 'Answer not saved',
              description: 'One answer failed to sync after multiple retries.',
              variant: 'destructive',
            });
          }
        }
      }
    }
    if (retryQueueRef.current.length > 0) scheduleRetry();
  }, [participantStatus, user, toast, scheduleRetry]);

  // Keep ref updated for scheduleRetry to use
  useEffect(() => {
    flushRetryQueueRef.current = flushRetryQueue;
  }, [flushRetryQueue]);

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

  const loadQuestions = useCallback(async (actualQuizId = null, forceReload = false) => {
    // Use passed actualQuizId, or fall back to quiz state, or URL params
    const effectiveId = actualQuizId || quiz?.id || quizId || slotId;
    if (!effectiveId) return;
    
    // Prevent repeated load attempts for the same quiz (unless forced)
    if (!forceReload && questionsLoadAttemptedRef.current === effectiveId) return;
    questionsLoadAttemptedRef.current = effectiveId;
    
    try {
      // Always fetch from questions table (tick_quiz_slots populates it before quiz starts)
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select(`id, question_text, options ( id, option_text )`)
        .eq('quiz_id', effectiveId)
        .order('id');
      
      if (questionsError) {
        logger.error('Questions fetch error:', questionsError);
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
      logger.error('Questions load exception:', err);
      setQuestions([]);
    }
  }, [quiz?.id, quizId, slotId]);

  const refreshEngagement = useCallback(async () => {
    // Slot-based quizzes: engagement is tracked by slot_id; prefer slot meta/view.
    if (slotId) {
      if (slotMeta) {
        setEngagement(normalizeEngagementFromSlotRow(slotMeta));
        return true;
      }
      await fetchSlotMeta();
      return true;
    }

    // Legacy quizzes: engagement tracked by quiz_id via RPC.
    if (!quizId) {
      setEngagement({ joined: 0, pre_joined: 0 });
      return true;
    }

    try {
      const { data: engagementData, error: engagementError } = await supabase.rpc(
        'get_engagement_counts',
        { p_quiz_id: quizId },
      );
      if (engagementError) {
        logger.warn('Engagement counts fetch failed:', engagementError);
        setEngagement({ joined: 0, pre_joined: 0 });
        return false;
      } else {
        const rec = Array.isArray(engagementData) ? engagementData[0] : engagementData;
        const j = Number(rec?.joined ?? 0);
        const pj = Number(rec?.pre_joined ?? 0);
        setEngagement({ joined: isNaN(j) ? 0 : j, pre_joined: isNaN(pj) ? 0 : pj });
        return true;
      }
    } catch (e) {
      logger.warn('Engagement refresh failed', e);
      return false;
    }
  }, [quizId, slotId, slotMeta, fetchSlotMeta, normalizeEngagementFromSlotRow]);

  const fetchQuizData = useCallback(async () => {
    try {
      setError(null);
      let quizData = null;
      
      // If slotId is provided, fetch from quiz_slots_view instead of quizzes table
      if (slotId) {
        const { data: slotData, error: slotError } = await supabase
          .from('quiz_slots_view')
          .select('*')
          .eq('id', slotId)
          .maybeSingle();
        if (slotError || !slotData) {
          const msg = 'Quiz slot not found.';
          toast({ title: 'Error', description: msg, variant: 'destructive' });
          setError(msg);
          setQuizState('error');
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
          const msg = 'Quiz not found.';
          toast({ title: 'Error', description: msg, variant: 'destructive' });
          setError(msg);
          setQuizState('error');
          return;
        }
        quizData = data;
      }
      
      setQuiz(quizData);

      // Use the actual quiz ID from loaded data (slot.id = quiz.id)
      const effectiveQuizId = quizData?.id || quizId;

      let participant = null;
      if (user && user.id && effectiveQuizId) {
        // Always check by quiz_id (quiz_participants table uses quiz_id, not slot_id)
        const result = await supabase
          .from('quiz_participants')
          .select('status')
          .eq('user_id', user.id)
          .eq('quiz_id', effectiveQuizId)
          .maybeSingle();
        const pData = result.data;
        const pError = result.error;
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
      logger.error('Error fetching quiz data:', error);
      const msg = 'Failed to load quiz. Please check your internet and try again.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
      setError(msg);
      setQuizState('error');
    }
  }, [quizId, slotId, user, toast, loadQuestions, refreshEngagement]); // slotId included

  // Reset attempt trackers when quiz/slot changes
  useEffect(() => {
    joinAttemptedRef.current = false;
    questionsLoadAttemptedRef.current = null;
  }, [quizId, slotId]);

  useEffect(() => {
    fetchQuizData();
  }, [fetchQuizData]);

  // Timer / phase management
  useEffect(() => {
    if (!quiz || quizState === 'completed' || quizState === 'error') return;
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

  // Engagement polling: pause when hidden + simple backoff on failures
  useEffect(() => {
    if (!quiz) return;
    if (!(quizState === 'waiting' || quizState === 'active')) return;

    const clearPoll = () => {
      if (engagementPollTimeoutRef.current) {
        clearTimeout(engagementPollTimeoutRef.current);
        engagementPollTimeoutRef.current = null;
      }
    };

    let cancelled = false;
    engagementPollDelayRef.current = QUIZ_ENGAGEMENT_POLL_INTERVAL_MS;

    const scheduleNext = (delayMs) => {
      clearPoll();
      engagementPollTimeoutRef.current = setTimeout(async () => {
        engagementPollTimeoutRef.current = null;
        if (cancelled || !mountedRef.current) return;
        if (isDocumentHidden()) {
          scheduleNext(QUIZ_ENGAGEMENT_POLL_INTERVAL_MS);
          return;
        }

        const ok = await refreshEngagement();
        engagementPollDelayRef.current = ok
          ? QUIZ_ENGAGEMENT_POLL_INTERVAL_MS
          : Math.min(engagementPollDelayRef.current * 2, 60000);
        scheduleNext(engagementPollDelayRef.current);
      }, delayMs);
    };

    scheduleNext(0);

    const onVisibility = () => {
      if (isDocumentHidden()) {
        clearPoll();
        return;
      }
      scheduleNext(0);
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      clearPoll();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [quiz, quizState, refreshEngagement]);

  // Transition to active: join & load questions
  useEffect(() => {
    const run = async () => {
      if (!quiz) return;
      if (quizState !== 'active') return;
      if (!user) return;
      if (slotId && slotPaused) return;
      
      // Prevent repeated join attempts on effect re-runs (e.g., after 400 errors)
      const joinKey = slotId || quizId;
      if (joinAttemptedRef.current === joinKey && joined) return;

      try {
        if (!joined || participantStatus === 'pre_joined') {
          // Mark that we're attempting join for this quiz/slot
          joinAttemptedRef.current = joinKey;
          
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
              // Set joined to true anyway to prevent infinite retry loops
              // The user can refresh if they want to try again
              setJoined(true);
              throw lastErr;
            }
          }
        }
        if (questions.length === 0) await loadQuestions(quiz?.id);
      } catch (e) {
        // Only show error if it's not a duplicate join attempt
        if (!e?.message?.includes('already') && !e?.message?.includes('completed')) {
          const msg = formatSupabaseError(e);
          logger.error('Quiz join error:', msg, e);
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
      logger.error('Error calculating redirect time:', error);
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
        logger.error('Join quiz error:', msg, err);
        toast({
          title: 'Error',
          description: msg || 'Could not join quiz. Please try again.',
          variant: 'destructive',
        });
      }
    }
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
  ]);

  const handleAnswerSelect = useCallback(
    async (questionId, optionId) => {
      if (submitting || quizState !== 'active' || participantStatus === 'completed') return;
      if (!user?.id) return; // Guard against null user

      // Optimistic UI update so selection + submit button are reliable even under flaky networks.
      setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
      // Removed auto-advance - user will click Next/Submit button manually

      try {
        const { error } = await supabase
          .from('user_answers')
          .upsert(
            { user_id: user.id, question_id: questionId, selected_option_id: optionId },
            { onConflict: 'user_id,question_id' },
          );
        if (error) throw error;
      } catch (error) {
        logger.error('Error saving answer:', error);
        // Queue silently; inform user first time only for this question
        const alreadyQueued = retryQueueRef.current.some((e) => e.questionId === questionId);
        if (!alreadyQueued) {
          toast({
            title: 'Sync delayed',
            description: 'Network issue. Will retry automatically.',
            variant: 'destructive',
          });
        }
        // Keep only latest selection for a question in the retry queue
        retryQueueRef.current = retryQueueRef.current.filter((e) => e.questionId !== questionId);
        retryQueueRef.current.push({ questionId, optionId, attempt: 1 });
        scheduleRetry();
      }
    },
    [
      submitting,
      quizState,
      participantStatus,
      user?.id,
      toast,
      scheduleRetry,
    ],
  );

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    if (!user?.id) return;
    setSubmitting(true);
    try {
      // Best-effort: flush any pending answer sync before finalizing.
      await flushRetryQueue();
      if (retryQueueRef.current.length > 0) {
        toast({
          title: 'Sync pending',
          description: 'Some answers are still syncing. Please check internet and try again.',
          variant: 'destructive',
        });
        return;
      }

      // Always use quiz_id for quiz_participants table (it doesn't have slot_id column)
      const effectiveQuizId = quiz?.id || quizId;
      const { error } = await supabase
        .from('quiz_participants')
        .update({ status: 'completed' })
        .eq('user_id', user.id)
        .eq('quiz_id', effectiveQuizId);
      if (error) throw error;
      toast({
        title: 'Quiz Completed!',
        description: 'Your answers have been submitted. Results will be announced soon!',
      });
      setQuizState('completed');
      try {
        // For results computation, use the quiz ID
        await safeComputeResultsIfDue(supabase, effectiveQuizId);
      } catch {
        /* ignore */
      }
      // Navigate to results - use slot path for slots
      navigate(slotId ? `/results/slot/${slotId}` : `/results/${quizId}`);
    } catch (error) {
      logger.error('Error submitting quiz:', error);
      toast({
        title: 'Submission Failed',
        description: 'Could not submit your answers. Please try again.',
        variant: 'destructive',
      });
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  }, [submitting, user?.id, quiz?.id, quizId, slotId, toast, navigate, flushRetryQueue]);

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  // Auto-submit on finish (only on transition to finished, only once per quiz/slot)
  const prevQuizStateRef = useRef(null);
  const autoSubmitDoneRef = useRef(null);
  useEffect(() => {
    // Reset guards when quiz changes
    autoSubmitDoneRef.current = null;
    prevQuizStateRef.current = null;
  }, [quizId, slotId]);

  useEffect(() => {
    const prev = prevQuizStateRef.current;
    prevQuizStateRef.current = quizState;

    if (quizState !== 'finished') return;
    if (prev === 'finished') return; // not a transition

    const key = slotId ? `slot:${slotId}` : `quiz:${quizId}`;
    if (autoSubmitDoneRef.current === key) return;

    const hasAnswers = Object.keys(answers || {}).length > 0;
    const wasPlaying = participantStatus === 'joined';
    if (hasAnswers && wasPlaying && !submitting) {
      autoSubmitDoneRef.current = key;
      if (typeof handleSubmitRef.current === 'function') handleSubmitRef.current();
    }
  }, [quizState, participantStatus, submitting, quizId, slotId, answers]);

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
    error,
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
