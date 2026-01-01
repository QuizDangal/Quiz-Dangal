import React, { useCallback, useEffect, useMemo, useState } from 'react';
import SeoHead from '@/components/SEO';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Trophy, Crown } from 'lucide-react';
import { m, AnimatePresence } from '@/lib/motion-lite';
import { logger } from '@/lib/logger';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const periods = [
  { key: 'all_time', label: 'All-time' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'weekly', label: 'Weekly' },
];

// Cache TTL: 5 minutes for leaderboard data (reduces RPC calls on free tier)
const LEADERBOARD_CACHE_TTL_MS = 5 * 60 * 1000;

function getLeaderboardCache(period) {
  try {
    const raw = sessionStorage.getItem(`qd_lb_${period}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > LEADERBOARD_CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function setLeaderboardCache(period, data) {
  try {
    sessionStorage.setItem(`qd_lb_${period}`, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // Quota exceeded or unavailable
  }
}

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

// removed old dark variant row component

export default function Leaderboards() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const query = useQuery();
  const period = query.get('period') || 'all_time';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLeaderboard = useCallback(async (p) => {
    // Check cache first (5 min TTL) - reduces RPC calls on free tier
    const cached = getLeaderboardCache(p);
    if (cached) {
      setRows(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
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

      setLeaderboardCache(p, data); // Cache for 5 min
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

  // Search removed; use full rows list directly

  const myIndex = useMemo(() => {
    if (!userProfile?.id) return -1;
    return rows.findIndex((r) => r.user_id === userProfile.id);
  }, [rows, userProfile]);

  const myRow = myIndex >= 0 ? rows[myIndex] : null;
  const myRank = myIndex >= 0 ? myIndex + 1 : null;

  return (
    <div className="relative pt-12 sm:pt-16 min-h-screen">
      {/* Keep global site background (no extra page blobs) */}

      {/* Floating Particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <m.div 
          className="absolute top-20 left-[10%] w-2 h-2 rounded-full bg-purple-400/30"
          animate={{ y: [0, -30, 0], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <m.div 
          className="absolute top-40 right-[15%] w-1.5 h-1.5 rounded-full bg-pink-400/30"
          animate={{ y: [0, -25, 0], opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        />
        <m.div 
          className="absolute top-60 left-[20%] w-1 h-1 rounded-full bg-amber-400/40"
          animate={{ y: [0, -20, 0], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        <m.div 
          className="absolute top-32 right-[25%] w-1.5 h-1.5 rounded-full bg-cyan-400/30"
          animate={{ y: [0, -35, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        />
      </div>

      <SeoHead
        title="Leaderboards – Quiz Dangal | Top Quiz Players"
        description="See the top players on Quiz Dangal leaderboards. Compete in daily opinion and knowledge quizzes, win coins, and climb ranks."
        canonical="https://quizdangal.com/leaderboards/"
        alternateLocales={['hi_IN', 'en_US']}
        keywords={[
          'quiz leaderboard',
          'top quiz players',
          'quizdangal leaderboard',
          'daily quiz rankings',
        ]}
        author="Quiz Dangal"
        datePublished="2025-01-01"
        dateModified="2025-12-29"
        jsonLd={[{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://quizdangal.com/' },
            { '@type': 'ListItem', position: 2, name: 'Leaderboards', item: 'https://quizdangal.com/leaderboards/' },
          ],
        }]}
      />
      
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-2">
        
        {/* Animated Header */}
        <m.div 
          className="text-center mb-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <m.div 
            className="inline-flex items-center gap-3 mb-3"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <m.div
              animate={{ rotate: [0, 10, -10, 0], y: [0, -4, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Trophy className="w-9 h-9 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]" />
            </m.div>
            <m.h1 
              className="text-4xl sm:text-5xl font-black tracking-tight relative"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <span className="bg-gradient-to-r from-amber-200 via-yellow-400 to-orange-400 bg-clip-text text-transparent drop-shadow-lg">
                Leaderboard
              </span>
              {/* Shimmer effect */}
              <m.span 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent bg-clip-text"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
              />
            </m.h1>
          </m.div>
        </m.div>

        {/* Period Tabs - Underline Slider Style */}
        <div className="flex justify-center gap-6 sm:gap-8">
          {periods.map((p, i) => (
            <m.button
              key={p.key}
              onClick={() => onTabClick(p.key)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ delay: i * 0.05 }}
              className="relative py-2"
            >
              <span className={`text-sm font-semibold transition-all duration-300 ${
                period === p.key 
                  ? 'text-white' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}>{p.label}</span>
            </m.button>
          ))}
        </div>

        {/* Top 3 Champions */}
        <h2 className="sr-only">Top 3 Quiz Champions</h2>
        <AnimatePresence>
          {!loading && !error && rows.length >= 1 && (
            <m.div 
              layout 
              className="relative py-2"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Animated Background Glow */}
              <div className="absolute inset-0 flex justify-center">
                <m.div 
                  className="w-40 h-40 bg-amber-500/20 rounded-full blur-[80px]"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              </div>
              
              <div className="relative flex items-end justify-center gap-1">
                {/* 2nd Place */}
                {rows[1] && (
                  <m.div
                    initial={{ opacity: 0, x: -40, scale: 0.7 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ delay: 0.25, type: 'spring', stiffness: 100 }}
                    className="flex flex-col items-center w-24 sm:w-28"
                  >
                    {/* Profile Badge */}
                    <m.div className="relative" whileHover={{ scale: 1.05 }}>
                      <m.div
                        className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-slate-200 via-slate-400 to-slate-500 p-[2px]"
                        animate={{
                          boxShadow: [
                            '0 0 16px rgba(148,163,184,0.25)',
                            '0 0 26px rgba(148,163,184,0.45)',
                            '0 0 16px rgba(148,163,184,0.25)',
                          ],
                        }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <div className="relative w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
                          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.25),transparent_60%)]" />
                          <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_center,rgba(148,163,184,0.3),transparent_70%)]" />
                          <m.div
                            className="absolute inset-0 opacity-40 bg-[conic-gradient(from_0deg,transparent,rgba(148,163,184,0.5),transparent)]"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                          />
                          <m.span 
                            className="relative text-2xl sm:text-3xl font-black bg-gradient-to-b from-white via-slate-200 to-slate-400 bg-clip-text text-transparent drop-shadow-lg"
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                          >2</m.span>
                        </div>
                      </m.div>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-gradient-to-br from-slate-200 to-slate-500 flex items-center justify-center text-xs font-black text-slate-900 shadow-lg border-2 border-slate-900">
                        2
                      </div>
                    </m.div>
                    {/* Name */}
                    <span className="mt-2 text-[10px] sm:text-xs font-semibold text-white/80 max-w-full truncate text-center px-1">
                      {rows[1].username ? `@${rows[1].username}` : rows[1].full_name || 'Anonymous'}
                    </span>
                    {/* Score */}
                    <span className="text-sm font-bold text-slate-300">{(rows[1].leaderboard_score ?? 0).toFixed(0)}</span>
                    {/* Podium */}
                    <div className="mt-2 w-full h-14 sm:h-16 rounded-t-lg bg-gradient-to-b from-slate-500 via-slate-600 to-slate-700 flex items-center justify-center border-t border-slate-400/40">
                      <span className="text-xl font-black text-white/20">2</span>
                    </div>
                  </m.div>
                )}
                
                {/* 1st Place - Champion */}
                {rows[0] && (
                  <m.div
                    initial={{ opacity: 0, y: -40, scale: 0.7 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.15, type: 'spring', stiffness: 100 }}
                    className="flex flex-col items-center w-28 sm:w-32 -mt-6"
                  >
                    {/* Crown */}
                    <m.div
                      animate={{ y: [0, -6, 0], rotate: [-5, 5, -5] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      className="mb-1"
                    >
                      <Crown className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400 drop-shadow-[0_0_16px_rgba(251,191,36,0.8)]" />
                    </m.div>
                    {/* Profile Badge */}
                    <m.div className="relative" whileHover={{ scale: 1.05 }}>
                      <m.div
                        className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-orange-500 p-[3px]"
                        animate={{
                          boxShadow: [
                            '0 0 18px rgba(251,191,36,0.35)',
                            '0 0 30px rgba(251,191,36,0.65)',
                            '0 0 18px rgba(251,191,36,0.35)',
                          ],
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <div className="relative w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
                          <div className="absolute inset-0 opacity-45 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.3),transparent_60%)]" />
                          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.35),transparent_70%)]" />
                          <m.div
                            className="absolute inset-0 opacity-50 bg-[conic-gradient(from_0deg,transparent,rgba(251,191,36,0.6),transparent)]"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                          />
                          <m.span 
                            className="relative text-3xl sm:text-4xl font-black bg-gradient-to-b from-amber-200 via-yellow-400 to-orange-500 bg-clip-text text-transparent drop-shadow-lg"
                            animate={{ scale: [1, 1.08, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                          >1</m.span>
                        </div>
                      </m.div>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm font-black text-amber-950 shadow-lg border-2 border-slate-900">
                        1
                      </div>
                    </m.div>
                    {/* Name */}
                    <span className="mt-2 text-xs sm:text-sm font-bold text-white max-w-full truncate text-center px-1">
                      {rows[0].username ? `@${rows[0].username}` : rows[0].full_name || 'Anonymous'}
                    </span>
                    {/* Score */}
                    <span className="text-base sm:text-lg font-bold bg-gradient-to-r from-amber-300 to-yellow-200 bg-clip-text text-transparent">{(rows[0].leaderboard_score ?? 0).toFixed(0)}</span>
                    {/* Podium */}
                    <div className="mt-2 w-full h-20 sm:h-24 rounded-t-lg bg-gradient-to-b from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center border-t-2 border-amber-400/60 shadow-lg shadow-amber-600/40">
                      <m.span 
                        className="text-2xl sm:text-3xl font-black text-amber-300/30"
                        animate={{ opacity: [0.3, 0.5, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >1</m.span>
                    </div>
                  </m.div>
                )}
                
                {/* 3rd Place */}
                {rows[2] && (
                  <m.div
                    initial={{ opacity: 0, x: 40, scale: 0.7 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ delay: 0.35, type: 'spring', stiffness: 100 }}
                    className="flex flex-col items-center w-24 sm:w-28"
                  >
                    {/* Profile Badge */}
                    <m.div className="relative" whileHover={{ scale: 1.05 }}>
                      <m.div
                        className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-orange-400 via-amber-500 to-orange-600 p-[2px]"
                        animate={{
                          boxShadow: [
                            '0 0 16px rgba(251,146,60,0.25)',
                            '0 0 26px rgba(251,146,60,0.45)',
                            '0 0 16px rgba(251,146,60,0.25)',
                          ],
                        }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <div className="relative w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
                          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.25),transparent_60%)]" />
                          <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_center,rgba(251,146,60,0.3),transparent_70%)]" />
                          <m.div
                            className="absolute inset-0 opacity-40 bg-[conic-gradient(from_0deg,transparent,rgba(251,146,60,0.5),transparent)]"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                          />
                          <m.span 
                            className="relative text-2xl sm:text-3xl font-black bg-gradient-to-b from-orange-200 via-orange-400 to-amber-600 bg-clip-text text-transparent drop-shadow-lg"
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                          >3</m.span>
                        </div>
                      </m.div>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-xs font-black text-orange-950 shadow-lg border-2 border-slate-900">
                        3
                      </div>
                    </m.div>
                    {/* Name */}
                    <span className="mt-2 text-[10px] sm:text-xs font-semibold text-white/80 max-w-full truncate text-center px-1">
                      {rows[2].username ? `@${rows[2].username}` : rows[2].full_name || 'Anonymous'}
                    </span>
                    {/* Score */}
                    <span className="text-sm font-bold text-orange-300">{(rows[2].leaderboard_score ?? 0).toFixed(0)}</span>
                    {/* Podium */}
                    <div className="mt-2 w-full h-10 sm:h-12 rounded-t-lg bg-gradient-to-b from-orange-500 via-orange-600 to-orange-700 flex items-center justify-center border-t border-orange-400/40">
                      <span className="text-xl font-black text-white/20">3</span>
                    </div>
                  </m.div>
                )}
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* My Rank Card */}
        {!loading && !error && myRow && (
          <m.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-0.5 p-3 rounded-xl bg-gradient-to-r from-violet-600/20 to-pink-600/20 border border-violet-500/40 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 text-white font-bold text-sm flex items-center justify-center shadow-md">
                  #{myRank}
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">
                    {myRow.username ? `@${myRow.username}` : myRow.full_name || 'You'}
                  </div>
                  <div className="text-xs text-violet-400">
                    Your Rank
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-white">
                  {Number(myRow.leaderboard_score ?? 0).toFixed(0)}
                </div>
                <div className="text-xs text-violet-400/70">points</div>
              </div>
            </div>
          </m.div>
        )}

        {/* Full Leaderboard Rankings */}
        <h2 className="sr-only">Full Leaderboard Rankings</h2>
        <div className="rounded-xl bg-slate-800/30 backdrop-blur-sm border border-slate-700/40 overflow-hidden">
          {loading ? (
            <div className="py-16 flex flex-col items-center text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-400 mb-2" />
              <span className="text-sm">Loading leaderboard...</span>
            </div>
          ) : error ? (
            <div className="py-12 text-center px-4">
              <div className="text-red-400 text-sm font-medium mb-3">{error}</div>
              <button
                type="button"
                onClick={() => loadLeaderboard(period)}
                className="px-4 py-2 rounded-full text-xs font-medium bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
              >
                Retry
              </button>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-slate-400 px-4">
              <div className="space-y-2">
                <div className="text-sm">No leaderboard data yet.</div>
                <div className="text-xs text-slate-500">
                  Try selecting All-time or refresh the page.
                </div>
                <button
                  type="button"
                  onClick={() => loadLeaderboard(period)}
                  className="mt-3 px-4 py-2 rounded-full text-xs font-medium bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
                >
                  Refresh
                </button>
              </div>
            </div>
          ) : (
            <m.div layout className="divide-y divide-slate-700/50">
              {rows.map((r, i) => {
                const rank = r.rank || i + 1;
                const highlight = myRank === rank;
                const top3 = rank <= 3;
                const name = r.username ? `@${r.username}` : r.full_name || 'Anonymous';
                
                return (
                  <m.div
                    key={r.user_id || `row-${rank}-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className={`group relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-700/30 ${highlight ? 'bg-indigo-500/10' : ''}`}
                  >
                    {/* Rank Badge */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      top3 
                        ? rank === 1 
                          ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-amber-900 shadow-lg shadow-amber-500/30' 
                          : rank === 2 
                            ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-700 shadow-lg shadow-slate-400/20'
                            : 'bg-gradient-to-br from-orange-400 to-amber-500 text-orange-900 shadow-lg shadow-orange-500/20'
                        : 'bg-slate-700/80 text-slate-300'
                    } ${highlight ? 'ring-2 ring-indigo-400/50' : ''}`}>
                      {rank}
                    </div>
                    
                    {/* Player Name */}
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold truncate ${highlight ? 'text-white' : 'text-slate-200'}`}>
                        {name}
                      </div>
                    </div>
                    
                    {/* Score */}
                    <div className="text-right shrink-0">
                      <div className="text-base font-bold bg-gradient-to-r from-white to-violet-200 bg-clip-text text-transparent">
                        {Number(r.leaderboard_score ?? 0).toFixed(1)}
                      </div>
                      <div className="text-[9px] text-slate-500 font-medium uppercase">pts</div>
                    </div>
                  </m.div>
                );
              })}
            </m.div>
          )}
        </div>

        {/* SEO Content Section */}
        <section className="mt-8 bg-slate-800/30 backdrop-blur-sm border border-slate-700/40 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">About Quiz Dangal Leaderboards</h2>
          <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
            <p>
              The Quiz Dangal Leaderboard showcases the top quiz players from across India. Our ranking system is designed to reward knowledge, speed, and consistency. Every correct answer you give in our daily quizzes contributes to your leaderboard score. Whether you are a casual player or a competitive quiz enthusiast, the leaderboard gives you a platform to showcase your skills.
            </p>
            <p>
              <strong className="text-white">How Rankings Work:</strong> Your leaderboard score is calculated based on the accuracy of your answers, the speed at which you respond, and your participation streak. The faster and more accurately you answer, the higher you climb. Players are ranked across three time periods — All-time, Monthly, and Weekly — so everyone has a chance to shine. New players can quickly rise through the weekly rankings, while consistent performers dominate the all-time charts.
            </p>
            <p>
              <strong className="text-white">Compete & Win:</strong> Climbing the leaderboard is not just about bragging rights. Top players earn recognition in the Quiz Dangal community and may receive bonus coins during special events. Whether you excel in Opinion polls, General Knowledge, Sports, or Movies, every quiz counts toward your ranking. The more quizzes you play, the more opportunities you have to earn points and climb higher.
            </p>
            <p>
              <strong className="text-white">Fair Play Guaranteed:</strong> We monitor all quiz activity to ensure fair competition. Bot accounts, multiple accounts, and cheating are strictly prohibited. Our automated systems detect suspicious patterns to maintain a level playing field for genuine players. We believe in rewarding real knowledge and skill, not shortcuts.
            </p>
            <p>
              <strong className="text-white">Categories That Count:</strong> Quiz Dangal offers multiple quiz categories including Opinion Polls, General Knowledge (GK), Sports Trivia, and Bollywood Movies. Each category contributes equally to your overall leaderboard score. Diversify your quiz participation to maximize your points and stay ahead of the competition.
            </p>
            <p>
              Join thousands of quiz enthusiasts competing daily on Quiz Dangal. Start playing now, answer correctly, beat the clock, and see your name rise on the leaderboard! Check back regularly to track your progress and see how you compare against other players from across India.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

