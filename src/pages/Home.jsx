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

const HERO_MODES = [
  {
    id: 'opinion',
    icon: '🗳️',
    title: 'Opinion Quiz',
    description: 'Vote on hot topics and win coins.',
    accentClass: 'from-rose-500 via-pink-500 to-fuchsia-600',
    glowClass: 'shadow-[0_24px_60px_rgba(236,72,153,0.24)]',
    buttonLabel: 'Play Now',
  },
  {
    id: 'gk',
    icon: '🧠',
    title: 'GK Quiz',
    description: 'Test your knowledge and earn rewards.',
    accentClass: 'from-indigo-500 via-violet-500 to-cyan-500',
    glowClass: 'shadow-[0_24px_60px_rgba(99,102,241,0.24)]',
    buttonLabel: 'Play Now',
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
        title="Quiz Dangal - Daily Opinion & GK Quiz for IPL Fans"
        description="Play daily opinion polls, IPL season trivia, current affairs, and GK quizzes on Quiz Dangal. Win coins, climb leaderboards, and join fresh live rounds every day."
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
          className="animate-fade-up relative overflow-hidden rounded-[32px] border border-white/10 bg-[#070311] shadow-[0_24px_90px_rgba(12,1,24,0.65)]"
          style={{ '--fade-delay': '0ms' }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.22),transparent_34%),radial-gradient(circle_at_85%_18%,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_12%_90%,rgba(244,63,94,0.18),transparent_24%),linear-gradient(180deg,#12051f_0%,#080412_48%,#07030d_100%)]" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2280%22 height=%2280%22 viewBox=%220 0 80 80%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.04%22%3E%3Ccircle cx=%2240%22 cy=%2240%22 r=%221.5%22/%3E%3Ccircle cx=%220%22 cy=%220%22 r=%221.5%22/%3E%3Ccircle cx=%2280%22 cy=%2280%22 r=%221.5%22/%3E%3Cpath d=%22M0 40h80M40 0v80%22 stroke=%22%23a855f7%22 stroke-opacity=%220.05%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />
          <div className="pointer-events-none absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-violet-500/30 blur-[120px] animate-float" />
          <div className="pointer-events-none absolute -right-12 top-10 h-40 w-40 rounded-full bg-cyan-500/20 blur-[100px] animate-float-slow" />
          <div className="pointer-events-none absolute -left-12 bottom-10 h-40 w-40 rounded-full bg-rose-500/20 blur-[90px] animate-float-delayed" />

          <div className="relative px-5 pb-5 pt-5">
            <div className="pointer-events-none absolute left-6 top-14 h-1.5 w-1.5 rounded-full bg-violet-300/70 animate-ping" />
            <div className="pointer-events-none absolute right-8 top-24 h-2 w-2 rounded-full bg-cyan-300/50 animate-float" />
            <div className="pointer-events-none absolute bottom-28 right-10 h-2 w-2 rounded-full bg-amber-300/50 animate-float-delayed" />

            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.76rem] font-medium text-white/50">
                  {user ? (
                    <>Hey <span className="font-bold text-amber-300">{displayName}</span>{' '}<span className="inline-block" style={{ animation: 'heroWave 1.8s ease-in-out infinite' }}>👋</span></>
                  ) : (
                    <>Welcome to <span className="font-bold text-violet-300">Quiz Dangal</span></>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-[0.58rem] font-extrabold uppercase tracking-[0.22em] text-emerald-300" role="status" aria-label="Quizzes are live now">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Live now
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.045] px-3.5 pb-4 pt-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />
              <div className="absolute -right-10 top-4 h-28 w-28 rounded-full bg-amber-400/15 blur-[50px]" />
              <div className="absolute left-0 top-0 h-24 w-24 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_70%)]" />

              <div className="relative flex items-start justify-between gap-2.5">
                <div className="max-w-[70%]">
                  <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[0.58rem] font-bold text-violet-200 shadow-[0_10px_30px_rgba(139,92,246,0.16)]" style={{ animation: 'heroPillFade 0.55s ease-out 0.1s both' }}>
                    <Crown size={12} className="text-amber-300" />
                    Live quiz drops
                  </div>

                  <h1 className="text-left leading-[1.03]">
                    <span className="block pb-0.5 text-[1.72rem] font-black tracking-[-0.05em] text-white">Play Smart.</span>
                    <span className="mt-0.5 block pb-1 bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400 bg-clip-text text-[1.96rem] font-black tracking-[-0.05em] text-transparent">Earn Big. ✨</span>
                  </h1>

                  <p className="mt-2.5 max-w-[15rem] text-[0.7rem] font-medium leading-[1.35] text-white/68">
                    Choose a quiz, play fast, and win daily rewards.
                  </p>
                </div>

                <div className="relative flex h-[6.1rem] w-[6.1rem] shrink-0 items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_200deg_at_50%_50%,rgba(251,191,36,0.42),rgba(255,255,255,0.12),rgba(34,211,238,0.16),rgba(168,85,247,0.22),rgba(251,191,36,0.42))] opacity-95 shadow-[0_18px_48px_rgba(251,191,36,0.24)]" />
                  <div className="absolute inset-[2px] rounded-full bg-[linear-gradient(180deg,rgba(32,15,52,0.98),rgba(12,7,22,0.98))] shadow-[inset_0_0_28px_rgba(251,191,36,0.08)]" />
                  <div className="absolute inset-[16px] rounded-full bg-[radial-gradient(circle_at_35%_28%,rgba(255,255,255,0.14),transparent_30%),radial-gradient(circle_at_50%_50%,rgba(251,191,36,0.14),transparent_70%)]" />
                  <Crown className="relative h-[3.15rem] w-[3.15rem] text-amber-300 drop-shadow-[0_6px_18px_rgba(251,191,36,0.35)]" strokeWidth={2} style={{ animation: 'float 4s ease-in-out infinite, shimmer-glow 2.5s ease-in-out infinite alternate' }} />
                </div>
              </div>

            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {HERO_MODES.map(({ id, icon, title, description, accentClass, glowClass, buttonLabel }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => go(id)}
                  className={`home-shine group relative overflow-hidden rounded-[24px] border border-white/10 bg-[#0d0818] text-left transition-all duration-300 hover:-translate-y-1.5 active:scale-[0.98] ${glowClass}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${accentClass} opacity-[0.95]`} />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(0,0,0,0.22))]" />
                  <div className="absolute -right-8 top-10 h-20 w-20 rounded-full bg-white/10 blur-2xl transition-transform duration-500 group-hover:scale-125" />

                  <div className="relative flex h-full flex-col px-3.5 pb-3.5 pt-3.5">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex h-14 w-14 items-center justify-center rounded-[1.15rem] border border-white/20 bg-white/20 text-[1.75rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_12px_24px_rgba(0,0,0,0.12)] backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                        <span>{icon}</span>
                      </div>
                    </div>

                    <div className="mt-1 text-[1rem] font-black leading-tight text-white">{title}</div>
                    <p className="mt-2 min-h-[2.25rem] text-[0.64rem] font-medium leading-4 text-white/74">{description}</p>

                    <div className="mt-4 flex items-center justify-between rounded-2xl border border-black/5 bg-white px-3.5 py-2.5 shadow-[0_14px_32px_rgba(255,255,255,0.18)] transition-all duration-200 group-hover:bg-white group-hover:shadow-[0_18px_36px_rgba(255,255,255,0.22)]">
                      <div className="flex items-center gap-1.5">
                        <Play size={11} className="text-slate-900" fill="rgb(15,23,42)" />
                        <span className="text-[0.68rem] font-black uppercase tracking-[0.08em] text-slate-900">{buttonLabel}</span>
                      </div>
                      <ChevronRight size={13} className="text-slate-500 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </button>
              ))}
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