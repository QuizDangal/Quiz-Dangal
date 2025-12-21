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
import SEO from '@/components/SEO';
// LeaderboardDisplay removed (unused)

const GoldTrophy = ({ size = 72, centered = false, fitParent = false }) => {
  const px = typeof size === 'number' ? `${size}px` : size;
  const [srcIdx, setSrcIdx] = useState(0);
  const sources = [
    `${import.meta.env.BASE_URL}Trophy.png`, // provided image (preferred)
    `${import.meta.env.BASE_URL}trophy.png`, // lowercase fallback just in case
    `${import.meta.env.BASE_URL}trophy-question.png`,
    `${import.meta.env.BASE_URL}trophy-question.webp`,
  ];
  const src = sources[srcIdx] || sources[0];

  // Directly use provided transparent image; no processing to ensure perfect blending
  return (
    <div
      className={`relative trophy-float pointer-events-none${centered ? '' : ' mx-auto mb-4'}`}
      style={{ width: fitParent ? '100%' : px, height: fitParent ? '100%' : px }}
    >
      <div className="trophy-sway w-full h-full">
        <div className="trophy-pulse w-full h-full">
          {srcIdx >= 0 ? (
            <img
              src={src}
              alt="Trophy"
              className="w-full h-full object-contain select-none"
              style={{
                backgroundColor: 'transparent',
                display: 'block',
                maxWidth: '96px',
                maxHeight: '96px',
              }}
              loading="eager"
              decoding="async"
              sizes="(max-width: 640px) 64px, 96px"
              onError={() => {
                const next = srcIdx + 1;
                if (next < sources.length) setSrcIdx(next);
                else setSrcIdx(-1);
              }}
            />
          ) : (
            <svg
              viewBox="0 0 128 128"
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden
            >
              <defs>
                <linearGradient id="qdTg" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffe795" />
                  <stop offset="45%" stopColor="#ffd34d" />
                  <stop offset="75%" stopColor="#f0a700" />
                  <stop offset="100%" stopColor="#b86a00" />
                </linearGradient>
                <linearGradient id="qdQM" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6d28d9" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
              <path
                d="M28 30c-10 0-18 10-16 20 2 10 14 14 24 11"
                fill="none"
                stroke="#f0b000"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M100 30c10 0 18 10 16 20-2 10-14 14-24 11"
                fill="none"
                stroke="#f0b000"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M28 22h72c0 24-10 36-26 41v9c0 7-6 13-14 13s-14-6-14-13v-9C38 58 28 46 28 22Z"
                fill="url(#qdTg)"
              />
              <rect x="56" y="72" width="16" height="10" rx="3" fill="url(#qdTg)" />
              <rect x="44" y="82" width="40" height="12" rx="4" fill="url(#qdTg)" />
              <rect x="36" y="94" width="56" height="10" rx="5" fill="url(#qdTg)" />
              <text
                x="64"
                y="46"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="32"
                fontWeight="900"
                fill="url(#qdQM)"
                stroke="#2b1a59"
                strokeWidth="3"
                paintOrder="stroke fill"
              >
                ?
              </text>
            </svg>
          )}
        </div>
      </div>
      {/* overlays removed to avoid altering section background */}
    </div>
  );
};

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
      console.error('fetchMyQuizzes failed', err);
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
      <div className="relative pt-14 mx-auto max-w-5xl px-4 py-4">
        <div className="container mx-auto px-4 py-6 max-w-lg">
          <div className="flex items-start justify-center pt-8">
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative text-center text-slate-100 p-2"
              >
                {/* Keep outside clean: lighter, smaller, clipped blobs */}
                <div className="pointer-events-none absolute -top-16 -left-16 w-44 h-44 rounded-full bg-indigo-600/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-16 -right-16 w-44 h-44 rounded-full bg-fuchsia-600/10 blur-3xl" />

                <h1 className="text-2xl font-bold heading-gradient text-shadow mb-4">My Quizzes</h1>

                {/* Gradient bordered card (no slide animation) */}
                <m.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.06 }}
                  className="relative max-w-md mx-auto rounded-3xl p-[2px] bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-rose-500 shadow-[0_30px_80px_-20px_rgba(99,102,241,0.25)]"
                >
                  <div className="rounded-3xl bg-slate-950/80 backdrop-blur border border-white/10 px-6 py-9">
                    {/* Trophy emblem */}
                    <div className="mx-auto mb-4 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full p-[2px] bg-gradient-to-b from-amber-400 to-amber-600">
                      <div className="w-full h-full rounded-full grid place-items-center bg-slate-950/90 p-1 sm:p-1.5 md:p-2">
                        <GoldTrophy centered fitParent />
                      </div>
                    </div>

                    <h3 className="text-xl font-extrabold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                      No Quizzes Yet
                    </h3>
                    <p className="mt-2 text-sm text-slate-300">
                      Kickstart your journey—join your first quiz and build your streak!
                    </p>

                    {/* Value chips */}
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[11px]">
                      <span className="px-2.5 py-1 rounded-full border border-indigo-500/40 bg-indigo-500/10 text-indigo-200">
                        Daily quizzes
                      </span>
                      <span className="px-2.5 py-1 rounded-full border border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-200">
                        Win coins
                      </span>
                      <span className="px-2.5 py-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-200">
                        Leaderboards
                      </span>
                    </div>

                    {/* Explore button removed per request */}
                  </div>
                </m.div>
              </m.div>
            </div>
          </div>
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
    <div className="relative pt-14 mx-auto max-w-5xl px-4 py-4">
      <SEO
        title="My Quizzes – Quiz Dangal"
        description="Track the quizzes you have joined, monitor live rounds, and revisit completed contests on Quiz Dangal."
        canonical="https://quizdangal.com/my-quizzes/"
        robots="noindex, nofollow"
      />
      <div className="container mx-auto px-4 py-6 max-w-lg">
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden"
        >
          {/* Page Header */}
          <div className="mb-6">
            <div className="qd-card rounded-2xl border border-slate-800/70 bg-slate-950/70 p-4 sm:p-6 shadow-[0_16px_50px_-28px_rgba(99,102,241,0.55)]">
              <h1 className="text-2xl font-bold heading-gradient text-shadow">My Quizzes</h1>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-700/40 bg-emerald-600/10 px-3 py-1 text-xs text-emerald-200">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15">
                    <Clock className="w-3.5 h-3.5" />
                  </span>
                  {liveUpcoming.length} Live/Upcoming
                </span>

                {/* Explore button removed per request */}
              </div>
            </div>
          </div>

          {liveUpcoming.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between gap-3 mb-2">
                <h2 className="text-sm sm:text-base font-semibold text-white">Live & Upcoming</h2>
                <span className="text-xs text-slate-400">{liveUpcoming.length} quizzes</span>
              </div>
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

          <div className="mt-7 flex items-center justify-between gap-3 mb-2">
            <h2 className="text-sm sm:text-base font-semibold text-white">Finished</h2>
            <span className="text-xs text-slate-400">Recent {finished.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    
                    {/* Result Stats */}
                    {isResultOut ? (
                      <div className="quiz-slot-prize-section mb-3">
                        <div className="quiz-slot-prize-title">📊 Your Result</div>
                        <div className="quiz-slot-prize-row">
                          <div className="quiz-slot-prize-item quiz-slot-prize-gold">
                            <span className="quiz-slot-prize-rank">Rank</span>
                            <span className="quiz-slot-prize-value">#{userRank?.rank ?? '-'}</span>
                          </div>
                          <div className="quiz-slot-prize-item quiz-slot-prize-silver">
                            <span className="quiz-slot-prize-rank">Score</span>
                            <span className="quiz-slot-prize-value">{userRank?.score ?? '-'}</span>
                          </div>
                          <div className="quiz-slot-prize-item quiz-slot-prize-bronze">
                            <span className="quiz-slot-prize-rank">Prize</span>
                            <span className="quiz-slot-prize-value">{prizeDisplay}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-xs text-slate-400 mb-3 py-2">
                        Results are being processed...
                      </div>
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
