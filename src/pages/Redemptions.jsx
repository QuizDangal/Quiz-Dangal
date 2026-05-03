import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { AnimatePresence, m } from '@/lib/motion-lite';
import { supabase, hasSupabaseConfig } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  Loader2,
  Receipt,
  Gift,
  CheckCircle2,
  Clock,
  XCircle,
  Coins,
  Sparkles,
  PartyPopper,
  Copy,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';
import { callUserRpc } from '@/lib/userRpc';
import SeoHead from '@/components/SEO';

export default function Redemptions() {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState([]);
  const [rewardsLoading, setRewardsLoading] = useState(true);
  const [selectedReward, setSelectedReward] = useState(null);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemStep, setRedeemStep] = useState('confirm'); // confirm | success
  const [redeemSubmitting, setRedeemSubmitting] = useState(false);
  const [payoutIdentifier, setPayoutIdentifier] = useState('');
  const [payoutChannel, setPayoutChannel] = useState('upi');
  const [redeemMode, setRedeemMode] = useState('cash'); // cash | voucher
  const payoutInputRef = React.useRef(null);
  const [_inputFocused, setInputFocused] = useState(false);
  const isMobile =
    typeof window !== 'undefined' &&
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  const [kbOffset, setKbOffset] = useState(0);

  // Track visual viewport to detect keyboard open/close on mobile
  useEffect(() => {
    if (!isMobile || typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      const diff = window.innerHeight - vv.height;
      setKbOffset(diff > 100 ? diff : 0);
    };
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, [isMobile]);
  const [activeTab, setActiveTab] = useState('rewards'); // rewards | history

  // Use backend reward_value exactly as provided (no extra suffix/prefix)
  const getRawRewardValue = useCallback((rw) => {
    if (!rw) return '';
    const v = rw.reward_value ?? '';
    return v === null || v === undefined ? '' : String(v).trim();
  }, []);

  // Display reward value exactly as provided by admin/backend without forcing currency like 'Rs.'
  const formatRewardValue = useCallback((value) => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }, []);

  const loadRedemptions = useCallback(async () => {
    if (!user || !hasSupabaseConfig || !supabase) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('redemptions')
        .select('*')
        .eq('user_id', user.id)
        .order('requested_at', { ascending: false });
      if (error) {
        logger.error('Failed to fetch redemptions history', error);
        setRows([]);
        return;
      }
      setRows(data || []);
    } catch (err) {
      logger.error('Unexpected error while fetching redemptions history', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user || !hasSupabaseConfig || !supabase) {
      setRows([]);
      setLoading(false);
      return;
    }
    const run = async () => {
      await loadRedemptions();
    };
    run();
    // Increased from 15s to 30s for Supabase free tier optimization
    const interval = setInterval(run, 30000);
    return () => {
      clearInterval(interval);
    };
  }, [user, loadRedemptions]);

  // Load available rewards from backend catalog (reward_catalog)
  useEffect(() => {
    async function loadRewards() {
      if (!hasSupabaseConfig || !supabase) {
        setRewards([]);
        setRewardsLoading(false);
        return;
      }
      setRewardsLoading(true);
      try {
        const res2 = await supabase
          .from('reward_catalog')
          .select('*')
          .eq('is_active', true)
          .order('coins_required', { ascending: true })
          .order('id', { ascending: false })
          .limit(100);
        if (res2.error) setRewards([]);
        else setRewards(res2.data || []);
      } catch {
        setRewards([]);
      } finally {
        setRewardsLoading(false);
      }
    }
    loadRewards();
  }, []);

  const walletCoins = useMemo(() => Number(userProfile?.wallet_balance || 0), [userProfile]);

  const filteredRewards = rewards || [];

  // History filters and sorting
  const filteredRows = useMemo(() => {
    return [...(rows || [])].sort((a, b) => {
      const at = a.requested_at ? new Date(a.requested_at).getTime() : 0;
      const bt = b.requested_at ? new Date(b.requested_at).getTime() : 0;
      return bt - at;
    });
  }, [rows]);

  const resolveRewardMode = useCallback((rw) => {
    const raw = String(rw?.reward_type || '')
      .trim()
      .toLowerCase();
    if (!raw) return 'cash';
    if (raw.includes('voucher')) return 'voucher';
    return 'cash';
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const pending = rows.filter((r) => r.status === 'pending').length;
    const approved = rows.filter((r) => r.status === 'approved').length;
    const rejected = rows.filter((r) => r.status === 'rejected').length;
    return { total, pending, approved, rejected };
  }, [rows]);

  const statusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'approved')
      return {
        label: 'Approved',
        className: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
        icon: CheckCircle2,
        rowAccent: 'border-l-2 border-emerald-400/60',
      };
    if (s === 'pending')
      return {
        label: 'Pending',
        className: 'bg-amber-500/15 text-amber-200 border-amber-300/30',
        icon: Clock,
        rowAccent: 'border-l-2 border-amber-400/60',
      };
    if (s === 'rejected')
      return {
        label: 'Rejected',
        className: 'bg-rose-500/15 text-rose-200 border-rose-300/30',
        icon: XCircle,
        rowAccent: 'border-l-2 border-rose-400/60',
      };
    return {
      label: 'Unknown',
      className: 'bg-slate-500/15 text-slate-200 border-slate-300/30',
      icon: Clock,
      rowAccent: 'border-l-2 border-slate-400/50',
    };
  };

  // Note: Redemption action will use admin-configured rewards; no hardcoded catalog here.
  const onRedeemClick = (rw) => {
    const mode = resolveRewardMode(rw);
    setSelectedReward(rw);
    setRedeemMode(mode);
    setRedeemStep('confirm');
    setPayoutIdentifier('');
    setInputFocused(false);
    setPayoutChannel(mode === 'voucher' ? 'phone' : 'upi');
    setRedeemOpen(true);
    setTimeout(() => {
      try {
        payoutInputRef.current?.focus();
      } catch (e) {
        /* ignore focus error */
      }
    }, 100);
  };

  const handleConfirmRedeem = async () => {
    if (!selectedReward || !user) return;
    if (!hasSupabaseConfig || !supabase) {
      toast({
        title: 'Configuration missing',
        description: 'Supabase env vars are not set. Please configure .env.local',
        variant: 'destructive',
      });
      return;
    }
    const requiresWhatsApp = redeemMode === 'voucher';
    const price = Number(
      selectedReward.coins_required ?? selectedReward.coin_cost ?? selectedReward.coins ?? 0,
    );
    const rawIdentifier = payoutIdentifier.trim();
    if ((userProfile?.wallet_balance ?? 0) < price) {
      toast({ title: 'Not enough coins', description: 'Earn more coins to redeem this reward.' });
      return;
    }
    if (!rawIdentifier) {
      toast({
        title: 'Add payout details',
        description: requiresWhatsApp
          ? 'Enter your WhatsApp number.'
          : 'Enter your UPI ID or phone number.',
      });
      return;
    }

    let identifierToSend = rawIdentifier;
    if (requiresWhatsApp || (payoutChannel || 'upi') === 'phone') {
      // User requested: accept any number (keep minimal guard to avoid empty/non-number)
      const digits = rawIdentifier.replace(/\D/g, '');
      if (digits.length < 8 || digits.length > 15) {
        toast({
          title: 'Invalid phone number',
          description: 'Please enter a valid phone number (8-15 digits).',
          variant: 'destructive',
        });
        return;
      }
      // Send digits only to match backend validation (8-15 digits)
      identifierToSend = digits;
    } else {
      // User requested: accept any UPI as long as it contains '@'
      const upi = rawIdentifier;
      if (!upi.includes('@')) {
        toast({
          title: 'Enter a UPI ID',
          description: 'Use format like name@bank.',
          variant: 'destructive',
        });
        return;
      }
    }
    try {
      setRedeemSubmitting(true);
      // Ensure session is fresh before RPC call (prevents 403 from expired JWT)
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        toast({
          title: 'Session expired',
          description: 'Please refresh the page and try again.',
          variant: 'destructive',
        });
        return;
      }
      const channel = requiresWhatsApp ? 'phone' : payoutChannel || 'upi';
      if (requiresWhatsApp && payoutChannel !== 'phone') setPayoutChannel('phone');
      const rpcPayload = {
        p_catalog_id: selectedReward.id,
        p_payout_identifier: identifierToSend,
        p_payout_channel: channel,
      };
      await callUserRpc('redeemFromCatalogWithDetails', rpcPayload);
      setRedeemStep('success');
      toast({
        title: 'Redemption pending',
        description: 'Your request is submitted. Await admin approval.',
      });
      setPayoutIdentifier('');
      await loadRedemptions();
      if (typeof refreshUserProfile === 'function') {
        await refreshUserProfile(user).catch(() => {
          void 0;
        });
      }
    } catch (e) {
      const message = e?.message || 'Please try again later';
      toast({ title: 'Submission failed', description: message, variant: 'destructive' });
    } finally {
      setRedeemSubmitting(false);
    }
  };

  return (
    <>
      <SeoHead
        title="Redemptions – Quiz Dangal"
        description="View and manage your reward redemptions on Quiz Dangal."
        canonical="https://quizdangal.com/redemptions/"
        robots="noindex, nofollow"
        author="Quiz Dangal"
        datePublished="2025-01-15"
      />
      <div className="relative min-h-screen mx-auto max-w-5xl px-4 py-4">
        {/* Dev guard: if Supabase is not configured, show a helpful message */}
        {!hasSupabaseConfig && (
          <div className="mb-4 rounded-xl border border-amber-300/30 bg-amber-500/10 p-3 text-amber-100 text-sm">
            Supabase configuration missing. Create a .env.local file with VITE_SUPABASE_URL and
            VITE_SUPABASE_ANON_KEY to enable redemptions and history.
          </div>
        )}

        {/* Available Rewards Section - Always visible at top */}
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          {/* Header */}
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 shadow-lg shadow-fuchsia-500/25">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-violet-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">
              Redeem Rewards
            </h1>
          </div>

          {/* Tabs */}
          <div className="mb-5 flex items-center gap-2 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            {[
              { key: 'rewards', label: 'Rewards', icon: Gift },
              { key: 'history', label: 'History', icon: Receipt },
            ].map((tab) => (
              <button
                type="button"
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-violet-500/20 via-fuchsia-500/15 to-pink-500/20 text-white shadow-lg shadow-fuchsia-500/10 border border-fuchsia-400/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'rewards' && (
            <>
              {/* Rewards Grid */}
              {rewardsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="rounded-2xl bg-slate-800/50 border border-white/5 p-4 animate-pulse"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-700/50" />
                        <div className="flex-1">
                          <div className="h-4 rounded bg-slate-700/50 w-2/3 mb-2" />
                          <div className="h-3 rounded bg-slate-700/50 w-1/3" />
                        </div>
                      </div>
                      <div className="h-10 rounded-xl bg-slate-700/50" />
                    </div>
                  ))}
                </div>
              ) : (filteredRewards?.length || 0) === 0 ? (
                <div className="text-center py-12 rounded-2xl bg-slate-800/30 border border-white/5">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-700/50 grid place-items-center mb-3">
                    <Gift className="w-7 h-7 text-slate-500" />
                  </div>
                  <p className="text-slate-400 font-medium">No rewards available</p>
                  <p className="text-slate-500 text-sm mt-1">Check back soon!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredRewards.map((rw, idx) => {
                    const price = Number(rw.coins_required ?? 0);
                    const rewardValue = getRawRewardValue(rw);
                    const displayValue = formatRewardValue(rewardValue);
                    const affordable = walletCoins >= price;
                    const pct =
                      price > 0 ? Math.min(100, Math.round((walletCoins / price) * 100)) : 100;
                    const rewardType = String(rw.reward_type || '').toLowerCase();
                    const isVoucher = rewardType.includes('voucher');
                    const cardColors = [
                      {
                        border: 'from-violet-500 via-fuchsia-500 to-pink-500',
                        btnBg: 'from-violet-500 to-fuchsia-500',
                      },
                      {
                        border: 'from-cyan-400 via-blue-500 to-indigo-500',
                        btnBg: 'from-cyan-500 to-blue-500',
                      },
                      {
                        border: 'from-emerald-400 via-teal-500 to-cyan-500',
                        btnBg: 'from-emerald-500 to-teal-500',
                      },
                      {
                        border: 'from-amber-400 via-orange-500 to-rose-500',
                        btnBg: 'from-amber-500 to-orange-500',
                      },
                    ];
                    const cc = cardColors[idx % cardColors.length];

                    return (
                      <m.div
                        key={rw.id}
                        className="group"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          delay: idx * 0.05,
                          type: 'spring',
                          stiffness: 150,
                          damping: 18,
                        }}
                      >
                        <div
                          className={`relative h-full rounded-2xl p-[1.5px] transition-all duration-200 ${
                            affordable
                              ? `bg-gradient-to-br ${cc.border} shadow-lg`
                              : 'bg-gradient-to-br from-slate-600/30 to-slate-700/30'
                          }`}
                        >
                          <div className="h-full rounded-[14.5px] bg-[#0a0a14]/95 p-4">
                            {/* Icon + Value row */}
                            <div className="flex items-center gap-3 mb-3">
                              <div
                                className={`w-12 h-12 rounded-xl grid place-items-center flex-shrink-0 ${
                                  affordable ? `bg-gradient-to-br ${cc.btnBg}` : 'bg-slate-700/50'
                                }`}
                              >
                                {rw.image_url ? (
                                  <img
                                    src={rw.image_url}
                                    alt={rw.name || rw.type || 'Reward'}
                                    className="w-full h-full rounded-xl object-cover"
                                    width={48}
                                    height={48}
                                    loading="lazy"
                                    decoding="async"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ) : isVoucher ? (
                                  <Gift className="w-5 h-5 text-white" />
                                ) : (
                                  <span className="text-lg font-bold text-white">₹</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div
                                  className={`text-lg font-extrabold leading-tight ${affordable ? 'text-white' : 'text-slate-400'}`}
                                >
                                  {displayValue || rw.title || 'Reward'}
                                </div>
                                <span
                                  className={`text-[10px] font-bold uppercase tracking-wider ${
                                    isVoucher ? 'text-fuchsia-400' : 'text-emerald-400'
                                  }`}
                                >
                                  {isVoucher ? 'Voucher' : 'Cash'}
                                </span>
                              </div>
                            </div>

                            {/* Coins + progress */}
                            <div className="flex items-center gap-2 mb-3">
                              <Coins className="w-4 h-4 text-amber-400" />
                              <span className="text-sm font-extrabold text-white">
                                {price.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-slate-500">coins</span>
                              <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden ml-1">
                                <m.div
                                  className={`h-full rounded-full ${affordable ? `bg-gradient-to-r ${cc.border}` : 'bg-slate-600'}`}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(pct, 100)}%` }}
                                  transition={{ duration: 0.6, ease: 'easeOut' }}
                                />
                              </div>
                              <span
                                className={`text-[10px] font-bold ${pct >= 100 ? 'text-emerald-400' : 'text-slate-500'}`}
                              >
                                {pct >= 100 ? '✓ Ready' : `${pct}%`}
                              </span>
                            </div>

                            {/* Button */}
                            <button
                              type="button"
                              disabled={!affordable}
                              onClick={() => onRedeemClick(rw)}
                              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${
                                affordable
                                  ? `bg-gradient-to-r ${cc.btnBg} text-white shadow-md hover:brightness-110 active:scale-[0.97]`
                                  : 'bg-white/[0.04] text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              {affordable ? (
                                <>
                                  <Sparkles className="w-4 h-4" /> Redeem Now
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3" />{' '}
                                  {(price - walletCoins).toLocaleString()} more
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </m.div>
                    );
                  })}
                </div>
              )}

              {/* Stats */}
              <m.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.08 }}
                className="mt-5"
              >
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-400/15">
                    <div className="w-6 h-6 rounded-lg grid place-items-center bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-sm flex-shrink-0">
                      <Receipt className="w-3 h-3 text-white" />
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                        Total
                      </div>
                      <div className="text-sm font-extrabold text-violet-300 leading-tight">
                        {stats.total}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-400/15">
                    <div className="w-6 h-6 rounded-lg grid place-items-center bg-gradient-to-br from-emerald-500 to-teal-500 shadow-sm flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                        Approved
                      </div>
                      <div className="text-sm font-extrabold text-emerald-300 leading-tight">
                        {stats.approved}
                      </div>
                    </div>
                  </div>

                </div>
              </m.div>
            </>
          )}
        </m.div>

        {/* Redemptions history list */}
        {activeTab === 'history' && (
          <m.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl p-[1.5px] bg-gradient-to-r from-slate-600/30 to-slate-700/30"
                  >
                    <div className="rounded-[14.5px] bg-[#0a0a14]/95 p-4 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800/60" />
                        <div className="flex-1">
                          <div className="h-3.5 bg-slate-800/60 rounded w-2/3 mb-2" />
                          <div className="h-2.5 bg-slate-800/60 rounded w-1/3" />
                        </div>
                        <div className="h-6 w-20 bg-slate-800/60 rounded-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="text-center py-14 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 grid place-items-center ring-1 ring-fuchsia-400/20">
                  <Gift className="w-7 h-7 text-fuchsia-400" />
                </div>
                <p className="text-white font-bold text-base">No redemptions yet</p>
                <p className="text-slate-500 text-sm mt-1">
                  Your redemption history will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredRows.map((r, i) => {
                  const badge = statusBadge(r.status);
                  const BadgeIcon = badge.icon;
                  const statusColors = {
                    approved: {
                      border: 'from-emerald-400 via-teal-500 to-cyan-500',
                      iconBg: 'from-emerald-500/20 to-teal-500/20',
                      ring: 'ring-emerald-400/20',
                    },
                    pending: {
                      border: 'from-amber-400 via-orange-500 to-yellow-500',
                      iconBg: 'from-amber-500/20 to-orange-500/20',
                      ring: 'ring-amber-400/20',
                    },
                    rejected: {
                      border: 'from-rose-400 via-red-500 to-pink-500',
                      iconBg: 'from-rose-500/20 to-red-500/20',
                      ring: 'ring-rose-400/20',
                    },
                  };
                  const sc = statusColors[String(r.status).toLowerCase()] || {
                    border: 'from-slate-500 to-slate-600',
                    iconBg: 'from-slate-700/40 to-slate-800/40',
                    ring: 'ring-slate-600/20',
                  };
                  return (
                    <m.div
                      key={r.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, type: 'spring', stiffness: 120, damping: 16 }}
                      className={`rounded-2xl p-[1.5px] bg-gradient-to-r ${sc.border} transition-all hover:-translate-y-0.5`}
                    >
                      <div className="rounded-[14.5px] bg-[#0a0a14]/95 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl grid place-items-center flex-shrink-0 bg-gradient-to-br ${sc.iconBg} ring-1 ${sc.ring}`}
                          >
                            <Gift className="w-5 h-5 text-white/80" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[13px] font-bold text-white leading-snug break-words line-clamp-1">
                              {r.reward_value}
                            </span>
                            <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {r.requested_at
                                ? new Date(r.requested_at).toLocaleString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    day: '2-digit',
                                    month: 'short',
                                  })
                                : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${badge.className}`}
                            >
                              <BadgeIcon className="w-3 h-3" /> {badge.label}
                            </span>
                            <button
                              className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] grid place-items-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(String(r.id));
                                  toast({ title: 'Copied', description: 'Redemption ID copied' });
                                } catch {
                                  toast({
                                    title: 'Copy failed',
                                    description: 'Unable to copy ID',
                                    variant: 'destructive',
                                  });
                                }
                              }}
                              title="Copy redemption ID"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </m.div>
                  );
                })}
              </div>
            )}
          </m.div>
        )}

        {/* Redeem Preview Dialog */}
        <Dialog
          open={redeemOpen}
          onOpenChange={(o) => {
            if (!o) {
              setInputFocused(false);
              setSelectedReward(null);
              setPayoutIdentifier('');
              setPayoutChannel('upi');
              setRedeemStep('confirm');
              setRedeemSubmitting(false);
              setRedeemMode('cash');
            }
            setRedeemOpen(o);
          }}
        >
          <DialogContent
            className="bg-slate-900/95 border-white/10 text-slate-100 rounded-xl sm:rounded-2xl p-0 overflow-hidden w-[min(94vw,600px)] sm:max-w-xl md:max-w-2xl max-h-[86svh] transition-all duration-200"
            style={isMobile && kbOffset > 0 ? { top: `calc(50% - ${kbOffset / 2}px)` } : undefined}
          >
            {selectedReward &&
              (() => {
                const isVoucherReward = redeemMode === 'voucher';
                const payoutLabel = isVoucherReward
                  ? 'WhatsApp Number'
                  : payoutChannel === 'phone'
                    ? 'Phone Number'
                    : 'UPI ID';
                const payoutPlaceholder = isVoucherReward
                  ? 'WhatsApp number'
                  : payoutChannel === 'phone'
                    ? 'Phone number'
                    : 'UPI ID (name@bank)';
                const payoutInputMode =
                  isVoucherReward || payoutChannel === 'phone' ? 'tel' : 'text';
                return (
                  <div className="p-4 sm:p-6 md:p-7">
                    <DialogHeader className="flex flex-col items-center text-center">
                      <DialogTitle className="text-xl sm:text-2xl font-extrabold flex items-center justify-center gap-2">
                        <PartyPopper className="w-6 h-6 text-fuchsia-300" /> Redeem
                      </DialogTitle>
                      <div className="w-full flex justify-center">
                        <DialogDescription className="text-slate-300 text-sm sm:text-base mt-1 max-w-[520px]">
                          {redeemStep === 'confirm'
                            ? 'Add payout details to submit.'
                            : 'Submitted. Await admin approval.'}
                        </DialogDescription>
                      </div>
                    </DialogHeader>

                    <DialogFooter className="mt-6">
                      {redeemStep === 'confirm' ? (
                        <div className="w-full">
                          <div className="space-y-4 mb-5">
                            {isVoucherReward ? (
                              <div className="flex flex-col gap-3">
                                <div>
                                  <label
                                    htmlFor="payout-identifier"
                                    className="text-[11px] font-semibold text-slate-400 mb-1 block"
                                  >
                                    {payoutLabel}
                                  </label>
                                  <input
                                    ref={payoutInputRef}
                                    id="payout-identifier"
                                    value={payoutIdentifier}
                                    onChange={(e) => setPayoutIdentifier(e.target.value)}
                                    onFocus={() => setInputFocused(true)}
                                    onBlur={() => setInputFocused(false)}
                                    placeholder={payoutPlaceholder}
                                    inputMode={payoutInputMode}
                                    className="w-full px-3 py-2 rounded-lg bg-slate-800/70 border border-slate-600 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                  />
                                  <p className="mt-2 text-[11px] text-slate-400">
                                    We’ll send the voucher on WhatsApp.
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1">
                                  <span className="text-[11px] font-semibold text-slate-400 mb-1 block">
                                    Payout Method
                                  </span>
                                  <div className="flex gap-2">
                                    {['upi', 'phone'].map((ch) => (
                                      <button
                                        key={ch}
                                        type="button"
                                        onClick={() => setPayoutChannel(ch)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition ${payoutChannel === ch ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}
                                      >
                                        {ch.toUpperCase()}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex-[2]">
                                  <label
                                    htmlFor="payout-identifier"
                                    className="text-[11px] font-semibold text-slate-400 mb-1 block"
                                  >
                                    {payoutLabel}
                                  </label>
                                  <input
                                    ref={payoutInputRef}
                                    id="payout-identifier"
                                    value={payoutIdentifier}
                                    onChange={(e) => setPayoutIdentifier(e.target.value)}
                                    onFocus={() => setInputFocused(true)}
                                    onBlur={() => setInputFocused(false)}
                                    placeholder={payoutPlaceholder}
                                    inputMode={payoutInputMode}
                                    className="w-full px-3 py-2 rounded-lg bg-slate-800/70 border border-slate-600 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                  />
                                </div>
                              </div>
                            )}
                            {(() => {
                              const price = Number(
                                selectedReward.coins_required ??
                                  selectedReward.coin_cost ??
                                  selectedReward.coins ??
                                  0,
                              );
                              return (
                                <div className="text-xs text-slate-400 text-center">
                                  <span className="text-white font-semibold">
                                    {getRawRewardValue(selectedReward)}
                                  </span>{' '}
                                  •{' '}
                                  <span className="text-fuchsia-200 font-semibold">
                                    {price.toLocaleString()} coins
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                          {(() => {
                            const rewardLabel = getRawRewardValue(selectedReward);
                            const price = Number(
                              selectedReward.coins_required ??
                                selectedReward.coin_cost ??
                                selectedReward.coins ??
                                0,
                            );
                            return (
                              <Button
                                onClick={handleConfirmRedeem}
                                disabled={redeemSubmitting || walletCoins < price}
                                className="w-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-600 hover:to-fuchsia-600 text-base py-3 h-12"
                              >
                                {redeemSubmitting ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Submitting
                                  </>
                                ) : (
                                  <>Redeem {rewardLabel}</>
                                )}
                              </Button>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="w-full">
                          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-emerald-100 flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-300 mt-0.5" />
                            <div>
                              <div className="font-semibold">Redemption submitted</div>
                              <div className="text-xs opacity-80">
                                Your request is pending admin approval. You will receive payout
                                after review.
                              </div>
                            </div>
                          </div>
                          {/* Confetti micro-animation */}
                          <AnimatePresence>
                            <m.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="relative h-0"
                            >
                              {[...Array(10)].map((_, i) => (
                                <m.span
                                  key={i}
                                  className="absolute inline-block w-2 h-2 rounded-sm"
                                  style={{
                                    left: `${10 + i * 8}%`,
                                    top: -8,
                                    background: [
                                      '#a78bfa',
                                      '#f472b6',
                                      '#60a5fa',
                                      '#34d399',
                                      '#f59e0b',
                                    ][i % 5],
                                  }}
                                  initial={{ y: -10, rotate: 0, opacity: 0 }}
                                  animate={{
                                    y: 40 + Math.random() * 20,
                                    rotate: 120 + Math.random() * 180,
                                    opacity: 1,
                                  }}
                                  transition={{ duration: 0.9, delay: i * 0.04, ease: 'easeOut' }}
                                />
                              ))}
                            </m.div>
                          </AnimatePresence>
                          <div className="mt-4 flex justify-end">
                            <Button onClick={() => setRedeemOpen(false)} variant="brand">
                              Close
                            </Button>
                          </div>
                        </div>
                      )}
                    </DialogFooter>
                  </div>
                );
              })()}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
