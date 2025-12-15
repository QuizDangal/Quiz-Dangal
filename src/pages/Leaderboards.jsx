import React, { useCallback, useEffect, useMemo, useState } from 'react';
import SEO from '@/components/SEO';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, ChevronDown, Zap, Trophy, Medal, Crown, Award } from 'lucide-react';
import { m, AnimatePresence } from '@/lib/motion-lite';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const periods = [
  { key: 'all_time', label: 'All-time' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'weekly', label: 'Weekly' },
];

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
  const [showAll, setShowAll] = useState(false);

  const loadLeaderboard = useCallback(async (p) => {
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

      setRows(data);
    } catch (err) {
      const errorMessage = err.message || 'Failed to load leaderboard.';
      console.error('Leaderboard fetch error:', err);
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
    <div className="relative pt-14 min-h-screen">
      <SEO
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
      />
      
      {/* Refined ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-50 [background-image:radial-gradient(ellipse_at_20%_20%,rgba(99,102,241,0.25),transparent_50%),radial-gradient(ellipse_at_80%_80%,rgba(139,92,246,0.2),transparent_50%),radial-gradient(ellipse_at_50%_50%,rgba(236,72,153,0.12),transparent_45%)]" />
      
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        
        {/* Modern Header */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2.5">
            <m.div
              className="relative"
              animate={{ rotate: [-2, 2, -2], y: [0, -1.5, 0] }}
              transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity }}
            >
              <Trophy className="w-7 h-7 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
            </m.div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-indigo-100 to-violet-200 bg-clip-text text-transparent tracking-tight">
              Leaderboards
            </h1>
          </div>
          <p className="text-slate-400 text-xs font-medium tracking-wide ml-0.5">Top players ranked by performance</p>
        </div>

        {/* Period Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="inline-flex p-1 rounded-full bg-slate-800/60 backdrop-blur-sm border border-slate-700/50">
            {periods.map((p) => (
              <button
                key={p.key}
                onClick={() => onTabClick(p.key)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  period === p.key 
                    ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Podium Section */}
        <AnimatePresence>
          {!loading && !error && rows.length >= 1 && (
            <m.div 
              layout 
              className="grid grid-cols-3 gap-2 sm:gap-3 items-end"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {[2, 1, 3].map((pos) => {
                const r = rows[pos - 1];
                if (!r) return <div key={`podium-empty-${pos}`} className="h-32"></div>;
                
                const podiumConfig = {
                  1: {
                    height: 'h-44',
                    icon: Crown,
                    iconColor: 'text-amber-400',
                    gradient: 'from-amber-500/20 via-yellow-500/10 to-amber-600/20',
                    border: 'border-amber-500/30',
                    badge: 'bg-gradient-to-br from-amber-400 to-yellow-500',
                    glow: 'shadow-[0_0_20px_rgba(251,191,36,0.3)]',
                    ring: 'ring-amber-400/40',
                  },
                  2: {
                    height: 'h-36',
                    icon: Medal,
                    iconColor: 'text-slate-300',
                    gradient: 'from-slate-400/15 via-slate-300/10 to-slate-500/15',
                    border: 'border-slate-400/25',
                    badge: 'bg-gradient-to-br from-slate-300 to-slate-400',
                    glow: 'shadow-[0_0_15px_rgba(148,163,184,0.2)]',
                    ring: 'ring-slate-400/30',
                  },
                  3: {
                    height: 'h-32',
                    icon: Award,
                    iconColor: 'text-orange-400',
                    gradient: 'from-orange-500/15 via-amber-500/10 to-orange-600/15',
                    border: 'border-orange-500/25',
                    badge: 'bg-gradient-to-br from-orange-400 to-amber-500',
                    glow: 'shadow-[0_0_15px_rgba(251,146,60,0.25)]',
                    ring: 'ring-orange-400/30',
                  },
                };
                
                const config = podiumConfig[pos];
                
                return (
                  <m.div
                    key={pos}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: pos === 1 ? 0.1 : pos === 2 ? 0.2 : 0.3 }}
                    className={`relative flex flex-col items-center justify-end ${config.height} rounded-2xl overflow-hidden border ${config.border} bg-gradient-to-b ${config.gradient} backdrop-blur-md ${config.glow}`}
                  >
                    {/* Subtle glass overlay */}
                    <div className="absolute inset-0 bg-slate-900/40" />
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/5" />
                    
                    <div className="relative z-10 w-full p-3 flex flex-col items-center gap-1.5">
                      {/* Premium Shield Badge */}
                      <div className="relative">
                        {/* Outer glow pulse */}
                        <div className={`absolute -inset-3 rounded-full ${pos === 1 ? 'bg-amber-400' : pos === 2 ? 'bg-slate-300' : 'bg-orange-400'} opacity-20 blur-lg animate-pulse`} />
                        
                        {/* Shield shape container */}
                        <div className="relative w-14 h-16 sm:w-16 sm:h-[4.5rem]">
                          {/* Shield background */}
                          <div 
                            className={`absolute inset-0 ${pos === 1 ? 'bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-600' : pos === 2 ? 'bg-gradient-to-b from-slate-200 via-slate-300 to-slate-500' : 'bg-gradient-to-b from-orange-300 via-amber-400 to-orange-600'} shadow-xl`}
                            style={{ clipPath: 'polygon(50% 0%, 100% 0%, 100% 65%, 50% 100%, 0% 65%, 0% 0%)' }}
                          >
                            {/* Inner shine */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent" style={{ clipPath: 'polygon(50% 0%, 100% 0%, 100% 65%, 50% 100%, 0% 65%, 0% 0%)' }} />
                          </div>
                          
                          {/* Inner shield face */}
                          <div 
                            className={`absolute inset-[3px] ${pos === 1 ? 'bg-gradient-to-b from-amber-500 via-yellow-500 to-amber-700' : pos === 2 ? 'bg-gradient-to-b from-slate-300 via-gray-400 to-slate-600' : 'bg-gradient-to-b from-amber-500 via-orange-500 to-orange-700'}`}
                            style={{ clipPath: 'polygon(50% 0%, 100% 0%, 100% 65%, 50% 100%, 0% 65%, 0% 0%)' }}
                          >
                            {/* Decorative stars */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                              {/* Top star */}
                              <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${pos === 1 ? 'text-yellow-200' : pos === 2 ? 'text-white/80' : 'text-orange-200'} drop-shadow-sm`} viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                              </svg>
                              {/* Position number */}
                              <span className={`text-lg sm:text-xl font-black ${pos === 1 ? 'text-amber-900' : pos === 2 ? 'text-slate-700' : 'text-orange-900'} drop-shadow-sm`}>
                                {pos}
                              </span>
                            </div>
                          </div>
                          
                          {/* Top decorative banner */}
                          <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-10 h-2.5 ${pos === 1 ? 'bg-gradient-to-r from-red-500 via-red-400 to-red-500' : pos === 2 ? 'bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500' : 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500'} rounded-t-sm shadow-md`} />
                        </div>
                      </div>
                      <span className="text-[10px] sm:text-xs font-semibold text-white/90 max-w-full truncate px-1 mt-1">
                        {r.username ? `@${r.username}` : r.full_name || 'Anonymous'}
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm sm:text-base font-bold bg-gradient-to-r from-white via-indigo-100 to-violet-200 bg-clip-text text-transparent">
                          {(r.leaderboard_score ?? 0).toFixed(1)}
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium uppercase">pts</span>
                      </div>
                    </div>
                  </m.div>
                );
              })}
            </m.div>
          )}
        </AnimatePresence>

        {/* My Rank Card */}
        {!loading && !error && myRow && (
          <m.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-fuchsia-500/10 border border-indigo-500/30 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-sm flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  #{myRank}
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">
                    {myRow.username ? `@${myRow.username}` : myRow.full_name || 'You'}
                  </div>
                  <div className="text-[10px] text-indigo-300/80 font-medium uppercase tracking-wider">
                    Your Ranking
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold bg-gradient-to-r from-indigo-200 to-violet-200 bg-clip-text text-transparent">
                  {Number(myRow.leaderboard_score ?? 0).toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                  Score
                </div>
              </div>
            </div>
          </m.div>
        )}

        {/* Player List */}
        <div className="rounded-xl bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 overflow-hidden">
          {loading ? (
            <div className="py-16 flex flex-col items-center text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-400 mb-2" />
              <span className="text-sm">Loading leaderboard...</span>
            </div>
          ) : error ? (
            <div className="py-12 text-center px-4">
              <div className="text-red-400 text-sm font-medium mb-3">{error}</div>
              <button
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
                  onClick={() => loadLeaderboard(period)}
                  className="mt-3 px-4 py-2 rounded-full text-xs font-medium bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
                >
                  Refresh
                </button>
              </div>
            </div>
          ) : (
            <m.div layout className="divide-y divide-slate-700/50">
              {(showAll ? rows : rows.slice(0, 5)).map((r, i) => {
                const rank = r.rank || i + 1;
                const highlight = myRank === rank;
                const top3 = rank <= 3;
                const win = Math.min(100, r.win_rate || 0);
                const name = r.username ? `@${r.username}` : r.full_name || 'Anonymous';
                
                return (
                  <m.div
                    key={r.user_id || `row-${rank}-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className={`group relative flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-slate-700/30 ${highlight ? 'bg-indigo-500/10' : ''}`}
                  >
                    {/* Rank Badge */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      top3 
                        ? rank === 1 
                          ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-amber-900' 
                          : rank === 2 
                            ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-700'
                            : 'bg-gradient-to-br from-orange-400 to-amber-500 text-orange-900'
                        : 'bg-slate-700/80 text-slate-300'
                    } ${highlight ? 'ring-2 ring-indigo-400/50' : ''}`}>
                      {rank}
                    </div>
                    
                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${highlight ? 'text-white' : 'text-slate-200'}`}>
                        {name}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {Number(r.win_rate ?? 0).toFixed(0)}% win
                        </span>
                        <span className="flex items-center gap-0.5 text-[10px] text-slate-400 font-medium">
                          <Zap className="w-2.5 h-2.5 text-violet-400" />
                          {r.streak || 0}
                        </span>
                      </div>
                      {/* Mini progress bar */}
                      <div className="mt-1.5 h-1 w-full max-w-[120px] rounded-full bg-slate-700/60 overflow-hidden">
                        <div
                          style={{ width: `${win}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500"
                        />
                      </div>
                    </div>
                    
                    {/* Score */}
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold bg-gradient-to-r from-white to-violet-200 bg-clip-text text-transparent">
                        {Number(r.leaderboard_score ?? 0).toFixed(1)}
                      </div>
                      <div className="text-[9px] text-slate-500 font-medium uppercase">pts</div>
                    </div>
                  </m.div>
                );
              })}
              
              {/* Show More/Less Button */}
              {rows.length > 5 && (
                <div className="py-2 flex justify-center bg-slate-800/20">
                  <button
                    type="button"
                    onClick={() => setShowAll(!showAll)}
                    className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
                  >
                    {showAll ? (
                      <>Show less</>
                    ) : (
                      <>Show all {rows.length} players <ChevronDown className="w-3 h-3" /></>
                    )}
                  </button>
                </div>
              )}
            </m.div>
          )}
        </div>
      </div>
    </div>
  );
}
