import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { isDocumentHidden } from '@/lib/visibility';
import {
  ANSWER_RETRY_BASE_DELAY_MS,
  ANSWER_RETRY_MAX_DELAY_MS,
  ANSWER_RETRY_MAX_ATTEMPTS,
  MAX_RETRY_QUEUE_SIZE,
} from '@/constants';

/**
 * useAnswerRetryQueue
 * 
 * Handles resilient answer syncing with exponential backoff retry logic.
 * Extracted from useQuizEngine for better code organization and reusability.
 * 
 * Features:
 * - Exponential backoff (2s, 4s, 8s... capped at 30s)
 * - Queue size limits to prevent memory issues
 * - Auto-flush on network online or tab visibility
 * - Optimistic UI updates with background sync
 * 
 * @param {Object} options - Configuration options
 * @param {Object} options.user - Current user object
 * @param {string} options.participantStatus - Current participant status
 * @param {Function} options.setAnswers - State setter for answers
 * @returns {Object} Queue management functions
 */
export function useAnswerRetryQueue({ user, participantStatus, setAnswers }) {
  const { toast } = useToast();
  const retryQueueRef = useRef([]); // { questionId, optionId, attempt }
  const retryTimerRef = useRef(null);
  const flushRetryQueueRef = useRef(null);

  /**
   * Schedule next retry with exponential backoff
   */
  const scheduleRetry = useCallback(() => {
    if (retryTimerRef.current || retryQueueRef.current.length === 0) return;
    
    // Compute delay based on first item's attempt count
    const next = retryQueueRef.current[0];
    const base = ANSWER_RETRY_BASE_DELAY_MS * Math.pow(2, (next.attempt || 1) - 1);
    const delay = Math.min(base, ANSWER_RETRY_MAX_DELAY_MS);
    
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      if (typeof flushRetryQueueRef.current === 'function') {
        flushRetryQueueRef.current();
      }
    }, delay);
  }, []);

  /**
   * Process all queued answers and sync to database
   */
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
        setAnswers((prev) => ({ ...prev, [entry.questionId]: entry.optionId }));
      } catch (err) {
        const nextAttempt = (entry.attempt || 1) + 1;
        if (nextAttempt <= ANSWER_RETRY_MAX_ATTEMPTS) {
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
  }, [participantStatus, user, toast, scheduleRetry, setAnswers]);

  // Keep ref updated for scheduleRetry to use
  useEffect(() => {
    flushRetryQueueRef.current = flushRetryQueue;
  }, [flushRetryQueue]);

  /**
   * Add answer to retry queue
   */
  const queueAnswer = useCallback((questionId, optionId) => {
    // Keep only latest selection for a question in the retry queue
    retryQueueRef.current = retryQueueRef.current.filter((e) => e.questionId !== questionId);
    retryQueueRef.current.push({ questionId, optionId, attempt: 1 });
    scheduleRetry();
  }, [scheduleRetry]);

  /**
   * Check if queue has pending items
   */
  const hasPendingItems = useCallback(() => {
    return retryQueueRef.current.length > 0;
  }, []);

  /**
   * Check if a specific question is already queued
   */
  const isQueued = useCallback((questionId) => {
    return retryQueueRef.current.some((e) => e.questionId === questionId);
  }, []);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryQueueRef.current = [];
    };
  }, []);

  return {
    queueAnswer,
    flushRetryQueue,
    hasPendingItems,
    isQueued,
  };
}
