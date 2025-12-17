import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useQuizEngine } from '@/hooks/useQuizEngine';
import { fetchSlotsForCategory } from '@/lib/slots';
import {
  LoadingView,
  ErrorView,
  NoQuestionsView,
  PreLobbyView,
  WaitingView,
  CompletedView,
  TimesUpView,
  ActiveQuizView,
} from '@/components/quiz/QuizUI';

/**
 * SlotQuiz page component for slot-based quizzes.
 * Uses shared QuizUI components to reduce code duplication.
 * Slot ID = Quiz ID (same UUID).
 */
export default function SlotQuiz() {
  const { slotId } = useParams();
  const navigate = useNavigate();
  const [slot, setSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      setError(e.message || 'Failed to load slot');
      setLoading(false);
    }
  }, [slotId]);

  useEffect(() => {
    loadSlot();
  }, [loadSlot]);

  // Use quiz engine with slot.id as quizId
  const {
    quiz,
    questions,
    currentQuestionIndex,
    answers,
    quizState,
    timeLeft,
    submitting,
    joined,
    participantStatus,
    totalJoined,
    displayJoined,
    handleJoinOrPrejoin,
    handleAnswerSelect,
    handleSubmit,
    formatTime,
  } = useQuizEngine(slot?.id, navigate, { slotId });

  // Redirect finished to next slot
  useEffect(() => {
    if (quizState !== 'finished' && quizState !== 'completed') return;
    if (!slot?.id || !slot?.category) return;
    let cancelled = false;
    (async () => {
      try {
        const { slots: list } = await fetchSlotsForCategory(supabase, slot.category);
        const endMs = slot.end_time ? new Date(slot.end_time).getTime() : Date.now();
        const future = (list || [])
          .filter((s) => {
            if (!s.start_time) return false;
            const st = new Date(s.start_time).getTime();
            return st > endMs;
          })
          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        if (!cancelled && future[0]) {
          navigate('/quiz/slot/' + future[0].slotId);
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [quizState, slot?.id, slot?.category, slot?.end_time, navigate]);

  // Close handler for modals
  const handleClose = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  // Navigate to home
  const handleNavigateHome = () => navigate('/');

  // Loading state
  if (loading || quizState === 'loading' || !slot) {
    return <LoadingView quizId={slotId} />;
  }

  // Error state
  if (error) {
    return <ErrorView message={error} />;
  }

  // Get slot/quiz details
  const quizTitle = slot.quiz_title || quiz?.title || 'Quiz';
  const prizes = Array.isArray(slot.prizes) ? slot.prizes : [];
  const prizeType = 'coins';

  // Calculate if quiz is currently active
  const now = new Date();
  const startTime = slot.start_time ? new Date(slot.start_time) : null;
  const endTime = slot.end_time ? new Date(slot.end_time) : null;
  const isActive = startTime && endTime && now >= startTime && now < endTime;

  // Pre-lobby: not joined yet
  if (!joined && quizState !== 'completed') {
    return (
      <PreLobbyView
        quiz={{ start_time: slot.start_time, end_time: slot.end_time }}
        title={quizTitle}
        isActive={isActive}
        timeLeft={timeLeft}
        displayJoined={displayJoined}
        prizes={prizes}
        prizeType={prizeType}
        formatTime={formatTime}
        onJoin={handleJoinOrPrejoin}
        onClose={handleClose}
      />
    );
  }

  // Waiting for quiz to start
  if (quizState === 'waiting') {
    return (
      <WaitingView
        quiz={{ start_time: slot.start_time, end_time: slot.end_time }}
        title={quizTitle}
        timeLeft={timeLeft}
        totalJoined={totalJoined}
        prizes={prizes}
        prizeType={prizeType}
        formatTime={formatTime}
        onClose={handleClose}
      />
    );
  }

  // Check if user answered any questions
  const hasAnsweredQuestions = Object.keys(answers).length > 0;

  // Completed/finished state with answers
  if (quizState === 'completed' || (quizState === 'finished' && hasAnsweredQuestions)) {
    return (
      <CompletedView
        title={quizTitle}
        onNavigateHome={handleNavigateHome}
      />
    );
  }

  // Quiz finished but user didn't answer - show time's up
  if (quizState === 'finished' && !hasAnsweredQuestions) {
    return <TimesUpView title={quizTitle} onNavigateHome={handleNavigateHome} />;
  }

  // Active quiz state - check for questions
  if (!questions || questions.length === 0) {
    return <NoQuestionsView />;
  }

  // Active quiz with questions
  return (
    <ActiveQuizView
      title={quizTitle}
      quizId={slotId}
      questions={questions}
      currentQuestionIndex={currentQuestionIndex}
      answers={answers}
      timeLeft={timeLeft}
      submitting={submitting}
      quizState={quizState}
      participantStatus={participantStatus}
      formatTime={formatTime}
      onAnswerSelect={handleAnswerSelect}
      onSubmit={handleSubmit}
    />
  );
}
