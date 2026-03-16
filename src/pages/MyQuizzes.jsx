import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel';
import { m } from '@/lib/motion-lite';
import { useNavigate } from 'react-router-dom';
import { Clock, Play, Users, Trophy, Sparkles, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getSupabase, hasSupabaseConfig } from '@/lib/customSupabaseClient';
import {
  formatTimeOnly,
  getPrizeDisplay,
  shouldAllowClientCompute,
  safeComputeResultsIfDue,
  prefetchRoute,
} from '@/lib/utils';
import { logger } from '@/lib/logger';
import SeoHead from '@/components/SEO';

const MyQuizzes = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({});
  const [_nowTick, setNowTick] = useState(0);

  const computeAttemptedRef = useRef(new Set());
  const notifiedResultsRef = useRef(new Set());
  const refreshTimerRef = useRef(null);

  const fetchMyQuizzes = useCallback(async () => {
    if (!user) return;
    if (!hasSupabaseConfig) {
      setQuizzes([]);
      return;
    }
    const sb = await getSupabase();
    if (!sb) {
      setQuizzes([]);
      return;
    }
    try {
      // Minimize payload and DB work:
      // - Query live/upcoming separately without heavy JSON columns (e.g., leaderboard)
      // - Fetch only the latest few finished with leaderboard for rank display
      const nowIso = new Date().toISOString();

      // Live/Upcoming: need only basic fields
      const liveCols = 'id, slot_id, title, start_time, end_time, prize_type, prizes';
      const { data: liveData, error: liveErr } = await sb
        .from('my_quizzes_view')
        .select(liveCols)
        .gt('end_time', nowIso)
        .order('start_time', { ascending: true })
        .limit(20);
      if (liveErr) throw liveErr;

      // Finished: include leaderboard but cap to recent items
      const finishedCols = 'id, slot_id, title, end_time, prize_type, prizes, leaderboard';
      const { data: finishedData, error: finErr } = await sb
        .from('my_quizzes_view')
        .select(finishedCols)
        .lte('end_time', nowIso)
        .order('end_time', { ascending: false })
        .limit(5);
      if (finErr) throw finErr;

      // Merge for downstream UI which splits again by time; keeping shape consistent
      setQuizzes([...(liveData || []), ...(finishedData || [])]);
    } catch (err) {
      logger.error('fetchMyQuizzes failed', err);
      setQuizzes([]);
    }
  }, [user]);

  // Background compute for missing leaderboards (never blocks initial render)
  useEffect(() => {
    if (!user) return;
    if (!hasSupabaseConfig) return;
    if (!Array.isArray(quizzes) || quizzes.length === 0) return;

    const now = Date.now();
    const needsCompute = quizzes.filter((row) => {
      try {
        if (!row?.id) return false;
        if (!row?.end_time) return false;
        const ended = new Date(row.end_time).getTime() <= now;
        if (!ended) return false;
        const missing = !Array.isArray(row.leaderboard) || row.leaderboard.length === 0;
        if (!missing) return false;
        if (computeAttemptedRef.current.has(row.id)) return false;
        return true;
      } catch {
        return false;
      }
    });

    const allowClientCompute =
      shouldAllowClientCompute({ defaultValue: true }) || userProfile?.role === 'admin';
    if (!allowClientCompute || needsCompute.length === 0) return;

    let cancelled = false;

    const schedule = (fn, timeoutMs = 2500) => {
      try {
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          window.requestIdleCallback(
            () => {
              try {
                fn();
              } catch {
                /* ignore */
              }
            },
            { timeout: timeoutMs },
          );
          return;
        }
      } catch {
        /* ignore */
      }
      setTimeout(() => {
        try {
          fn();
        } catch {
          /* ignore */
        }
      }, Math.max(0, timeoutMs));
    };

    // Mark as attempted up-front to avoid rescheduling loops.
    for (const row of needsCompute) computeAttemptedRef.current.add(row.id);

    schedule(async () => {
      try {
        const sb = await getSupabase();
        if (!sb || cancelled) return;

        const settled = await Promise.allSettled(
          needsCompute.map((row) => safeComputeResultsIfDue(sb, row.id)),
        );
        const attempted = settled.some(
          (r) => r.status === 'fulfilled' && r.value === true,
        );
        if (!attempted || cancelled) return;

        // Best-effort refresh; UI already rendered.
        const { data: data2 } = await sb.from('my_quizzes_view').select('*');
        if (cancelled) return;
        setQuizzes((data2 || []).map((s) => ({ ...s })));
      } catch {
        /* ignore */
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user, userProfile?.role, quizzes]);

  useEffect(() => {
    // Auto-ask once on My Quizzes page (in addition to join-based prompt)
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      Notification.requestPermission().catch(() => {});
    }

    if (!user) {
      setLoading(false);
      setQuizzes([]);
      setCounts({});
      return;
    }

    const initialFetch = async () => {
      setLoading(true);
      try {
        await fetchMyQuizzes();
      } finally {
        setLoading(false);
      }
    };
    initialFetch();

    // Poll every 30 seconds as fallback (realtime will push sooner)
    const interval = setInterval(fetchMyQuizzes, 30000);

    // Refresh when page becomes visible (user switches tabs back)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchMyQuizzes();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Refresh when network comes back online
    const handleOnline = () => {
      fetchMyQuizzes();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [user, fetchMyQuizzes]);

  // Realtime for instant result updates without page refresh
  const realtimeEnabled = (() => {
    try {
      const runtimeEnv =
        typeof window !== 'undefined' && window.__QUIZ_DANGAL_ENV__
          ? window.__QUIZ_DANGAL_ENV__
          : {};
      const raw =
        import.meta.env.VITE_ENABLE_REALTIME ??
        runtimeEnv.VITE_ENABLE_REALTIME ??
        '1'; // Enabled by default now
      const v = String(raw).toLowerCase();
      return v === '1' || v === 'true' || v === 'yes';
    } catch {
      return true; // Default enabled
    }
  })();
  const realtimeConditionsOk = (() => {
    try {
      if (typeof window === 'undefined') return false;
      if (!window.isSecureContext) return false;
      if (!('WebSocket' in window)) return false;
      if (navigator && navigator.onLine === false) return false;
      // Removed visibility check - still listen in background for updates
      const conn =
        (navigator &&
          (navigator.connection || navigator.mozConnection || navigator.webkitConnection)) ||
        null;
      if (conn) {
        if (conn.saveData) return false;
        if (typeof conn.effectiveType === 'string' && /(^|\b)2g(\b|$)/i.test(conn.effectiveType))
          return false;
      }
      return true;
    } catch {
      return false;
    }
  })();
  
  const realtimeActive = realtimeEnabled && realtimeConditionsOk && !!user && !!hasSupabaseConfig;

  const scheduleRefresh = useCallback(() => {
    try {
      if (refreshTimerRef.current) return;
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        fetchMyQuizzes();
      }, 650);
    } catch {
      // Fallback: if timers fail, do a direct refresh
      fetchMyQuizzes();
    }
  }, [fetchMyQuizzes]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    };
  }, []);

  // IMPORTANT: never subscribe to entire tables here.
  // We subscribe only to the current user's visible quiz_ids / slot_ids.
  const myQuizzesRealtimeChanges = useMemo(() => {
    try {
      const quizIds = Array.from(
        new Set((quizzes || []).map((q) => q?.id).filter(Boolean)),
      ).slice(0, 40);
      const slotIds = Array.from(
        new Set((quizzes || []).map((q) => q?.slot_id).filter(Boolean)),
      ).slice(0, 40);

      const changes = [];
      for (const quizId of quizIds) {
        changes.push({ event: '*', table: 'quiz_results', filter: `quiz_id=eq.${quizId}` });
      }
      for (const slotId of slotIds) {
        // quiz_slots primary key is expected to be `id`.
        changes.push({ event: 'UPDATE', table: 'quiz_slots', filter: `id=eq.${slotId}` });
      }
      return changes;
    } catch {
      return [];
    }
  }, [quizzes]);

  useRealtimeChannel({
    enabled: realtimeActive && myQuizzesRealtimeChanges.length > 0,
    channelName: user?.id ? `myquizzes-${user.id}` : 'myquizzes',
    changes: myQuizzesRealtimeChanges,
    onChange: (payload) => {
      scheduleRefresh();
      try {
        if (payload?.table !== 'quiz_results') return;
        const quizId = payload?.new?.quiz_id || payload?.old?.quiz_id;
        if (!quizId) return;
        if (notifiedResultsRef.current.has(quizId)) return;
        notifiedResultsRef.current.add(quizId);
        if (
          typeof window !== 'undefined' &&
          'Notification' in window &&
          Notification.permission === 'granted'
        ) {
          new Notification('Quiz Result Ready', {
            body: 'Your quiz results are available. Tap to view.',
          });
        }
      } catch {
        /* ignore */
      }
    },
    joinTimeoutMs: 5000,
  });

  useEffect(() => {
    let tickId = null;
    try {
      const now = Date.now();
      const hasLive = (quizzes || []).some((q) => {
        const st = q.start_time ? new Date(q.start_time).getTime() : 0;
        const et = q.end_time ? new Date(q.end_time).getTime() : 0;
        return (st && now < st) || (st && et && now >= st && now < et);
      });
      if (hasLive) {
        tickId = setInterval(() => {
          setNowTick((t) => (t + 1) % 1_000_000);
        }, 1000);
      }
    } catch {
      /* ignore */
    }

    return () => {
      if (tickId) clearInterval(tickId);
    };
  }, [quizzes]);

  // Fetch engagement counts for visible (non-finished) quizzes, same as Category
  useEffect(() => {
    const run = async () => {
      try {
        if (!hasSupabaseConfig) {
          setCounts({});
          return;
        }
        const sb = await getSupabase();
        if (!sb) {
          setCounts({});
          return;
        }
        const now = Date.now();
        const visible = (quizzes || []).filter(
          (q) => q.end_time && now < new Date(q.end_time).getTime(),
        );

        const legacyQuizIds = visible.filter((q) => !q.slot_id).map((q) => q.id);
        const slotIds = visible.filter((q) => !!q.slot_id).map((q) => q.slot_id);

        const map = {};

        // Legacy quizzes: use existing bulk RPC by quiz_id
        if (legacyQuizIds.length) {
          const { data, error } = await sb.rpc('get_engagement_counts_many', {
            p_quiz_ids: legacyQuizIds,
          });
          if (error) throw error;
          for (const row of data || []) {
            const pre = row.pre_joined || 0;
            const joined = row.joined || 0; // SQL includes completed
            map[row.quiz_id] = pre + joined;
          }
        }

        // Slot-based quizzes: participants are tracked by slot_id.
        // NOTE: quiz_slots_view schema has historically varied (participants_* vs *_count),
        // so we fetch `*` and normalize counts with fallbacks.
        if (slotIds.length) {
          const normalizeTotal = (row) => {
            const joined = Number(row?.participants_joined ?? row?.joined_count ?? row?.joined ?? 0);
            const pre = Number(row?.participants_pre ?? row?.pre_joined_count ?? row?.pre_joined ?? 0);
            const total = Number(row?.participants_total ?? (joined + pre));
            return Number.isFinite(total) ? total : 0;
          };

          const keyOf = (row) => row?.id || row?.slot_id || null;

          // Try primary filter by `id`, then fallback to `slot_id` if needed.
          try {
            const { data: slotRows, error: slotErr } = await sb
              .from('quiz_slots_view')
              .select('*')
              .in('id', slotIds);
            if (slotErr) throw slotErr;
            for (const s of slotRows || []) {
              const key = keyOf(s);
              if (!key) continue;
              map[key] = normalizeTotal(s);
            }
          } catch {
            try {
              const { data: slotRows2, error: slotErr2 } = await sb
                .from('quiz_slots_view')
                .select('*')
                .in('slot_id', slotIds);
              if (slotErr2) throw slotErr2;
              for (const s of slotRows2 || []) {
                const key = keyOf(s);
                if (!key) continue;
                map[key] = normalizeTotal(s);
              }
            } catch {
              // If view/filter is missing, just leave slot counts as 0
            }
          }
        }

        setCounts(map);
      } catch {
        setCounts({});
      }
    };
    if (quizzes && quizzes.length) run();
  }, [quizzes]);

  if (loading) {
    return (
      <div className="relative min-h-screen pt-4 mx-auto max-w-3xl px-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-slate-800 animate-pulse" />
          <div className="h-6 w-28 bg-slate-800 rounded-lg animate-pulse" />
        </div>
        <div className="h-4 w-32 bg-slate-800 rounded mb-3 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-white/5 bg-slate-950/80 p-4 animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="h-5 w-16 bg-emerald-900/40 rounded-lg" />
                <div className="h-4 w-12 bg-slate-800 rounded" />
              </div>
              <div className="h-5 w-3/4 bg-slate-700 rounded mb-3" />
              <div className="flex gap-1.5 mb-3">
                {[1,2,3].map(j => <div key={j} className="flex-1 h-12 bg-slate-800/60 rounded-xl" />)}
              </div>
              <div className="h-10 bg-slate-800 rounded-xl" />
            </div>
          ))}
        </div>
        <div className="h-4 w-24 bg-slate-800 rounded mb-3 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-white/5 bg-slate-950/80 p-4 animate-pulse">
              <div className="h-4 w-2/3 bg-slate-700 rounded mb-3" />
              <div className="flex gap-1.5 mb-3">
                {[1,2,3].map(j => <div key={j} className="flex-1 h-14 bg-slate-800/60 rounded-xl" />)}
              </div>
              <div className="h-10 bg-slate-800 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center overflow-hidden">
        {/* Original Animated Background Orbs */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
          <m.div 
            className="absolute top-20 -left-20 w-64 h-64 rounded-full bg-gradient-to-br from-orange-500/20 via-pink-500/15 to-purple-600/20 blur-[80px]"
            animate={{ x: [0, 30, 0], y: [0, 20, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <m.div 
            className="absolute top-1/3 -right-20 w-72 h-72 rounded-full bg-gradient-to-br from-violet-600/20 via-blue-500/15 to-cyan-500/20 blur-[90px]"
            animate={{ x: [0, -25, 0], y: [0, 30, 0], scale: [1.1, 1, 1.1] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
          <m.div 
            className="absolute bottom-40 left-1/4 w-56 h-56 rounded-full bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-cyan-500/15 blur-[70px]"
            animate={{ x: [0, 20, 0], y: [0, -20, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Content */}
        <m.div 
          className="relative z-10 text-center px-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* 3D Isometric Illustration */}
          <m.div 
            className="relative w-44 h-44 mx-auto mb-5"
            animate={{ 
              y: [0, -10, 0],
              rotateY: [0, 5, 0, -5, 0]
            }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          >
            {/* Animated Glow behind */}
            <m.div 
              className="absolute inset-0 bg-gradient-to-b from-violet-500/40 via-pink-500/30 to-cyan-500/20 blur-3xl scale-150"
              animate={{ 
                opacity: [0.5, 0.8, 0.5],
                scale: [1.4, 1.6, 1.4]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
            
            <svg viewBox="0 0 160 160" className="w-full h-full relative z-10" fill="none">
              <defs>
                {/* Gradients */}
                <linearGradient id="isoTop" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#c4b5fd"/>
                  <stop offset="100%" stopColor="#a78bfa"/>
                </linearGradient>
                <linearGradient id="isoLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7c3aed"/>
                  <stop offset="100%" stopColor="#5b21b6"/>
                </linearGradient>
                <linearGradient id="isoRight" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6"/>
                  <stop offset="100%" stopColor="#6d28d9"/>
                </linearGradient>
                <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fcd34d"/>
                  <stop offset="50%" stopColor="#fbbf24"/>
                  <stop offset="100%" stopColor="#f59e0b"/>
                </linearGradient>
                <linearGradient id="lineGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f472b6"/>
                  <stop offset="100%" stopColor="#ec4899"/>
                </linearGradient>
                <linearGradient id="lineGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22d3ee"/>
                  <stop offset="100%" stopColor="#06b6d4"/>
                </linearGradient>
                <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#7c3aed" floodOpacity="0.35"/>
                </filter>
              </defs>
              
              {/* 3D Isometric Clipboard */}
              <g filter="url(#softShadow)" transform="translate(80, 85)">
                {/* Back face (left) */}
                <path d="M-35 -50 L-35 45 L0 65 L0 -30 Z" fill="url(#isoLeft)"/>
                {/* Back face (right) */}
                <path d="M0 -30 L0 65 L35 45 L35 -50 Z" fill="url(#isoRight)"/>
                {/* Top face */}
                <path d="M-35 -50 L0 -70 L35 -50 L0 -30 Z" fill="url(#isoTop)"/>
                
                {/* Clip holder - 3D */}
                <g transform="translate(0, -60)">
                  <path d="M-12 -8 L0 -14 L12 -8 L12 4 L0 10 L-12 4 Z" fill="url(#goldGrad)"/>
                  <ellipse cx="0" cy="-2" rx="4" ry="3" fill="#92400e"/>
                </g>
                
                {/* Content lines on front face */}
                <g transform="translate(-25, -25)">
                  <rect x="0" y="0" width="28" height="4" rx="2" fill="url(#lineGrad1)" opacity="0.9">
                    <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite"/>
                  </rect>
                  <rect x="0" y="12" width="22" height="4" rx="2" fill="#a78bfa" opacity="0.8">
                    <animate attributeName="opacity" values="1;0.6;1" dur="2.2s" repeatCount="indefinite"/>
                  </rect>
                  <rect x="0" y="24" width="25" height="4" rx="2" fill="url(#lineGrad2)" opacity="0.85">
                    <animate attributeName="opacity" values="0.7;1;0.7" dur="1.8s" repeatCount="indefinite"/>
                  </rect>
                  <rect x="0" y="36" width="18" height="4" rx="2" fill="#fbbf24" opacity="0.75">
                    <animate attributeName="opacity" values="0.5;0.9;0.5" dur="2.5s" repeatCount="indefinite"/>
                  </rect>
                </g>
                
                {/* Question mark */}
                <text x="5" y="35" fontSize="24" fontWeight="bold" fill="#ddd6fe" opacity="0.4">?</text>
              </g>
              
              {/* Floating elements */}
              <g>
                {/* Star */}
                <path d="M130 30 L132 36 L138 38 L132 40 L130 46 L128 40 L122 38 L128 36 Z" fill="#fbbf24">
                  <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite"/>
                  <animateTransform attributeName="transform" type="rotate" from="0 130 38" to="360 130 38" dur="6s" repeatCount="indefinite"/>
                </path>
                
                {/* Small star */}
                <path d="M25 50 L26.5 54 L31 55.5 L26.5 57 L25 61 L23.5 57 L19 55.5 L23.5 54 Z" fill="#ec4899">
                  <animate attributeName="opacity" values="1;0.4;1" dur="1.8s" repeatCount="indefinite"/>
                  <animateTransform attributeName="transform" type="rotate" from="360 25 55.5" to="0 25 55.5" dur="5s" repeatCount="indefinite"/>
                </path>
                
                {/* Dots */}
                <circle cx="140" cy="100" r="4" fill="#22d3ee">
                  <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite"/>
                </circle>
                <circle cx="20" cy="110" r="3" fill="#f472b6">
                  <animate attributeName="r" values="2;4;2" dur="2.5s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="1;0.5;1" dur="2.5s" repeatCount="indefinite"/>
                </circle>
                <circle cx="135" cy="130" r="2.5" fill="#a78bfa">
                  <animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" repeatCount="indefinite"/>
                </circle>
              </g>
            </svg>
          </m.div>

          {/* Text */}
          <m.p 
            className="text-base text-slate-400 mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            No Quizzes Joined
          </m.p>

          {/* Button */}
          <m.button
            onClick={() => navigate('/')}
            className="relative px-8 py-3.5 rounded-xl font-semibold text-white overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #db2777, #ea580c)',
              boxShadow: '0 8px 32px -8px rgba(124, 58, 237, 0.5)',
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.02, boxShadow: '0 12px 40px -8px rgba(124, 58, 237, 0.6)' }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Shimmer */}
            <m.div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-12"
              animate={{ x: ['-200%', '200%'] }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 }}
            />
            <span className="relative z-10 flex items-center justify-center gap-2">
              <span>🎯</span>
              <span>Explore Quizzes</span>
            </span>
          </m.button>
        </m.div>
      </div>
    );
  }

  // Merge: Live/Upcoming (pre_joined or joined, but not finished), then Finished
  const nowTs = Date.now();
  const liveUpcoming = quizzes.filter((q) => q.end_time && nowTs < new Date(q.end_time).getTime());
  const finished = quizzes
    .filter((q) => q.end_time && nowTs >= new Date(q.end_time).getTime())
    .sort((a, b) => {
      const aEnd = a.end_time ? new Date(a.end_time).getTime() : 0;
      const bEnd = b.end_time ? new Date(b.end_time).getTime() : 0;
      return bEnd - aEnd;
    })
    .slice(0, 5);
  // sort live/upcoming: active first, then by start time
  liveUpcoming.sort((a, b) => {
    const aSt = a.start_time ? new Date(a.start_time).getTime() : 0;
    const aEt = a.end_time ? new Date(a.end_time).getTime() : 0;
    const bSt = b.start_time ? new Date(b.start_time).getTime() : 0;
    const bEt = b.end_time ? new Date(b.end_time).getTime() : 0;
    const aActive = aSt && aEt && nowTs >= aSt && nowTs < aEt;
    const bActive = bSt && bEt && nowTs >= bSt && nowTs < bEt;
    if (aActive !== bActive) return aActive ? -1 : 1;
    // both not active: earlier start first
    return aSt - bSt;
  });

  return (
    <div className="relative pb-10 px-3 sm:px-4 mx-auto max-w-3xl min-h-screen">
      {/* Animated Background Orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <m.div 
          className="absolute -top-10 -left-20 w-80 h-80 rounded-full bg-gradient-to-br from-fuchsia-600/20 via-pink-500/15 to-orange-500/20 blur-[100px]"
          animate={{ x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <m.div 
          className="absolute top-1/3 -right-20 w-72 h-72 rounded-full bg-gradient-to-br from-violet-600/25 via-blue-500/15 to-cyan-500/20 blur-[90px]"
          animate={{ x: [0, -30, 0], y: [0, 40, 0], scale: [1.1, 1, 1.1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <m.div 
          className="absolute bottom-1/4 left-1/3 w-60 h-60 rounded-full bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-yellow-500/10 blur-[80px]"
          animate={{ x: [0, 25, 0], y: [0, -25, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      
      <SeoHead
        title="My Quizzes – Quiz Dangal"
        description="Track the quizzes you have joined, monitor live rounds, and revisit completed contests on Quiz Dangal."
        canonical="https://quizdangal.com/my-quizzes/"
        robots="noindex, nofollow"
        author="Quiz Dangal"
        datePublished="2025-01-01"
      />

      <div className="relative z-10">
        <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

          {/* ═══════════ Page Header ═══════════ */}
          <div className="flex items-center gap-3 pt-2 mb-6">
            <m.div 
              className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-pink-600 flex items-center justify-center shadow-lg shadow-orange-500/40"
              animate={{ rotate: [0, -3, 3, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Trophy className="w-5 h-5 text-white drop-shadow-lg" />
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                <Sparkles className="w-2.5 h-2.5 text-white" />
              </div>
            </m.div>
            <div>
              <h1 className="text-xl font-black bg-gradient-to-r from-amber-200 via-pink-300 to-violet-300 bg-clip-text text-transparent leading-tight">
                My Quizzes
              </h1>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                {liveUpcoming.length} active · {finished.length} completed
              </p>
            </div>
          </div>

          {/* ═══════════ Live & Upcoming ═══════════ */}
          {liveUpcoming.length > 0 && (
            <div className="mb-10">
              <m.div 
                className="flex items-center gap-2 mb-4"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="relative">
                  <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-30" />
                  <span className="relative block w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                </div>
                <h2 className="text-xs font-extrabold uppercase tracking-widest text-emerald-300/90">Live & Upcoming</h2>
              </m.div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {liveUpcoming.map((quiz, index) => {
                  const st = quiz.start_time ? new Date(quiz.start_time) : null;
                  const et = quiz.end_time ? new Date(quiz.end_time) : null;
                  const isActive = st && et && nowTs >= st.getTime() && nowTs < et.getTime();
                  const secs = isActive
                    ? Math.max(0, Math.floor((et.getTime() - Date.now()) / 1000))
                    : st
                      ? Math.max(0, Math.floor((st.getTime() - Date.now()) / 1000))
                      : 0;
                  const totalWindow = st && et ? Math.max(1, et.getTime() - st.getTime()) : null;
                  const progressed =
                    isActive && totalWindow
                      ? Math.min(100, Math.max(0, Math.round(((Date.now() - st.getTime()) / totalWindow) * 100)))
                      : null;
                  const prizes = Array.isArray(quiz.prizes) ? quiz.prizes : [];
                  const prizeType = quiz.prize_type || 'coins';
                  const p1 = prizes[0] ?? 0;
                  const p2 = prizes[1] ?? 0;
                  const p3 = prizes[2] ?? 0;
                  const formatPrize = (value) => getPrizeDisplay(prizeType, value, { fallback: 0 }).formatted;
                  const joined = counts[quiz.slot_id || quiz.id] || 0;
                  const quizPath = quiz.slot_id ? `/quiz/slot/${quiz.slot_id}` : `/quiz/${quiz.id}`;
                  const mins = Math.floor(secs / 60);
                  const secsR = secs % 60;

                  return (
                    <m.div
                      key={`lu-${quiz.slot_id || quiz.id}`}
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08, type: 'spring', stiffness: 100, damping: 14 }}
                      className="group cursor-pointer"
                      onClick={() => navigate(quizPath)}
                    >
                      {/* Animated conic gradient border */}
                      <div className={`relative rounded-[20px] p-[2px] overflow-hidden transition-all group-hover:-translate-y-1 ${
                        isActive 
                          ? 'bg-[conic-gradient(from_0deg,#ef4444,#f97316,#eab308,#ef4444)] shadow-[0_0_30px_-5px_rgba(239,68,68,0.3)]'
                          : 'bg-[conic-gradient(from_0deg,#06b6d4,#3b82f6,#8b5cf6,#06b6d4)] shadow-[0_0_30px_-5px_rgba(6,182,212,0.25)]'
                      }`}>
                        <div className="relative rounded-[18px] bg-[#08080f] p-4 sm:p-5 overflow-hidden">
                          {/* Top shimmer glow */}
                          <div className={`absolute top-0 left-0 right-0 h-24 opacity-30 pointer-events-none ${
                            isActive 
                              ? 'bg-gradient-to-b from-red-500/25 via-orange-500/10 to-transparent'
                              : 'bg-gradient-to-b from-cyan-500/20 via-blue-500/10 to-transparent'
                          }`} />

                          {/* Badge Row */}
                          <div className="relative flex items-center justify-between mb-3">
                            <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-full ${
                              isActive 
                                ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-[0_4px_15px_-3px_rgba(239,68,68,0.5)]'
                                : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-[0_4px_15px_-3px_rgba(6,182,212,0.5)]'
                            }`}>
                              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                              {isActive ? '🔴 LIVE NOW' : '⏰ UPCOMING'}
                            </span>
                            <div className="flex items-center gap-1 text-slate-500">
                              <Users className="w-3 h-3" />
                              <span className="text-[10px] font-bold">{joined}</span>
                            </div>
                          </div>

                          {/* Title */}
                          <h3 className="relative text-base sm:text-lg font-bold text-white mb-4 leading-snug line-clamp-2">
                            {quiz.title}
                          </h3>

                          {/* Timer — Big and prominent */}
                          <div className={`relative mb-4 rounded-2xl overflow-hidden ${
                            isActive 
                              ? 'bg-gradient-to-r from-red-950/80 via-orange-950/60 to-amber-950/80 border border-red-500/20'
                              : 'bg-gradient-to-r from-cyan-950/80 via-blue-950/60 to-indigo-950/80 border border-cyan-500/15'
                          }`}>
                            <div className="px-4 py-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Clock className={`w-4 h-4 ${isActive ? 'text-orange-400' : 'text-cyan-400'}`} />
                                <div>
                                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                    {isActive ? 'Ends in' : 'Starts in'}
                                  </div>
                                  <div className="flex items-baseline gap-1 mt-0.5">
                                    <span className={`text-2xl font-black tabular-nums ${isActive ? 'text-orange-300' : 'text-cyan-300'}`}>
                                      {String(mins).padStart(2, '0')}
                                    </span>
                                    <span className={`text-xs font-bold ${isActive ? 'text-orange-500' : 'text-cyan-500'} animate-pulse`}>:</span>
                                    <span className={`text-2xl font-black tabular-nums ${isActive ? 'text-orange-300' : 'text-cyan-300'}`}>
                                      {String(secsR).padStart(2, '0')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right space-y-1">
                                <div className="text-[8px] text-slate-500 font-bold uppercase">Schedule</div>
                                <div className="text-[11px] text-slate-300 font-semibold">
                                  {quiz.start_time ? formatTimeOnly(quiz.start_time) : '—'} → {quiz.end_time ? formatTimeOnly(quiz.end_time) : '—'}
                                </div>
                              </div>
                            </div>
                            {progressed !== null && (
                              <div className="h-1 bg-black/30">
                                <m.div 
                                  className={`h-full rounded-full ${isActive ? 'bg-gradient-to-r from-red-500 via-orange-400 to-amber-400' : 'bg-gradient-to-r from-cyan-400 to-blue-500'}`}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progressed}%` }}
                                  transition={{ duration: 0.8 }}
                                />
                              </div>
                            )}
                          </div>

                          {/* Prizes — Medal cards */}
                          <div className="grid grid-cols-3 gap-2 mb-4">
                            {[
                              { label: '1st', emoji: '🥇', value: formatPrize(p1), bg: 'from-amber-500/20 to-yellow-600/10', border: 'border-amber-500/25', text: 'text-amber-300', glow: 'shadow-amber-500/10' },
                              { label: '2nd', emoji: '🥈', value: formatPrize(p2), bg: 'from-slate-400/15 to-slate-500/10', border: 'border-slate-400/20', text: 'text-slate-300', glow: 'shadow-slate-400/5' },
                              { label: '3rd', emoji: '🥉', value: formatPrize(p3), bg: 'from-orange-500/15 to-orange-600/10', border: 'border-orange-500/20', text: 'text-orange-300', glow: 'shadow-orange-500/10' },
                            ].map((prize) => (
                              <div key={prize.label} className={`relative text-center py-3 rounded-2xl bg-gradient-to-b ${prize.bg} border ${prize.border} shadow-lg ${prize.glow}`}>
                                <div className="text-lg leading-none">{prize.emoji}</div>
                                <div className={`text-sm font-black ${prize.text} mt-1`}>{prize.value}</div>
                              </div>
                            ))}
                          </div>

                          {/* Joined badge (above button, left-aligned) + Full Play button */}
                          <div className="mb-2">
                            <span className="text-[10px] text-emerald-400/80 bg-emerald-500/10 px-2.5 py-1 rounded-full font-bold border border-emerald-500/15 inline-flex items-center gap-1">
                              ✅ Joined
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); navigate(quizPath); }}
                            onMouseEnter={() => prefetchRoute('/quiz')}
                            className={`w-full py-3 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all active:scale-[0.97] ${
                              isActive 
                                ? 'bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 text-white shadow-[0_8px_25px_-5px_rgba(244,63,94,0.5)]'
                                : 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 text-white shadow-[0_8px_25px_-5px_rgba(59,130,246,0.5)]'
                            }`}
                          >
                            <Play className="w-4 h-4" fill="currentColor" />
                            {isActive ? 'PLAY NOW' : 'PLAY'}
                            <ChevronRight className="w-4 h-4 opacity-60" />
                          </button>
                        </div>
                      </div>
                    </m.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══════════ Finished ═══════════ */}
          {finished.length > 0 && (
            <div>
              <m.div 
                className="flex items-center gap-2 mb-4"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <span className="block w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
                <h2 className="text-xs font-extrabold uppercase tracking-widest text-violet-300/90">Completed</h2>
                <span className="text-[10px] bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded-full font-bold border border-violet-500/15">{finished.length}</span>
              </m.div>

              <div className="space-y-2">
                {finished.map((quiz, index) => {
                  const now = new Date();
                  const endTime = new Date(quiz.end_time);
                  const endedAtLabel = endTime.toLocaleString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: 'short',
                  });
                  const board = Array.isArray(quiz.leaderboard) ? quiz.leaderboard : [];
                  const isResultOut = now >= endTime && board.length > 0;
                  const userRank = isResultOut ? board.find((p) => p.user_id === user?.id) : null;
                  const prizeType =
                    quiz.prize_type && String(quiz.prize_type).trim() ? quiz.prize_type : 'coins';
                  const rawPrize =
                    userRank?.rank && Array.isArray(quiz.prizes)
                      ? quiz.prizes[userRank.rank - 1]
                      : null;
                  const prizeDisplay = userRank?.rank
                    ? getPrizeDisplay(prizeType, rawPrize ?? 0, { fallback: 0 }).formatted
                    : '—';
                  const isWinner = userRank?.rank && userRank.rank <= 3;
                  const rankEmoji = userRank?.rank === 1 ? '🏆' : userRank?.rank === 2 ? '🥈' : userRank?.rank === 3 ? '🥉' : null;

                  return (
                    <m.div
                      key={quiz.slot_id || quiz.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, type: 'spring', stiffness: 120, damping: 16 }}
                      className={`group relative rounded-2xl p-[1.5px] cursor-pointer transition-all hover:-translate-y-0.5 ${
                        isWinner 
                          ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 shadow-[0_0_16px_-5px_rgba(59,130,246,0.3)]'
                          : 'bg-gradient-to-r from-slate-600/40 via-slate-500/30 to-slate-600/40'
                      }`}
                      onClick={() => navigate(quiz.slot_id ? `/results/slot/${quiz.slot_id}` : `/results/${quiz.id}`)}
                    >
                      <div className="rounded-[14.5px] bg-[#08080f]/95 px-3 py-2.5 h-full">
                        {/* Title Row */}
                        <div className="flex items-center gap-2.5 mb-2">
                          {isResultOut && (
                            <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                              isWinner 
                                ? 'bg-gradient-to-br from-blue-500/20 to-indigo-600/15 border border-blue-500/25' 
                                : 'bg-gradient-to-br from-slate-700/40 to-slate-800/40 border border-slate-600/20'
                            }`}>
                              {rankEmoji || <span className="text-[10px] font-black text-slate-400">#{userRank?.rank ?? '?'}</span>}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[13px] font-bold text-white line-clamp-1 leading-snug">{quiz.title}</h3>
                            <span className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Clock className="w-2.5 h-2.5" /> {endedAtLabel}
                            </span>
                          </div>
                        </div>

                        {/* Results Row */}
                        {isResultOut ? (
                          <div className="flex items-stretch gap-1.5 mb-2">
                            <div className={`flex-1 text-center py-1.5 px-1 rounded-lg border ${
                              isWinner ? 'bg-blue-500/10 border-blue-500/20' : 'bg-white/[0.02] border-white/[0.06]'
                            }`}>
                              <div className="text-[7px] text-slate-500 font-bold uppercase tracking-wider">Rank</div>
                              <div className={`text-sm font-black ${isWinner ? 'text-blue-400' : 'text-slate-200'}`}>
                                #{userRank?.rank ?? '-'}
                              </div>
                            </div>
                            <div className="flex-1 text-center py-1.5 px-1 rounded-lg bg-violet-500/[0.06] border border-violet-500/15">
                              <div className="text-[7px] text-slate-500 font-bold uppercase tracking-wider">Score</div>
                              <div className="text-sm font-black text-violet-300">{userRank?.score ?? '-'}</div>
                            </div>
                            <div className="flex-1 text-center py-1.5 px-1 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15">
                              <div className="text-[7px] text-slate-500 font-bold uppercase tracking-wider">Won</div>
                              <div className={`text-sm font-black ${prizeDisplay !== '—' ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {prizeDisplay}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mb-2 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-center">
                            <span className="text-[11px] text-slate-500 inline-flex items-center gap-1.5">
                              <m.span animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>⏳</m.span>
                              Calculating Results...
                            </span>
                          </div>
                        )}

                        {/* View Result */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(quiz.slot_id ? `/results/slot/${quiz.slot_id}` : `/results/${quiz.id}`);
                          }}
                          className={`w-full py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] ${
                            isWinner
                              ? 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 text-white shadow-[0_4px_16px_-4px_rgba(168,85,247,0.4)]'
                              : 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 text-white shadow-[0_4px_16px_-4px_rgba(168,85,247,0.3)]'
                          }`}
                        >
                          <Trophy className="w-3 h-3" /> VIEW RESULT <ChevronRight className="w-3 h-3 opacity-60" />
                        </button>
                      </div>
                    </m.div>
                  );
                })}
              </div>
            </div>
          )}
        </m.div>
      </div>
    </div>
  );
};

export default MyQuizzes;
