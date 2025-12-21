import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { m } from '@/lib/motion-lite';
import { supabase } from '@/lib/customSupabaseClient';
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
import { Users, MessageSquare, Brain, Clapperboard, Clock, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import SEO from '@/components/SEO';

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
    };
  if (s.includes('gk'))
    return {
      title: 'GK Quizzes',
      emoji: '🧠',
      Icon: Brain,
      from: 'from-emerald-600/30',
      to: 'to-teal-600/30',
      ring: 'ring-emerald-500/30',
    };
  if (s.includes('sport'))
    return {
      title: 'Sports Quizzes',
      emoji: '🏆',
      Icon: Trophy,
      from: 'from-orange-600/30',
      to: 'to-red-600/30',
      ring: 'ring-orange-500/30',
    };
  if (s.includes('movie'))
    return {
      title: 'Movie Quizzes',
      emoji: '🎬',
      Icon: Clapperboard,
      from: 'from-violet-600/30',
      to: 'to-indigo-600/30',
      ring: 'ring-violet-500/30',
    };
  return {
    title: `${slug} Quizzes`,
    emoji: '⭐',
    Icon: MessageSquare,
    from: 'from-sky-600/30',
    to: 'to-indigo-600/30',
    ring: 'ring-sky-500/30',
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

const CategoryQuizzes = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isSubscribed, subscribeToPush } = usePushNotifications();
  const [quizzes] = useState([]); // legacy quizzes list fallback (setQuizzes removed)
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null);
  const [counts, setCounts] = useState({}); // { [quizId]: joined (pre+joined+completed as joined) }
  const [joinedMap, setJoinedMap] = useState({}); // quiz_id -> 'joined' | 'pre'
  const [tick, setTick] = useState(0); // reintroduced for live countdown display recalculation

  // Slot mode state
  const [slots, setSlots] = useState([]);
  const [slotMode, setSlotMode] = useState('detect'); // detect | slots | legacy
  const [categoryAutoEnabled, setCategoryAutoEnabled] = useState(true);

  const pollIntervalMs = 20000; // 20s for slot refresh

  const loadSlots = useCallback(async () => {
    if (!supabase) return;
    try {
      const { slots: s, mode, auto } = await fetchSlotsForCategory(supabase, slug);
      // Always set slots regardless of mode - fetchSlotsForCategory now returns merged results
      setSlots(s);
      setCategoryAutoEnabled(auto);
      if (mode === 'slots' || mode === 'legacy') {
        setSlotMode('slots'); // Use slots UI for both - they're unified now
      } else {
        setSlotMode('legacy');
      }
    } catch {
      setSlotMode('legacy');
    }
  }, [slug]);

  useEffect(() => {
    setLoading(true);
    // Load all quizzes (both slots and legacy are now merged in loadSlots)
    loadSlots().finally(() => {
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadSlots, slug]);

  // Poll slots for updates
  useEffect(() => {
    if (slotMode === 'none') return;
    const id = setInterval(() => {
      loadSlots();
    }, pollIntervalMs);
    return () => clearInterval(id);
  }, [slotMode, loadSlots]);

  // Live countdown tick (only when there are active/upcoming quizzes)
  useEffect(() => {
    const now = Date.now();
    const hasLive = (quizzes || []).some((q) => {
      const st = q.start_time ? new Date(q.start_time).getTime() : 0;
      const et = q.end_time ? new Date(q.end_time).getTime() : 0;
      return (st && now < st) || (st && et && now >= st && now < et);
    });
    if (!hasLive) return;
    const id = setInterval(() => setTick((t) => (t + 1) % 1_000_000), 1000);
    return () => clearInterval(id);
  }, [quizzes]);

  useEffect(() => {
    if (slotMode !== 'slots') return;
    const now = Date.now();
    const hasSlotActivity = (slots || []).some((s) => {
      const st = s.start_time ? new Date(s.start_time).getTime() : 0;
      const et = s.end_time ? new Date(s.end_time).getTime() : 0;
      return (st && now < st) || (st && et && now >= st && now < et);
    });
    if (!hasSlotActivity) return;
    const id = setInterval(() => setTick((t) => (t + 1) % 1_000_000), 1000);
    return () => clearInterval(id);
  }, [slots, slotMode]);

  // Fetch participant counts using bulk RPC; joined = pre_joined + joined(completed included)
  useEffect(() => {
    const run = async () => {
      try {
        const ids = (quizzes || []).map((q) => q.id);
        if (!ids.length) {
          setCounts({});
          return;
        }
        const { data, error } = await supabase.rpc('get_engagement_counts_many', {
          p_quiz_ids: ids,
        });
        if (error) throw error;
        const map = {};
        for (const row of data || []) {
          const pre = row.pre_joined || 0;
          const joined = row.joined || 0; // already includes completed per SQL
          map[row.quiz_id] = pre + joined;
        }
        setCounts(map);
      } catch (e) {
        /* fetch categories fail */
      }
    };
    if (quizzes && quizzes.length) run();
  }, [quizzes]);

  // Fetch whether current user has joined or pre-joined each quiz
  useEffect(() => {
    const run = async () => {
      // Collect IDs from both quizzes and slots
      const quizIds = (quizzes || []).map((q) => q.id).filter(Boolean);
      // For slot-based quizzes, collect slotIds (used as slot_id in quiz_participants)
      const slotIds = (slots || []).filter(s => !s.isLegacy).map((s) => s.slotId).filter(Boolean);
      // For legacy quizzes from slots, collect quizIds
      const legacyQuizIds = (slots || []).filter(s => s.isLegacy).map((s) => s.quizId).filter(Boolean);
      
      const allQuizIds = [...new Set([...quizIds, ...legacyQuizIds])];
      
      if (!user || (!allQuizIds.length && !slotIds.length)) {
        setJoinedMap({});
        return;
      }
      try {
        const map = {};
        
        // Fetch by quiz_id for legacy quizzes
        if (allQuizIds.length) {
          const { data, error } = await supabase
            .from('quiz_participants')
            .select('quiz_id,status')
            .eq('user_id', user.id)
            .in('quiz_id', allQuizIds);
          if (!error && data) {
            for (const r of data) {
              map[r.quiz_id] = r.status === 'pre_joined' ? 'pre' : 'joined';
            }
          }
        }
        
        // Fetch by slot_id for slot-based quizzes
        if (slotIds.length) {
          const { data, error } = await supabase
            .from('quiz_participants')
            .select('slot_id,status')
            .eq('user_id', user.id)
            .in('slot_id', slotIds);
          if (!error && data) {
            for (const r of data) {
              map[r.slot_id] = r.status === 'pre_joined' ? 'pre' : 'joined';
            }
          }
        }
        
        setJoinedMap(map);
      } catch {
        setJoinedMap({});
      }
    };
    run();
  }, [user, quizzes, slots]);

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
      const result = await smartJoinQuiz({ supabase, quiz: q, user });
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

  // Show ONLY Active + Upcoming quizzes (exclude recently finished)
  const filtered = quizzes.filter((q) => {
    if (slotMode === 'slots') return false; // hide legacy list when in slot mode
    const now = Date.now();
    const st = q.start_time ? new Date(q.start_time).getTime() : 0;
    const et = q.end_time ? new Date(q.end_time).getTime() : 0;
    const isActive = st && et && now >= st && now < et;
    const isUpcoming = st && now < st;
    return isActive || isUpcoming;
  });

  const meta = categoryMeta(slug);

  // Header stats: active/upcoming counts and next start
  const nowHeader = Date.now();
  const slotSource = slotMode === 'slots';
  const liveItems = slotSource ? slots : quizzes || [];
  const activeCount = slotSource
    ? liveItems.filter((slot) => isSlotLiveWindow(slot)).length
    : liveItems.reduce((acc, q) => {
        const st = q.start_time ? new Date(q.start_time).getTime() : 0;
        const et = q.end_time ? new Date(q.end_time).getTime() : 0;
        return acc + (st && et && nowHeader >= st && nowHeader < et ? 1 : 0);
      }, 0);
  // Upcoming count: Legacy quizzes = all upcoming, Slot quizzes = within 5 min
  const upcomingCount = liveItems.filter((slot) => {
    const st = slot.start_time ? new Date(slot.start_time).getTime() : 0;
    if (!st || nowHeader >= st) return false;
    // Legacy: count all upcoming, Slot: count only within 5 min
    return slot.isLegacy ? true : (st - nowHeader) <= 5 * 60 * 1000;
  }).length;
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
    const secs =
      upcoming && st
        ? Math.max(0, Math.floor((st - now) / 1000))
        : isActive && et
          ? Math.max(0, Math.floor((et - now) / 1000))
          : null;
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
    
    // Check if user has already joined/pre-joined this quiz
    // For slots, use slotId as key (since that's what pre_join_slot/join_slot expects)
    const cardId = slot.isLegacy ? slot.quizId : slot.slotId;
    const myJoinStatus = joinedMap[cardId]; // 'pre' | 'joined' | undefined
    const hasJoined = !!myJoinStatus;
    const isJoining = joiningId === cardId;
    
    // Determine button text and action
    const getCta = () => {
      if (isFinished) return 'Results';
      if (isActive) return hasJoined ? 'Play' : 'Join Now';
      if (upcoming) return hasJoined ? 'Joined ✓' : 'Pre-Join';
      return 'View';
    };
    const cta = getCta();
    
    // Handle button click
    const handleClick = async () => {
      // Results page - anyone can view
      if (isFinished) {
        navigate(slot.isLegacy ? `/quiz/${slot.quizId}` : `/quiz/slot/${slot.slotId}`);
        return;
      }
      
      // For live/upcoming quizzes, require login
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
        // Already joined upcoming - navigate to lobby
        navigate(slot.isLegacy ? `/quiz/${slot.quizId}` : `/quiz/slot/${slot.slotId}`);
        return;
      }
      if (isActive) {
        // Live quiz - navigate to play
        navigate(slot.isLegacy ? `/quiz/${slot.quizId}` : `/quiz/slot/${slot.slotId}`);
        return;
      }
      if (upcoming && !hasJoined) {
        // Pre-join the quiz - pass the full slot object with id for legacy compatibility
        await handleJoin({ id: slot.quizId, ...slot });
      }
    };
    
    return (
      <div
        key={slot.slotId}
        className="quiz-slot-card"
      >
        <div className={`quiz-slot-card-inner ${isActive ? 'quiz-slot-card-live' : ''}`}>
          {/* Top Row: Language + Badge */}
          <div className="flex justify-between items-center mb-3">
            <span className="quiz-slot-lang">
              🌐 Hindi / English
            </span>
            <span className={`quiz-slot-badge ${
              badge === 'LIVE' ? 'quiz-slot-badge-live' :
              badge === 'UPCOMING' ? 'quiz-slot-badge-upcoming' :
              badge === 'PAUSED' ? 'quiz-slot-badge-paused' :
              'quiz-slot-badge-default'
            }`}>
              {badge === 'LIVE' && <span className="quiz-slot-badge-dot" />}
              {badge}
            </span>
          </div>
          
          {/* Title */}
          <h3 className="text-sm sm:text-base font-bold text-white mb-3 line-clamp-2">
            {slot.quiz_title || slot.title || 'Quiz'}
          </h3>
          
          {/* Time Section - Start & End with Timer */}
          <div className="quiz-slot-time-section">
            <div className="quiz-slot-time-row">
              <div className="quiz-slot-time-box">
                <span className="quiz-slot-time-label">START</span>
                <span className="quiz-slot-time-value">{slot.start_time ? formatTimeOnly(slot.start_time) : '—'}</span>
              </div>
              <div className="quiz-slot-time-divider">→</div>
              <div className="quiz-slot-time-box">
                <span className="quiz-slot-time-label">END</span>
                <span className="quiz-slot-time-value">{slot.end_time ? formatTimeOnly(slot.end_time) : '—'}</span>
              </div>
            </div>
            {secs !== null && (
              <div className={`quiz-slot-timer ${isActive ? 'quiz-slot-timer-live' : ''}`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{upcoming ? 'Starts in' : 'Ends in'}</span>
                <span className="quiz-slot-timer-value">
                  {Math.floor(secs / 60).toString().padStart(2, '0')}:{(secs % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}
          </div>
          
          {/* Prize Section */}
          <div className="quiz-slot-prize-section">
            <div className="quiz-slot-prize-title">🏆 Prizes</div>
            <div className="quiz-slot-prize-row">
              <div className="quiz-slot-prize-item quiz-slot-prize-gold">
                <span className="quiz-slot-prize-rank">1st</span>
                <span className="quiz-slot-prize-value">{formatPrize(p1)}</span>
              </div>
              <div className="quiz-slot-prize-item quiz-slot-prize-silver">
                <span className="quiz-slot-prize-rank">2nd</span>
                <span className="quiz-slot-prize-value">{formatPrize(p2)}</span>
              </div>
              <div className="quiz-slot-prize-item quiz-slot-prize-bronze">
                <span className="quiz-slot-prize-rank">3rd</span>
                <span className="quiz-slot-prize-value">{formatPrize(p3)}</span>
              </div>
            </div>
          </div>
          
          {/* Stats Row */}
          <div className="flex items-center gap-2 mb-3">
            <span className="quiz-slot-stat">
              📝 {qCount} Questions
            </span>
            <span className="quiz-slot-stat">
              <Users className="w-3 h-3" /> {participantsJoined} Joined
            </span>
          </div>
          
          {/* CTA Button */}
          <button
            type="button"
            disabled={isJoining || (hasJoined && upcoming)}
            onClick={handleClick}
            onMouseEnter={() => prefetchRoute(slot.isLegacy ? `/quiz/${slot.quizId}` : `/quiz/slot/${slot.slotId}`)}
            className={`quiz-slot-btn ${
              isJoining ? 'opacity-50 cursor-wait' :
              hasJoined && upcoming ? 'quiz-slot-btn-joined' :
              isActive ? 'quiz-slot-btn-live' : 'quiz-slot-btn-default'
            }`}
          >
            {isJoining ? 'Joining...' : cta}
          </button>
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

  // Removed recent finished inclusion from display; do not mention in description

  const canonical =
    typeof window !== 'undefined'
      ? `${window.location.origin}/category/${slug}/`
      : `https://quizdangal.com/category/${slug}/`;

  return (
    <div className="px-3 sm:px-4 pt-16 sm:pt-20 pb-6">
      <SEO
        title={`${meta.title} – Quiz Dangal`}
        description={`Active and upcoming quizzes in ${meta.title}.`}
        canonical={canonical}
        robots="index, follow"
      />
      <span className="hidden" aria-hidden>
        {tick}
      </span>
      <div className="max-w-md sm:max-w-2xl lg:max-w-4xl mx-auto space-y-4">
        {/* Category Header - Responsive */}
        <div className="p-[1px] rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-500/50 via-violet-500/40 to-fuchsia-500/50">
          <div className="rounded-xl sm:rounded-2xl bg-slate-900/95 p-3 sm:p-4 lg:p-5">
            <div className="flex items-center gap-3 sm:gap-4 mb-2">
              <div className="w-9 h-9 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-lg sm:text-2xl lg:text-3xl">
                {meta.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-xl lg:text-2xl font-bold text-white truncate">{meta.title}</h1>
                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs mt-1">
                  <span className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded sm:rounded-md bg-emerald-600/20 text-emerald-300 border border-emerald-600/30">
                    {activeCount} live
                  </span>
                  <span className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded sm:rounded-md bg-sky-600/20 text-sky-300 border border-sky-600/30">
                    {upcomingCount} upcoming
                  </span>
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

      {slotMode === 'slots' ? (
        <>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-40 sm:h-48 lg:h-52 rounded-xl sm:rounded-2xl bg-slate-800/60 border border-slate-700/60 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <>
              {slots.filter(s => {
                const now = Date.now();
                const st = s.start_time ? new Date(s.start_time).getTime() : null;
                const et = s.end_time ? new Date(s.end_time).getTime() : null;
                const isLive = st && et && now >= st && now < et;
                // Legacy quizzes: show ALL upcoming. Slot quizzes: show within 5 min only
                const isUpcoming = st && now < st;
                const isUpcomingSoon = isUpcoming && (st - now) <= 5 * 60 * 1000;
                // Legacy quizzes show all upcoming, slot quizzes only within 5 min
                return isLive || (s.isLegacy ? isUpcoming : isUpcomingSoon);
              }).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {/* Show LIVE + Legacy UPCOMING (any time) + Slot UPCOMING (within 5 min) */}
                  {slots.filter(s => {
                    const now = Date.now();
                    const st = s.start_time ? new Date(s.start_time).getTime() : null;
                    const et = s.end_time ? new Date(s.end_time).getTime() : null;
                    const isLive = st && et && now >= st && now < et;
                    const isUpcoming = st && now < st;
                    const isUpcomingSoon = isUpcoming && (st - now) <= 5 * 60 * 1000;
                    return isLive || (s.isLegacy ? isUpcoming : isUpcomingSoon);
                  }).map((slot) => renderSlotCard(slot, null))}
                </div>
              ) : (
                <div className="rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900/50 p-4 sm:p-6 text-center text-sm sm:text-base text-slate-400">
                  No quizzes scheduled yet.
                </div>
              )}
            </>
          )}
        </>
      ) : loading ? (
        <div className="grid gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 sm:h-28 rounded-xl sm:rounded-2xl bg-slate-800/60 border border-slate-700/60 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">
          No quizzes in this category yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map((q, idx) => {
            // use tick to trigger re-render every second
            const now = Date.now();
            const st = q.start_time ? new Date(q.start_time).getTime() : null;
            const et = q.end_time ? new Date(q.end_time).getTime() : null;
            const isActive = st && et && now >= st && now < et;
            const isUpcoming = st && now < st;
            const canJoin = isActive || isUpcoming;
            const secs =
              isUpcoming && st
                ? Math.max(0, Math.floor((st - now) / 1000))
                : isActive && et
                  ? Math.max(0, Math.floor((et - now) / 1000))
                  : null;
            const prizes = Array.isArray(q.prizes) ? q.prizes : [];
            const prizeType = q.prize_type || 'coins';
            const p1 = prizes[0] ?? 0;
            const p2 = prizes[1] ?? 0;
            const p3 = prizes[2] ?? 0;
            const formatPrize = (value) => {
              const display = getPrizeDisplay(prizeType, value, { fallback: 0 });
              // Plain text only, no coin icon
              return display.formatted;
            };
            const joined = counts[q.id] || 0;
            const myStatus = joinedMap[q.id];
            // unified UX: show only JOIN/JOINED; treat pre-joined as Joined in UI
            const already = !!myStatus; // 'pre' or 'joined' both count as joined for display
            const totalWindow = st && et ? Math.max(1, et - st) : null;
            const progressed =
              isActive && totalWindow
                ? Math.min(100, Math.max(0, Math.round(((now - st) / totalWindow) * 100)))
                : null;
            return (
              <m.div
                key={q.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                onClick={() => navigate(`/quiz/${q.id}`)}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate(`/quiz/${q.id}`);
                }}
              >
                <div className={`p-[1px] rounded-xl sm:rounded-2xl ${isActive ? 'bg-gradient-to-r from-emerald-500/60 to-green-500/60' : 'bg-gradient-to-r from-indigo-500/40 via-violet-500/30 to-fuchsia-500/40'}`}>
                  <div className="rounded-xl sm:rounded-2xl bg-slate-900/95 p-3 sm:p-4">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-sm sm:text-base font-bold text-white flex-1 min-w-0 line-clamp-2">{q.title}</h3>
                      <div className="shrink-0 flex items-center gap-1">
                        {isActive && <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[9px] sm:text-[10px] font-bold bg-rose-600 text-white">LIVE</span>}
                        {isUpcoming && <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[9px] sm:text-[10px] font-bold bg-sky-600 text-white">SOON</span>}
                        {myStatus && <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[9px] sm:text-[10px] font-semibold bg-indigo-600/20 text-indigo-300 border border-indigo-500/40">Joined</span>}
                      </div>
                    </div>
                    {/* Prize chips */}
                    <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs mb-2">
                      <span className="px-1.5 sm:px-2 py-1 rounded bg-amber-500/15 text-amber-300 border border-amber-600/30">🥇 {formatPrize(p1)}</span>
                      <span className="px-1.5 sm:px-2 py-1 rounded bg-sky-500/15 text-sky-300 border border-sky-600/30">🥈 {formatPrize(p2)}</span>
                      <span className="px-1.5 sm:px-2 py-1 rounded bg-violet-500/15 text-violet-300 border border-violet-600/30">🥉 {formatPrize(p3)}</span>
                    </div>
                    {/* Time info */}
                    <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-400 mb-2">
                      <span>{q.start_time ? formatDateOnly(q.start_time) : '—'}</span>
                      <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-slate-800/60 border border-slate-700/50">
                        {q.start_time ? formatTimeOnly(q.start_time) : '—'} - {q.end_time ? formatTimeOnly(q.end_time) : '—'}
                      </span>
                    </div>
                    {/* Stats row */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-500">
                        <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                        {joined} joined
                      </div>
                      {secs !== null && (
                        <div className="text-xs sm:text-sm font-semibold text-indigo-300">
                          {isUpcoming ? 'In' : 'Ends'} {Math.floor(secs / 60).toString().padStart(2, '0')}:{(secs % 60).toString().padStart(2, '0')}
                        </div>
                      )}
                    </div>
                    {/* Progress bar */}
                    {progressed !== null && (
                      <div className="mb-2 w-full bg-slate-800 rounded-full h-1 sm:h-1.5 overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${progressed}%` }} />
                      </div>
                    )}
                    {/* CTA Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (already || !canJoin) navigate(`/quiz/${q.id}`);
                        else handleJoin(q);
                      }}
                      onMouseEnter={() => prefetchRoute('/quiz')}
                      disabled={joiningId === q.id}
                      className={`w-full h-9 sm:h-10 rounded-lg text-xs sm:text-sm font-bold text-white transition ${
                        isActive
                          ? 'bg-gradient-to-r from-emerald-600 to-green-500 hover:opacity-90'
                          : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90'
                      } ${joiningId === q.id ? 'opacity-80' : ''}`}
                    >
                      {already ? 'JOINED' : !canJoin ? 'VIEW' : joiningId === q.id ? 'JOINING…' : 'JOIN'}
                    </button>
                  </div>
                </div>
              </m.div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
};

export default CategoryQuizzes;
