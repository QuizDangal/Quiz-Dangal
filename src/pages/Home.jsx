// Quiz Dangal – Home (premium redesign)
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SeoHead from '@/components/SEO';
import { useNavigate, Link } from 'react-router-dom';
import {
  ChevronRight,
  Coins,
  Crown,
  Flame,
  Play,
  User,
} from 'lucide-react';
import { getSupabase, supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { STREAK_CLAIM_DELAY_MS } from '@/constants';
import StreakModal from '@/components/StreakModal';

/* ─── tiny static data ─── */
const HOT_PICKS = [
  {
    emoji: '🏏', title: 'IPL & Cricket',
    sub: 'Predict scores, win big',
    cat: 'gk', tag: 'TRENDING',
    gradient: 'from-orange-500 via-amber-500 to-yellow-500',
    glow: 'rgba(245,158,11,0.25)',
    hoverGlow: 'rgba(245,158,11,0.4)',
  },
  {
    emoji: '🗳️', title: "Today's Opinion",
    sub: 'Vote & earn coins instantly',
    cat: 'opinion', tag: 'HOT',
    gradient: 'from-pink-500 via-rose-500 to-fuchsia-600',
    glow: 'rgba(236,72,153,0.25)',
    hoverGlow: 'rgba(236,72,153,0.4)',
  },
  {
    emoji: '🧠', title: 'GK Challenge',
    sub: 'Test your brain daily',
    cat: 'gk', tag: 'POPULAR',
    gradient: 'from-violet-500 via-purple-500 to-indigo-600',
    glow: 'rgba(139,92,246,0.25)',
    hoverGlow: 'rgba(139,92,246,0.4)',
  },
  {
    emoji: '📰', title: 'Current Affairs',
    sub: 'Stay sharp, earn rewards',
    cat: 'gk', tag: 'NEW',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    glow: 'rgba(16,185,129,0.25)',
    hoverGlow: 'rgba(16,185,129,0.4)',
  },
];

const Home = () => {
  const navigate = useNavigate();
  const { user, userProfile, refreshUserProfile } = useAuth();
  const [modal, setModal] = useState({ open: false, day: 0, coins: 0 });
  const claiming = useRef(false);

  const coins = useMemo(() => Number(userProfile?.wallet_balance || 0), [userProfile?.wallet_balance]);
  const streak = useMemo(() => Number(userProfile?.current_streak || 0), [userProfile?.current_streak]);
  const nextStreakReward = useMemo(() => Math.min(50, 10 + Math.max(0, streak - 1) * 5), [streak]);

  const displayName = useMemo(() => {
    const raw = userProfile?.full_name || userProfile?.name || user?.email || '';
    const s = String(raw || '').trim();
    if (!s) return 'Player';
    const first = s.split(/\s+/)[0];
    return first.length > 14 ? `${first.slice(0, 14)}…` : first;
  }, [userProfile?.full_name, userProfile?.name, user?.email]);

  // Auto claim streak
  useEffect(() => {
    if (!user || claiming.current || !supabase) return;
    const run = async () => {
      claiming.current = true;
      try {
        const k = `qd_s_${user.id}`, d = new Date(), s = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
        try {
          if (sessionStorage.getItem(k) === s) return;
        } catch (e) {
          void e;
        }
        const { data, error } = await supabase.rpc('handle_daily_login', { user_uuid: user.id });
        if (!error && data?.is_new_login) {
          await refreshUserProfile(user);
          setModal({ open: true, day: data.streak_day, coins: data.coins_earned });
        }
        try {
          sessionStorage.setItem(k, s);
        } catch (e) {
          void e;
        }
      } catch (e) {
        void e;
      } finally {
        claiming.current = false;
      }
    };
    const t = setTimeout(run, STREAK_CLAIM_DELAY_MS);
    return () => clearTimeout(t);
  }, [user, refreshUserProfile]);

  const go = useCallback(async (id) => {
    try {
      await getSupabase();
    } catch (e) {
      void e;
    }
    navigate(`/category/${id}/`);
  }, [navigate]);

  return (
    <div className="mx-auto max-w-[480px] px-4 pb-[calc(var(--qd-footer-h)+24px)]">
      <SeoHead
        title="Quiz Dangal - Play Quiz & Win"
        description="India's #1 quiz platform. Play opinion polls and GK quizzes daily!"
        canonical="https://quizdangal.com/"
        jsonLd={[{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Quiz Dangal', url: 'https://quizdangal.com/' }]}
      />

      {/* ═══════ HEADER ═══════ */}
      <header className="sticky top-0 z-20 -mx-4 px-4 pt-3 pb-3 bg-black/50 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3 no-underline group">
            <img
              src="/logo-48.png"
              alt="Quiz Dangal"
              width={44}
              height={44}
              className="h-11 w-11 rounded-2xl ring-2 ring-white/10 shadow-[0_0_20px_rgba(139,92,246,0.2)] transition-shadow duration-300 group-hover:shadow-[0_0_28px_rgba(139,92,246,0.35)]"
            />
            <div className="leading-tight">
              <div className="text-[1.12rem] font-black tracking-tight bg-gradient-to-r from-violet-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent">
                Quiz Dangal
              </div>
              <div className="text-[0.68rem] font-medium text-white/50 tracking-wide">Play · Win · Repeat</div>
            </div>
          </Link>

          {user ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setModal({ open: true, day: streak, coins: nextStreakReward })}
                className="home-shine inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-extrabold border border-orange-400/25 bg-gradient-to-r from-orange-500 to-red-600 shadow-[0_4px_20px_rgba(249,115,22,0.3)] transition-all duration-200 hover:shadow-[0_4px_28px_rgba(249,115,22,0.45)] hover:scale-[1.03] active:scale-[0.97]"
                aria-label="Open streak rewards"
              >
                <Flame size={15} className="text-amber-100" />
                <span>{streak}</span>
              </button>
              <Link
                to="/wallet/"
                className="home-shine inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-extrabold border border-violet-400/25 bg-gradient-to-r from-indigo-500 to-purple-600 shadow-[0_4px_20px_rgba(139,92,246,0.3)] transition-all duration-200 hover:shadow-[0_4px_28px_rgba(139,92,246,0.45)] hover:scale-[1.03] active:scale-[0.97]"
                aria-label="Open wallet"
              >
                <Coins size={15} className="text-yellow-200" />
                <span>{coins.toLocaleString()}</span>
              </Link>
            </div>
          ) : (
            <Link
              to="/login/"
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold border border-white/15 bg-white/[0.07] backdrop-blur-sm hover:bg-white/[0.12] transition-all duration-200 hover:border-white/25"
            >
              <User size={15} className="text-white/70" />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </header>

      <div className="pt-5 space-y-6">

        {/* ═══════ HERO ═══════ */}
        <section
          className="animate-fade-up relative overflow-hidden rounded-[28px]"
          style={{ '--fade-delay': '0ms' }}
        >
          {/* Main bg with mesh pattern */}
          <div className="absolute inset-0 bg-[#0c0118]" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23a855f7%22 fill-opacity=%220.04%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-60" />

          {/* Animated glow orbs */}
          <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full bg-violet-600/30 blur-[100px] animate-float" />
          <div className="pointer-events-none absolute bottom-0 -left-10 h-36 w-36 rounded-full bg-pink-500/25 blur-[80px] animate-float-delayed" />
          <div className="pointer-events-none absolute top-8 -right-10 h-32 w-32 rounded-full bg-cyan-500/20 blur-[70px] animate-float-slow" />

          <div className="relative px-5 pt-6 pb-5">

            {/* Floating particles */}
            <div className="pointer-events-none absolute top-4 right-6 h-2 w-2 rounded-full bg-amber-400/50 animate-float" />
            <div className="pointer-events-none absolute top-16 left-6 h-1.5 w-1.5 rounded-full bg-violet-400/40 animate-float-delayed" />
            <div className="pointer-events-none absolute bottom-28 right-10 h-2.5 w-2.5 rounded-full bg-pink-400/35 animate-float-slow" />
            <div className="pointer-events-none absolute bottom-16 left-10 h-1.5 w-1.5 rounded-full bg-cyan-400/40 animate-float" />
            <div className="pointer-events-none absolute top-1/3 right-4 h-1 w-1 rounded-full bg-yellow-300/50 animate-ping" />

            {/* Top row: Greeting + LIVE */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-[0.78rem] text-white/50 font-medium">
                {user ? (
                  <>Hey <span className="text-amber-300 font-bold">{displayName}</span>{' '}<span className="inline-block" style={{ animation: 'heroWave 1.8s ease-in-out infinite' }}>👋</span></>
                ) : (
                  <>Welcome to <span className="text-violet-300 font-bold">Quiz Dangal</span></>
                )}
              </p>
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-1 text-[0.55rem] font-extrabold text-emerald-400 tracking-wider" role="status" aria-label="Quizzes are live now">
                <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" /></span>
                LIVE
              </div>
            </div>

            {/* Center crown icon */}
            <div className="flex justify-center mb-3">
              <Crown className="w-[4.5rem] h-[4.5rem] text-amber-400" strokeWidth={1.8} style={{ animation: 'float 4s ease-in-out infinite, shimmer-glow 2.5s ease-in-out infinite alternate' }} />
            </div>

            {/* Title - centered, bold */}
            <h1 className="text-center mb-1">
              <span className="block text-[1.5rem] font-black tracking-tight text-white leading-tight">
                Quiz Khelo Daily
              </span>
              <span className="block text-[1.8rem] font-black tracking-tight bg-gradient-to-r from-amber-300 via-yellow-200 to-orange-400 bg-300% bg-clip-text text-transparent animate-gradient-slow leading-tight">
                Coins Jeeto! 💰
              </span>
            </h1>

            {/* Tagline pills with stagger animation */}
            <div className="flex items-center justify-center gap-2 mt-3 mb-6">
              <span className="rounded-full bg-violet-500/15 border border-violet-500/20 px-3 py-1 text-[0.6rem] font-bold text-violet-300" style={{ animation: 'heroPillFade 0.5s ease-out 0.2s both' }}>🎮 Free to Play</span>
              <span className="rounded-full bg-amber-500/15 border border-amber-500/20 px-3 py-1 text-[0.6rem] font-bold text-amber-300" style={{ animation: 'heroPillFade 0.5s ease-out 0.4s both' }}>💰 Win Coins</span>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/20 px-3 py-1 text-[0.6rem] font-bold text-emerald-300" style={{ animation: 'heroPillFade 0.5s ease-out 0.6s both' }}>🧠 Daily New</span>
            </div>

            {/* Two side-by-side game cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Opinion Poll Card */}
              <button
                type="button"
                onClick={() => go('opinion')}
                className="home-shine group relative overflow-hidden rounded-2xl text-left transition-all duration-300 hover:-translate-y-1 active:scale-[0.97]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-pink-600 via-rose-500 to-fuchsia-600" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.2),transparent_50%)]" />
                <div className="relative px-3.5 pt-4 pb-3.5">
                  <div className="h-11 w-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                    <span className="text-[1.4rem] leading-none">🗳️</span>
                  </div>
                  <div className="text-[0.92rem] font-black text-white leading-tight mb-0.5">Opinion Quiz</div>
                  <div className="text-[0.58rem] text-white/50 font-medium mb-3">Vote & Earn</div>
                  <div className="flex items-center justify-center gap-1.5 rounded-lg bg-white/95 py-1.5 shadow-lg transition-all duration-200 group-hover:bg-white">
                    <Play size={11} className="text-pink-600" fill="rgb(219,39,119)" />
                    <span className="text-[0.72rem] font-extrabold text-pink-600">Play</span>
                    <ChevronRight size={11} className="text-pink-400 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </button>

              {/* GK Quiz Card */}
              <button
                type="button"
                onClick={() => go('gk')}
                className="home-shine group relative overflow-hidden rounded-2xl text-left transition-all duration-300 hover:-translate-y-1 active:scale-[0.97]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-500 to-cyan-500" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.2),transparent_50%)]" />
                <div className="relative px-3.5 pt-4 pb-3.5">
                  <div className="h-11 w-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                    <span className="text-[1.4rem] leading-none">🧠</span>
                  </div>
                  <div className="text-[0.92rem] font-black text-white leading-tight mb-0.5">GK Quiz</div>
                  <div className="text-[0.58rem] text-white/50 font-medium mb-3">Test & Win</div>
                  <div className="flex items-center justify-center gap-1.5 rounded-lg bg-white/95 py-1.5 shadow-lg transition-all duration-200 group-hover:bg-white">
                    <Play size={11} className="text-indigo-600" fill="rgb(79,70,229)" />
                    <span className="text-[0.72rem] font-extrabold text-indigo-600">Play</span>
                    <ChevronRight size={11} className="text-indigo-400 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </button>
            </div>

            {/* Bottom stats strip */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center gap-1 rounded-xl bg-gradient-to-b from-violet-500/15 to-violet-500/5 border border-violet-500/15 py-2.5">
                <div className="flex items-center gap-1">
                  <User size={12} className="text-violet-400" />
                  <span className="text-[0.82rem] font-black text-white">10K+</span>
                </div>
                <span className="text-[0.5rem] text-violet-300/60 font-semibold">Players</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-xl bg-gradient-to-b from-cyan-500/15 to-cyan-500/5 border border-cyan-500/15 py-2.5">
                <div className="flex items-center gap-1">
                  <span className="text-[0.7rem]">🧠</span>
                  <span className="text-[0.82rem] font-black text-white">500+</span>
                </div>
                <span className="text-[0.5rem] text-cyan-300/60 font-semibold">Quizzes</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-xl bg-gradient-to-b from-amber-500/15 to-amber-500/5 border border-amber-500/15 py-2.5">
                <div className="flex items-center gap-1">
                  <Coins size={12} className="text-amber-400" />
                  <span className="text-[0.82rem] font-black text-amber-300">₹1L+</span>
                </div>
                <span className="text-[0.5rem] text-amber-300/60 font-semibold">Rewards</span>
              </div>
            </div>

          </div>
        </section>

        {/* ═══════ TRENDING ═══════ */}
        <section className="animate-fade-up" style={{ '--fade-delay': '100ms' }}>
          <div className="flex items-center justify-between px-1 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-base">🔥</span>
              <h2 className="text-[0.82rem] font-extrabold text-white/70">Trending Now</h2>
            </div>
            <button
              type="button"
              onClick={() => go('gk')}
              className="inline-flex items-center gap-1 text-[0.68rem] font-semibold text-violet-400/70 hover:text-violet-300 transition-colors duration-200"
            >
              All <ChevronRight size={12} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {HOT_PICKS.map(({ emoji, title, sub, cat, tag, gradient, glow, hoverGlow }) => (
              <button
                key={title}
                type="button"
                onClick={() => go(cat)}
                aria-label={`Play ${title} quiz`}
                className={`home-shine group relative overflow-hidden rounded-[22px] bg-gradient-to-br ${gradient} text-left transition-all duration-300 hover:-translate-y-1.5 active:translate-y-0`}
                style={{ boxShadow: `0 10px 36px ${glow}` }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 16px 52px ${hoverGlow}`; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 10px 36px ${glow}`; }}
              >
                {/* Glass overlay */}
                <div className="relative rounded-[22px] bg-gradient-to-b from-black/[0.05] via-black/[0.15] to-black/[0.35] p-4">
                  {/* Top shine orb */}
                  <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-white/[0.1] blur-2xl" />
                  <div className="pointer-events-none absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-black/20 blur-2xl" />

                  {/* Tag */}
                  <div className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-sm px-2 py-[3px] text-[0.48rem] font-black tracking-[0.12em] text-white/90 uppercase mb-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-pulse" />
                    {tag}
                  </div>

                  {/* Emoji */}
                  <div className="text-[2.4rem] leading-none mb-3 drop-shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">{emoji}</div>

                  {/* Title */}
                  <div className="text-[0.95rem] font-black leading-tight drop-shadow-sm">{title}</div>
                  <div className="text-[0.6rem] text-white/50 mt-1">{sub}</div>

                  {/* Play CTA */}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[0.62rem] font-bold text-white/50 group-hover:text-white/70 transition-colors">Play now</span>
                    <div className="h-7 w-7 rounded-full bg-white/20 backdrop-blur-sm grid place-items-center transition-all duration-200 group-hover:bg-white/30 group-hover:scale-110">
                      <Play size={11} className="text-white ml-0.5" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ═══════ GUEST CTA ═══════ */}
        {!user && (
          <section
            className="animate-fade-up relative overflow-hidden rounded-[22px] border border-emerald-400/15 bg-gradient-to-br from-emerald-500/10 via-teal-500/[0.06] to-transparent p-5"
            style={{ '--fade-delay': '200ms' }}
          >
            <div className="pointer-events-none absolute -right-12 -bottom-12 h-32 w-32 rounded-full bg-emerald-500/10 blur-[40px]" />
            <div className="flex items-center gap-2 mb-3">
              <Crown size={16} className="text-emerald-400/80" />
              <div className="text-[0.95rem] font-extrabold">Start Winning Today</div>
            </div>
            <p className="text-[0.75rem] text-white/50 mb-4">Join 50K+ players earning rewards daily. Free to play!</p>
            <Link
              to="/login/"
              className="home-shine inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-sm font-extrabold text-white shadow-[0_8px_28px_rgba(16,185,129,0.25)] transition-all duration-200 hover:shadow-[0_8px_36px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 active:translate-y-0"
            >
              Get Started
              <ChevronRight size={16} />
            </Link>
          </section>
        )}
      </div>

      <StreakModal
        open={modal.open}
        onClose={() => setModal(s => ({ ...s, open: false }))}
        streakDay={modal.day}
        coinsEarned={modal.coins}
      />
    </div>
  );
};

export default Home;