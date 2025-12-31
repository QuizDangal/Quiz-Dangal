import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';
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
import SeoHead from '@/components/SEO';

export default function Profile() {
  const { signOut } = useAuth();
  const { toast } = useToast();
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

  // Helper: Resolve avatar URL (external URL or signed storage URL)
  const resolveAvatarUrl = useCallback(async (avatarPath) => {
    if (!avatarPath) return '';
    if (avatarPath.includes('://')) return avatarPath;
    
    const { data: signed, error: signedError } = await supabase.storage
      .from('avatars')
      .createSignedUrl(avatarPath, 60 * 60);
    if (signedError) {
      logger.warn('Avatar signed URL creation failed:', signedError);
      return '';
    }
    return signed?.signedUrl || '';
  }, []);

  // Helper: Fetch and process user profile data
  const fetchProfileData = useCallback(async (user) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (error) throw error;
    return data;
  }, []);

  // Helper: Update level/progress state from profile data
  const updateLevelState = useCallback((data) => {
    const coins = Number(data?.total_coins || 0);
    const lvl = calcLevelFromCoins(coins);
    setDerivedLevel(lvl);
    setDerivedNext(computeNextInfo(coins, lvl));
  }, [calcLevelFromCoins, computeNextInfo]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user || null;
      setSessionUser(u);
      
      if (!u) {
        setProfile(null);
        setAvatarUrl('');
        return;
      }
      
      const data = await fetchProfileData(u);
      setProfile(data);
      updateLevelState(data);
      const resolvedUrl = await resolveAvatarUrl(data?.avatar_url);
      setAvatarUrl(resolvedUrl);
    } catch (err) {
      logger.warn('Failed to load profile:', err);
      setProfile(null);
      setAvatarUrl('');
    } finally {
      setLoading(false);
    }
  }, [fetchProfileData, updateLevelState, resolveAvatarUrl]);

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
      toast({ title: 'Avatar updated', description: 'Your profile picture has been changed.', variant: 'default' });
    } catch (err) {
      toast({ title: 'Avatar change failed', description: err?.message || 'Try again later', variant: 'destructive' });
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
  const getLevelGradient = (level) => {
    if (level >= 80) return 'from-violet-500 via-fuchsia-500 to-pink-500';
    if (level >= 50) return 'from-amber-400 via-orange-500 to-red-500';
    if (level >= 20) return 'from-cyan-400 via-blue-500 to-indigo-500';
    return 'from-emerald-400 via-teal-500 to-cyan-500';
  };
  const levelGradient = getLevelGradient(derivedLevel);

  return (
    <div className="relative overflow-x-hidden">
      <SeoHead
        title="Your Quiz Dangal Profile"
        description="View and manage your Quiz Dangal profile details, quiz preferences, and account settings."
        canonical="https://quizdangal.com/profile/"
        robots="noindex, nofollow"
        author="Quiz Dangal"
        datePublished="2025-01-01"
      />

      <div className="mx-auto w-full max-w-lg lg:max-w-xl px-4 pt-14 lg:pt-20 pb-12 space-y-3 lg:space-y-4">
        
        {/* Profile Hero Card */}
        <section className="relative overflow-hidden rounded-3xl lg:rounded-2xl bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 border border-white/10 shadow-2xl">
          {/* Animated Glow Background */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden" aria-hidden>
            <div className={`absolute -top-20 -left-20 w-40 h-40 rounded-full bg-gradient-to-br ${levelGradient} opacity-25 blur-3xl`} />
            <div className="absolute -bottom-20 -right-20 w-48 h-48 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 opacity-20 blur-3xl" />
          </div>
          
          {/* Shimmer Line */}
          <div className={`absolute top-0 left-0 right-0 h-[2px] lg:h-[1px] bg-gradient-to-r ${levelGradient}`} />

          <div className="relative p-4 lg:p-3">
            {/* Avatar + Info Row */}
            <div className="flex items-start gap-3 lg:gap-2">
              {/* Avatar Container */}
              <div className="relative shrink-0">
                {/* Outer Glow Ring */}
                <div className={`absolute -inset-1 rounded-full bg-gradient-to-tr ${levelGradient} blur-sm opacity-60 lg:opacity-40`} />
                
                {/* Avatar */}
                <div className="relative w-20 h-20 lg:w-16 lg:h-16 rounded-full overflow-hidden ring-[3px] lg:ring-2 ring-white/20 ring-offset-2 lg:ring-offset-1 ring-offset-slate-900 shadow-2xl lg:shadow-lg">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="User profile avatar"
                      title={(profile?.full_name || profile?.username) ? `${profile.full_name || profile.username}'s avatar` : 'User avatar'}
                      className="w-full h-full object-cover"
                      width={80}
                      height={80}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${levelGradient} flex items-center justify-center`}>
                      <span className="text-2xl lg:text-xl font-bold text-white">{(profile?.full_name || sessionUser?.email || 'U').charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                </div>

                {/* Camera Button */}
                <button
                  type="button"
                  onClick={onChooseAvatar}
                  disabled={uploading}
                  className="absolute -bottom-0.5 -right-0.5 p-1.5 lg:p-1 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-slate-900 shadow-lg text-white hover:scale-110 transition disabled:opacity-60"
                  title={uploading ? 'Uploading...' : 'Change avatar'}
                  aria-label={uploading ? 'Uploading avatar' : 'Change avatar'}
                >
                  <Camera className="w-3.5 h-3.5 lg:w-3 lg:h-3" aria-hidden="true" />
                </button>
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={onAvatarSelected}
                  id="avatar-upload"
                  aria-label="Upload avatar image"
                />
                
                {/* Level Badge */}
                <div className={`absolute -top-1 -left-1 px-2 lg:px-1.5 py-0.5 rounded-full bg-gradient-to-r ${levelGradient} shadow-lg`}>
                  <span className="text-[10px] lg:text-[9px] font-bold text-white">{derivedLevel}</span>
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 lg:gap-1.5">
                  <h2 className="text-lg lg:text-base font-bold text-white truncate">{usernameLabel}</h2>
                  {derivedLevel >= 50 && <Crown className="w-4 h-4 lg:w-3.5 lg:h-3.5 text-amber-400 shrink-0" />}
                </div>
                <p className="text-xs lg:text-[11px] text-slate-400 truncate mt-0.5">{emailLabel}</p>
              </div>
            </div>

            {/* Edit Profile Button - Below Avatar */}
            <button
              type="button"
              onClick={() => setEditingProfile(true)}
              className="mt-3 lg:mt-2 inline-flex items-center gap-1.5 px-4 lg:px-3 py-1.5 lg:py-1 rounded-full text-[11px] lg:text-[10px] font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/20 hover:scale-105 transition"
              aria-label="Edit your profile"
            >
              <svg className="w-3 h-3 lg:w-2.5 lg:h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              Edit Profile
            </button>

            {/* Level Progress - Clickable */}
            <button
              type="button"
              onClick={() => setShowLevelInfo(!showLevelInfo)}
              className="mt-3 lg:mt-2 w-full p-2.5 lg:p-2 rounded-xl lg:rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition text-left"
              aria-label={showLevelInfo ? 'Hide level info' : 'Show level info'}
              aria-expanded={showLevelInfo}
            >
              <div className="flex items-center gap-1.5 mb-1.5 lg:mb-1">
                <Zap className="w-3.5 h-3.5 lg:w-3 lg:h-3 text-yellow-400" aria-hidden="true" />
                <span className="text-xs lg:text-[11px] font-semibold text-white">Level {derivedLevel}</span>
              </div>
              <div className="relative h-2 lg:h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${levelGradient} shadow-[0_0_12px_rgba(139,92,246,0.5)] transition-all duration-700`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              
              {/* Coin Info Popup */}
              {showLevelInfo && (
                <div className="mt-2 p-2.5 lg:p-2 rounded-lg bg-slate-800/90 border border-white/10 text-[11px] lg:text-[10px]">
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
        <section className="grid grid-cols-2 gap-3 lg:gap-2">
          {/* Wallet Button */}
          <Link
            to="/wallet"
            className="relative flex items-center gap-3 lg:gap-2 p-3 lg:p-2.5 rounded-xl lg:rounded-lg overflow-hidden group"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(20, 184, 166, 0.15) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <div className="w-9 h-9 lg:w-8 lg:h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 grid place-items-center shadow-md flex-shrink-0">
              <Coins className="w-4.5 h-4.5 lg:w-4 lg:h-4 text-white" aria-hidden="true" />
            </div>
            <p className="flex-1 text-sm lg:text-xs font-bold text-white">Wallet</p>
          </Link>
          
          {/* Refer & Earn Button */}
          <Link
            to="/refer"
            className="relative flex items-center gap-3 lg:gap-2 p-3 lg:p-2.5 rounded-xl lg:rounded-lg overflow-hidden group"
            style={{
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(168, 85, 247, 0.15) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
            }}
          >
            <div className="w-9 h-9 lg:w-8 lg:h-8 rounded-lg bg-gradient-to-br from-pink-400 to-violet-500 grid place-items-center shadow-md flex-shrink-0">
              <Share2 className="w-4.5 h-4.5 lg:w-4 lg:h-4 text-white" aria-hidden="true" />
            </div>
            <p className="flex-1 text-sm lg:text-xs font-bold text-white">Refer & Earn</p>
          </Link>
        </section>

        {/* Settings Menu */}
        <section className="rounded-2xl lg:rounded-xl bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 border border-white/10 overflow-hidden">
          <div className="px-4 lg:px-3 py-3 lg:py-2 border-b border-white/5">
            <p className="text-sm lg:text-xs font-semibold text-slate-200">Settings & Info</p>
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
              className="group flex items-center justify-between px-4 lg:px-3 py-3 lg:py-2 hover:bg-white/5 transition"
            >
              <div className="flex items-center gap-3 lg:gap-2">
                <span className={`w-8 h-8 lg:w-7 lg:h-7 rounded-xl lg:rounded-lg bg-gradient-to-br ${item.color} grid place-items-center shadow group-hover:scale-105 transition`}>
                  <item.icon className="w-4 h-4 lg:w-3.5 lg:h-3.5 text-white" />
                </span>
                <span className="text-sm lg:text-xs font-medium text-white">{item.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 lg:w-3.5 lg:h-3.5 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition" />
            </Link>
          ))}
          
          {/* Logout inside menu */}
          <div className="px-4 lg:px-3 py-3 lg:py-2 border-t border-white/5">
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 lg:gap-1.5 px-3 lg:px-2.5 py-1.5 lg:py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 transition text-xs lg:text-[11px] text-rose-300 font-semibold"
              aria-label="Log out of your account"
            >
              <LogOut className="w-3.5 h-3.5 lg:w-3 lg:h-3" aria-hidden="true" />
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
