import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { m } from '@/lib/motion-lite';
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
import { Users, MessageSquare, Brain, Clapperboard, Clock, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import SeoHead from '@/components/SEO';

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
        'New opinion polls every 10 minutes',
      ],
      faqs: [
        { q: 'How do opinion quizzes work?', a: 'Answer questions based on your personal opinion. Points are awarded based on how your answers align with the majority response.' },
        { q: 'When are new opinion quizzes available?', a: 'New opinion quizzes go live every 10 minutes, 24 hours a day. Each quiz lasts 5 minutes.' },
        { q: 'Can I win real prizes?', a: 'Yes! Top performers in each quiz can win cash prizes and coins that can be redeemed.' },
      ],
    };
  if (s.includes('gk'))
    return {
      title: 'GK Quizzes',
      emoji: '🧠',
      Icon: Brain,
      from: 'from-emerald-600/30',
      to: 'to-teal-600/30',
      ring: 'ring-emerald-500/30',
      description: 'Test your General Knowledge with Quiz Dangal! From history to science, geography to current affairs - challenge yourself with diverse GK questions and compete for prizes.',
      features: [
        'Questions from history, science, geography & more',
        'Competitive leaderboards with real prizes',
        'Learn while you play and earn',
        'Fresh GK questions every 10 minutes',
      ],
      faqs: [
        { q: 'What topics are covered in GK quizzes?', a: 'Our GK quizzes cover a wide range of topics including history, geography, science, sports, politics, arts, and current affairs.' },
        { q: 'How often are new GK quizzes added?', a: 'New GK quizzes are scheduled every 10 minutes throughout the day. Each quiz runs for 5 minutes.' },
        { q: 'Are GK quiz answers verified?', a: 'Yes, all GK questions and answers are carefully verified for accuracy before being added to our platform.' },
      ],
    };
  if (s.includes('sport'))
    return {
      title: 'Sports Quizzes',
      emoji: '🏆',
      Icon: Trophy,
      from: 'from-orange-600/30',
      to: 'to-red-600/30',
      ring: 'ring-orange-500/30',
      description: 'Are you a true sports fan? Test your knowledge of Cricket, Football, Olympics, and more! Quiz Dangal sports quizzes cover everything from legendary matches to current tournaments.',
      features: [
        'Cricket, Football, Olympics & more',
        'Questions on legends and current stars',
        'Live sports trivia during matches',
        'Win prizes with your sports knowledge',
      ],
      faqs: [
        { q: 'Which sports are covered?', a: 'We cover all major sports including Cricket, Football, Tennis, Badminton, Hockey, Olympics, Wrestling, and more.' },
        { q: 'Are there quizzes during live matches?', a: 'Yes! We often run special quizzes during major sporting events and tournaments with extra prizes.' },
        { q: 'How can I improve my sports knowledge?', a: 'Play our quizzes regularly! Each question comes with the correct answer, helping you learn while you compete.' },
      ],
    };
  if (s.includes('movie'))
    return {
      title: 'Movie Quizzes',
      emoji: '🎬',
      Icon: Clapperboard,
      from: 'from-violet-600/30',
      to: 'to-indigo-600/30',
      ring: 'ring-violet-500/30',
      description: 'Bollywood, Hollywood, regional cinema - how well do you know your movies? Quiz Dangal movie quizzes test your knowledge of actors, directors, dialogues, and iconic scenes.',
      features: [
        'Bollywood, Hollywood & regional films',
        'Questions on actors, directors & dialogues',
        'Guess the movie from scenes or songs',
        'Special quizzes on new releases',
      ],
      faqs: [
        { q: 'What kind of movie questions are asked?', a: 'Questions range from identifying actors, famous dialogues, movie plots, songs, directors, awards, and box office facts.' },
        { q: 'Are regional movies covered?', a: 'Yes! We include questions from South Indian, Bengali, Marathi, and other regional film industries.' },
        { q: 'How do I join a movie quiz?', a: 'Simply click on any upcoming or live quiz on this page and press the JOIN button. The quiz will start at the scheduled time.' },
      ],
    };
  return {
    title: `${slug} Quizzes`,
    emoji: '⭐',
    Icon: MessageSquare,
    from: 'from-sky-600/30',
    to: 'to-indigo-600/30',
    ring: 'ring-sky-500/30',
    description: 'Challenge yourself with exciting quizzes on Quiz Dangal! Compete with players across India and win real prizes.',
    features: [
      'New quizzes every 10 minutes',
      'Win cash prizes and coins',
      'Compete on leaderboards',
      'Play anytime, anywhere',
    ],
    faqs: [
      { q: 'How do I join a quiz?', a: 'Click on any upcoming quiz and press JOIN. The quiz will start at the scheduled time.' },
      { q: 'How long is each quiz?', a: 'Each quiz lasts 5 minutes with a 5 minute break between quizzes.' },
      { q: 'Is it free to play?', a: 'Yes! You can join and play quizzes for free. Some premium quizzes may have entry fees with bigger prizes.' },
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
  const [slotMode, setSlotMode] = useState('legacy'); // slots | legacy
  const [categoryAutoEnabled, setCategoryAutoEnabled] = useState(true);
  const [slotLoadError, setSlotLoadError] = useState(null);

  const pollIntervalMs = 20000; // 20s for slot refresh

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
        const sb = await getSupabase();
        if (!sb) return;
        const ids = (quizzes || []).map((q) => q.id);
        if (!ids.length) {
          setCounts({});
          return;
        }
        const { data, error } = await sb.rpc('get_engagement_counts_many', {
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
      // Filter out any null/undefined/empty values and ensure valid UUIDs
      const isValidUuid = (id) => {
        if (!id || typeof id !== 'string') return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
      };
      
      const quizIds = (quizzes || []).map((q) => q.id).filter(isValidUuid);
      // For slot-based quizzes, use quiz_id (not slot_id) since quiz_participants tracks by quiz_id
      const slotQuizIds = (slots || []).map((s) => s.quizId || s.quiz_id || s.id).filter(isValidUuid);
      
      // Combine all quiz IDs (legacy quizzes + slot quiz IDs)
      const allQuizIds = [...new Set([...quizIds, ...slotQuizIds])];
      
      if (!user || !allQuizIds.length) {
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
          .in('quiz_id', allQuizIds);
        
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

  // Always index - we now have rich static content (FAQ, features, how-it-works) even when no quizzes are live
  // This ensures Google sees valuable content regardless of when it crawls

  return (
    <div className="px-3 sm:px-4 pt-14 sm:pt-16 pb-6">
      <SeoHead
        title={`${meta.title} – Quiz Dangal`}
        description={`Active and upcoming quizzes in ${meta.title}. Play daily ${meta.title.toLowerCase()} on Quiz Dangal and earn coins.`}
        canonical={canonical}
        robots="index, follow"
        alternateLocales={['hi_IN', 'en_US']}
        author="Quiz Dangal"
        datePublished="2025-01-01"
        dateModified="2026-01-15"
        jsonLd={[{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://quizdangal.com/' },
            { '@type': 'ListItem', position: 2, name: meta.title, item: canonical },
          ],
        }]}
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

        {import.meta.env.DEV && slotLoadError && (
          <div className="rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900/50 p-3 sm:p-4 text-xs sm:text-sm text-slate-300">
            <div className="font-semibold text-slate-200">Category load issue</div>
            <div className="mt-1 break-words">{slotLoadError}</div>
            <div className="mt-2 text-[11px] text-slate-400">slug: {String(slug || '')} • mode: {String(slotMode)} • slots: {(slots || []).length}</div>
          </div>
        )}

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
              {displaySlots.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {/* Show LIVE slots + only the next UPCOMING (soon) */}
                  {displaySlots.map((slot) => renderSlotCard(slot, null))}
                </div>
              ) : (
                /* Rich static content when no quizzes are live - helps SEO & AdSense */
                <div className="space-y-6">
                  {/* Next quiz coming soon banner */}
                  <div className="rounded-xl sm:rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-900/40 to-violet-900/40 p-4 sm:p-6 text-center">
                    <Clock className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-3 text-indigo-400" />
                    <h2 className="text-lg sm:text-xl font-bold text-white mb-2">Next Quiz Starting Soon!</h2>
                    <p className="text-sm sm:text-base text-slate-300 mb-3">
                      Quizzes run every 10 minutes. The next {meta.title.replace(' Quizzes', '')} quiz will start shortly.
                    </p>
                    <p className="text-xs sm:text-sm text-slate-400">
                      Refresh this page or wait for the countdown to appear.
                    </p>
                  </div>

                  {/* Category description */}
                  {meta.description && (
                    <div className="rounded-xl sm:rounded-2xl border border-slate-700/50 bg-slate-900/50 p-4 sm:p-6">
                      <h2 className="text-base sm:text-lg font-semibold text-white mb-3">About {meta.title}</h2>
                      <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                        {meta.description}
                      </p>
                    </div>
                  )}

                  {/* Features grid */}
                  {meta.features && meta.features.length > 0 && (
                    <div className="rounded-xl sm:rounded-2xl border border-slate-700/50 bg-slate-900/50 p-4 sm:p-6">
                      <h2 className="text-base sm:text-lg font-semibold text-white mb-4">Why Play {meta.title}?</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {meta.features.map((feature, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50">
                            <span className="text-emerald-400 mt-0.5">✓</span>
                            <span className="text-sm text-slate-300">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* FAQ Section */}
                  {meta.faqs && meta.faqs.length > 0 && (
                    <div className="rounded-xl sm:rounded-2xl border border-slate-700/50 bg-slate-900/50 p-4 sm:p-6">
                      <h2 className="text-base sm:text-lg font-semibold text-white mb-4">Frequently Asked Questions</h2>
                      <div className="space-y-4">
                        {meta.faqs.map((faq, idx) => (
                          <div key={idx} className="border-b border-slate-700/50 pb-4 last:border-0 last:pb-0">
                            <h3 className="text-sm sm:text-base font-medium text-white mb-2">{faq.q}</h3>
                            <p className="text-sm text-slate-400">{faq.a}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* How it works */}
                  <div className="rounded-xl sm:rounded-2xl border border-slate-700/50 bg-slate-900/50 p-4 sm:p-6">
                    <h2 className="text-base sm:text-lg font-semibold text-white mb-4">How Quiz Dangal Works</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="text-center p-4 rounded-lg bg-slate-800/50">
                        <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-indigo-600/30 flex items-center justify-center text-xl">1</div>
                        <h3 className="font-medium text-white mb-1">Join a Quiz</h3>
                        <p className="text-xs text-slate-400">Click JOIN when a quiz is live or upcoming</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-slate-800/50">
                        <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-violet-600/30 flex items-center justify-center text-xl">2</div>
                        <h3 className="font-medium text-white mb-1">Answer Questions</h3>
                        <p className="text-xs text-slate-400">You have 5 minutes to answer all questions</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-slate-800/50">
                        <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-emerald-600/30 flex items-center justify-center text-xl">3</div>
                        <h3 className="font-medium text-white mb-1">Win Prizes</h3>
                        <p className="text-xs text-slate-400">Top 3 players win cash prizes & coins</p>
                      </div>
                    </div>
                  </div>

                  {/* Quiz schedule info */}
                  <div className="rounded-xl sm:rounded-2xl border border-amber-500/20 bg-amber-900/10 p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">📅</span>
                      <div>
                        <h3 className="font-medium text-amber-200 mb-1">Quiz Schedule</h3>
                        <p className="text-sm text-slate-300">
                          {meta.title} run every 10 minutes, 24 hours a day. Each quiz is 5 minutes long with a 5 minute break between quizzes. 
                          Check back regularly for the next live quiz!
                        </p>
                      </div>
                    </div>
                  </div>
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
        /* Rich static content for non-slot mode empty state */
        <div className="space-y-6">
          <div className="rounded-xl sm:rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-900/40 to-violet-900/40 p-4 sm:p-6 text-center">
            <Clock className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-3 text-indigo-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white mb-2">Quizzes Coming Soon!</h2>
            <p className="text-sm sm:text-base text-slate-300">
              {meta.description || `New ${meta.title} are added regularly. Check back soon!`}
            </p>
          </div>
          {meta.features && (
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4 sm:p-6">
              <h2 className="text-base font-semibold text-white mb-3">What to Expect</h2>
              <ul className="space-y-2">
                {meta.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="text-emerald-400">✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
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
