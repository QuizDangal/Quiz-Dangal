import React, { useEffect, useState, useCallback, memo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { BUILD_DATE } from '@/constants';
import { getSupabase } from '@/lib/customSupabaseClient';
import { fetchSlotsForCategory, classifyThreeSlots } from '@/lib/slots';
import { smartJoinQuiz } from '@/lib/smartJoinQuiz';
import { rateLimit } from '@/lib/security';
import {
  formatDateOnly,
  formatTimeOnly,
  getPrizeDisplay,
  prefetchRoute,
  formatSupabaseError,
} from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { Users, MessageSquare, Brain, Clock, Trophy, Play, ChevronRight, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import SeoHead from '@/components/SEO';
import { getCategorySeoContent } from '@/lib/categorySeoContent';

function categoryMeta(slug = '') {
  const s = String(slug || '').toLowerCase();
  if (s.includes('opinion'))
    return {
      title: 'Opinion Quizzes',
      emoji: '💬',
      Icon: MessageSquare,
      from: 'from-indigo-600/30',
      to: 'to-fuchsia-600/30',
      ring: 'ring-fuchsia-500/30',
      description: 'Share your views and see if the majority agrees with you! Opinion quizzes on Quiz Dangal challenge your perspective on trending topics, current affairs, and popular debates.',
      features: [
        'Vote on trending topics and debates',
        'See how your opinion matches the majority',
        'Win prizes for popular opinions',
        'New opinion polls every 5 minutes',
      ],
      faqs: [
        { q: 'How do opinion quizzes work?', a: 'Answer questions based on your personal opinion. Points are awarded based on how your answers align with the majority response.' },
        { q: 'When are new opinion quizzes available?', a: 'New opinion quizzes go live every 5 minutes, 24 hours a day. Each quiz lasts 5 minutes with no gap in between.' },
        { q: 'Can I win real prizes?', a: 'Yes! Top performers in each quiz can win cash prizes and coins that can be redeemed.' },
      ],
    };
  if (s.includes('gk'))
    return {
      title: 'Master Quizzes',
      emoji: '🧠',
      Icon: Brain,
      from: 'from-emerald-600/30',
      to: 'to-teal-600/30',
      ring: 'ring-emerald-500/30',
      description: 'Test your General Knowledge with Quiz Dangal. From current affairs and Indian history to IPL season sports awareness and science, every GK round is built for real daily players.',
      features: [
        'Questions from current affairs, history, science and geography',
        'IPL season and cricket awareness blended into live GK rounds',
        'Competitive leaderboards with real prizes',
        'Learn while you play and earn',
        'Fresh GK questions every 5 minutes',
      ],
      faqs: [
        { q: 'What topics are covered in GK quizzes?', a: 'Our GK quizzes cover current affairs, Indian history, geography, science, polity, economy, and IPL-season sports awareness.' },
        { q: 'How often are new GK quizzes added?', a: 'New GK quizzes are scheduled every 5 minutes throughout the day. Each quiz runs for 5 minutes back-to-back with no waiting.' },
        { q: 'Are GK quiz answers verified?', a: 'Yes, all GK questions and answers are carefully verified for accuracy before being added to our platform.' },
      ],
    };
  return {
    title: 'Quizzes',
    emoji: '⭐',
    Icon: MessageSquare,
    from: 'from-sky-600/30',
    to: 'to-indigo-600/30',
    ring: 'ring-sky-500/30',
    description: 'Quiz Dangal currently focuses on Opinion and GK categories. Unsupported category URLs are redirected to active public quiz sections.',
    features: [
      'Opinion Quiz and GK Quiz are live across the platform',
      'New quizzes every 5 minutes',
      'Win cash prizes and coins',
      'Compete on leaderboards',
    ],
    faqs: [
      { q: 'Which categories are active on Quiz Dangal?', a: 'Quiz Dangal currently focuses on Opinion Quiz and GK Quiz as the two active public categories.' },
      { q: 'How long is each quiz?', a: 'Each quiz lasts 5 minutes and the next quiz starts immediately after, so there is no waiting.' },
      { q: 'Is it free to play?', a: 'Yes. You can join and play public quizzes for free and track your performance on the leaderboard.' },
    ],
  };
}

const slotStartMs = (slot) => (slot?.start_time ? new Date(slot.start_time).getTime() : null);
const slotEndMs = (slot) => (slot?.end_time ? new Date(slot.end_time).getTime() : null);
const isSlotLiveWindow = (slot) => {
  const start = slotStartMs(slot);
  const end = slotEndMs(slot);
  if (!start || !end) return false;
  const now = Date.now();
  return now >= start && now < end;
};
const isSlotUpcomingWindow = (slot) => {
  const start = slotStartMs(slot);
  if (!start) return false;
  return Date.now() < start;
};

const UPCOMING_SOON_WINDOW_MS = 5 * 60 * 1000; // show only the next upcoming when it's within 5 minutes

/** Self-contained countdown that ticks every 1 s — only this component re-renders, NOT the parent */
const SlotCountdown = memo(function SlotCountdown({ startMs, endMs, isActive, formatTimeOnly: fmtTime, startTimeRaw, endTimeRaw }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 1_000_000), 1000);
    return () => clearInterval(id);
  }, []);

  const now = Date.now();
  const upcoming = startMs && now < startMs;
  const secs = upcoming
    ? Math.max(0, Math.floor((startMs - now) / 1000))
    : isActive && endMs
      ? Math.max(0, Math.floor((endMs - now) / 1000))
      : null;
  if (secs === null) return null;

  const mins = Math.floor(secs / 60);
  const secsR = secs % 60;
  const totalWindow = startMs && endMs ? Math.max(1, endMs - startMs) : null;
  const progressed = isActive && totalWindow ? Math.min(100, Math.max(0, Math.round(((now - startMs) / totalWindow) * 100))) : null;

  return (
    <div className={`relative mb-4 rounded-2xl overflow-hidden ${
      isActive
        ? 'bg-gradient-to-r from-red-950/80 via-orange-950/60 to-amber-950/80 border border-red-500/20'
        : 'bg-gradient-to-r from-violet-950/80 via-fuchsia-950/60 to-pink-950/80 border border-violet-500/15'
    }`}>
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className={`w-4 h-4 ${isActive ? 'text-orange-400' : 'text-fuchsia-400'}`} />
          <div>
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
              {isActive ? 'Ends in' : 'Starts in'}
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`text-2xl font-black tabular-nums ${isActive ? 'text-orange-300' : 'text-fuchsia-300'}`}>
                {String(mins).padStart(2, '0')}
              </span>
              <span className={`text-xs font-bold ${isActive ? 'text-orange-500' : 'text-fuchsia-500'} animate-pulse`}>:</span>
              <span className={`text-2xl font-black tabular-nums ${isActive ? 'text-orange-300' : 'text-fuchsia-300'}`}>
                {String(secsR).padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right space-y-1">
          <div className="text-[8px] text-slate-500 font-bold uppercase">Schedule</div>
          <div className="text-[11px] text-slate-300 font-semibold">
            {startTimeRaw ? fmtTime(startTimeRaw) : '—'} → {endTimeRaw ? fmtTime(endTimeRaw) : '—'}
          </div>
        </div>
      </div>
      {progressed !== null && (
        <div className="h-1 bg-black/30">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ${isActive ? 'bg-gradient-to-r from-red-500 via-orange-400 to-amber-400' : 'bg-gradient-to-r from-violet-400 via-fuchsia-500 to-pink-400'}`}
            style={{ width: `${progressed}%` }}
          />
        </div>
      )}
    </div>
  );
});

const CategoryQuizzes = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isSubscribed, subscribeToPush } = usePushNotifications();
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null);
  const [joinedMap, setJoinedMap] = useState({}); // quiz_id -> 'joined' | 'pre'

  // Slot mode state
  const [slots, setSlots] = useState([]);
  const [slotMode, setSlotMode] = useState('legacy'); // slots | legacy
  const [categoryAutoEnabled, setCategoryAutoEnabled] = useState(true);
  const [slotLoadError, setSlotLoadError] = useState(null);
  const [seoExpanded, setSeoExpanded] = useState(false);

  const pollIntervalMs = 60000; // 60s for slot refresh

  const loadSlots = useCallback(async () => {
    try {
      const sb = await getSupabase();
      if (!sb) {
        setSlots([]);
        setCategoryAutoEnabled(true);
        setSlotMode('legacy');
        setSlotLoadError('Supabase is not configured.');
        return;
      }

      const { slots: s, mode, auto } = await fetchSlotsForCategory(sb, slug);
      // Always set slots regardless of mode - fetchSlotsForCategory now returns merged results
      setSlots(s);
      setCategoryAutoEnabled(auto);
      setSlotLoadError(null);
      if (mode === 'slots' || mode === 'legacy') {
        setSlotMode('slots'); // Use slots UI for both - they're unified now
      } else {
        setSlotMode('legacy');
      }
    } catch (e) {
      setSlotLoadError(formatSupabaseError(e) || e?.message || 'Could not load category quizzes.');
      setSlotMode('legacy');
    }
  }, [slug]);

  useEffect(() => {
    setLoading(true);
    // Load all quizzes (both slots and legacy are now merged in loadSlots)
    loadSlots().finally(() => {
      setLoading(false);
    });
  }, [loadSlots]);

  // Poll slots for updates
  useEffect(() => {
    if (slotMode === 'none') return;
    const id = setInterval(() => {
      loadSlots();
    }, pollIntervalMs);
    return () => clearInterval(id);
  }, [slotMode, loadSlots]);

  // Fetch whether current user has joined or pre-joined each quiz
  useEffect(() => {
    const run = async () => {
      // Filter out any null/undefined/empty values and ensure valid UUIDs
      const isValidUuid = (id) => {
        if (!id || typeof id !== 'string') return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
      };
      
      // For slot-based quizzes, use quiz_id (not slot_id) since quiz_participants tracks by quiz_id
      const slotQuizIds = (slots || []).map((s) => s.quizId || s.quiz_id || s.id).filter(isValidUuid);
      
      if (!user || !slotQuizIds.length) {
        setJoinedMap({});
        return;
      }
      try {
        const sb = await getSupabase();
        if (!sb) {
          setJoinedMap({});
          return;
        }
        const map = {};
        
        // Fetch participation status by quiz_id
        const { data, error } = await sb
          .from('quiz_participants')
          .select('quiz_id,status')
          .eq('user_id', user.id)
          .in('quiz_id', slotQuizIds);
        
        if (!error && data) {
          for (const r of data) {
            if (r.quiz_id) {
              map[r.quiz_id] = r.status === 'pre_joined' ? 'pre' : 'joined';
            }
          }
        }
        
        // Also map by slotId for UI lookup (slot cards use slotId as key)
        for (const slot of (slots || [])) {
          const qId = slot.quizId || slot.quiz_id || slot.id;
          if (qId && map[qId] && slot.slotId) {
            map[slot.slotId] = map[qId];
          }
        }
        
        setJoinedMap(map);
      } catch {
        setJoinedMap({});
      }
    };
    run();
  }, [user, slots]);

  const handleJoin = async (q) => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'Please sign in to join the quiz.',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }

    const sb = await getSupabase();
    if (!sb) {
      toast({
        title: 'Setup required',
        description: 'Supabase is not configured for this app.',
        variant: 'destructive',
      });
      return;
    }
    // Get the identifier (slotId for slots, id for legacy quizzes)
    const qId = q.slotId || q.id;

    // Guard: if slot/category is paused/stopped, don't call join_slot (prevents repeated 400s).
    try {
      const st = String(q?.status || '').trim().toLowerCase();
      if (st === 'paused' || st === 'stopped' || st === 'skipped' || q?.stop_override) {
        toast({
          title: 'Paused',
          description: 'This category is paused right now. Please try later.',
          variant: 'destructive',
        });
        return;
      }
    } catch {
      /* ignore */
    }

    // Immediately reflect UI state
    setJoiningId(qId);
    // Try to enable push notifications on first join/pre-join (fire-and-forget; don't block join)
    try {
      if (
        typeof Notification !== 'undefined' &&
        Notification.permission !== 'granted' &&
        !isSubscribed
      ) {
        // Do not await to avoid stalling join on desktop
        Promise.resolve()
          .then(() => subscribeToPush())
          .catch(() => {});
      }
    } catch {
      /* ignore push errors */
    }
    try {
      const result = await smartJoinQuiz({ supabase: sb, quiz: q, user });
      if (result.status === 'error') throw result.error;
      if (result.status === 'already') {
        setJoinedMap((prev) => ({ ...prev, [qId]: 'joined' }));
        toast({ title: 'Already Joined', description: 'You are in this quiz.' });
      } else if (result.status === 'joined') {
        setJoinedMap((prev) => ({ ...prev, [qId]: 'joined' }));
        const rl = rateLimit(`join_${user?.id || 'anon'}`, { max: 4, windowMs: 8000 });
        if (!rl.allowed) {
          toast({
            title: 'Slow down',
            description: 'Please wait a moment before trying again.',
            variant: 'destructive',
          });
        } else {
          toast({ title: 'Joined!', description: 'Taking you to the quiz.' });
          // Navigate to appropriate route
          navigate(q.slotId && !q.isLegacy ? `/quiz/slot/${q.slotId}` : `/quiz/${q.id}`);
        }
      } else if (result.status === 'pre_joined') {
        setJoinedMap((prev) => ({ ...prev, [qId]: 'pre' }));
        toast({ title: 'Pre-joined!', description: 'We will remind you before start.' });
      } else if (result.status === 'scheduled_retry') {
        setJoinedMap((prev) => ({ ...prev, [qId]: 'pre' }));
        toast({ title: 'Pre-joined!', description: 'Auto joining at start time.' });
      }
    } catch (err) {
      const msg = formatSupabaseError(err);
      toast({
        title: 'Error',
        description: msg || err?.message || 'Could not join quiz.',
        variant: 'destructive',
      });
    } finally {
      setJoiningId(null);
    }
  };

  const meta = categoryMeta(slug);
  const seoContent = getCategorySeoContent(slug);

  // Header stats: active/upcoming counts and next start
  const nowHeader = Date.now();
  const slotSource = slotMode === 'slots';
  const liveItems = slots;

  // Slot display policy: show all LIVE, and only the single NEXT upcoming when it is soon.
  const liveSlots = (slots || []).filter((s) => {
    const st = slotStartMs(s);
    const et = slotEndMs(s);
    const now = nowHeader;
    return (st && et && now >= st && now < et) || String(s?.status || '').toLowerCase() === 'active';
  });
  const nextUpcomingSlot = (() => {
    const upcoming = (slots || [])
      .filter((s) => {
        const st = slotStartMs(s);
        if (!st) return false;
        return st > nowHeader;
      })
      .sort((a, b) => (slotStartMs(a) || 0) - (slotStartMs(b) || 0));
    return upcoming[0] || null;
  })();
  const nextUpcomingIsSoon = (() => {
    const st = nextUpcomingSlot ? slotStartMs(nextUpcomingSlot) : null;
    if (!st) return false;
    const delta = st - nowHeader;
    return delta > 0 && delta <= UPCOMING_SOON_WINDOW_MS;
  })();
  const displaySlots = [...liveSlots];
  if (nextUpcomingSlot && nextUpcomingIsSoon) {
    const alreadyInLive = displaySlots.some((s) => s?.slotId && s.slotId === nextUpcomingSlot.slotId);
    if (!alreadyInLive) displaySlots.push(nextUpcomingSlot);
  }
  const activeCount = slotSource
    ? liveItems.filter((slot) => isSlotLiveWindow(slot)).length
    : liveItems.reduce((acc, q) => {
        const st = q.start_time ? new Date(q.start_time).getTime() : 0;
        const et = q.end_time ? new Date(q.end_time).getTime() : 0;
        return acc + (st && et && nowHeader >= st && nowHeader < et ? 1 : 0);
      }, 0);
  // Upcoming count: show only one upcoming slot (when it is soon)
  const upcomingCount = slotSource ? (nextUpcomingSlot && nextUpcomingIsSoon ? 1 : 0) : 0;
  const nextStartTs = slotSource
    ? liveItems
        .map((slot) => slotStartMs(slot))
        .filter((ts) => ts && ts > nowHeader)
        .sort((a, b) => a - b)[0] || null
    : liveItems
        .map((q) => (q.start_time ? new Date(q.start_time).getTime() : null))
        .filter((ts) => ts && ts > nowHeader)
        .sort((a, b) => a - b)[0] || null;
  // Slot classification (only in slot mode)
  const { next: nextSlot } = classifyThreeSlots(slots);

  const renderSlotCard = (slot) => {
    if (!slot) return null;
    const now = Date.now();
    const st = slotStartMs(slot);
    const et = slotEndMs(slot);
    const isActive = isSlotLiveWindow(slot);
    const isPaused = slot.status === 'paused';
    const isFinished = slot.status === 'finished' || (et && now >= et);
    const upcoming = isSlotUpcomingWindow(slot);
    const needsCountdown = (upcoming && st) || (isActive && et);
    const prizes = Array.isArray(slot.prizes) ? slot.prizes : [];
    const prizeType = slot.prize_type || 'coins';
    const p1 = prizes[0] ?? 0;
    const p2 = prizes[1] ?? 0;
    const p3 = prizes[2] ?? 0;
    const formatPrize = (value) => getPrizeDisplay(prizeType, value, { fallback: 0 }).formatted;
    const participantsJoined = slot.participants_total || slot.participants_joined || 0;
    const qCount = slot.questions_count || 10;
    const stopped = !categoryAutoEnabled && !isActive && !upcoming;
    const badge = (() => {
      if (isActive && !isFinished) return 'LIVE';
      if (isPaused) return 'PAUSED';
      if (stopped) return 'STOPPED';
      if (upcoming) return 'UPCOMING';
      if (isFinished) return 'FINISHED';
      return (slot.status || '').toUpperCase();
    })();
    
    const cardId = slot.isLegacy ? slot.quizId : slot.slotId;
    const myJoinStatus = joinedMap[cardId];
    const hasJoined = !!myJoinStatus;
    const isJoining = joiningId === cardId;
    
    const handleClick = async () => {
      if (isFinished) {
        navigate(slot.isLegacy ? `/quiz/${slot.quizId}` : `/quiz/slot/${slot.slotId}`);
        return;
      }
      if (!user) {
        toast({
          title: 'Login Required',
          description: 'Please login to join the quiz.',
          variant: 'destructive',
        });
        navigate('/login', { state: { from: location.pathname, message: 'Login to join the quiz' } });
        return;
      }
      if (hasJoined && !isActive) {
        navigate(slot.isLegacy ? `/quiz/${slot.quizId}` : `/quiz/slot/${slot.slotId}`);
        return;
      }
      if (isActive) {
        navigate(slot.isLegacy ? `/quiz/${slot.quizId}` : `/quiz/slot/${slot.slotId}`);
        return;
      }
      if (upcoming && !hasJoined) {
        await handleJoin({ id: slot.quizId, ...slot });
      }
    };

    return (
      <div
        key={slot.slotId}
        role="button"
        tabIndex={0}
        className="group cursor-pointer animate-fade-up"
        onClick={handleClick}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
      >
        {/* Animated conic gradient border */}
        <div className={`relative rounded-[20px] p-[2px] overflow-hidden transition-all group-hover:-translate-y-1 ${
          isActive 
            ? 'bg-[conic-gradient(from_0deg,#ef4444,#f97316,#eab308,#ef4444)] shadow-[0_0_30px_-5px_rgba(239,68,68,0.3)]'
            : isPaused
              ? 'bg-[conic-gradient(from_0deg,#f59e0b,#d97706,#b45309,#f59e0b)] shadow-[0_0_20px_-5px_rgba(245,158,11,0.25)]'
              : isFinished
                ? 'bg-[conic-gradient(from_0deg,#10b981,#06b6d4,#3b82f6,#10b981)] shadow-[0_0_20px_-5px_rgba(16,185,129,0.25)]'
                : 'bg-[conic-gradient(from_0deg,#a855f7,#ec4899,#f43f5e,#a855f7)] shadow-[0_0_30px_-5px_rgba(168,85,247,0.3)]'
        }`}>
          <div className="relative rounded-[18px] bg-[#08080f] p-4 sm:p-5 lg:p-6 overflow-hidden">
            {/* Top shimmer glow */}
            <div className={`absolute top-0 left-0 right-0 h-24 opacity-30 pointer-events-none ${
              isActive 
                ? 'bg-gradient-to-b from-red-500/25 via-orange-500/10 to-transparent'
                : isPaused
                  ? 'bg-gradient-to-b from-amber-500/20 via-yellow-500/10 to-transparent'
                  : isFinished
                    ? 'bg-gradient-to-b from-emerald-500/20 via-teal-500/10 to-transparent'
                    : 'bg-gradient-to-b from-violet-500/25 via-fuchsia-500/10 to-transparent'
            }`} />

            {/* Badge Row */}
            <div className="relative flex items-center justify-between mb-3">
              <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-full ${
                isActive
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-[0_4px_15px_-3px_rgba(239,68,68,0.5)]'
                  : isPaused
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-[0_4px_15px_-3px_rgba(245,158,11,0.5)]'
                    : isFinished
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_4px_12px_-3px_rgba(16,185,129,0.5)]'
                      : 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-[0_4px_15px_-3px_rgba(168,85,247,0.5)]'
              }`}>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                {badge === 'LIVE' ? '🔴 LIVE NOW' : badge === 'UPCOMING' ? '⏰ UPCOMING' : badge === 'PAUSED' ? '⏸️ PAUSED' : badge === 'FINISHED' ? '✅ FINISHED' : badge}
              </span>
              <div className="flex items-center gap-1 text-slate-500">
                <Users className="w-3 h-3" />
                <span className="text-[10px] font-bold">{participantsJoined}</span>
              </div>
            </div>

            {/* Title */}
            <h3 className="relative text-base sm:text-lg font-bold text-white mb-4 leading-snug line-clamp-2">
              {slot.quiz_title || slot.title || 'Quiz'}
            </h3>

            {/* Timer — Self-contained countdown (only this component re-renders every 1s) */}
            {needsCountdown && (
              <SlotCountdown
                startMs={st}
                endMs={et}
                isActive={isActive}
                formatTimeOnly={formatTimeOnly}
                startTimeRaw={slot.start_time}
                endTimeRaw={slot.end_time}
              />
            )}

            {/* Prizes — Medal cards */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: '1st', emoji: '🥇', value: formatPrize(p1), bg: 'from-rose-500/20 to-pink-600/10', border: 'border-rose-500/25', text: 'text-rose-300', glow: 'shadow-rose-500/10' },
                { label: '2nd', emoji: '🥈', value: formatPrize(p2), bg: 'from-violet-400/15 to-purple-500/10', border: 'border-violet-400/20', text: 'text-violet-300', glow: 'shadow-violet-400/5' },
                { label: '3rd', emoji: '🥉', value: formatPrize(p3), bg: 'from-cyan-500/15 to-teal-600/10', border: 'border-cyan-500/20', text: 'text-cyan-300', glow: 'shadow-cyan-500/10' },
              ].map((prize) => (
                <div key={prize.label} className={`relative text-center py-3 rounded-2xl bg-gradient-to-b ${prize.bg} border ${prize.border} shadow-lg ${prize.glow}`}>
                  <div className="text-lg leading-none">{prize.emoji}</div>
                  <div className={`text-sm font-black ${prize.text} mt-1`}>{prize.value}</div>
                </div>
              ))}
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-slate-800/60 border border-slate-700/40 text-slate-400 font-medium">
                📝 {qCount} Qs
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-slate-800/60 border border-slate-700/40 text-slate-400 font-medium">
                🌐 Hindi / English
              </span>
            </div>

            {/* CTA Button (full width) */}
            <button
              type="button"
              disabled={isJoining}
              onClick={(e) => { e.stopPropagation(); handleClick(); }}
              onMouseEnter={() => prefetchRoute(slot.isLegacy ? `/quiz/${slot.quizId}` : `/quiz/slot/${slot.slotId}`)}
              className={`w-full py-3 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all active:scale-[0.97] ${
                isJoining ? 'opacity-50 cursor-wait bg-slate-700 text-slate-300' :
                isActive 
                  ? 'bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 text-white shadow-[0_8px_25px_-5px_rgba(244,63,94,0.5)]'
                  : isPaused
                    ? 'bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-[0_6px_20px_-4px_rgba(100,116,139,0.4)]'
                    : isFinished
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_6px_20px_-4px_rgba(16,185,129,0.3)]'
                      : 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 text-white shadow-[0_8px_25px_-5px_rgba(168,85,247,0.5)]'
              }`}
            >
              {isJoining ? (
                'Joining...'
              ) : isFinished ? (
                <><Trophy className="w-4 h-4" /> RESULTS <ChevronRight className="w-4 h-4 opacity-60" /></>
              ) : isActive ? (
                <><Play className="w-4 h-4" fill="currentColor" /> PLAY NOW <ChevronRight className="w-4 h-4 opacity-60" /></>
              ) : hasJoined ? (
                <><Play className="w-4 h-4" fill="currentColor" /> PLAY <ChevronRight className="w-4 h-4 opacity-60" /></>
              ) : (
                <><Play className="w-4 h-4" fill="currentColor" /> {upcoming ? 'PRE-JOIN' : 'JOIN NOW'} <ChevronRight className="w-4 h-4 opacity-60" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };
  // Push reminder scheduling for next slot (simple local toast) – front-end only placeholder
  useEffect(() => {
    if (!nextSlot) return;
    const st = nextSlot.start_time ? new Date(nextSlot.start_time).getTime() : null;
    if (!st) return;
    const now = Date.now();
    const delta = st - now - 60000; // 1 min before start
    if (delta <= 0 || delta > 30 * 60 * 1000) return; // ignore if too near or too far (>30m)
    const id = setTimeout(() => {
      try {
        toast({
          title: 'Upcoming Slot',
          description: '1 minute to start – be ready!',
          duration: 4000,
        });
      } catch (e) {
        /* ignore toast errors */
      }
    }, delta);
    return () => clearTimeout(id);
  }, [nextSlot, toast]);

  const canonical =
    typeof window !== 'undefined'
      ? `${window.location.origin}/category/${slug}/`
      : `https://quizdangal.com/category/${slug}/`;

  // Always index - we now have rich static content (FAQ, features, how-it-works) even when no quizzes are live
  // This ensures Google sees valuable content regardless of when it crawls

  return (
    <div className="min-h-screen px-3 sm:px-4 pt-14 sm:pt-16 pb-6">
      <SeoHead
        title={`${meta.title} – Quiz Dangal`}
        description={`Active and upcoming quizzes in ${meta.title}. Play daily ${meta.title.toLowerCase()} on Quiz Dangal and earn coins.`}
        canonical={canonical}
        robots="index, follow"
        author="Quiz Dangal"
        datePublished="2025-01-15"
        dateModified={BUILD_DATE}
        jsonLd={[{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://quizdangal.com/' },
            { '@type': 'ListItem', position: 2, name: meta.title, item: canonical },
          ],
        }]}
      />
      <div className="max-w-md sm:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto space-y-4">
        {/* Category Header - Responsive */}
        <div className="p-[1px] rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-500/50 via-violet-500/40 to-fuchsia-500/50">
          <div className="rounded-xl sm:rounded-2xl bg-slate-900/95 p-3 sm:p-4 lg:p-5">
            <div className="flex items-center gap-3 sm:gap-4 mb-2">
              <div className="w-9 h-9 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-lg sm:text-2xl lg:text-3xl">
                {meta.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-xl lg:text-2xl font-bold text-white truncate">{meta.title}</h1>
                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs mt-1 flex-wrap">
                  <span className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded sm:rounded-md bg-emerald-600/20 text-emerald-300 border border-emerald-600/30">
                    {activeCount} live
                  </span>
                  <span className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded sm:rounded-md bg-sky-600/20 text-sky-300 border border-sky-600/30">
                    {upcomingCount} upcoming
                  </span>
                  <button
                    type="button"
                    onClick={() => setSeoExpanded((prev) => !prev)}
                    className="inline-flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded sm:rounded-md bg-orange-500/15 text-orange-300 border border-orange-500/30 hover:bg-orange-500/25 transition-colors font-medium cursor-pointer select-none"
                  >
                    {seoExpanded ? 'Read Less' : 'Read More'} ℹ️
                    <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${seoExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
            {nextStartTs && (
              <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-400">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                Next: {formatDateOnly(nextStartTs)} • {formatTimeOnly(nextStartTs)}
              </div>
            )}
          </div>
        </div>

        {import.meta.env.DEV && slotLoadError && (
          <div className="rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900/50 p-3 sm:p-4 text-xs sm:text-sm text-slate-300">
            <div className="font-semibold text-slate-200">Category load issue</div>
            <div className="mt-1 break-words">{slotLoadError}</div>
            <div className="mt-2 text-[11px] text-slate-400">slug: {String(slug || '')} • mode: {String(slotMode)} • slots: {(slots || []).length}</div>
          </div>
        )}

      {slotMode === 'slots' && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-40 sm:h-52 lg:h-60 rounded-xl sm:rounded-2xl bg-slate-800/60 border border-slate-700/60 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <>
              {displaySlots.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
                  {/* Show LIVE slots + only the next UPCOMING (soon) */}
                  {displaySlots.map((slot) => renderSlotCard(slot, null))}
                </div>
              ) : (
                <div className="rounded-xl sm:rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-900/40 to-violet-900/40 p-4 sm:p-6 text-center">
                  <Clock className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-3 text-indigo-400" />
                  <h2 className="text-lg sm:text-xl font-bold text-white mb-2">Next Quiz Starting Soon!</h2>
                  <p className="text-sm sm:text-base text-slate-300">
                    Quizzes run every 5 minutes back-to-back. Refresh or wait for the countdown.
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}

        {/* SEO Content Panel — Always in DOM for search engine indexing; CSS controls visibility */}
        <section
          className={`cat-seo-panel rounded-xl sm:rounded-2xl ${seoExpanded ? 'cat-seo-panel--open' : ''}`}
        >
          <div className="p-[1px] rounded-xl sm:rounded-2xl bg-gradient-to-r from-orange-500/50 via-fuchsia-500/30 to-blue-500/50">
            <div className="cat-seo-panel__body rounded-[11px] sm:rounded-[15px] bg-[#0a0a16]/95 px-4 sm:px-6 py-4">
              <h2 className="text-sm sm:text-base font-bold bg-gradient-to-r from-orange-300 via-fuchsia-300 to-blue-300 bg-clip-text text-transparent mb-3">
                {seoContent.heading}
              </h2>
              <div className="text-xs sm:text-sm text-slate-300/90 leading-relaxed space-y-2.5">
                {seoContent.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CategoryQuizzes;
