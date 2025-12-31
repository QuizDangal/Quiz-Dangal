import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { m } from '@/lib/motion-lite';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase, hasSupabaseConfig } from '@/lib/customSupabaseClient';
import { logger } from '@/lib/logger';
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel';
import {
  Coins,
  Share2,
  Gift,
  Trophy,
  ArrowDownRight,
  ArrowUpRight,
  UserPlus,
  RefreshCcw,
  ShoppingBag,
  LogOut,
  Wallet as WalletIcon,
  Gamepad2,
  Clock,
} from 'lucide-react';
import SeoHead from '@/components/SEO';

const Wallet = () => {
  const { user, userProfile } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bouncing, setBouncing] = useState(false);

  const allowedTypes = useMemo(
    () => ['credit', 'reward', 'bonus', 'referral', 'daily_login', 'quiz_reward', 'purchase', 'debit', 'refund', 'join_fee', 'prize'],
    [],
  );
  const positiveTypes = useMemo(
    () => ['reward', 'bonus', 'credit', 'referral', 'refund', 'daily_login', 'quiz_reward', 'prize'],
    [],
  );

  const fetchTransactions = useCallback(async () => {
    if (!user || !hasSupabaseConfig || !supabase) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .in('type', allowedTypes)
        .not('type', 'is', null)
        .not('amount', 'is', null)
        .neq('amount', 0)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) logger.error('Wallet transactions fetch error:', error);
      setTransactions(data || []);
    } catch (e) {
      logger.error('Wallet transactions exception:', e);
    } finally {
      setLoading(false);
    }
  }, [user, allowedTypes]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const txRealtimeEnabled = (() => {
    try {
      if (typeof window === 'undefined') return false;
      if (!('WebSocket' in window)) return false;
      if (navigator && navigator.onLine === false) return false;
      return true;
    } catch {
      return false;
    }
  })();

  useRealtimeChannel({
    enabled: !!user?.id && txRealtimeEnabled && hasSupabaseConfig && !!supabase,
    channelName: user?.id ? `tx-updates-${user.id}` : undefined,
    event: 'INSERT',
    table: 'transactions',
    filter: user?.id ? `user_id=eq.${user.id}` : undefined,
    onChange: fetchTransactions,
    joinTimeoutMs: 5000,
  });

  const walletBalance = Number(userProfile?.wallet_balance || 0);
  const prevBalanceRef = useRef(walletBalance);
  
  useEffect(() => {
    const prev = prevBalanceRef.current;
    if (walletBalance > prev) {
      setBouncing(true);
      const t = setTimeout(() => setBouncing(false), 600);
      prevBalanceRef.current = walletBalance;
      return () => clearTimeout(t);
    }
    prevBalanceRef.current = walletBalance;
  }, [walletBalance]);

  const formatCoins = (n) => Number(n || 0).toLocaleString();

  const txMeta = (type) => {
    const t = String(type || '').toLowerCase();
    if (t.includes('ref')) return { icon: UserPlus, bgClass: 'bg-sky-500/20', textClass: 'text-sky-400' };
    if (t.includes('quiz') || t.includes('prize') || t.includes('reward')) return { icon: Trophy, bgClass: 'bg-emerald-500/20', textClass: 'text-emerald-400' };
    if (t.includes('credit') || t.includes('daily')) return { icon: Coins, bgClass: 'bg-amber-500/20', textClass: 'text-amber-400' };
    if (t.includes('refund')) return { icon: RefreshCcw, bgClass: 'bg-indigo-500/20', textClass: 'text-indigo-400' };
    if (t.includes('purchase')) return { icon: ShoppingBag, bgClass: 'bg-fuchsia-500/20', textClass: 'text-fuchsia-400' };
    if (t.includes('debit') || t.includes('join')) return { icon: LogOut, bgClass: 'bg-rose-500/20', textClass: 'text-rose-400' };
    return { icon: WalletIcon, bgClass: 'bg-slate-500/20', textClass: 'text-slate-400' };
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="relative pt-14 pb-4">
      <SeoHead
        title="Wallet – Quiz Dangal"
        description="View your Quiz Dangal wallet balance, recent transactions, and referral earnings."
        canonical="https://quizdangal.com/wallet/"
        robots="noindex, nofollow"
        author="Quiz Dangal"
        datePublished="2025-01-01"
      />
      
      <m.div
        className="px-4 py-4 mx-auto w-full max-w-md sm:max-w-lg"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <m.div variants={itemVariants} className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <WalletIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">My Wallet</h1>
        </m.div>

        {/* Balance Card - Premium */}
        <m.div 
          variants={itemVariants}
          className="relative mb-5 rounded-2xl overflow-hidden border border-amber-500/20"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-900/40 via-slate-900 to-orange-900/30" />
          
          <div className="relative p-5 flex items-center gap-4">
            {/* Coin Icon */}
            <m.div
              animate={bouncing ? { scale: [1, 1.2, 1] } : {}}
              className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30"
            >
              <Coins className="w-7 h-7 text-white" />
            </m.div>
            
            {/* Balance Info */}
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Your Balance</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-white">{formatCoins(walletBalance)}</span>
                <span className="text-sm font-semibold text-amber-400">coins</span>
              </div>
            </div>
          </div>
        </m.div>

        {/* Quick Actions - Compact Attractive Buttons */}
        <m.div variants={itemVariants} className="grid grid-cols-2 gap-3 mb-6">
          <Link
            to="/refer"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Share2 className="w-4 h-4 text-white" />
            <span className="text-sm font-bold text-white">Refer & Earn</span>
          </Link>
          
          <Link
            to="/redemptions"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Gift className="w-4 h-4 text-white" />
            <span className="text-sm font-bold text-white">Redeem</span>
          </Link>
        </m.div>

        {/* Earn More Section */}
        <m.div variants={itemVariants} className="mb-6">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
            <Gamepad2 className="w-5 h-5 text-cyan-400" />
            <Link to="/" className="flex-1">
              <p className="text-sm font-medium text-cyan-200">Play Quizzes to Earn More!</p>
            </Link>
          </div>
        </m.div>

        {/* Recent Transactions */}
        <m.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recent Activity
            </h3>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-800/40 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-700" />
                    <div className="flex-1">
                      <div className="h-3 w-20 bg-slate-700 rounded mb-2" />
                      <div className="h-2 w-14 bg-slate-700 rounded" />
                    </div>
                    <div className="h-4 w-16 bg-slate-700 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-10 bg-slate-800/30 rounded-2xl border border-dashed border-slate-700/50">
              <div className="text-3xl mb-2">🪙</div>
              <p className="text-slate-400 font-medium mb-1">No transactions yet</p>
              <p className="text-xs text-slate-600">Play quizzes and start earning!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((t, idx) => {
                const type = (t.type || '').toLowerCase();
                const isPositive = positiveTypes.includes(type);
                const meta = txMeta(type);
                const Icon = meta.icon;
                
                return (
                  <m.div
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/30 hover:border-slate-600/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full ${meta.bgClass} flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${meta.textClass}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-200 capitalize">{t.type || 'Transaction'}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                    
                    <div className={`flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      <span className="font-bold text-sm">{isPositive ? '+' : '-'}{formatCoins(Math.abs(Number(t.amount) || 0))}</span>
                    </div>
                  </m.div>
                );
              })}
            </div>
          )}
        </m.div>
      </m.div>
    </div>
  );
};

export default Wallet;
