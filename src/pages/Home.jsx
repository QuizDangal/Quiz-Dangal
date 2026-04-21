// Quiz Dangal – Home (premium redesign)
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SeoHead from '@/components/SEO';
import { BUILD_DATE } from '@/constants';
import { useNavigate, Link } from 'react-router-dom';
import {
  ChevronRight,
  Coins,
  Flame,
  User,
} from 'lucide-react';
import { getSupabase, supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { STREAK_CLAIM_DELAY_MS } from '@/constants';
import StreakModal from '@/components/StreakModal';
import { prefetchRoute } from '@/lib/utils';
import { prefetchSlotData } from '@/lib/slots';

/* ─── tiny static data ─── */
const QUICK_ARENAS = [
  {
    id: 'gk',
    title: 'Brain Dangal',
    subtitle: 'GK & Trivia',
    emoji: '🧠',
    bg: 'from-violet-600 to-fuchsia-700',
    ring: 'ring-fuchsia-500/30',
    shadow: 'shadow-[0_10px_40px_rgba(192,38,211,0.25)]'
  },
  {
    id: 'opinion',
    title: 'Opinion Wars',
    subtitle: 'Share views',
    emoji: '💬',
    bg: 'from-emerald-500 to-teal-700',
    ring: 'ring-teal-500/30',
    shadow: 'shadow-[0_10px_40px_rgba(20,184,166,0.25)]'
  },
  {
    id: 'gk',
    title: 'Daily Clash',
    subtitle: 'Current Affairs',
    emoji: '📰',
    bg: 'from-blue-600 to-indigo-800',
    ring: 'ring-indigo-500/30',
    shadow: 'shadow-[0_10px_40px_rgba(79,70,229,0.25)]'
  },
  {
    id: 'gk',
    title: 'Bollywood',
    subtitle: 'Movie Magic',
    emoji: '🎬',
    bg: 'from-rose-500 to-pink-700',
    ring: 'ring-pink-500/30',
    shadow: 'shadow-[0_10px_40px_rgba(236,72,153,0.25)]'
  }
];

const shouldSkipStartupPrefetch = () => {
  if (typeof window === 'undefined') return false;
  try {
    const isCoarse = window.matchMedia?.('(pointer: coarse)').matches;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const saveData = Boolean(connection?.saveData);
    const effectiveType = String(connection?.effectiveType || '').toLowerCase();
    return (
      isCoarse
      || saveData
      || effectiveType === 'slow-2g'
      || effectiveType === '2g'
      || effectiveType === '3g'
    );
  } catch {
    return false;
  }
};

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

  // Warm Supabase in background on Home mount so it's ready when user taps a category
  useEffect(() => {
    if (shouldSkipStartupPrefetch()) return;
    const timeoutId = window.setTimeout(() => {
      getSupabase().catch(() => {});
    }, 1200);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (shouldSkipStartupPrefetch()) return;

    let timeoutId = null;
    let idleId = null;
    let started = false;

    const warmRoutes = () => {
      prefetchRoute('/category/opinion');
      prefetchRoute('/category/gk');
    };

    const startWarmup = () => {
      if (started) return;
      started = true;
      if (typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(warmRoutes, { timeout: 2200 });
      } else {
        timeoutId = window.setTimeout(warmRoutes, 900);
      }
    };

    window.addEventListener('pointerdown', startWarmup, { once: true, passive: true });
    window.addEventListener('touchstart', startWarmup, { once: true, passive: true });
    window.addEventListener('keydown', startWarmup, { once: true });

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      if (idleId && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
      window.removeEventListener('pointerdown', startWarmup);
      window.removeEventListener('touchstart', startWarmup);
      window.removeEventListener('keydown', startWarmup);
    };
  }, []);

  const go = useCallback((id) => {
    prefetchSlotData(id);
    navigate(`/category/${id}/`);
  }, [navigate]);

  const warmCategory = useCallback((id) => {
    prefetchRoute(`/category/${id}`);
    prefetchSlotData(id);
  }, []);

  return (
    <div className="mx-auto w-full max-w-[520px] px-0 pb-[calc(var(--qd-footer-h)+24px)] sm:px-4 md:max-w-[780px] md:px-8 lg:max-w-[860px] lg:px-12 xl:max-w-[920px] xl:px-16">
      <SeoHead
        title="Quiz Dangal - Daily Opinion & GK Quiz for IPL Fans"
        description="Play daily opinion polls, IPL season trivia, current affairs, and GK quizzes on Quiz Dangal. Win coins, climb leaderboards, and join fresh live rounds every day."
        canonical="https://quizdangal.com/"
        datePublished="2025-01-15"
        dateModified={BUILD_DATE}
        jsonLd={[
          { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Quiz Dangal', url: 'https://quizdangal.com/' },
          {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Quiz Dangal',
            operatingSystem: 'Web, Android, iOS',
            applicationCategory: 'GameApplication',
            applicationSubCategory: 'Trivia',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
            aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.7', ratingCount: '1240', bestRating: '5', worstRating: '1' },
            description: 'Play daily opinion polls, GK quizzes, and current affairs rounds. Earn coins, climb leaderboards, and compete with players across India — 100% free.',
            url: 'https://quizdangal.com/',
            image: 'https://quizdangal.com/android-chrome-512x512.png',
            author: { '@type': 'Organization', name: 'Quiz Dangal', url: 'https://quizdangal.com/' },
            inLanguage: ['en', 'hi'],
          },
        ]}
      />

      {/* ═══════ FLOATING HEADER ═══════ */}
      <header className="sticky top-0 z-50 mx-0 mt-0 mb-5 px-4 py-3.5 sm:top-3 sm:mx-2 sm:mt-3 sm:mb-6 sm:px-4 sm:py-3 rounded-none sm:rounded-xl bg-[#090412]/85 backdrop-blur-xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2.5 no-underline group shrink-0">
            <img
              src="/logo-48.png"
              alt="Quiz Dangal"
              width={44}
              height={44}
              fetchPriority="high"
              className="h-11 w-11 sm:h-10 sm:w-10 rounded-[12px] transition-transform duration-300 group-hover:scale-[1.05]"
            />
            <div className="text-[1.35rem] sm:text-[1.35rem] md:text-[1.55rem] font-black tracking-tight bg-gradient-to-r from-violet-200 via-fuchsia-200 to-amber-200 bg-clip-text text-transparent">
              Quiz Dangal
            </div>
          </Link>

          {user ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setModal({ open: true, day: streak, coins: nextStreakReward })}
                className="home-shine flex items-center gap-1.5 rounded-full px-3.5 py-2 sm:px-3.5 sm:py-2 text-sm sm:text-sm md:text-base font-extrabold border border-orange-500/30 bg-gradient-to-br from-orange-600 to-red-700 shadow-[0_4px_15px_rgba(249,115,22,0.3)] transition-all hover:scale-[1.05] active:scale-95"
                aria-label="Open streak rewards"
              >
                <Flame size={14} className="text-amber-200" />
                <span className="text-white drop-shadow-md">{streak}</span>
              </button>
              <Link
                to="/wallet/"
                className="home-shine flex items-center gap-1.5 rounded-full px-3.5 py-2 sm:px-3.5 sm:py-2 text-sm sm:text-sm md:text-base font-extrabold border border-violet-400/30 bg-gradient-to-br from-indigo-600 to-purple-700 shadow-[0_4px_15px_rgba(139,92,246,0.3)] transition-all hover:scale-[1.05] active:scale-95"
                aria-label="Open wallet"
              >
                <Coins size={14} className="text-yellow-300" />
                <span className="text-white drop-shadow-md">{coins.toLocaleString()}</span>
              </Link>
            </div>
          ) : (
            <Link
              to="/login/"
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 sm:px-5 sm:py-2.5 text-sm sm:text-sm md:text-base font-bold border border-violet-500/50 bg-violet-600/20 hover:bg-violet-600/40 text-violet-100 transition-all shadow-[0_0_15px_rgba(139,92,246,0.2)] shrink-0"
            >
              <User size={14} className="text-violet-300" />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </header>

      <div className="pt-2 space-y-7 px-0">

        {/* ═══════ HERO BATTLE ═══════ */}
        <section className="animate-fade-up px-0" style={{ '--fade-delay': '0ms' }}>

          <div className="mb-4 px-4 sm:px-0">
            <h1 className="flex items-center gap-2 text-[1.55rem] sm:text-[1.8rem] font-black tracking-tight">
              <span className="text-white">Hey!</span>
              <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent">
                {user ? displayName : 'Player'}
              </span>
            </h1>
          </div>

          <button
            type="button"
            onClick={() => go('opinion')}
            onPointerEnter={() => warmCategory('opinion')}
            className="group relative block w-full overflow-hidden rounded-[36px] bg-[#030008] text-center border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_30px_60px_rgba(249,115,22,0.5)] hover:border-orange-500/50"
          >
            {/* Deep Explosive Background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.3)_0%,transparent_60%)] group-hover:bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.5)_0%,transparent_70%)] transition-colors duration-700" />
            <div className="absolute inset-0 opacity-[0.08] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#030008] to-transparent" />

            {/* Enhanced Background Image with Higher Exposure */}
            <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1614294148960-9aa740632a87?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80')] bg-cover bg-center group-hover:opacity-30 transition-opacity duration-500" />

            {/* Massive Background Emoji with More Intensity */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[16rem] sm:text-[20rem] md:text-[28rem] opacity-15 blur-md transition-all duration-700 group-hover:scale-110 group-hover:blur-[2px] group-hover:opacity-25 pointer-events-none">
              🏏
            </div>

            {/* Additional Animated Elements for Chaos */}
            <div className="absolute left-[-10%] top-[-10%] h-[120%] w-[120%] bg-[radial-gradient(circle_at_center,rgba(255,0,0,0.2)_0%,transparent_50%)] animate-[spin_10s_linear_infinite]" />
            <div className="absolute right-[-10%] bottom-[-10%] h-[120%] w-[120%] bg-[radial-gradient(circle_at_center,rgba(255,165,0,0.2)_0%,transparent_50%)] animate-[spin_8s_linear_infinite_reverse]" />

            {/* Center Aligned Content */}
            <div className="relative z-10 flex min-h-[300px] sm:min-h-[360px] md:min-h-[440px] flex-col items-center justify-center px-4 py-10 sm:px-8">
              
              {/* Center Live Badge with More Intensity */}
              <div className="mb-4 sm:mb-6 inline-flex items-center gap-2 rounded-full border border-red-500/50 bg-red-500/20 px-4 py-2 text-[0.65rem] sm:text-[0.7rem] font-black uppercase tracking-[0.25em] text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-[pulse_2s_ease-in-out_infinite] group-hover:shadow-[0_0_20px_rgba(239,68,68,0.8)] transition-all duration-300">
                <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-[blink_1.5s_ease-in-out_infinite]" />
                LIVE ARENA
                <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-[blink_1.5s_ease-in-out_infinite]" />
              </div>

              {/* IPL Dangal Title with Explosive Effects */}
              <div className="mb-2 sm:mb-3 text-center text-[2.2rem] sm:text-[3rem] md:text-[4.2rem] font-black leading-[1.1] tracking-tight text-orange-500 drop-shadow-[0_8px_16px_rgba(249,115,22,0.7)] animate-[titlePulse_3s_ease-in-out_infinite]">
                IPL DANGAL
              </div>

              {/* Emoji Overload with Animation */}
              <div className="mt-4 sm:mt-6 flex flex-wrap justify-center gap-3 sm:gap-4 text-[1.5rem] sm:text-[2rem] animate-[bounce_2s_ease-in-out_infinite]">
                <span className="animate-[spin_5s_linear_infinite]">🔥</span>
                <span className="animate-[spin_6s_linear_infinite_reverse]">⚡</span>
                <span className="animate-[spin_4s_linear_infinite]">💥</span>
                <span className="animate-[spin_7s_linear_infinite_reverse]">🏆</span>
                <span className="animate-[spin_5.5s_linear_infinite]">🛡️</span>
              </div>

              {/* CTA Button with Explosive Animation */}
              <div className="mt-6 sm:mt-8 px-6 py-3 sm:px-8 sm:py-4 rounded-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-sm sm:text-base uppercase tracking-wider shadow-[0_10px_30px_rgba(249,115,22,0.5)] transition-all duration-300 hover:shadow-[0_15px_40px_rgba(249,115,22,0.8)] hover:scale-105 animate-[buttonPulse_3.5s_ease-in-out_infinite] group-hover:bg-gradient-to-r group-hover:from-red-600 group-hover:to-orange-500">
                ENTER BATTLE ROYALE
              </div>
            </div>
          </button>
        </section>

        {/* ═══════ QUICK ARENAS (Premium Refined 2x2 Grid) ═══════ */}
        <section className="animate-fade-up px-0" style={{ '--fade-delay': '100ms' }}>
          <div className="flex items-center mb-4 px-4 sm:px-0">
            <h2 className="text-[1rem] sm:text-[0.95rem] font-black text-white/90 tracking-widest uppercase">Quick Arenas</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 px-4 sm:px-0">
            {QUICK_ARENAS.map(({ id, emoji, title, subtitle, bg, ring, shadow }) => (
              <button
                key={title}
                type="button"
                onClick={() => go(id)}
                onPointerEnter={() => warmCategory(id)}
                className={`group relative overflow-hidden rounded-[24px] p-4 sm:p-5 text-left transition-all duration-300 hover:-translate-y-1 active:translate-y-0 bg-gradient-to-br ${bg} ${shadow} ring-1 ring-inset ${ring} min-h-[180px] md:min-h-[200px]`}
              >
                <div className="absolute -right-4 -bottom-4 text-[4.8rem] leading-none opacity-20 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12">{emoji}</div>
                
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.1),transparent_60%)]" />

                <div className="relative z-10 flex flex-col h-full">
                  <div className="h-12 w-12 rounded-[16px] bg-white/20 grid place-items-center backdrop-blur-md mb-3 shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                    <span className="text-[1.2rem] drop-shadow-md">{emoji}</span>
                  </div>
                  <div>
                    <h3 className="text-[1.05rem] font-black text-white leading-tight drop-shadow-md">{title}</h3>
                    <p className="text-[0.65rem] font-bold text-white/75 mt-1 tracking-widest uppercase">{subtitle}</p>
                  </div>

                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <span className="text-[0.65rem] font-black uppercase tracking-widest text-white/85">Play</span>
                    <div className="h-8 w-8 rounded-full bg-white/20 grid place-items-center border border-white/25 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
                      <ChevronRight size={16} className="text-white" strokeWidth={3} />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

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