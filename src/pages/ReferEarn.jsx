import React, { useEffect, useMemo, useState } from 'react';
import SEO from '@/components/SEO';
import { Gift, Users, Coins, Share2, Copy, Check, Loader2, Trophy, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { normalizeReferralCode, saveReferralCode } from '@/lib/referralStorage';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { getSignedAvatarUrls } from '@/lib/avatar';
import { m as motion } from '@/lib/motion-lite';

const ReferEarn = () => {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Refer & Earn ka bonus kab milta hai?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Jaise hi aapka refer kiya hua friend sign up karke eligible quizzes complete karta hai, dono ko bonus coins milte hain.',
        },
      },
      {
        '@type': 'Question',
        name: 'Referral code kaise share karein?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Profile section me aapka code milta hai. Link ya code WhatsApp, Telegram ya kisi bhi social app par share karein.',
        },
      },
    ],
  };

  const { user, userProfile } = useAuth();
  const [referralStats, setReferralStats] = useState({ total: 0, earnings: 0 });
  const [referralHistory, setReferralHistory] = useState([]);
  const [copied, setCopied] = useState('');
  const [loading, setLoading] = useState(true);

  const fallbackCode = (() => {
    if (userProfile?.referral_code) return userProfile.referral_code;
    if (user?.id) return user.id.replace(/-/g, '').slice(0, 8).toUpperCase();
    return '';
  })();
  
  const referralCode = normalizeReferralCode(userProfile?.referral_code || fallbackCode);
  const referralLink = `https://quizdangal.com/?ref=${referralCode}`;
  
  const shareCaption = useMemo(
    () => `Yo! 🤩 Ab dimaag se paisa banao 💸
Join Quiz Dangal – jaha brains = fame ✨

👉 बस नीचे दिए लिंक पर जाओ
Referral Code: ${referralCode} डालो
और turant coins kamao 🚀

Referral Link: ${referralLink}`,
    [referralCode, referralLink],
  );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data: referrals, error } = await supabase
          .from('referrals')
          .select('id, referred_id, coins_awarded, created_at, referral_code')
          .eq('referrer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);
        if (error && error.code !== 'PGRST116') throw error;
        if (!mounted) return;

        let history = referrals || [];
        if (history.length) {
          const referredIds = Array.from(new Set(history.map((r) => r.referred_id).filter(Boolean)));
          if (referredIds.length) {
            const { data: publicProfiles, error: profileError } = await supabase.rpc('profiles_public_by_ids', { p_ids: referredIds });
            if (profileError) console.warn('Referral profile lookup failed:', profileError);
            const profiles = publicProfiles || [];
            const profileMap = new Map(profiles.map((p) => [p.id, p]));
            const signedMap = await getSignedAvatarUrls(profiles.map((p) => p.avatar_url).filter(Boolean));
            history = history.map((ref) => {
              const publicProfile = profileMap.get(ref.referred_id);
              if (!publicProfile) return { ...ref, referred: null };
              const signedUrl = publicProfile.avatar_url ? signedMap.get(publicProfile.avatar_url) || '' : '';
              return { ...ref, referred: { ...publicProfile, avatar_url: signedUrl } };
            });
          }
        }
        const total = history.length;
        const earnings = history.reduce((sum, r) => sum + (Number(r.coins_awarded) || 0), 0);
        setReferralStats({ total, earnings });
        setReferralHistory(history);
      } catch (e) {
        if (!mounted) return;
        setReferralStats({ total: 0, earnings: 0 });
        setReferralHistory([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [user]);

  const copyToClipboard = async (text, kind) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(''), 1600);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(kind);
      setTimeout(() => setCopied(''), 1600);
    }
  };

  const shareToWhatsApp = async () => {
    const encoded = encodeURIComponent(shareCaption);
    const ua = navigator.userAgent || '';
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const waDeep = `whatsapp://send?text=${encoded}`;
    const waWeb = `https://wa.me/?text=${encoded}`;
    const openNew = (url) => { const w = window.open(url, '_blank'); return !!w; };

    if (isAndroid || isIOS) {
      window.location.href = waDeep;
      setTimeout(() => { if (!document.hidden) window.location.href = waWeb; }, 700);
      return;
    }
    openNew(waWeb);
  };

  const shareReferralLink = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Quiz Dangal', text: shareCaption });
        return;
      }
    } catch { /* ignore */ }
    shareToWhatsApp();
  };

  useEffect(() => {
    if (referralCode) saveReferralCode(referralCode);
  }, [referralCode]);

  useEffect(() => {
    if (userProfile) {
      setReferralStats((prev) => ({
        total: Math.max(Number(userProfile.referral_count ?? 0), prev.total || 0),
        earnings: prev.earnings,
      }));
    }
  }, [userProfile]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <>
      <SEO
        title="Refer & Earn – Quiz Dangal | Invite Friends, Get Coins"
        description="Share your unique referral link on Quiz Dangal and earn bonus coins when friends join and play opinion-based quizzes."
        canonical="https://quizdangal.com/refer/"
        robots="noindex, nofollow"
        image="https://quizdangal.com/refer-earn-poster.png?v=1"
        imageAlt="Quiz Dangal Refer and Earn poster"
        keywords={['refer and earn', 'quizdangal refer', 'invite friends quiz app', 'earn coins by referral']}
        jsonLd={[faqSchema]}
      />
      
      <div className="min-h-screen pt-14 pb-24">
        <motion.div 
          className="container mx-auto px-4 py-6 max-w-lg"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Hero Section - Compact */}
          <motion.div variants={itemVariants} className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Refer & Earn</h1>
              <p className="text-sm text-slate-400">Dost bulao, <span className="text-amber-400 font-semibold">50 Coins</span> kamao!</p>
            </div>
          </motion.div>

          {/* Reward Card - Compact */}
          <motion.div 
            variants={itemVariants}
            className="relative mb-5 p-3 rounded-2xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/15 to-orange-500/15" />
            <div className="absolute inset-[1px] rounded-2xl bg-slate-900/90" />
            
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Coins className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-lg font-bold text-white">+50 <span className="text-amber-400">Coins</span></div>
                <p className="text-xs text-slate-500">Per referral</p>
              </div>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
          </motion.div>

          {/* Stats Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 mb-6">
            <div className="relative p-4 rounded-2xl overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 group-hover:from-cyan-500/20 group-hover:to-blue-500/20 transition-colors" />
              <div className="absolute inset-[1px] rounded-2xl bg-slate-900/90" />
              <div className="relative">
                <Users className="w-5 h-5 text-cyan-400 mb-2" />
                <div className="text-2xl font-bold text-white">{referralStats.total}</div>
                <p className="text-xs text-slate-500 font-medium">Friends Joined</p>
              </div>
            </div>
            
            <div className="relative p-4 rounded-2xl overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-500/10 group-hover:from-emerald-500/20 group-hover:to-green-500/20 transition-colors" />
              <div className="absolute inset-[1px] rounded-2xl bg-slate-900/90" />
              <div className="relative">
                <Trophy className="w-5 h-5 text-emerald-400 mb-2" />
                <div className="text-2xl font-bold text-white">{referralStats.earnings}</div>
                <p className="text-xs text-slate-500 font-medium">Coins Earned</p>
              </div>
            </div>
          </motion.div>

          {/* Referral Code Box */}
          <motion.div variants={itemVariants} className="mb-4">
            <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/50">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 block">Your Code</span>
              <div className="flex gap-2">
                <div className="flex-1 bg-slate-900 rounded-xl border-2 border-dashed border-slate-600 flex items-center justify-center px-4 py-3.5">
                  <span className="font-mono text-xl font-black tracking-[0.3em] text-white">{referralCode}</span>
                </div>
                <Button
                  onClick={() => copyToClipboard(referralCode, 'code')}
                  className="h-auto px-5 bg-slate-700 hover:bg-slate-600 border-0 rounded-xl"
                >
                  {copied === 'code' ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Share Buttons */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 mb-8">
            <Button
              onClick={shareToWhatsApp}
              className="h-14 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold shadow-lg shadow-emerald-900/30 border-0"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.272-.099-.471-.148-.67.149-.198.297-.768.966-.941 1.164-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.149-.173.198-.297.297-.495.099-.198.05-.372-.025-.521-.074-.149-.669-1.611-.916-2.205-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.521.074-.793.372s-1.042 1.016-1.042 2.479 1.067 2.876 1.219 3.074c.149.198 2.1 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.718 2.007-1.41.248-.694.248-1.289.173-1.41-.074-.123-.272-.198-.57-.347m-5.49 7.485h-.004a9.867 9.867 0 01-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.861 9.861 0 01-1.51-5.241c.001-5.45 4.434-9.884 9.885-9.884 2.641 0 5.122 1.03 6.988 2.897a9.825 9.825 0 012.897 6.994c-.003 5.45-4.436 9.884-9.887 9.884m8.413-18.297A11.815 11.815 0 0012.004 0C5.375 0 .16 5.215.157 11.844a11.82 11.82 0 001.624 5.99L0 24l6.305-1.654a11.86 11.86 0 005.68 1.448h.005c6.628 0 11.843-5.215 11.846-11.844a11.787 11.787 0 00-3.473-8.372z" />
              </svg>
              WhatsApp
            </Button>
            
            <Button
              onClick={shareReferralLink}
              className="h-14 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold shadow-lg shadow-violet-900/30 border-0"
            >
              <Share2 className="w-5 h-5 mr-2" />
              Share
            </Button>
          </motion.div>

          {/* Referral History */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4" />
                Recent Referrals
              </h3>
              {referralHistory.length > 0 && (
                <span className="text-xs text-slate-600 bg-slate-800 px-2 py-1 rounded-full">{referralHistory.length}</span>
              )}
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 bg-slate-800/30 rounded-2xl border border-slate-800/50">
                <Loader2 className="w-6 h-6 animate-spin mb-2 text-cyan-400" />
                <p className="text-sm">Loading...</p>
              </div>
            ) : referralHistory.length > 0 ? (
              <div className="space-y-2">
                {referralHistory.slice(0, 5).map((ref, idx) => (
                  <motion.div
                    key={ref.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/30 hover:border-slate-600/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                        {ref.referred?.avatar_url ? (
                          <img src={ref.referred.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                        ) : (
                          <span className="text-sm font-bold text-slate-400">
                            {(ref.referred?.username || 'U')[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-slate-200 text-sm">{ref.referred?.username || 'New User'}</div>
                        <div className="text-xs text-slate-500">
                          {new Date(ref.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                      <Coins className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-sm font-bold text-emerald-400">+{ref.coins_awarded}</span>
                    </div>
                  </motion.div>
                ))}
                {referralHistory.length > 5 && (
                  <p className="text-center text-xs text-slate-600 pt-2">+{referralHistory.length - 5} more</p>
                )}
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-800/30 rounded-2xl border border-dashed border-slate-700/50">
                <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-7 h-7 text-slate-600" />
                </div>
                <h4 className="text-slate-400 font-medium mb-1">Koi referral nahi</h4>
                <p className="text-xs text-slate-600 max-w-[200px] mx-auto">Link share karo aur coins kamao!</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </>
  );
};

export default ReferEarn;
