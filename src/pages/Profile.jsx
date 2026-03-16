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
  Wallet,
  Gift,
  Globe,
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
  const [showLanguagePopup, setShowLanguagePopup] = useState(false);
  const selectedLanguage = 'en';
  const [derivedLevel, setDerivedLevel] = useState(0);
  const [derivedNext, setDerivedNext] = useState({
    nextLevel: 1,
    nextReq: 50,
    have: 0,
    remaining: 50,
    currReq: 0,
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!showLanguagePopup) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setShowLanguagePopup(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showLanguagePopup]);

  // Local thresholds (1..100) -> coins required (cumulative)
  const LEVEL_THRESHOLDS = useMemo(
    () => [
      0, 50, 200, 450, 800, 1250, 1800, 2450, 3200, 4050, 5000,
      6050, 7200, 8450, 9800, 11250, 12800, 14450, 16200, 18050, 20000,
      22050, 24200, 26450, 28800, 31250, 33800, 36450, 39200, 42050, 45000,
      48050, 51200, 54450, 57800, 61250, 64800, 68450, 72200, 76050, 80000,
      84050, 88200, 92450, 96800, 101250, 105800, 110450, 115200, 120050, 125000,
      130050, 135200, 140450, 145800, 151250, 156800, 162450, 168200, 174050, 180000,
      186050, 192200, 198450, 204800, 211250, 217800, 224450, 231200, 238050, 245000,
      252050, 259200, 266450, 273800, 281250, 288800, 296450, 304200, 312050, 320000,
      328050, 336200, 344450, 352800, 361250, 369800, 378450, 387200, 396050, 405000,
      414050, 423200, 432450, 441800, 451250, 460800, 470450, 480200, 490050, 500000,
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

  const fetchProfileData = useCallback(async (user) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (error) throw error;
    return data;
  }, []);

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
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
        </div>
      </div>
    );
  }

  if (!sessionUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-xs">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center mb-5 mx-auto">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Welcome to Quiz Dangal</h2>
          <p className="text-gray-400 text-xs mb-6">
            Sign in to track your progress and compete with friends
          </p>
          <Link 
            to="/login" 
            className="inline-flex items-center justify-center w-full gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Get Started
          </Link>
        </div>
      </div>
    );
  }

  const usernameLabel = profile?.username ? `@${profile.username}` : 'Username not set';
  const emailLabel = profile?.email || sessionUser.email;
  const totalCoins = Number(profile?.total_coins ?? 0);
  const progressPct = getLevelProgress(totalCoins, derivedLevel);

  return (
    <div className="min-h-[100svh] flex flex-col overflow-y-auto">
      <SeoHead
        title="Your Quiz Dangal Profile"
        description="View and manage your Quiz Dangal profile details, quiz preferences, and account settings."
        canonical="https://quizdangal.com/profile/"
        robots="noindex, nofollow"
        author="Quiz Dangal"
        datePublished="2025-01-01"
      />

      {/* Gradient Header Strip */}
      <div className="h-32 sm:h-36 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-500 flex-shrink-0 relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.05%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30" />
      </div>
      
      <div className="mx-auto w-full max-w-md sm:max-w-lg px-3 sm:px-4 -mt-9 flex-1 pb-20 sm:pb-24">
        
        {/* Profile Card */}
        <section className="rounded-2xl bg-[#1a1229]/90 backdrop-blur-sm p-3 sm:p-4 pt-14 sm:pt-16 text-center relative">
          {/* Avatar - overlapping header */}
          <div className="absolute -top-11 sm:-top-12 left-1/2 -translate-x-1/2">
            <div className="relative inline-block">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden ring-4 ring-[#1a1229] bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-xl shadow-violet-500/30">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile avatar"
                  className="w-full h-full object-cover"
                  width={112}
                  height={112}
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-4xl sm:text-5xl font-bold text-white">
                    {(profile?.full_name || sessionUser?.email || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              </div>
              {/* Camera button */}
              <button
                type="button"
                onClick={onChooseAvatar}
                disabled={uploading}
                className="absolute bottom-1 right-1 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-violet-600 text-white flex items-center justify-center ring-2 ring-[#1a1229] hover:bg-violet-500 transition-colors disabled:opacity-50 shadow-lg"
                aria-label="Change avatar"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
              <input 
                ref={fileInputRef} 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={onAvatarSelected}
              />
            </div>
          </div>
          
          {/* User Info - Clickable */}
          <button
            type="button"
            onClick={() => setEditingProfile(true)}
            className="block w-full mt-3 mb-2 hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <h2 className="text-base sm:text-lg font-semibold text-white">{usernameLabel}</h2>
              {derivedLevel >= 50 && <Crown className="w-4 h-4 text-amber-400" />}
            </div>
            <p className="text-gray-400 text-[11px] sm:text-xs">{emailLabel}</p>
          </button>
          
          {/* Level Progress */}
          <div className="mt-3 px-3 py-2.5 rounded-xl bg-[#1a1229]/90 border border-violet-500/15">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white font-medium">Level {derivedLevel}</span>
              <span className="text-xs text-violet-400 font-semibold">{progressPct}%</span>
            </div>
            <div
              className="h-2 rounded-full bg-white/5 overflow-hidden"
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 transition-all duration-500"
                style={{ width: `${Math.max(2, progressPct)}%` }}
              />
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-2 gap-2 sm:gap-3 mt-3">
          <Link
            to="/wallet"
            className="group flex items-center gap-2.5 px-2.5 sm:px-3 py-2.5 rounded-xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 hover:border-emerald-500/40 transition-all hover:scale-[1.02]"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center shadow-[0_4px_20px_rgba(16,185,129,0.5)] group-hover:shadow-[0_4px_28px_rgba(16,185,129,0.65)] transition-shadow">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-white">Wallet</p>
              <p className="text-[9px] text-emerald-400/80">View Balance</p>
            </div>
          </Link>
          
          <Link
            to="/refer"
            className="group flex items-center gap-2.5 px-2.5 sm:px-3 py-2.5 rounded-xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 hover:border-violet-500/40 transition-all hover:scale-[1.02]"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-400 flex items-center justify-center shadow-[0_4px_20px_rgba(192,38,211,0.5)] group-hover:shadow-[0_4px_28px_rgba(192,38,211,0.65)] transition-shadow">
              <Gift className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-white">Refer</p>
              <p className="text-[9px] text-violet-400/80">Earn Coins</p>
            </div>
          </Link>
        </section>

        {/* Settings & Info */}
        <section className="mt-3 rounded-xl bg-[#1a1229] overflow-hidden">
          <div className="px-3 sm:px-4 py-2 border-b border-gray-800/50">
            <span className="text-sm font-semibold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Settings & Info</span>
          </div>
          
          {/* Menu Items */}
          {[
            { label: 'About Us', href: '/about-us', icon: Info, gradient: 'from-violet-500 to-purple-400', glow: 'shadow-[0_3px_16px_rgba(139,92,246,0.45)]' },
            { label: 'Contact Us', href: '/contact-us', icon: Mail, gradient: 'from-pink-500 to-rose-400', glow: 'shadow-[0_3px_16px_rgba(236,72,153,0.45)]' },
            { label: 'Terms & Conditions', href: '/terms-conditions', icon: FileText, gradient: 'from-amber-500 to-orange-400', glow: 'shadow-[0_3px_16px_rgba(245,158,11,0.45)]' },
            { label: 'Privacy Policy', href: '/privacy-policy', icon: Shield, gradient: 'from-emerald-500 to-green-400', glow: 'shadow-[0_3px_16px_rgba(16,185,129,0.45)]' },
          ].map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="flex items-center justify-between px-3 sm:px-4 py-2.5 hover:bg-white/5 transition-colors border-b border-gray-800/30"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center ${item.glow}`}>
                  <item.icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm text-gray-200">{item.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </Link>
          ))}
          
          {/* Language Option */}
          <button
            type="button"
            onClick={() => setShowLanguagePopup(true)}
            className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 hover:bg-white/5 transition-colors border-b border-gray-800/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-[0_3px_16px_rgba(59,130,246,0.45)]">
                <Globe className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm text-gray-200">Language</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{selectedLanguage === 'en' ? 'English' : 'हिंदी'}</span>
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </div>
          </button>
          
          {/* Sign Out - Small Left Button */}
          <div className="px-3 sm:px-4 py-3 border-t border-gray-800/50">
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-colors group"
            >
              <LogOut className="w-4 h-4 text-red-400 group-hover:text-red-300 transition-colors" />
              <span className="text-sm text-red-400 group-hover:text-red-300 transition-colors">Logout</span>
            </button>
          </div>
        </section>

        {/* Language Selection Popup */}
        {showLanguagePopup && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setShowLanguagePopup(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                setShowLanguagePopup(false);
              }
            }}
          >
            <div
              className="w-80 bg-gradient-to-b from-[#1e1433] to-[#150d22] rounded-3xl overflow-hidden shadow-2xl border border-violet-500/20"
              style={{ animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}
              role="dialog"
              aria-modal="true"
              aria-label="Multi-language coming soon"
            >
              {/* Popup Header */}
              <div className="relative bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 px-5 py-4">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2230%22 height=%2230%22 viewBox=%220 0 30 30%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath d=%22M15 0L30 15L15 30L0 15z%22 fill=%22%23ffffff%22 fill-opacity=%220.05%22/%3E%3C/svg%3E')] opacity-50" />
                <div className="relative flex items-center justify-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base">Multi-Language Support</h3>
                    <p className="text-white/70 text-[10px]">Exciting update ahead!</p>
                  </div>
                </div>
              </div>
              
              {/* Coming Soon Message */}
              <div className="p-5 text-center">
                <div className="text-[2.5rem] mb-2">🌐</div>
                <h4 className="text-white font-bold text-lg mb-3">Coming Soon!</h4>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/25 px-3 py-1.5">
                  <span className="text-[0.65rem] font-bold text-amber-400">🚀 Next version update</span>
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 pb-4">
                <button
                  type="button"
                  onClick={() => setShowLanguagePopup(false)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-violet-500/20"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        )}
        
        <style>{`
          @keyframes popIn {
            0% { opacity: 0; transform: scale(0.8) translateY(20px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }

          @keyframes qd_shimmer {
            0% { transform: translateX(-120%); }
            100% { transform: translateX(120%); }
          }
        `}</style>

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
