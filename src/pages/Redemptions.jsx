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
import SeoHead from '@/components/SEO';
// Removed Link import since we no longer show the Earn now link

export default function Redemptions() {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState([]);
  const [rewardsLoading, setRewardsLoading] = useState(true);
  // search is removed from UI; keep list as-is
  const [selectedReward, setSelectedReward] = useState(null);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemStep, setRedeemStep] = useState('confirm'); // confirm | success
  const [redeemSubmitting, setRedeemSubmitting] = useState(false);
  const [payoutIdentifier, setPayoutIdentifier] = useState('');
  const [payoutChannel, setPayoutChannel] = useState('upi');
  const [redeemMode, setRedeemMode] = useState('cash'); // cash | voucher
  const payoutInputRef = React.useRef(null);
  // Mobile keyboard handling: when input focused on small screens, lift dialog upward for better visibility
  const [inputFocused, setInputFocused] = useState(false);
  const isMobile =
    typeof window !== 'undefined' &&
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  const [activeTab, setActiveTab] = useState('rewards'); // rewards | history
  const historyQuery = '';
  const historySort = 'newest';

  // Use backend reward_value exactly as provided (no extra suffix/prefix)
  const getRawRewardValue = useCallback((rw) => {
    if (!rw) return '';
    const v = rw.reward_value ?? rw.value ?? rw.amount ?? '';
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
      const res2 = await supabase
        .from('reward_catalog')
        .select('*')
        .eq('is_active', true)
        .order('coins_required', { ascending: true })
        .order('id', { ascending: false });
      if (res2.error) setRewards([]);
      else setRewards(res2.data || []);
      setRewardsLoading(false);
    }
    loadRewards();
  }, []);

  const walletCoins = useMemo(() => Number(userProfile?.wallet_balance || 0), [userProfile]);

  const filteredRewards = rewards || [];

  // History filters and sorting
  const filteredRows = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    let list = rows || [];
    if (q) {
      list = list.filter(
        (r) =>
          String(r.reward_type || '')
            .toLowerCase()
            .includes(q) ||
          String(r.reward_value || '')
            .toLowerCase()
            .includes(q) ||
          String(r.status || '')
            .toLowerCase()
            .includes(q),
      );
    }
    list = [...list].sort((a, b) => {
      const at = a.requested_at ? new Date(a.requested_at).getTime() : 0;
      const bt = b.requested_at ? new Date(b.requested_at).getTime() : 0;
      return historySort === 'oldest' ? at - bt : bt - at;
    });
    return list;
  }, [rows, historyQuery, historySort]);

  const resolveRewardMode = useCallback((rw) => {
    const raw = String(rw?.reward_type || '')
      .trim()
      .toLowerCase();
    if (!raw) return 'cash';
    if (raw.includes('cash')) return 'cash';
    if (raw.includes('voucher')) return 'voucher';
    return raw === 'voucher' ? 'voucher' : 'cash';
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const pending = rows.filter((r) => r.status === 'pending').length;
    const approved = rows.filter((r) => r.status === 'approved').length;
    const rejected = rows.filter((r) => r.status === 'rejected').length;
    const coinsUsed = rows.reduce((acc, r) => acc + Number(r.coins_required || 0), 0);
    return { total, pending, approved, rejected, coinsUsed };
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
      if (!digits) {
        toast({
          title: 'Enter a phone number',
          description: 'Please enter digits only (any length).',
          variant: 'destructive',
        });
        return;
      }
      // Send as provided (trimmed). Backend stores as text.
      identifierToSend = rawIdentifier;
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
      const channel = requiresWhatsApp ? 'phone' : payoutChannel || 'upi';
      if (requiresWhatsApp && payoutChannel !== 'phone') setPayoutChannel('phone');
      const rpcPayload = {
        p_catalog_id: selectedReward.id,
        p_payout_identifier: identifierToSend,
        p_payout_channel: channel,
      };
      let { error } = await supabase.rpc('redeem_from_catalog_with_details', rpcPayload);
      if (error) throw error;
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
        datePublished="2025-01-01"
      />
      <div className="relative pt-20 mx-auto max-w-5xl px-4 py-6">
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
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 grid place-items-center shadow-lg shadow-orange-500/20">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Redeem Rewards</h1>
              <p className="text-sm text-slate-400">Exchange coins for real prizes</p>
            </div>
          </div>

          {/* Tabs: Rewards Summary | History (under heading) */}
          <div className="mb-4 flex items-center gap-2">
            {[
              { key: 'rewards', label: 'My Redemptions', icon: Gift },
              { key: 'history', label: 'Full History', icon: Receipt },
            ].map((tab) => (
              <button
                type="button"
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  activeTab === tab.key
                    ? 'bg-white/10 text-white border-white/20 shadow-lg'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:border-white/20'
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
                    <div key={i} className="rounded-2xl bg-slate-800/50 border border-white/5 p-4 animate-pulse">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRewards.map((rw) => {
                    const price = Number(rw.coins_required ?? rw.coin_cost ?? rw.coins ?? 0);
                    const rewardValue = getRawRewardValue(rw);
                    const displayValue = formatRewardValue(rewardValue);
                    const affordable = walletCoins >= price;
                    const pct = price > 0 ? Math.min(100, Math.round((walletCoins / price) * 100)) : 100;
                    const description = rw.description ? String(rw.description).trim() : '';
                    const rewardType = String(rw.reward_type || '').toLowerCase();
                    const isVoucher = rewardType.includes('voucher');
                    
                    return (
                      <m.div
                        key={rw.id}
                        className="group"
                        whileHover={{ y: -3 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      >
                        <div className={`h-full rounded-2xl border overflow-hidden transition-all duration-200 ${
                          affordable 
                            ? 'bg-gradient-to-b from-slate-800/90 to-slate-900/95 border-white/10 hover:border-indigo-400/50 hover:shadow-lg hover:shadow-indigo-500/10' 
                            : 'bg-slate-800/40 border-white/5'
                        }`}>
                          {/* Top colored bar */}
                          <div className={`h-1 ${affordable ? 'bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-500' : 'bg-slate-700'}`} />
                          
                          <div className="p-4">
                            {/* Header: Icon + Value + Type Badge */}
                            <div className="flex items-start gap-3 mb-3">
                              {/* Reward Icon */}
                              <div className={`w-12 h-12 rounded-xl grid place-items-center flex-shrink-0 ${
                                isVoucher 
                                  ? 'bg-gradient-to-br from-purple-500/25 to-pink-500/25 ring-1 ring-purple-400/20' 
                                  : 'bg-gradient-to-br from-emerald-500/25 to-teal-500/25 ring-1 ring-emerald-400/20'
                              }`}>
                                {rw.image_url ? (
                                  <img
                                    src={rw.image_url}
                                    alt="Reward item"
                                    className="w-full h-full rounded-xl object-cover"
                                    width={48}
                                    height={48}
                                    loading="lazy"
                                    decoding="async"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  />
                                ) : isVoucher ? (
                                  <Gift className="w-5 h-5 text-purple-300" aria-hidden="true" />
                                ) : (
                                  <span className="text-lg font-bold text-emerald-300" aria-hidden="true">₹</span>
                                )}
                              </div>
                              
                              {/* Value + Title */}
                              <div className="flex-1 min-w-0">
                                <div className={`text-lg font-bold ${affordable ? 'text-white' : 'text-slate-400'}`}>
                                  {displayValue || rw.title || 'Reward'}
                                </div>
                                {rw.title && displayValue && (
                                  <div className="text-sm text-slate-400 truncate">{rw.title}</div>
                                )}
                                {/* Type Badge */}
                                <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${
                                  isVoucher 
                                    ? 'bg-purple-500/20 text-purple-300' 
                                    : 'bg-emerald-500/20 text-emerald-300'
                                }`}>
                                  {isVoucher ? 'Voucher' : 'Cash'}
                                </span>
                              </div>

                              {/* Affordable Check */}
                              {affordable && (
                                <div className="w-6 h-6 rounded-full bg-emerald-500/20 grid place-items-center flex-shrink-0">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                </div>
                              )}
                            </div>

                            {/* Description */}
                            {description && (
                              <p className="text-xs text-slate-400 mb-3 line-clamp-2">{description}</p>
                            )}

                            {/* Price & Progress */}
                            <div className="flex items-center gap-3 mb-3 p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                              <div className="flex items-center gap-2">
                                <Coins className="w-4 h-4 text-amber-400" />
                                <span className="text-base font-bold text-white">{price.toLocaleString()}</span>
                                <span className="text-xs text-slate-500">coins</span>
                              </div>
                              <div className="ml-auto text-sm font-semibold text-slate-400">
                                {pct >= 100 ? (
                                  <span className="text-emerald-400">Ready!</span>
                                ) : (
                                  <span>{pct}%</span>
                                )}
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-1.5 w-full rounded-full bg-slate-700/50 mb-4 overflow-hidden">
                              <m.div
                                className={`h-full rounded-full ${affordable ? 'bg-gradient-to-r from-emerald-400 to-cyan-400' : 'bg-gradient-to-r from-amber-500 to-orange-500'}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(pct, 100)}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                              />
                            </div>

                            {/* Redeem Button */}
                            <button
                              type="button"
                              disabled={!affordable}
                              onClick={() => onRedeemClick(rw)}
                              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all ${
                                affordable
                                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-md hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98]'
                                  : 'bg-slate-700/40 text-slate-500 border border-slate-600/30 cursor-not-allowed'
                              }`}
                            >
                              {affordable ? (
                                <>
                                  <Sparkles className="w-4 h-4" />
                                  Redeem Now
                                </>
                              ) : (
                                <>
                                  <Clock className="w-4 h-4" />
                                  Need {(price - walletCoins).toLocaleString()} more
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

              {/* Stats Summary - refreshed layout */}
              <m.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.08 }}
                className="mt-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[{
                    label: 'Total Requests',
                    value: stats.total,
                    icon: Receipt,
                    accent: 'from-indigo-500/15 to-blue-600/20',
                  },
                  {
                    label: 'Approved',
                    value: stats.approved,
                    icon: CheckCircle2,
                    accent: 'from-emerald-500/15 to-teal-600/20',
                  }].map((card) => (
                    <div
                      key={card.label}
                      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-lg p-4 shadow-lg flex items-center gap-3"
                    >
                      <div className={`w-11 h-11 rounded-xl grid place-items-center bg-gradient-to-br ${card.accent} border border-white/10 shadow-inner`}>
                        <card.icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">
                          {card.label}
                        </div>
                        <div className="text-2xl font-bold text-white leading-tight">{card.value}</div>
                      </div>
                      <div className="absolute inset-y-0 right-0 w-16 opacity-20 bg-gradient-to-l from-white/20 to-transparent" />
                    </div>
                  ))}
                </div>
              </m.div>
            </>
          )}
        </m.div>

        {/* Redemptions history list */}
        {activeTab === 'history' && (
          <div className="qd-card rounded-3xl p-5 shadow-xl border border-white/10 bg-white/[0.02] backdrop-blur-xl">
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-indigo-900/30 border border-indigo-700/40"
                  >
                    <div className="animate-pulse flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 w-2/3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-800/40" />
                        <div className="flex-1">
                          <div className="h-3 bg-indigo-800/40 rounded w-2/3 mb-2" />
                          <div className="h-2.5 bg-indigo-800/40 rounded w-1/3" />
                        </div>
                      </div>
                      <div className="h-3 w-20 bg-indigo-800/40 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="text-center py-10">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-md mb-3">
                  <Gift className="w-6 h-6" />
                </div>
                <p className="text-slate-200 font-semibold">No redemptions yet</p>
                <p className="text-slate-400 text-sm">Make a request and it will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRows.map((r) => {
                  const badge = statusBadge(r.status);
                  const BadgeIcon = badge.icon;
                  return (
                    <m.div
                      key={r.id}
                      className={`p-3 sm:p-3.5 rounded-xl bg-indigo-900/30 border border-indigo-700/40 hover:border-indigo-400/50 transition hover:shadow-lg ${badge.rowAccent}`}
                      whileHover={{ y: -2 }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          <div className="relative w-10 h-10 rounded-xl grid place-items-center bg-gradient-to-br from-violet-500 to-fuchsia-500 ring-2 ring-white/20 flex-shrink-0">
                            <Gift className="w-5 h-5 text-white" />
                          </div>
                          <div className="min-w-0">
                            {/* reward value only - without star icon, allow full text */}
                            <div className="inline-block rounded-lg px-2.5 py-1 bg-white/5 border border-white/10 backdrop-blur-sm shadow-sm max-w-full">
                              <span className="text-slate-100 font-semibold text-sm leading-snug break-words">
                                {r.reward_value}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-slate-400/80 font-mono truncate">
                              {r.requested_at ? new Date(r.requested_at).toLocaleString() : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${badge.className} shadow`}
                          >
                            <BadgeIcon className="w-3.5 h-3.5" /> {badge.label}
                          </span>
                          <button
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-slate-200 hover:bg-white/10"
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
                            <Copy className="w-3.5 h-3.5" /> ID
                          </button>
                        </div>
                      </div>
                    </m.div>
                  );
                })}
              </div>
            )}
          </div>
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
            className={`bg-slate-900/95 border-white/10 text-slate-100 rounded-xl sm:rounded-2xl p-0 overflow-hidden w-[min(94vw,600px)] sm:max-w-xl md:max-w-2xl max-h-[86svh] transition-transform duration-300 ${isMobile && inputFocused ? 'translate-y-[-12svh]' : ''}`}
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

                    {/* Top summary intentionally removed (was value/coins line). No empty block retained. */}

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
