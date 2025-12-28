import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useQuizEngine } from '@/hooks/useQuizEngine';
import SEO from '@/components/SEO';
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
 * Unified Quiz page component for both regular and slot-based quizzes.
 * Handles:
 *   - /quiz/:id (regular quiz)
 *   - /quiz/slot/:slotId (slot-based quiz)
 * Uses shared QuizUI components to reduce code duplication.
 */
const Quiz = () => {
  const { id: quizId, slotId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Determine if this is a slot-based quiz
  const isSlotQuiz = location.pathname.includes('/quiz/slot/');
  const effectiveId = isSlotQuiz ? slotId : quizId;
  
  // Slot-specific state
  const [slot, setSlot] = useState(null);
  const [slotLoading, setSlotLoading] = useState(isSlotQuiz);
  const [slotError, setSlotError] = useState(null);

  // Load slot data if this is a slot quiz
  const loadSlot = useCallback(async () => {
    if (!isSlotQuiz || !slotId) return;
    if (!supabase) {
      setSlotError('Supabase not configured');
      setSlotLoading(false);
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
      setSlotLoading(false);
    } catch (e) {
      setSlotError(e.message || 'Failed to load slot');
      setSlotLoading(false);
    }
  }, [isSlotQuiz, slotId]);

  useEffect(() => {
    if (isSlotQuiz) {
      loadSlot();
    }
  }, [isSlotQuiz, loadSlot]);

  // Use quiz engine with the effective ID
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
    error,
    totalJoined,
    displayJoined,
    setCurrentQuestionIndex,
    handleJoinOrPrejoin,
    handleAnswerSelect,
    handleSubmit,
    formatTime,
  } = useQuizEngine(isSlotQuiz ? slot?.id : quizId, navigate, isSlotQuiz ? { slotId } : undefined);

  // Handle next question
  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

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

  // Loading state - for slot quiz, wait for slot to load first
  if (isSlotQuiz && slotLoading) {
    return <LoadingView quizId={effectiveId} />;
  }

  // Error state for slot quiz
  if (isSlotQuiz && slotError) {
    return <ErrorView message={slotError} />;
  }

  // Engine-level error state (avoid auto-navigation on transient failures)
  if (quizState === 'error') {
    return <ErrorView message={error || 'Something went wrong. Please try again.'} />;
  }

  // Loading state for regular quiz
  if (quizState === 'loading' || (!isSlotQuiz && !quiz) || (isSlotQuiz && !slot)) {
    return <LoadingView quizId={effectiveId} />;
  }

  // Get quiz/slot details
  const quizTitle = isSlotQuiz ? (slot?.quiz_title || quiz?.title || 'Quiz') : (quiz?.title || 'Quiz');
  const prizes = isSlotQuiz 
    ? (Array.isArray(slot?.prizes) ? slot.prizes : [])
    : (Array.isArray(quiz?.prizes) ? quiz.prizes : []);
  const prizeType = isSlotQuiz ? 'coins' : (quiz?.prize_type || 'coins');
  
  // Get effective times
  const effectiveStartTime = isSlotQuiz ? slot?.start_time : quiz?.start_time;
  const effectiveQuizEndTime = isSlotQuiz ? slot?.end_time : quiz?.end_time;

  // Calculate if quiz is currently active
  const now = new Date();
  const startTime = effectiveStartTime ? new Date(effectiveStartTime) : null;
  const endTime = effectiveQuizEndTime ? new Date(effectiveQuizEndTime) : null;
  const isActive = startTime && endTime && now >= startTime && now < endTime;

  // Build quiz object for views (unified interface)
  const quizData = isSlotQuiz 
    ? { start_time: slot?.start_time, end_time: slot?.end_time }
    : quiz;

  // Pre-lobby: not joined yet
  if (!joined && quizState !== 'completed') {
    return (
      <PreLobbyView
        quiz={quizData}
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
        quiz={quizData}
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
    <>
      <SEO
        title={`${quizTitle} – Quiz Dangal`}
        description="Play this quiz on Quiz Dangal and win rewards!"
        robots="noindex, nofollow"
      />
      <ActiveQuizView
        title={quizTitle}
        quizId={effectiveId}
        questions={questions}
        currentQuestionIndex={currentQuestionIndex}
        answers={answers}
        timeLeft={timeLeft}
        submitting={submitting}
        quizState={quizState}
        participantStatus={participantStatus}
        formatTime={formatTime}
        onAnswerSelect={handleAnswerSelect}
        onNext={handleNext}
        onSubmit={handleSubmit}
      />
    </>
  );
};

export default Quiz;
