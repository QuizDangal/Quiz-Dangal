import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel';
import { m } from '@/lib/motion-lite';
import { useNavigate } from 'react-router-dom';
import { Clock, Play, Users, Trophy } from 'lucide-react';
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
// LeaderboardDisplay removed (unused)
// GoldTrophy removed (unused)

const MyQuizzes = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  // useToast removed - not used currently
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  // tick state hata diya (countdown UI reactivity sufficient without forced re-render)
  // const [tick, setTick] = useState(0);
  const [counts, setCounts] = useState({}); // key (slot_id or quiz_id) -> joined (pre + joined, where joined includes completed)
  const [_nowTick, setNowTick] = useState(0); // lightweight re-render driver for countdown/progress (prefixed to satisfy lint)

  const computeAttemptedRef = useRef(new Set());

  // joinAndPlay removed

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

  // Subscribe to quiz_results INSERT (when results are computed)
  useRealtimeChannel({
    enabled: realtimeActive,
    channelName: 'myquizzes-results-channel',
    event: 'INSERT',
    table: 'quiz_results',
    onChange: () => {
      fetchMyQuizzes();
      try {
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

  // Subscribe to quiz_results UPDATE (when leaderboard is updated)
  useRealtimeChannel({
    enabled: realtimeActive,
    channelName: 'myquizzes-results-update-channel',
    event: 'UPDATE',
    table: 'quiz_results',
    onChange: () => {
      fetchMyQuizzes();
    },
    joinTimeoutMs: 5000,
  });

  // Subscribe to quiz_slots changes (status updates)
  useRealtimeChannel({
    enabled: realtimeActive,
    channelName: 'myquizzes-slots-channel',
    event: '*',
    table: 'quiz_slots',
    onChange: () => {
      fetchMyQuizzes();
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
      <div className="relative pt-14 mx-auto max-w-5xl px-4 py-4">
        <div className="container mx-auto px-4 py-6 max-w-lg">
          {/* Skeleton Header */}
          <div className="qd-card rounded-2xl border border-slate-800/70 bg-slate-950/70 p-4 sm:p-6 mb-6 animate-pulse">
            <div className="h-7 w-32 bg-slate-700 rounded mb-4"></div>
            <div className="flex gap-2">
              <div className="h-7 w-28 bg-slate-800 rounded-full"></div>
            </div>
          </div>
          {/* Skeleton Cards */}
          <div className="mb-4">
            <div className="h-4 w-28 bg-slate-700 rounded mb-3"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 animate-pulse">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-5 flex-1 bg-slate-700 rounded"></div>
                    <div className="h-5 w-16 bg-slate-800 rounded-full"></div>
                  </div>
                  <div className="flex gap-2 mb-3">
                    {[1,2,3].map(j => <div key={j} className="h-8 w-16 bg-slate-800 rounded-lg"></div>)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="h-12 bg-slate-800 rounded-md"></div>
                    <div className="h-12 bg-slate-800 rounded-md"></div>
                  </div>
                  <div className="h-10 bg-gradient-to-r from-slate-700 to-slate-600 rounded-lg"></div>
                </div>
              ))}
            </div>
          </div>
          {/* Skeleton Finished Section */}
          <div className="h-4 w-20 bg-slate-700 rounded mb-3"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-slate-700 rounded-2xl"></div>
                  <div className="flex-1">
                    <div className="h-4 w-32 bg-slate-700 rounded mb-2"></div>
                    <div className="h-3 w-20 bg-slate-800 rounded"></div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[1,2,3].map(j => <div key={j} className="h-14 bg-slate-800 rounded-xl"></div>)}
                </div>
              </div>
            ))}
          </div>
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
    <div className="relative pt-16 pb-8 px-3 sm:px-4 mx-auto w-full max-w-md sm:max-w-4xl lg:max-w-5xl xl:max-w-6xl min-h-screen">
      {/* Animated Background Orbs */}
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
      
      <SeoHead
        title="My Quizzes – Quiz Dangal"
        description="Track the quizzes you have joined, monitor live rounds, and revisit completed contests on Quiz Dangal."
        canonical="https://quizdangal.com/my-quizzes/"
        robots="noindex, nofollow"
        author="Quiz Dangal"
        datePublished="2025-01-01"
      />
      <div className="relative z-10">
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden"
        >
          {/* Page Header */}
          <m.div 
            className="text-center mb-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center gap-3">
              <m.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Trophy className="w-9 h-9 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.7)]" />
              </m.div>
              <h1 className="text-3xl font-black bg-gradient-to-r from-orange-300 via-pink-300 to-violet-400 bg-clip-text text-transparent drop-shadow-sm">
                My Quizzes
              </h1>
            </div>
          </m.div>

          {liveUpcoming.length > 0 && (
            <div className="mb-8">
              <m.div 
                className="flex items-center justify-between gap-3 mb-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-2">
                  <m.div
                    className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 grid place-items-center"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Play className="w-4 h-4 text-white" />
                  </m.div>
                  <h2 className="text-base font-bold bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">Live & Upcoming</h2>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">{liveUpcoming.length} quizzes</span>
              </m.div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      ? Math.min(
                          100,
                          Math.max(
                            0,
                            Math.round(((Date.now() - st.getTime()) / totalWindow) * 100),
                          ),
                        )
                      : null;
                  const prizes = Array.isArray(quiz.prizes) ? quiz.prizes : [];
                  const prizeType = quiz.prize_type || 'coins';
                  const p1 = prizes[0] ?? 0;
                  const p2 = prizes[1] ?? 0;
                  const p3 = prizes[2] ?? 0;
                  const formatPrize = (value) => {
                    const display = getPrizeDisplay(prizeType, value, { fallback: 0 });
                    // UI decision: do not show separate coin icon; plain text only
                    return display.formatted;
                  };
                  const joined = counts[quiz.slot_id || quiz.id] || 0;
                  // Determine navigation path based on slot_id
                  const quizPath = quiz.slot_id ? `/quiz/slot/${quiz.slot_id}` : `/quiz/${quiz.id}`;
                  // Removed unused local UI state placeholders (already, btnDisabled, btnLabel, btnColor) for lint cleanliness
                  return (
                    <m.div
                      key={`lu-${quiz.slot_id || quiz.id}`}
                      initial={{ opacity: 0, y: 16, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: index * 0.06, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                      className="quiz-slot-card cursor-pointer"
                      onClick={() => navigate(quizPath)}
                    >
                      <div className={`quiz-slot-card-inner ${isActive ? 'quiz-slot-card-live' : ''}`}>
                        {/* Top Row: Language + Badge */}
                        <div className="flex justify-between items-center mb-3">
                          <span className="quiz-slot-lang">🌐 Hindi / English</span>
                          <span className={`quiz-slot-badge ${isActive ? 'quiz-slot-badge-live' : 'quiz-slot-badge-upcoming'}`}>
                            {isActive && <span className="quiz-slot-badge-dot" />}
                            {isActive ? 'LIVE' : 'UPCOMING'}
                          </span>
                        </div>
                        
                        {/* Title */}
                        <h3 className="text-sm sm:text-base font-bold text-white mb-3 line-clamp-2">
                          {quiz.title}
                        </h3>
                        
                        {/* Time Section */}
                        <div className="quiz-slot-time-section">
                          <div className="quiz-slot-time-row">
                            <div className="quiz-slot-time-box">
                              <span className="quiz-slot-time-label">START</span>
                              <span className="quiz-slot-time-value">{quiz.start_time ? formatTimeOnly(quiz.start_time) : '—'}</span>
                            </div>
                            <div className="quiz-slot-time-divider">→</div>
                            <div className="quiz-slot-time-box">
                              <span className="quiz-slot-time-label">END</span>
                              <span className="quiz-slot-time-value">{quiz.end_time ? formatTimeOnly(quiz.end_time) : '—'}</span>
                            </div>
                          </div>
                          {secs !== null && (
                            <div className={`quiz-slot-timer ${isActive ? 'quiz-slot-timer-live' : ''}`}>
                              <Clock className="w-3.5 h-3.5" />
                              <span>{isActive ? 'Ends in' : 'Starts in'}</span>
                              <span className="quiz-slot-timer-value">
                                {String(Math.floor(secs / 60)).padStart(2, '0')}:{String(secs % 60).padStart(2, '0')}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Prize Section */}
                        <div className="quiz-slot-prize-section">
                          <div className="quiz-slot-prize-title">🏆 Prizes</div>
                          <div className="quiz-slot-prize-row">
                            <div className="quiz-slot-prize-item quiz-slot-prize-gold">
                              <span className="quiz-slot-prize-rank">1st</span>
                              <span className="quiz-slot-prize-value">{formatPrize(p1)}</span>
                            </div>
                            <div className="quiz-slot-prize-item quiz-slot-prize-silver">
                              <span className="quiz-slot-prize-rank">2nd</span>
                              <span className="quiz-slot-prize-value">{formatPrize(p2)}</span>
                            </div>
                            <div className="quiz-slot-prize-item quiz-slot-prize-bronze">
                              <span className="quiz-slot-prize-rank">3rd</span>
                              <span className="quiz-slot-prize-value">{formatPrize(p3)}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Stats + Progress */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="quiz-slot-stat">
                            <Users className="w-3 h-3" /> {joined} Joined
                          </span>
                          <span className="quiz-slot-stat quiz-slot-stat-joined">✓ You&apos;re In</span>
                        </div>
                        
                        {progressed !== null && (
                          <div className="w-full bg-slate-800/50 rounded-full h-1.5 mb-3 overflow-hidden">
                            <div className="h-1.5 bg-emerald-500/80 rounded-full" style={{ width: `${progressed}%` }} />
                          </div>
                        )}
                        
                        {/* CTA Button */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); navigate(quizPath); }}
                          onMouseEnter={() => prefetchRoute('/quiz')}
                          className={`quiz-slot-btn ${isActive ? 'quiz-slot-btn-live' : 'quiz-slot-btn-default'}`}
                        >
                          <Play className="w-4 h-4 mr-1" /> PLAY
                        </button>
                      </div>
                    </m.div>
                  );
                })}
              </div>
            </div>
          )}

          <m.div 
            className="mt-8 flex items-center justify-between gap-3 mb-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2">
              <m.div
                className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 grid place-items-center"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Trophy className="w-4 h-4 text-white" />
              </m.div>
              <h2 className="text-base font-bold bg-gradient-to-r from-violet-300 to-purple-300 bg-clip-text text-transparent">Finished</h2>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300">Recent {finished.length}</span>
          </m.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              return (
                <m.div
                  key={quiz.slot_id || quiz.id}
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.06, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                  onClick={() => navigate(quiz.slot_id ? `/results/slot/${quiz.slot_id}` : `/results/${quiz.id}`)}
                  className="quiz-slot-card cursor-pointer"
                >
                  <div className="quiz-slot-card-inner">
                    {/* Top Row: Language & Ended Date */}
                    <div className="flex justify-between items-center mb-3">
                      <span className="quiz-slot-lang">🌐 Hindi / English</span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {endedAtLabel}
                      </span>
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-sm sm:text-base font-bold text-white mb-3 line-clamp-2">
                      {quiz.title}
                    </h3>
                    
                    {/* Result Stats - Beautiful Compact */}
                    {isResultOut ? (
                      <m.div 
                        className="mb-3 p-2.5 rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-white/10 overflow-hidden relative"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        {/* Animated glow background */}
                        <m.div 
                          className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-violet-500/5 to-emerald-500/5"
                          animate={{ opacity: [0.3, 0.6, 0.3] }}
                          transition={{ duration: 3, repeat: Infinity }}
                        />
                        
                        {/* Stats Row */}
                        <div className="relative flex items-stretch gap-1.5 min-w-0">
                          {/* Rank */}
                          <m.div 
                            className="flex-1 min-w-0 text-center py-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-600/10 border border-amber-400/30 relative overflow-hidden"
                            whileHover={{ scale: 1.03, y: -1 }}
                          >
                            <m.div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 to-transparent" />
                            <div className="relative">
                              <div className="text-[8px] text-amber-300/70 font-semibold uppercase tracking-wide mb-0.5">Rank</div>
                              <m.div 
                                className="text-base font-black text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)] w-full truncate"
                                animate={{ scale: userRank?.rank <= 3 ? [1, 1.05, 1] : 1 }}
                                transition={{ duration: 2, repeat: Infinity }}
                              >
                                #{userRank?.rank ?? '-'}
                              </m.div>
                            </div>
                            {userRank?.rank <= 3 && (
                              <m.div 
                                className="absolute -top-0.5 -right-0.5 text-[10px]"
                                animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              >
                                🏆
                              </m.div>
                            )}
                          </m.div>
                          
                          {/* Score */}
                          <m.div 
                            className="flex-1 min-w-0 text-center py-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-600/10 border border-violet-400/30 relative overflow-hidden"
                            whileHover={{ scale: 1.03, y: -1 }}
                          >
                            <m.div className="absolute inset-0 bg-gradient-to-t from-violet-500/10 to-transparent" />
                            <div className="relative">
                              <div className="text-[8px] text-violet-300/70 font-semibold uppercase tracking-wide mb-0.5">Score</div>
                              <div className="text-base font-black text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.4)] w-full truncate">
                                {userRank?.score ?? '-'}
                              </div>
                            </div>
                          </m.div>
                          
                          {/* Prize */}
                          <m.div 
                            className="flex-1 min-w-0 text-center py-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-600/10 border border-emerald-400/30 relative overflow-hidden"
                            whileHover={{ scale: 1.03, y: -1 }}
                          >
                            <m.div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent" />
                            <div className="relative">
                              <div className="text-[8px] text-emerald-300/70 font-semibold uppercase tracking-wide mb-0.5">Won</div>
                              <m.div 
                                className="text-base font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)] w-full truncate"
                                animate={prizeDisplay !== '-' ? { scale: [1, 1.05, 1] } : {}}
                                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                              >
                                {prizeDisplay}
                              </m.div>
                            </div>
                            {prizeDisplay !== '-' && prizeDisplay !== '0' && (
                              <m.div 
                                className="absolute -top-0.5 -right-0.5 text-[10px]"
                                animate={{ y: [0, -2, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                              >
                                🪙
                              </m.div>
                            )}
                          </m.div>
                        </div>
                      </m.div>
                    ) : (
                      <m.div 
                        className="mb-3 py-3 rounded-xl bg-gradient-to-r from-slate-800/60 via-slate-700/40 to-slate-800/60 border border-white/5 text-center"
                        animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        style={{ backgroundSize: '200% 100%' }}
                      >
                        <m.span 
                          className="text-xs text-slate-400 inline-flex items-center gap-2"
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <m.span animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>⏳</m.span>
                          Calculating Results...
                        </m.span>
                      </m.div>
                    )}
                    
                    {/* CTA Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(quiz.slot_id ? `/results/slot/${quiz.slot_id}` : `/results/${quiz.id}`);
                      }}
                      className="quiz-slot-btn quiz-slot-btn-default"
                    >
                      <Trophy className="w-4 h-4" /> VIEW RESULT
                    </button>
                  </div>
                </m.div>
              );
            })}
          </div>
        </m.div>
      </div>
    </div>
  );
};

export default MyQuizzes;
