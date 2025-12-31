import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { logger } from '@/lib/logger';
import { isDocumentHidden } from '@/lib/visibility';
import { QUIZ_ENGAGEMENT_POLL_INTERVAL_MS } from '@/constants';

/**
 * useQuizEngagement
 * 
 * Manages quiz engagement metrics (participant counts) with polling.
 * Extracted from useQuizEngine for better code organization.
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.quizId - Quiz ID for legacy quizzes
 * @param {string} options.slotId - Slot ID for slot-based quizzes
 * @param {Object} options.slotMeta - Slot metadata
 * @param {string} options.quizState - Current quiz state
 * @returns {Object} Engagement state and utilities
 */
export function useQuizEngagement({ quizId, slotId, slotMeta, quizState }) {
  const [engagement, setEngagement] = useState({ joined: 0, pre_joined: 0 });

  /**
   * Normalize engagement counts from slot row data
   */
  const normalizeEngagementFromSlotRow = useCallback((row) => {
    const joined = Number(row?.participants_joined ?? row?.joined_count ?? row?.joined ?? 0);
    const pre = Number(row?.participants_pre ?? row?.pre_joined_count ?? row?.pre_joined ?? 0);
    return {
      joined: Number.isFinite(joined) ? joined : 0,
      pre_joined: Number.isFinite(pre) ? pre : 0,
    };
  }, []);

  /**
   * Refresh engagement counts from database
   */
  const refreshEngagement = useCallback(async () => {
    // Slot-based quizzes: engagement is tracked by slot_id
    if (slotId) {
      if (slotMeta) {
        setEngagement(normalizeEngagementFromSlotRow(slotMeta));
        return;
      }
      // Fetch fresh slot data if no slotMeta
      try {
        const { data, error } = await supabase
          .from('quiz_slots_view')
          .select('*')
          .eq('id', slotId)
          .maybeSingle();
        if (!error && data) {
          setEngagement(normalizeEngagementFromSlotRow(data));
        }
      } catch (e) {
        logger.warn('Slot engagement fetch failed', e);
      }
      return;
    }

    // Legacy quizzes: engagement tracked by quiz_id via RPC
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
        logger.warn('Engagement counts fetch failed:', engagementError);
        setEngagement({ joined: 0, pre_joined: 0 });
      } else {
        const rec = Array.isArray(engagementData) ? engagementData[0] : engagementData;
        const j = Number(rec?.joined ?? 0);
        const pj = Number(rec?.pre_joined ?? 0);
        setEngagement({ joined: isNaN(j) ? 0 : j, pre_joined: isNaN(pj) ? 0 : pj });
      }
    } catch (e) {
      logger.warn('Engagement refresh failed', e);
    }
  }, [quizId, slotId, slotMeta, normalizeEngagementFromSlotRow]);

  // Engagement polling (skip when tab is hidden)
  useEffect(() => {
    if (!(quizState === 'waiting' || quizState === 'active')) return;
    
    const tick = () => {
      if (isDocumentHidden()) return;
      refreshEngagement();
    };
    
    const id = setInterval(tick, QUIZ_ENGAGEMENT_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [quizState, refreshEngagement]);

  // Derived values
  const totalJoined = (engagement.joined || 0) + (engagement.pre_joined || 0);
  
  // Display rule: when active, show only actually joined; when upcoming, show interested (pre+joined)
  const displayJoined = quizState === 'active' ? (engagement.joined || 0) : totalJoined;

  return {
    engagement,
    setEngagement,
    refreshEngagement,
    normalizeEngagementFromSlotRow,
    totalJoined,
    displayJoined,
  };
}
