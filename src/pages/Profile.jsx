import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  Loader2,
  Crown,
  Camera,
  LogOut,
  ChevronRight,
  Info,
  Mail,
  FileText,
  Shield,
  Share2,
  Zap,
  Coins,
} from 'lucide-react';
import ProfileUpdateModal from '@/components/ProfileUpdateModal';
import SEO from '@/components/SEO';

export default function Profile() {
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showLevelInfo, setShowLevelInfo] = useState(false);
  const [derivedLevel, setDerivedLevel] = useState(0);
  const [derivedNext, setDerivedNext] = useState({
    nextLevel: 1,
    nextReq: 50,
    have: 0,
    remaining: 50,
    currReq: 0,
  });

  // Local thresholds (1..100) -> coins required (cumulative)
  const LEVEL_THRESHOLDS = useMemo(
    () => [
      0, // level 0 baseline (not displayed)
      50,
      200,
      450,
      800,
      1250,
      1800,
      2450,
      3200,
      4050,
      5000,
      6050,
      7200,
      8450,
      9800,
      11250,
      12800,
      14450,
      16200,
      18050,
      20000,
      22050,
      24200,
      26450,
      28800,
      31250,
      33800,
      36450,
      39200,
      42050,
      45000,
      48050,
      51200,
      54450,
      57800,
      61250,
      64800,
      68450,
      72200,
      76050,
      80000,
      84050,
      88200,
      92450,
      96800,
      101250,
      105800,
      110450,
      115200,
      120050,
      125000,
      130050,
      135200,
      140450,
      145800,
      151250,
      156800,
      162450,
      168200,
      174050,
      180000,
      186050,
      192200,
      198450,
      204800,
      211250,
      217800,
      224450,
      231200,
      238050,
      245000,
      252050,
      259200,
      266450,
      273800,
      281250,
      288800,
      296450,
      304200,
      312050,
      320000,
      328050,
      336200,
      344450,
      352800,
      361250,
      369800,
      378450,
      387200,
      396050,
      405000,
      414050,
      423200,
      432450,
      441800,
      451250,
      460800,
      470450,
      480200,
      490050,
      500000,
    ],
    [],
  );

  const calcLevelFromCoins = useCallback(
    (coins) => {
      const c = Number(coins || 0);
      let lvl = 0;
      for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
        if (c >= LEVEL_THRESHOLDS[i]) lvl = i;
        else break;
      }
      return lvl;
    },
    [LEVEL_THRESHOLDS],
  );

  const computeNextInfo = useCallback(
    (coins, currLvl) => {
      const have = Number(coins || 0);
      const curr = Math.max(0, Number(currLvl || 0));
      const maxLvl = 100;
      const nextLvl = Math.min(maxLvl, curr + 1);
      const currReq = LEVEL_THRESHOLDS[curr] || 0;
      const nextReq = LEVEL_THRESHOLDS[nextLvl] || LEVEL_THRESHOLDS[maxLvl];
      const remaining = Math.max(0, (nextReq || 0) - have);
      return { nextLevel: nextLvl, nextReq, have, remaining, currReq };
    },
    [LEVEL_THRESHOLDS],
  );
  // Refer & Earn now opens as full page (/refer)
  // Language modal removed
  const fileInputRef = useRef(null);
  // Push notification subscription options not used on this simplified profile page now
  // const { isSubscribed, subscribeToPush, unsubscribeFromPush, error: pushError } = usePushNotifications();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const u = session?.user || null;
      setSessionUser(u);
      if (u) {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', u.id).single();
        if (error) throw error;
        setProfile(data);
        // Derive level/progress locally (works even if DB migration not applied yet)
        const coins = Number(data?.total_coins || 0);
        const lvl = calcLevelFromCoins(coins);
        setDerivedLevel(lvl);
        setDerivedNext(computeNextInfo(coins, lvl));
        if (data?.avatar_url) {
          if (data.avatar_url.includes('://')) {
            setAvatarUrl(data.avatar_url);
          } else {
            const { data: signed, error: signedError } = await supabase.storage
              .from('avatars')
              .createSignedUrl(data.avatar_url, 60 * 60);
            if (signedError) {
              console.warn('Avatar signed URL creation failed:', signedError);
              setAvatarUrl('');
            } else {
              setAvatarUrl(signed?.signedUrl || '');
            }
          }
        } else {
          setAvatarUrl('');
        }
      } else {
        setProfile(null);
        setAvatarUrl('');
      }
    } catch (e) {
      setProfile(null);
      setAvatarUrl('');
    } finally {
      setLoading(false);
    }
  }, [calcLevelFromCoins, computeNextInfo]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSignOut = async () => {
    await signOut();
  };

  const onChooseAvatar = () => fileInputRef.current?.click();
  const onAvatarSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !sessionUser) return;
    setUploading(true);
    try {
      const path = `${sessionUser.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { error: updErr } = await supabase
        .from('profiles')
        .update({ avatar_url: path })
        .eq('id', sessionUser.id);
      if (updErr) throw updErr;
      const { data: signed, error: signedError } = await supabase.storage
        .from('avatars')
        .createSignedUrl(path, 60 * 60);
      if (!signedError) {
        setAvatarUrl(signed?.signedUrl || '');
      }
      await load();
      alert('Avatar updated');
    } catch (err) {
      alert(`Avatar change failed: ${err?.message || 'Try again later'}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getLevelProgress = (totalCoins, level) => {
    const have = Number(totalCoins || 0);
    const curr = Math.max(0, Number(level || 0));
    if (curr >= 100) return 100;
    const { nextReq, currReq } = derivedNext;
    if (!nextReq || nextReq <= currReq) return 0;
    const span = nextReq - currReq;
    const pos = Math.max(0, Math.min(span, have - currReq));
    return Math.round((pos / span) * 100);
  };
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-300" />
      </div>
    );
  }

  if (!sessionUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <div className="w-12 h-12 rounded-full bg-indigo-800/40 text-indigo-300 flex items-center justify-center mb-3 border border-indigo-700/60">
          <Crown className="w-6 h-6" />
        </div>
        <p className="text-lg text-slate-200">
          You are not logged in or session expired.
          <br />
          Please{' '}
          <Link to="/login" className="text-indigo-300 underline">
            login
          </Link>{' '}
          to view your profile.
        </p>
      </div>
    );
  }

  const usernameLabel = profile?.username ? `@${profile.username}` : 'Username not set';
  const emailLabel = profile?.email || sessionUser.email;
  const totalCoins = Number(profile?.total_coins ?? 0);
  const progressPct = getLevelProgress(totalCoins, derivedLevel);

  // Gradient colors for level ring animation
  const levelGradient = derivedLevel >= 80
    ? 'from-violet-500 via-fuchsia-500 to-pink-500'
    : derivedLevel >= 50
      ? 'from-amber-400 via-orange-500 to-red-500'
      : derivedLevel >= 20
        ? 'from-cyan-400 via-blue-500 to-indigo-500'
        : 'from-emerald-400 via-teal-500 to-cyan-500';

  return (
    <div className="relative overflow-x-hidden">
      <SEO
        title="Your Quiz Dangal Profile"
        description="View and manage your Quiz Dangal profile details, quiz preferences, and account settings."
        canonical="https://quizdangal.com/profile/"
        robots="noindex, nofollow"
      />

      <div className="mx-auto w-full max-w-lg px-4 pt-14 pb-12 space-y-3">
        
        {/* Profile Hero Card */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 border border-white/10 shadow-2xl">
          {/* Animated Glow Background */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div className={`absolute -top-20 -left-20 w-40 h-40 rounded-full bg-gradient-to-br ${levelGradient} opacity-25 blur-3xl`} />
            <div className="absolute -bottom-20 -right-20 w-48 h-48 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 opacity-20 blur-3xl" />
          </div>
          
          {/* Shimmer Line */}
          <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${levelGradient}`} />

          <div className="relative p-4">
            {/* Avatar + Info Row */}
            <div className="flex items-start gap-3">
              {/* Avatar Container */}
              <div className="relative shrink-0">
                {/* Outer Glow Ring */}
                <div className={`absolute -inset-1 rounded-full bg-gradient-to-tr ${levelGradient} blur-sm opacity-60`} />
                
                {/* Avatar */}
                <div className="relative w-20 h-20 rounded-full overflow-hidden ring-[3px] ring-white/20 ring-offset-2 ring-offset-slate-900 shadow-2xl">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={profile?.full_name || profile?.username ? `${profile.full_name || profile.username} avatar` : 'User avatar'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${levelGradient} flex items-center justify-center`}>
                      <span className="text-2xl font-bold text-white">{(profile?.full_name || sessionUser?.email || 'U').charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                </div>

                {/* Camera Button */}
                <button
                  onClick={onChooseAvatar}
                  disabled={uploading}
                  className="absolute -bottom-0.5 -right-0.5 p-1.5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-slate-900 shadow-lg text-white hover:scale-110 transition disabled:opacity-60"
                  title={uploading ? 'Uploading...' : 'Change avatar'}
                  aria-label={uploading ? 'Uploading avatar' : 'Change avatar'}
                >
                  <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onAvatarSelected} />
                
                {/* Level Badge */}
                <div className={`absolute -top-1 -left-1 px-2 py-0.5 rounded-full bg-gradient-to-r ${levelGradient} shadow-lg`}>
                  <span className="text-[10px] font-bold text-white">{derivedLevel}</span>
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white truncate">{usernameLabel}</h2>
                  {derivedLevel >= 50 && <Crown className="w-4 h-4 text-amber-400 shrink-0" />}
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5">{emailLabel}</p>
              </div>
            </div>

            {/* Edit Profile Button - Below Avatar */}
            <button
              onClick={() => setEditingProfile(true)}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/20 hover:scale-105 transition"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              Edit Profile
            </button>

            {/* Level Progress - Clickable */}
            <button
              onClick={() => setShowLevelInfo(!showLevelInfo)}
              className="mt-3 w-full p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-left"
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-xs font-semibold text-white">Level {derivedLevel}</span>
              </div>
              <div className="relative h-2 bg-slate-800/80 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${levelGradient} shadow-[0_0_12px_rgba(139,92,246,0.5)] transition-all duration-700`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              
              {/* Coin Info Popup */}
              {showLevelInfo && (
                <div className="mt-2 p-2.5 rounded-lg bg-slate-800/90 border border-white/10 text-[11px]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-400">Current Coins</span>
                    <span className="text-amber-400 font-bold">{totalCoins.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Next Level ({derivedLevel + 1})</span>
                    <span className="text-emerald-400 font-bold">{derivedNext.nextReq.toLocaleString()}</span>
                  </div>
                  <div className="mt-1 pt-1 border-t border-white/10 flex justify-between items-center">
                    <span className="text-slate-400">Need More</span>
                    <span className="text-rose-400 font-bold">{derivedNext.remaining.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </button>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-2 gap-3">
          {/* Wallet Button */}
          <Link
            to="/wallet"
            className="relative flex items-center gap-3 p-3 rounded-xl overflow-hidden group"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(20, 184, 166, 0.15) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 grid place-items-center shadow-md flex-shrink-0">
              <Coins className="w-4.5 h-4.5 text-white" />
            </div>
            <p className="flex-1 text-sm font-bold text-white">Wallet</p>
          </Link>
          
          {/* Refer & Earn Button */}
          <Link
            to="/refer"
            className="relative flex items-center gap-3 p-3 rounded-xl overflow-hidden group"
            style={{
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(168, 85, 247, 0.15) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
            }}
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-pink-400 to-violet-500 grid place-items-center shadow-md flex-shrink-0">
              <Share2 className="w-4.5 h-4.5 text-white" />
            </div>
            <p className="flex-1 text-sm font-bold text-white">Refer & Earn</p>
          </Link>
        </section>

        {/* Settings Menu */}
        <section className="rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 border border-white/10 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-sm font-semibold text-slate-200">Settings & Info</p>
          </div>
          {[
            { label: 'About Us', href: '/about-us', icon: Info, color: 'from-blue-500 to-cyan-500' },
            { label: 'Contact Us', href: '/contact-us', icon: Mail, color: 'from-pink-500 to-rose-500' },
            { label: 'Terms & Conditions', href: '/terms-conditions', icon: FileText, color: 'from-violet-500 to-purple-500' },
            { label: 'Privacy Policy', href: '/privacy-policy', icon: Shield, color: 'from-amber-500 to-orange-500' },
          ].map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="group flex items-center justify-between px-4 py-3 hover:bg-white/5 transition"
            >
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-xl bg-gradient-to-br ${item.color} grid place-items-center shadow group-hover:scale-105 transition`}>
                  <item.icon className="w-4 h-4 text-white" />
                </span>
                <span className="text-sm font-medium text-white">{item.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition" />
            </Link>
          ))}
          
          {/* Logout inside menu */}
          <div className="px-4 py-3 border-t border-white/5">
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 transition text-xs text-rose-300 font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </section>

        <ProfileUpdateModal
          isOpen={editingProfile}
          onClose={() => {
            setEditingProfile(false);
            load();
          }}
          isFirstTime={false}
        />
      </div>
    </div>
  );
}
