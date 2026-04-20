import React, { useEffect, useState, useCallback, useRef, memo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { BUILD_DATE } from '@/constants';
import { getSupabase } from '@/lib/customSupabaseClient';
import { fetchSlotsForCategory, classifyThreeSlots, consumePrefetchedSlotData, getCachedSlotSnapshot, getCurrentAndUpcomingQuiz } from '@/lib/slots';
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
import { getIplPredictionMeta, isIplPredictionQuiz } from '@/lib/iplTeams';

function categoryMeta(slug = '') {
  const s = String(slug || '').toLowerCase();
  if (s.includes('opinion'))
    return {
      title: 'IPL / Opinion Quizzes',
      emoji: '🏏',
      Icon: MessageSquare,
      from: 'from-indigo-600/30',
      to: 'to-fuchsia-600/30',
      ring: 'ring-fuchsia-500/30',
      description: 'Play IPL prediction contests first, then explore opinion-style polls inside the same lobby. Quiz Dangal keeps official IPL match quizzes and public opinion rounds together for now.',
      features: [
        'Play official IPL prediction quizzes in the Opinion lobby',
        'Join opinion-style fan polls around match-day moments',
        'See how your opinion matches the majority',
        'Win prizes for popular opinions',
        'New IPL and opinion rounds every 5 minutes',
      ],
      faqs: [
        { q: 'How do opinion quizzes work?', a: 'Answer questions based on your personal opinion. Points are awarded based on how your answers align with the majority response.' },
        { q: 'Are IPL prediction quizzes also inside Opinion?', a: 'Yes. IPL match prediction quizzes appear in the same Opinion lobby, but their official results are published only after admin finalizes the correct outcomes after the match.' },
        { q: 'When are new opinion quizzes available?', a: 'New opinion quizzes go live every 5 minutes, 24 hours a day. Each quiz lasts 5 minutes with no gap in between.' },
        { q: 'Can I win real prizes?', a: 'Yes! Top performers in each quiz can win cash prizes and coins that can be redeemed.' },
      ],
    };
  if (s.includes('gk'))
    return {
      title: 'GK / Current Affairs Quizzes',
      emoji: '🧠',
      Icon: Brain,
      from: 'from-emerald-600/30',
      to: 'to-teal-600/30',
      ring: 'ring-emerald-500/30',
      description: 'Test your General Knowledge and current affairs with Quiz Dangal. Daily rounds cover news, history, science, geography, polity, economy, and more.',
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
  const slotRequestRef = useRef(0);

  const pollIntervalMs = 60000; // 60s for slot refresh

  useEffect(() => {
    if (String(slug || '').toLowerCase().includes('ipl')) {
      navigate('/category/opinion/', { replace: true });
    }
  }, [slug, navigate]);

  const applySlotResult = useCallback((result) => {
    if (!result) return;
    const { slots: s, mode, auto } = result;
    setSlots(s);
    setCategoryAutoEnabled(auto);
    setSlotLoadError(null);
    if (mode === 'slots' || mode === 'legacy') {
      setSlotMode('slots');
    } else {
      setSlotMode('legacy');
    }
  }, []);

  const loadSlots = useCallback(async (requestId = slotRequestRef.current) => {
    try {
      const sb = await getSupabase();
      if (requestId !== slotRequestRef.current) return null;
      if (!sb) {
        setSlots([]);
        setCategoryAutoEnabled(true);
        setSlotMode('legacy');
        setSlotLoadError('Supabase is not configured.');
        return null;
      }
      const result = await fetchSlotsForCategory(sb, slug);
      if (requestId !== slotRequestRef.current) return null;
      applySlotResult(result);
      return result;
    } catch (e) {
      if (requestId !== slotRequestRef.current) return null;
      setSlotLoadError(formatSupabaseError(e) || e?.message || 'Could not load category quizzes.');
      setSlotMode('legacy');
      return null;
    }
  }, [applySlotResult, slug]);

  useEffect(() => {
    const requestId = slotRequestRef.current + 1;
    slotRequestRef.current = requestId;
    const cachedSnapshot = getCachedSlotSnapshot(slug);
    if (cachedSnapshot) {
      applySlotResult(cachedSnapshot);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // Fast path: try RPC for just live + upcoming (1 query vs 3), then refine
    const fastLoad = async () => {
      if (cachedSnapshot) {
        await loadSlots(requestId);
        return;
      }

      try {
        // First check prefetch cache
        const prefetched = consumePrefetchedSlotData(slug);
        if (prefetched) {
          const result = await prefetched;
          if (requestId !== slotRequestRef.current) return;
          if (result) {
            applySlotResult(result);
            setLoading(false);
            void loadSlots(requestId);
            return;
          }
        }
        // Try fast RPC — returns just current + upcoming in ONE call
        const sb = await getSupabase();
        if (requestId !== slotRequestRef.current) return;
        if (!sb) {
          setSlots([]);
          setLoading(false);
          return;
        }
        const { current, upcoming, is_paused } = await getCurrentAndUpcomingQuiz(sb, slug);
        if (requestId !== slotRequestRef.current) return;
        const fastSlots = [current, upcoming].filter(Boolean);
        if (fastSlots.length > 0) {
          applySlotResult({ slots: fastSlots, mode: 'slots', auto: !is_paused });
          setLoading(false);
          // Background: fetch full list for accuracy (e.g. multiple live slots)
          void loadSlots(requestId);
          return;
        }
        // RPC returned nothing — fall through to full fetch
      } catch {
        // RPC failed — fall through
      }
      // Fallback: full fetch
      await loadSlots(requestId);
      if (requestId === slotRequestRef.current) {
        setLoading(false);
      }
    };
    void fastLoad();

    return () => {
      if (slotRequestRef.current === requestId) {
        slotRequestRef.current += 1;
      }
    };
  }, [applySlotResult, slug, loadSlots]);

  // Poll slots for updates
  useEffect(() => {
    if (slotMode === 'none') return;
    const id = setInterval(() => {
      void loadSlots(slotRequestRef.current);
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
  // Also show finished IPL prediction quizzes until admin removes them (status !== 'completed' means still visible)
  const liveSlots = (slots || []).filter((s) => {
    const st = slotStartMs(s);
    const et = slotEndMs(s);
    const now = nowHeader;
    // Never show explicitly hidden quizzes
    if (s?.meta?.hidden_from_category === true) return false;
    const isLive = (st && et && now >= st && now < et) || String(s?.status || '').toLowerCase() === 'active';
    // Show finished/completed IPL prediction quizzes until admin explicitly hides them
    const isFinishedIpl = isIplPredictionQuiz(s) && ['finished', 'completed'].includes(String(s?.status || '').toLowerCase());
    return isLive || isFinishedIpl;
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
    const iplMeta = isIplPredictionQuiz(slot) ? getIplPredictionMeta(slot) : null;
    const teamA = iplMeta?.teamA;
    const teamB = iplMeta?.teamB;
    const resultPublishAtMs = iplMeta?.resultPublishAt ? new Date(iplMeta.resultPublishAt).getTime() : null;
    const isLiveResult = !!iplMeta && isFinished && slot.status !== 'completed' && !!resultPublishAtMs && now < resultPublishAtMs;
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
    const playRoute = slot.isLegacy ? `/quiz/${slot.quizId}` : `/quiz/slot/${slot.slotId}`;
    const resultsRoute = slot.isLegacy ? `/results/${slot.quizId}` : `/results/slot/${slot.slotId}`;
    
    const handleClick = async () => {
      if (isFinished) {
        navigate(resultsRoute);
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
        navigate(playRoute);
        return;
      }
      if (isActive) {
        navigate(playRoute);
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
          iplMeta
            ? isFinished
              ? 'bg-[conic-gradient(from_0deg,#10b981,#22c55e,#06b6d4,#10b981)] shadow-[0_0_24px_-5px_rgba(34,197,94,0.28)]'
              : isActive
                ? 'bg-[conic-gradient(from_0deg,#f97316,#facc15,#fb7185,#38bdf8,#f97316)] shadow-[0_0_34px_-6px_rgba(249,115,22,0.34)]'
                : 'bg-[conic-gradient(from_0deg,#f97316,#facc15,#8b5cf6,#ec4899,#f97316)] shadow-[0_0_34px_-6px_rgba(249,115,22,0.28)]'
            : isActive 
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
              iplMeta
                ? isFinished
                  ? 'bg-gradient-to-b from-emerald-500/20 via-teal-500/10 to-transparent'
                  : 'bg-gradient-to-b from-orange-500/25 via-amber-500/15 to-transparent'
                : isActive 
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
                iplMeta
                  ? isFinished
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_4px_12px_-3px_rgba(16,185,129,0.5)]'
                    : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-[0_4px_15px_-3px_rgba(249,115,22,0.5)]'
                  : isActive
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
            {iplMeta ? (
              <div className="relative mb-4">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-300">IPL Prediction</div>
                <h3 className="mt-2 text-base sm:text-lg font-bold text-white leading-snug line-clamp-2">
                  {iplMeta.fixtureLabel}
                </h3>
              </div>
            ) : (
              <h3 className="relative text-base sm:text-lg font-bold text-white mb-4 leading-snug line-clamp-2">
                {slot.quiz_title || slot.title || 'Quiz'}
              </h3>
            )}

            {iplMeta && (
              <div className="relative mb-4 rounded-[20px] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-cyan-500/15" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.15),transparent_60%)]" />
                <div className="relative border border-white/10 rounded-[20px] p-4">
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-center">
                      <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-2 text-lg font-black shadow-lg ${teamA?.chipClass || 'border-orange-400/40 bg-gradient-to-br from-orange-500/25 to-amber-500/15 text-orange-100'}`}>
                        {teamA?.short || iplMeta.team_a_short || 'A'}
                      </div>
                      <div className="mt-1.5 text-[10px] font-bold text-slate-300 truncate max-w-[70px]">{teamA?.name || iplMeta.team_a || 'Team A'}</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500 to-cyan-500 blur-md opacity-40" />
                        <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-white/20">
                          <span className="text-xs font-black text-white">VS</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-2 text-lg font-black shadow-lg ${teamB?.chipClass || 'border-cyan-400/40 bg-gradient-to-br from-cyan-500/25 to-sky-500/15 text-cyan-100'}`}>
                        {teamB?.short || iplMeta.team_b_short || 'B'}
                      </div>
                      <div className="mt-1.5 text-[10px] font-bold text-slate-300 truncate max-w-[70px]">{teamB?.name || iplMeta.team_b || 'Team B'}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
              {isLiveResult && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-cyan-500/10 border border-cyan-400/20 text-cyan-200 font-medium">
                  📡 Live Result
                </span>
              )}
            </div>

            {/* CTA Button (full width) */}
            <button
              type="button"
              disabled={isJoining}
              onClick={(e) => { e.stopPropagation(); handleClick(); }}
              onMouseEnter={() => prefetchRoute(isFinished ? resultsRoute : playRoute)}
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
                <><Trophy className="w-4 h-4" /> {isLiveResult ? 'LIVE RESULT' : 'RESULTS'} <ChevronRight className="w-4 h-4 opacity-60" /></>
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
                    Read
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
