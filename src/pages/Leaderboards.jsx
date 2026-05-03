import React, { useCallback, useEffect, useMemo, useState } from 'react';
import SeoHead from '@/components/SEO';
import { BUILD_DATE } from '@/constants';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase, getSupabase } from '@/lib/customSupabaseClient';
import { Trophy, Crown, ChevronDown, Medal } from 'lucide-react';
import { m, AnimatePresence } from '@/lib/motion-lite';
import { logger } from '@/lib/logger';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const periods = [
  { key: 'all_time', label: 'All Time' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'weekly', label: 'Weekly' },
];

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function Leaderboards() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const query = useQuery();
  const period = query.get('period') || 'all_time';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAbout, setShowAbout] = useState(false);

  const loadLeaderboard = useCallback(async (p) => {
    // Cache disabled - always fetch fresh data for accurate leaderboard
    // (sessionStorage cache was causing stale data issues after DB changes)

    setLoading(true);
    setError('');
    try {
      // Ensure client is initialized (handles home→leaderboard lazy-load race)
      if (!supabase) await getSupabase();
      if (!supabase) throw new Error('Supabase not configured');

      let data = [];
      if (p === 'all_time') {
        const { data: allTime, error: v2Err } = await supabase.rpc('get_all_time_leaderboard_v2', {
          limit_rows: 100,
          offset_rows: 0,
          max_streak_limit: 30,
        });
        if (!v2Err) {
          data = allTime || [];
        } else {
          const { data: v1Data, error: v1Err } = await supabase.rpc('get_all_time_leaderboard', {
            limit_rows: 100,
            offset_rows: 0,
            max_streak_limit: 30,
          });
          if (v1Err) throw v1Err;
          data = v1Data || [];
        }
      } else {
        const streakCap = p === 'weekly' ? 7 : 30;
        const { data: v2Data, error: v2Err } = await supabase.rpc('get_leaderboard_v2', {
          p_period: p,
          limit_rows: 100,
          offset_rows: 0,
          max_streak_limit: streakCap,
        });
        if (!v2Err) {
          data = v2Data || [];
        } else {
          const { data: v1Data, error: v1Err } = await supabase.rpc('get_leaderboard', {
            p_period: p,
            limit_rows: 100,
            offset_rows: 0,
            max_streak_limit: streakCap,
          });
          if (v1Err) throw v1Err;
          data = v1Data || [];
        }
      }

      setRows(data);
    } catch (err) {
      const errorMessage = err.message || 'Failed to load leaderboard.';
      logger.error('Leaderboard fetch error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeaderboard(period);
  }, [period, loadLeaderboard]);

  const onTabClick = (key) => {
    navigate(`?period=${key}`);
  };

  const myIndex = useMemo(() => {
    if (!userProfile?.id) return -1;
    return rows.findIndex((r) => r.user_id === userProfile.id);
  }, [rows, userProfile]);

  const myRow = myIndex >= 0 ? rows[myIndex] : null;
  const myRank = myIndex >= 0 ? myIndex + 1 : null;

  const getName = (r) => (r.username ? `@${r.username}` : r.full_name || 'Anonymous');
  const getScore = (r) => Number(r.leaderboard_score ?? 0).toFixed(0);

  // Podium config for top 3: [2nd, 1st, 3rd] order for visual layout
  const podiumConfig = [
    {
      index: 1,
      rank: 2,
      height: 'h-16 sm:h-20',
      color: 'from-slate-200 via-gray-300 to-slate-400',
      glowColor: 'rgba(203,213,225,0.6)',
      textColor: 'text-slate-100',
      badgeBg: 'from-slate-200 to-gray-400',
      badgeText: 'text-slate-800',
      podiumBg: 'from-slate-300/85 to-gray-500/90',
      size: 'w-16 h-16 sm:w-[72px] sm:h-[72px]',
      fontSize: 'text-lg sm:text-xl',
    },
    {
      index: 0,
      rank: 1,
      height: 'h-28 sm:h-32',
      color: 'from-yellow-300 via-amber-400 to-yellow-500',
      glowColor: 'rgba(250,204,21,0.7)',
      textColor: 'text-yellow-100',
      badgeBg: 'from-yellow-300 to-amber-500',
      badgeText: 'text-amber-950',
      podiumBg: 'from-yellow-400/90 to-amber-500/95',
      size: 'w-20 h-20 sm:w-24 sm:h-24',
      fontSize: 'text-xl sm:text-2xl',
      champion: true,
    },
    {
      index: 2,
      rank: 3,
      height: 'h-12 sm:h-16',
      color: 'from-amber-600 via-orange-500 to-amber-700',
      glowColor: 'rgba(217,119,6,0.55)',
      textColor: 'text-orange-200',
      badgeBg: 'from-amber-600 to-orange-600',
      badgeText: 'text-orange-950',
      podiumBg: 'from-amber-600/85 to-orange-700/90',
      size: 'w-16 h-16 sm:w-[72px] sm:h-[72px]',
      fontSize: 'text-lg sm:text-xl',
    },
  ];

  return (
    <div className="relative pt-4 sm:pt-6 min-h-screen pb-8">
      <SeoHead
        title="Leaderboards – Quiz Dangal | Top Quiz Players"
        description="See the top players on Quiz Dangal leaderboards. Compete in daily opinion and knowledge quizzes, win coins, and climb ranks."
        canonical="https://quizdangal.com/leaderboards/"
        keywords={[
          'quiz leaderboard',
          'top quiz players',
          'quizdangal leaderboard',
          'daily quiz rankings',
        ]}
        author="Quiz Dangal"
        datePublished="2025-01-15"
        dateModified={BUILD_DATE}
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://quizdangal.com/' },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Leaderboards',
                item: 'https://quizdangal.com/leaderboards/',
              },
            ],
          },
        ]}
      />

      <div className="max-w-3xl mx-auto px-4 space-y-5">
        {/* ═══════════ Header + Tabs ═══════════ */}
        <m.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500 shadow-lg shadow-amber-500/25">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-400 bg-clip-text text-transparent">
              Leaderboard
            </h1>
          </div>

          <div className="flex justify-center gap-2">
            {periods.map((p) => {
              const active = period === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => onTabClick(p.key)}
                  className={`rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold transition-all duration-200 ${
                    active
                      ? 'bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-500 text-white shadow-md shadow-sky-500/30'
                      : 'bg-white/[0.06] text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </m.div>

        {/* ═══════════ Top 3 Podium ═══════════ */}
        <h2 className="sr-only">Top 3 Quiz Champions</h2>
        <AnimatePresence mode="wait">
          {!loading && !error && rows.length >= 1 && (
            <m.div
              key={`podium-${period}`}
              className="relative pt-4 pb-2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.35 }}
            >
              {/* Glow behind champion */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/15 rounded-full blur-[100px] pointer-events-none" />

              <div className="relative flex items-end justify-center gap-2 sm:gap-3">
                {podiumConfig.map((cfg, i) => {
                  const r = rows[cfg.index];
                  if (!r) return <div key={cfg.rank} className="w-24 sm:w-28" />;
                  return (
                    <m.div
                      key={r.user_id || cfg.rank}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: 0.15 + i * 0.1,
                        type: 'spring',
                        stiffness: 120,
                        damping: 14,
                      }}
                      className={`flex flex-col items-center ${cfg.champion ? 'w-28 sm:w-32 -mt-6' : 'w-24 sm:w-28'}`}
                    >
                      {cfg.champion && (
                        <m.div
                          animate={{ y: [0, -3, 0] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                          className="mb-1"
                        >
                          <Crown className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400 drop-shadow-[0_0_16px_rgba(251,191,36,0.8)]" />
                        </m.div>
                      )}

                      <div className="relative">
                        <div
                          className={`relative ${cfg.size} rounded-full bg-gradient-to-br ${cfg.color} p-[2.5px]`}
                          style={{ boxShadow: `0 0 22px ${cfg.glowColor}` }}
                        >
                          <div className="relative w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.24),transparent_60%)]" />
                            <div
                              className={`absolute inset-0 opacity-30 bg-[conic-gradient(from_0deg,transparent,rgba(255,255,255,0.2),transparent)]`}
                            />
                            <span
                              className={`${cfg.fontSize} font-black bg-gradient-to-b ${cfg.color} bg-clip-text text-transparent`}
                            >
                              {cfg.rank}
                            </span>
                          </div>
                        </div>
                        <div
                          className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-gradient-to-br ${cfg.badgeBg} flex items-center justify-center text-[10px] font-black ${cfg.badgeText} border-2 border-slate-900`}
                        >
                          {cfg.rank}
                        </div>
                      </div>

                      <span className="mt-2.5 text-xs sm:text-sm font-bold text-white max-w-full truncate text-center px-1 leading-tight">
                        {getName(r)}
                      </span>

                      <div
                        className={`mt-2 w-full ${cfg.height} rounded-t-lg bg-gradient-to-b ${cfg.podiumBg} border-t border-white/10 flex items-center justify-center`}
                      >
                        <span
                          className={`text-2xl sm:text-3xl font-black ${cfg.textColor} opacity-25`}
                        >
                          {cfg.rank}
                        </span>
                      </div>
                    </m.div>
                  );
                })}
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* ═══════════ My Rank Card ═══════════ */}
        {!loading && !error && myRow && (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative overflow-hidden rounded-2xl border border-violet-500/30"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600/15 via-purple-600/10 to-pink-600/15" />
            <div className="relative flex items-center gap-3 px-4 py-3.5 sm:px-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 text-white font-bold text-sm flex items-center justify-center shadow-lg shadow-violet-500/25 shrink-0">
                #{myRank}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm sm:text-base font-semibold text-white truncate">
                  {getName(myRow)}
                </div>
                <div className="text-[11px] text-violet-300/80 font-medium uppercase tracking-[0.18em]">
                  Your Rank
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xl font-black bg-gradient-to-r from-violet-200 to-pink-200 bg-clip-text text-transparent">
                  {getScore(myRow)}
                </div>
                <div className="text-[10px] text-violet-400/60 font-medium">points</div>
              </div>
            </div>
          </m.div>
        )}

        {/* ═══════════ Rankings List ═══════════ */}
        <h2 className="sr-only">Full Leaderboard Rankings</h2>
        <m.div
          className="rounded-2xl bg-slate-800/40 backdrop-blur-sm border border-slate-700/40 overflow-hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* List header */}
          <div className="flex items-center px-4 py-2.5 border-b border-slate-700/40 bg-slate-800/30 sm:px-5">
            <span className="w-10 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              #
            </span>
            <span className="flex-1 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              Player
            </span>
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              Score
            </span>
          </div>

          {loading ? (
            <div className="py-20 flex items-center justify-center text-slate-400">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 rounded-full border-2 border-slate-700" />
                <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              </div>
            </div>
          ) : error ? (
            <div className="py-14 text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-3">
                <Trophy className="w-5 h-5 text-red-400" />
              </div>
              <div className="text-red-400 text-sm font-medium mb-1">
                Oops! Something went wrong
              </div>
              <div className="text-xs text-slate-500 mb-4">{error}</div>
              <button
                type="button"
                onClick={() => loadLeaderboard(period)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:shadow-lg hover:shadow-indigo-500/25 transition-all active:scale-95"
              >
                Try Again
              </button>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-14 text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-700/50 flex items-center justify-center mx-auto mb-3">
                <Medal className="w-5 h-5 text-slate-500" />
              </div>
              <div className="text-sm font-medium text-slate-300 mb-1">No rankings yet</div>
              <div className="text-xs text-slate-500 mb-4">
                Play quizzes to appear on the leaderboard!
              </div>
              <button
                type="button"
                onClick={() => loadLeaderboard(period)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-700/80 text-slate-200 hover:bg-slate-700 transition-all active:scale-95"
              >
                Refresh
              </button>
            </div>
          ) : (
            <div>
              {rows.map((r, i) => {
                const rank = r.rank || i + 1;
                const highlight = myRank === rank;
                const isTop3 = rank <= 3;
                const name = getName(r);

                const rankColors =
                  rank === 1
                    ? 'from-yellow-300 to-amber-500 text-amber-950'
                    : rank === 2
                      ? 'from-slate-200 to-gray-400 text-slate-800'
                      : rank === 3
                        ? 'from-amber-500 to-orange-600 text-orange-950'
                        : '';

                return (
                  <m.div
                    key={r.user_id || `row-${rank}-${i}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.6) }}
                    className={`group flex items-center gap-3 px-4 py-3 transition-colors border-b border-slate-700/20 last:border-b-0 sm:px-5 ${
                      highlight
                        ? 'bg-indigo-500/10 border-l-2 border-l-indigo-400'
                        : 'hover:bg-slate-700/20'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                        isTop3
                          ? `bg-gradient-to-br ${rankColors} shadow-sm`
                          : 'bg-slate-700/60 text-slate-300'
                      }`}
                    >
                      {rank}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm font-semibold truncate ${highlight ? 'text-white' : 'text-slate-200'}`}
                      >
                        {name}
                      </div>
                      {isTop3 && (
                        <div
                          className={`mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] ${
                            rank === 1
                              ? 'text-amber-400/80'
                              : rank === 2
                                ? 'text-slate-400/80'
                                : 'text-orange-400/80'
                          }`}
                        >
                          {rank === 1 ? 'Champion' : rank === 2 ? 'Runner-up' : 'Bronze'}
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-base font-bold tabular-nums ${
                          isTop3
                            ? rank === 1
                              ? 'text-amber-300'
                              : rank === 2
                                ? 'text-slate-300'
                                : 'text-orange-300'
                            : 'bg-gradient-to-r from-white to-violet-200 bg-clip-text text-transparent'
                        }`}
                      >
                        {Number(r.leaderboard_score ?? 0).toFixed(1)}
                      </div>
                      <div className="text-[9px] text-slate-500 font-medium uppercase">pts</div>
                    </div>
                  </m.div>
                );
              })}
            </div>
          )}
        </m.div>

        {/* ═══════════ SEO Content ═══════════ */}
        <section className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/40 rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAbout(!showAbout)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-700/20 transition-colors"
          >
            <h2 className="text-sm font-bold text-white">About Quiz Dangal Leaderboards</h2>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${showAbout ? 'rotate-180' : ''}`}
            />
          </button>

          <AnimatePresence>
            {showAbout && (
              <m.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-5 space-y-3 text-slate-400 text-xs leading-relaxed">
                  <p>
                    The Quiz Dangal Leaderboard showcases the top quiz players from across India.
                    Our ranking system is designed to reward knowledge, speed, and consistency.
                    Every correct answer you give in our daily quizzes contributes to your
                    leaderboard score. Whether you are a casual player or a competitive quiz
                    enthusiast, the leaderboard gives you a platform to showcase your skills.
                  </p>
                  <p>
                    <strong className="text-slate-200">How Rankings Work:</strong> Your leaderboard
                    score is calculated based on the accuracy of your answers, the speed at which
                    you respond, and your participation streak. The faster and more accurately you
                    answer, the higher you climb. Players are ranked across three time periods —
                    All-time, Monthly, and Weekly — so everyone has a chance to shine.
                  </p>
                  <p>
                    <strong className="text-slate-200">Compete & Win:</strong> Top players earn
                    recognition in the Quiz Dangal community and may receive bonus coins during
                    special events. Whether you excel in Opinion polls or General Knowledge, every
                    real quiz round counts toward your ranking.
                  </p>
                  <p>
                    <strong className="text-slate-200">Fair Play Guaranteed:</strong> We monitor all
                    quiz activity to ensure fair competition. Bot accounts, multiple accounts, and
                    cheating are strictly prohibited. Our automated systems detect suspicious
                    patterns to maintain a level playing field for genuine players.
                  </p>
                  <p>
                    Join thousands of quiz enthusiasts competing daily on Quiz Dangal. Start playing
                    now, answer correctly, beat the clock, and see your name rise on the
                    leaderboard!
                  </p>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}
