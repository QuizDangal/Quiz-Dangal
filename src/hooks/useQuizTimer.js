import { useState, useEffect, useCallback } from 'react';

/**
 * useQuizTimer
 * 
 * Manages quiz timing and phase transitions (waiting -> active -> finished).
 * Extracted from useQuizEngine for better code organization.
 * 
 * @param {Object} options - Configuration options
 * @param {Object} options.quiz - Quiz data with start_time and end_time
 * @param {Object} options.slotMeta - Slot metadata (optional, for slot-based quizzes)
 * @param {boolean} options.slotPaused - Whether slot is paused
 * @param {string} options.initialState - Initial quiz state
 * @returns {Object} Timer state and utilities
 */
export function useQuizTimer({ quiz, slotMeta, slotPaused, initialState = 'loading' }) {
  const [quizState, setQuizState] = useState(initialState);
  const [timeLeft, setTimeLeft] = useState(0);

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
        setQuizState('waiting');
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

  /**
   * Format seconds to MM:SS display
   */
  const formatTime = useCallback((seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  /**
   * Get time until quiz starts (for upcoming quizzes)
   */
  const getTimeUntilStart = useCallback(() => {
    if (!quiz?.start_time) return null;
    const st = new Date(quiz.start_time).getTime();
    const now = Date.now();
    return st > now ? Math.round((st - now) / 1000) : 0;
  }, [quiz?.start_time]);

  /**
   * Get time until quiz ends (for active quizzes)
   */
  const getTimeUntilEnd = useCallback(() => {
    if (!quiz?.end_time) return null;
    const et = new Date(quiz.end_time).getTime();
    const now = Date.now();
    return et > now ? Math.round((et - now) / 1000) : 0;
  }, [quiz?.end_time]);

  /**
   * Check if quiz is in specific phase
   */
  const isWaiting = quizState === 'waiting';
  const isActive = quizState === 'active';
  const isFinished = quizState === 'finished';
  const isCompleted = quizState === 'completed';

  return {
    quizState,
    setQuizState,
    timeLeft,
    formatTime,
    getTimeUntilStart,
    getTimeUntilEnd,
    isWaiting,
    isActive,
    isFinished,
    isCompleted,
  };
}
