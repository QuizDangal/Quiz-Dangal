import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';
import { useAuth } from '@/contexts/SupabaseAuthContext';

// Categories for scheduler (keep in sync with backend expected values)
export const CATEGORIES = ['opinion', 'gk', 'sports', 'movies'];
// Fixed prizes (always enforced everywhere) - in coins
export const PRIZES = [121, 71, 51];
// Quiz duration in minutes (each quiz runs for 5 minutes)
export const QUIZ_DURATION_MINUTES = 5;
// Interval between quiz starts (10 min = 5 min quiz + 5 min gap)
export const QUIZ_INTERVAL_MINUTES = 10;
// 00:00 to 23:50 with 10-min intervals = 144 quizzes per day per category (24 hours)
// (00:00-00:05 quiz, 00:05-00:10 gap, 00:10-00:15 quiz... 23:50-23:55 last quiz)
// 4 categories × 144 = 576 total quizzes per day
export const TOTAL_QUIZZES_PER_DAY = 144;
const QUESTIONS_PER_QUIZ = 10;

// Generate time slots from 00:00 to 23:50 (10-min intervals) - 24 hour schedule
function generateDaySchedule() {
  const times = [];
  let h = 0, m = 0;
  while (h < 24) {
    times.push(String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'));
    m += QUIZ_INTERVAL_MINUTES; // 10 min intervals
    if (m >= 60) { h++; m = m - 60; }
  }
  return times; // 00:00, 00:10, 00:20... 23:50
}

// Category colors
const CATEGORY_COLORS = {
  opinion: { bg: 'bg-pink-600/20', border: 'border-pink-500', text: 'text-pink-400', badge: 'bg-pink-600' },
  gk: { bg: 'bg-emerald-600/20', border: 'border-emerald-500', text: 'text-emerald-400', badge: 'bg-emerald-600' },
  sports: { bg: 'bg-blue-600/20', border: 'border-blue-500', text: 'text-blue-400', badge: 'bg-blue-600' },
  movies: { bg: 'bg-amber-600/20', border: 'border-amber-500', text: 'text-amber-400', badge: 'bg-amber-600' },
};

// Icons
const CategoryIcon = ({ category, className = 'w-4 h-4' }) => {
  const icons = {
    opinion: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    gk: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    sports: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    movies: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
      </svg>
    ),
  };
  return icons[category] || null;
};

export default function DailyScheduler() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const isAdmin = String(userProfile?.role || '').toLowerCase() === 'admin';

  // State
  const [loading, setLoading] = useState(false);
  const [schedulerStatus, setSchedulerStatus] = useState(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('gk');
  const [bulkDate, setBulkDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [bulkText, setBulkText] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [structuredQuizzes, setStructuredQuizzes] = useState([]);
  const [expandedQuiz, setExpandedQuiz] = useState(null);

  // Get today and max date (3 days from today)
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const maxDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  }, []);

  // Load scheduler status
  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      // Try RPC first
      const { data, error } = await supabase.rpc('get_scheduler_status');
      if (!error && data) {
        setSchedulerStatus(data);
        return;
      }
      
      // Fallback: Direct query if RPC not available
      logger.warn('get_scheduler_status RPC failed, using fallback:', error?.message);
      
      const { data: overrides } = await supabase
        .from('category_runtime_overrides')
        .select('category, is_auto')
        .in('category', CATEGORIES);
      
      const { data: slots } = await supabase
        .from('quiz_slots')
        .select('category, status, target_date')
        .gte('target_date', new Date().toISOString().slice(0, 10));
      
      const today = new Date().toISOString().slice(0, 10);
      const categories = CATEGORIES.map(cat => {
        const override = overrides?.find(o => o.category === cat);
        const catSlots = slots?.filter(s => s.category === cat && s.target_date?.slice(0, 10) === today) || [];
        return {
          category: cat,
          is_auto: override?.is_auto ?? true,
          today: {
            total: catSlots.length,
            active: catSlots.filter(s => s.status === 'active').length,
            finished: catSlots.filter(s => s.status === 'finished').length,
            scheduled: catSlots.filter(s => s.status === 'scheduled').length,
            skipped: catSlots.filter(s => s.status === 'skipped').length,
          }
        };
      });
      
      setSchedulerStatus({
        ok: true,
        today,
        current_time: new Date().toISOString(),
        categories
      });
    } catch (e) {
      logger.error('loadStatus error:', e);
      // Set default empty state instead of showing error toast repeatedly
      setSchedulerStatus({
        ok: false,
        today: new Date().toISOString().slice(0, 10),
        current_time: new Date().toISOString(),
        categories: CATEGORIES.map(cat => ({
          category: cat,
          is_auto: true,
          today: { total: 0, active: 0, finished: 0, scheduled: 0, skipped: 0 }
        }))
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [loadStatus]);

  // Toggle category ON/OFF
  const handleToggleAuto = async (category, currentState) => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase.rpc('toggle_category_auto', { 
        p_category: category, 
        p_enabled: !currentState 
      });
      if (error) throw error;
      toast({ 
        title: !currentState ? '▶️ Resumed' : '⏸️ Paused', 
        description: `${category} quiz scheduling ${!currentState ? 'enabled' : 'paused'}.` 
      });
      loadStatus();
    } catch (e) {
      toast({ title: 'Toggle failed', description: e?.message, variant: 'destructive' });
    }
  };

  // Initialize empty structured quizzes
  const initStructuredQuizzes = useCallback(() => {
    return Array.from({ length: TOTAL_QUIZZES_PER_DAY }).map((_, i) => ({
      index: i + 1,
      title: '',
      questions: Array.from({ length: QUESTIONS_PER_QUIZ }).map(() => ({
        question_text: '',
        options: Array.from({ length: 4 }).map(() => ({ option_text: '', is_correct: false })),
      })),
    }));
  }, []);

  // Open bulk modal
  const openBulkModal = (category = 'gk') => {
    setBulkCategory(category);
    setBulkDate(today);
    setBulkText('');
    setStructuredQuizzes(initStructuredQuizzes());
    setExpandedQuiz(null);
    setShowBulkModal(true);
  };

  // Parse bulk text and populate form
  const parseBulkText = useCallback((raw) => {
    const slots = [];
    const errors = [];
    const input = String(raw || '').trim();
    if (!input) return { slots, errors };

    // Try JSON first
    if (input.startsWith('[') || input.startsWith('{')) {
      try {
        const data = JSON.parse(input);
        const arr = Array.isArray(data) ? data : [data];
        for (const entry of arr) {
          const title = entry.title || 'Untitled';
          const questions = Array.isArray(entry.questions) ? entry.questions : [];
          const normalizedQs = questions.slice(0, 10).map((q) => ({
            question_text: q.question_text || q.text || '',
            options: (q.options || []).slice(0, 4).map((o, i) => ({
              option_text: o.option_text || o.text || String(o).trim(),
              is_correct: bulkCategory === 'opinion' ? false : !!(o.is_correct || o.correct || q.correctIndex === i),
            })),
          }));
          slots.push({ title, questions: normalizedQs });
        }
        return { slots, errors };
      } catch (e) {
        errors.push('JSON parse failed: ' + e.message);
        return { slots, errors };
      }
    }

    // Text format parsing
    const rawBlocks = input.split(/\n(?=Category:|Title:)/i);
    for (const block of rawBlocks) {
      const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (!lines.length) continue;
      
      let title = 'Untitled';
      const questions = [];
      let currentQ = null;
      
      for (const ln of lines) {
        if (/^Category:/i.test(ln)) continue; // Skip category line
        if (/^Title:/i.test(ln)) {
          title = ln.split(/:/).slice(1).join(':').trim();
          continue;
        }
        if (/^Prizes?:/i.test(ln)) continue; // Ignore prizes
        
        const qMatch = ln.match(/^Q\d+\.\s*(.+)$/i);
        if (qMatch) {
          if (currentQ) questions.push(currentQ);
          currentQ = { question_text: qMatch[1].trim(), options: [], correctIndex: -1 };
          continue;
        }
        
        const optMatch = ln.match(/^(?:[-*•]|[A-D]\)|[A-D][.:])\s*(.+)$/);
        if (optMatch && currentQ) {
          currentQ.options.push({ option_text: optMatch[1].trim(), is_correct: false });
          continue;
        }
        
        const ansMatch = ln.match(/^Ans(wer)?[:\s]+(.+)$/i);
        if (ansMatch && currentQ) {
          const ans = ansMatch[2].trim();
          const letter = ans.match(/^[A-D]/i)?.[0]?.toUpperCase();
          if (letter) currentQ.correctIndex = { A: 0, B: 1, C: 2, D: 3 }[letter];
        }
      }
      if (currentQ) questions.push(currentQ);
      
      const normalizedQs = questions.slice(0, 10).map((q) => ({
        question_text: q.question_text,
        options: q.options.slice(0, 4).map((o, i) => ({
          option_text: o.option_text,
          is_correct: bulkCategory === 'opinion' ? false : q.correctIndex === i,
        })),
      }));
      
      if (normalizedQs.length > 0) {
        slots.push({ title, questions: normalizedQs });
      }
    }
    
    return { slots, errors };
  }, [bulkCategory]);

  // Fill form from parsed data
  const handleFillForm = () => {
    const { slots, errors } = parseBulkText(bulkText);
    if (errors.length) {
      toast({ title: 'Parse errors', description: errors[0], variant: 'destructive' });
      return;
    }
    if (slots.length === 0) {
      toast({ title: 'No quizzes found', description: 'Could not parse any quizzes from the text.', variant: 'destructive' });
      return;
    }
    if (slots.length !== TOTAL_QUIZZES_PER_DAY) {
      toast({ title: 'Quiz count mismatch', description: `Found ${slots.length} quizzes, need exactly ${TOTAL_QUIZZES_PER_DAY}.`, variant: 'destructive' });
      return;
    }

    const transformed = slots.map((s, i) => {
      const quiz = {
        index: i + 1,
        title: s.title || `Quiz ${i + 1}`,
        questions: s.questions.slice(0, QUESTIONS_PER_QUIZ).map((q) => ({
          question_text: q.question_text || '',
          options: q.options.slice(0, 4).map((o) => ({
            option_text: o.option_text || '',
            is_correct: bulkCategory === 'opinion' ? false : !!o.is_correct,
          })),
        })),
      };
      // Pad missing questions/options
      while (quiz.questions.length < QUESTIONS_PER_QUIZ) {
        quiz.questions.push({
          question_text: '',
          options: Array.from({ length: 4 }).map(() => ({ option_text: '', is_correct: false })),
        });
      }
      for (const qq of quiz.questions) {
        while (qq.options.length < 4) {
          qq.options.push({ option_text: '', is_correct: false });
        }
      }
      return quiz;
    });

    setStructuredQuizzes(transformed);
    toast({ title: '✅ Form populated', description: `${slots.length} quizzes loaded into form.` });
  };

  // Update structured quiz
  const updateQuizTitle = (qi, value) => {
    setStructuredQuizzes((list) => list.map((q, idx) => (idx === qi ? { ...q, title: value } : q)));
  };

  const updateQuestion = (qi, qni, value) => {
    setStructuredQuizzes((list) =>
      list.map((qz, idx) => {
        if (idx !== qi) return qz;
        const questions = qz.questions.map((qq, id2) => (id2 === qni ? { ...qq, question_text: value } : qq));
        return { ...qz, questions };
      })
    );
  };

  const updateOption = (qi, qni, oi, value) => {
    setStructuredQuizzes((list) =>
      list.map((qz, idx) => {
        if (idx !== qi) return qz;
        const questions = qz.questions.map((qq, id2) => {
          if (id2 !== qni) return qq;
          const options = qq.options.map((op, id3) => (id3 === oi ? { ...op, option_text: value } : op));
          return { ...qq, options };
        });
        return { ...qz, questions };
      })
    );
  };

  const setCorrectOption = (qi, qni, oi) => {
    if (bulkCategory === 'opinion') return;
    setStructuredQuizzes((list) =>
      list.map((qz, idx) => {
        if (idx !== qi) return qz;
        const questions = qz.questions.map((qq, id2) => {
          if (id2 !== qni) return qq;
          const options = qq.options.map((op, id3) => ({ ...op, is_correct: id3 === oi }));
          return { ...qq, options };
        });
        return { ...qz, questions };
      })
    );
  };

  // Validate and deploy
  const handleDeploy = async () => {
    if (!isAdmin) return;
    setBulkProcessing(true);

    try {
      // Validate
      if (structuredQuizzes.length !== TOTAL_QUIZZES_PER_DAY) {
        throw new Error(`Need exactly ${TOTAL_QUIZZES_PER_DAY} quizzes, found ${structuredQuizzes.length}`);
      }

      for (const qz of structuredQuizzes) {
        if (!qz.title.trim()) {
          throw new Error(`Quiz #${qz.index}: Title is empty`);
        }
        for (let qi = 0; qi < qz.questions.length; qi++) {
          const qq = qz.questions[qi];
          if (!qq.question_text.trim()) {
            throw new Error(`Quiz #${qz.index}, Q${qi + 1}: Question is empty`);
          }
          for (let oi = 0; oi < qq.options.length; oi++) {
            if (!qq.options[oi].option_text.trim()) {
              throw new Error(`Quiz #${qz.index}, Q${qi + 1}, Option ${oi + 1}: Option is empty`);
            }
          }
          if (bulkCategory !== 'opinion' && !qq.options.some((o) => o.is_correct)) {
            throw new Error(`Quiz #${qz.index}, Q${qi + 1}: No correct answer selected`);
          }
        }
      }

      // Build payload
      const autoTimes = generateDaySchedule();
      const quizzesPayload = structuredQuizzes.map((qz, i) => ({
        time: autoTimes[i],
        title: qz.title.trim(),
        prizes: PRIZES,
        questions: qz.questions.map((qq) => ({
          question_text: qq.question_text.trim(),
          options: qq.options.map((op) => ({
            option_text: op.option_text.trim(),
            is_correct: bulkCategory === 'opinion' ? false : op.is_correct,
          })),
        })),
      }));

      const payload = {
        target_date: bulkDate,
        categories: {
          [bulkCategory]: quizzesPayload,
        },
      };

      // Call RPC
      const { error } = await supabase.rpc('admin_seed_quiz_day_multi', { p_payload: payload });
      if (error) throw error;

      toast({ 
        title: '🎉 Deployed!', 
        description: `${TOTAL_QUIZZES_PER_DAY} quizzes deployed for ${bulkCategory} on ${bulkDate}.` 
      });
      setShowBulkModal(false);
      loadStatus();
    } catch (e) {
      toast({ title: 'Deploy failed', description: e?.message, variant: 'destructive' });
    } finally {
      setBulkProcessing(false);
    }
  };

  // Check quiz validity
  const getQuizValidation = useCallback((qz) => {
    if (!qz.title.trim()) return { valid: false, error: 'No title' };
    for (let qi = 0; qi < qz.questions.length; qi++) {
      const qq = qz.questions[qi];
      if (!qq.question_text.trim()) return { valid: false, error: `Q${qi + 1} empty` };
      for (let oi = 0; oi < qq.options.length; oi++) {
        if (!qq.options[oi].option_text.trim()) return { valid: false, error: `Q${qi + 1} opt ${oi + 1} empty` };
      }
      if (bulkCategory !== 'opinion' && !qq.options.some((o) => o.is_correct)) {
        return { valid: false, error: `Q${qi + 1} no answer` };
      }
    }
    return { valid: true };
  }, [bulkCategory]);

  const validQuizCount = useMemo(() => {
    return structuredQuizzes.filter((qz) => getQuizValidation(qz).valid).length;
  }, [structuredQuizzes, getQuizValidation]);

  return (
    <div className="relative min-h-[600px] rounded-2xl overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM2MzY2ZjEiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl" />
      
      {/* Content */}
      <div className="relative z-10 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Quiz Scheduler
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {TOTAL_QUIZZES_PER_DAY} quizzes/day × 4 categories • 00:00 - 23:50 IST (24hr) • {QUIZ_DURATION_MINUTES} min quiz + {QUIZ_DURATION_MINUTES} min gap
          </p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            Loading...
          </div>
        )}
      </div>

      {/* Quick Stats */}
      {schedulerStatus && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300">Today&apos;s Status</h3>
            <span className="text-[10px] text-slate-500">
              {schedulerStatus.today} • {new Date(schedulerStatus.current_time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {schedulerStatus.categories?.map((cat) => {
              const colors = CATEGORY_COLORS[cat.category] || CATEGORY_COLORS.gk;
              const progress = cat.today.total > 0 ? ((cat.today.finished / cat.today.total) * 100).toFixed(0) : 0;
              return (
                <div key={cat.category} className={`rounded-lg border ${colors.border} ${colors.bg} p-3`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <CategoryIcon category={cat.category} className={`w-4 h-4 ${colors.text}`} />
                      <span className={`text-xs font-semibold uppercase ${colors.text}`}>{cat.category}</span>
                    </div>
                    <button
                      onClick={() => handleToggleAuto(cat.category, cat.is_auto)}
                      disabled={!isAdmin}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                        cat.is_auto 
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                          : 'bg-rose-600/80 text-white hover:bg-rose-600'
                      } disabled:opacity-50`}
                    >
                      {cat.is_auto ? '▶ ON' : '⏸ OFF'}
                    </button>
                  </div>
                  {cat.today.total > 0 ? (
                    <>
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mb-2">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>✓ {cat.today.finished}/{cat.today.total}</span>
                        <span className="text-emerald-400">{cat.today.active > 0 ? `● Live: ${cat.today.active}` : ''}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-[10px] text-slate-500 mt-1">No quizzes deployed</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Deploy Section */}
      {isAdmin && (
        <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/20 rounded-xl border border-indigo-600/30 p-4">
          <h3 className="text-sm font-semibold text-indigo-300 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Bulk Deploy Quizzes
          </h3>
          <p className="text-[11px] text-slate-400 mb-4">
            Deploy {TOTAL_QUIZZES_PER_DAY} quizzes for any category. You can deploy up to 3 days in advance.
          </p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const colors = CATEGORY_COLORS[cat];
              return (
                <button
                  key={cat}
                  onClick={() => openBulkModal(cat)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${colors.border} ${colors.bg} hover:opacity-90 transition-all`}
                >
                  <CategoryIcon category={cat} className={`w-4 h-4 ${colors.text}`} />
                  <span className={`text-sm font-medium ${colors.text} capitalize`}>{cat}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}



      {/* Bulk Upload Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto p-4">
          <div className="w-full max-w-4xl my-8 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
            {/* Modal Header */}
            <div className={`p-4 rounded-t-2xl border-b border-slate-700 ${CATEGORY_COLORS[bulkCategory].bg}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CategoryIcon category={bulkCategory} className={`w-6 h-6 ${CATEGORY_COLORS[bulkCategory].text}`} />
                  <div>
                    <h3 className="text-lg font-bold text-white">Bulk Deploy - {bulkCategory.toUpperCase()}</h3>
                    <p className="text-xs text-slate-400">{TOTAL_QUIZZES_PER_DAY} quizzes × 10 questions × 4 options</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* Date & Category Selection */}
              <div className="flex flex-wrap gap-4 items-center">
                <div>
                  <label htmlFor="bulk-category-select" className="block text-[10px] text-slate-500 mb-1">CATEGORY</label>
                  <select
                    id="bulk-category-select"
                    value={bulkCategory}
                    onChange={(e) => setBulkCategory(e.target.value)}
                    className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="bulk-date-input" className="block text-[10px] text-slate-500 mb-1">DATE (Max 3 days)</label>
                  <input
                    id="bulk-date-input"
                    type="date"
                    value={bulkDate}
                    min={today}
                    max={maxDate}
                    onChange={(e) => setBulkDate(e.target.value)}
                    className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200"
                  />
                </div>
                <div className="flex-1" />
                <div className="text-right">
                  <div className="text-[10px] text-slate-500">VALID QUIZZES</div>
                  <div className={`text-2xl font-bold ${validQuizCount === TOTAL_QUIZZES_PER_DAY ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {validQuizCount}/{TOTAL_QUIZZES_PER_DAY}
                  </div>
                </div>
              </div>

              {/* Paste Section */}
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-slate-300">Paste Quiz Data</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const format = bulkCategory === 'opinion' 
                          ? `Quiz 1
Title: Quiz Title Here
Q1. Question text here?
A) Option A
B) Option B
C) Option C
D) Option D

Q2. Second question?
A) Option A
B) Option B
C) Option C
D) Option D

Q3. Third question?
A) Option A
B) Option B
C) Option C
D) Option D

Q4. Fourth question?
A) Option A
B) Option B
C) Option C
D) Option D

Q5. Fifth question?
A) Option A
B) Option B
C) Option C
D) Option D

Q6. Sixth question?
A) Option A
B) Option B
C) Option C
D) Option D

Q7. Seventh question?
A) Option A
B) Option B
C) Option C
D) Option D

Q8. Eighth question?
A) Option A
B) Option B
C) Option C
D) Option D

Q9. Ninth question?
A) Option A
B) Option B
C) Option C
D) Option D

Q10. Tenth question?
A) Option A
B) Option B
C) Option C
D) Option D

Quiz 2
Title: Next Quiz Title
...`
                          : `Quiz 1
Title: Quiz Title Here
Q1. Question text here?
A) Option A
B) Option B
C) Option C
D) Option D
Answer: A

Q2. Second question?
A) Option A
B) Option B
C) Option C
D) Option D
Answer: B

Q3. Third question?
A) Option A
B) Option B
C) Option C
D) Option D
Answer: C

Q4. Fourth question?
A) Option A
B) Option B
C) Option C
D) Option D
Answer: D

Q5. Fifth question?
A) Option A
B) Option B
C) Option C
D) Option D
Answer: A

Q6. Sixth question?
A) Option A
B) Option B
C) Option C
D) Option D
Answer: B

Q7. Seventh question?
A) Option A
B) Option B
C) Option C
D) Option D
Answer: C

Q8. Eighth question?
A) Option A
B) Option B
C) Option C
D) Option D
Answer: D

Q9. Ninth question?
A) Option A
B) Option B
C) Option C
D) Option D
Answer: A

Q10. Tenth question?
A) Option A
B) Option B
C) Option C
D) Option D
Answer: B

Quiz 2
Title: Next Quiz Title
...`;
                        navigator.clipboard.writeText(format);
                        toast({ title: '📋 Format Copied!', description: 'Paste in Notepad, fill data, then paste here.' });
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition"
                    >
                      📋 Copy Format
                    </button>
                    <button
                      onClick={handleFillForm}
                      disabled={!bulkText.trim()}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition"
                    >
                      Fill Form →
                    </button>
                    <button
                      onClick={() => setBulkText('')}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="w-full h-28 rounded-lg border border-slate-600 bg-slate-900 text-slate-200 text-xs p-3 font-mono resize-none"
                  placeholder={bulkCategory === 'opinion' 
                    ? `Paste ${TOTAL_QUIZZES_PER_DAY} quiz blocks (No Answer needed for Opinion):

Quiz 1
Title: Aaj Ka Sawaal
Q1. Aapko kaunsa color pasand hai?
A) Red  B) Blue  C) Green  D) Yellow
...10 questions...

Quiz 2
Title: Evening Poll
...`
                    : `Paste ${TOTAL_QUIZZES_PER_DAY} quiz blocks:

Quiz 1
Title: GK Morning Quiz
Q1. Bharat ki rajdhani?
A) Mumbai  B) Delhi  C) Kolkata  D) Chennai
Answer: B
...10 questions with answers...

Quiz 2
Title: Sports Quiz
...`}
                />
              </div>

              {/* Quiz Grid */}
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                <div className="sticky top-0 bg-slate-900 py-2 z-10">
                  <h4 className="text-sm font-semibold text-slate-300">Quiz Editor</h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {structuredQuizzes.map((qz, qi) => {
                    const validation = getQuizValidation(qz);
                    const isExpanded = expandedQuiz === qi;
                    return (
                      <button
                        key={qi}
                        onClick={() => setExpandedQuiz(isExpanded ? null : qi)}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          validation.valid 
                            ? 'border-emerald-600/50 bg-emerald-900/20 hover:bg-emerald-900/30' 
                            : 'border-slate-600 bg-slate-800/50 hover:bg-slate-800'
                        } ${isExpanded ? 'ring-2 ring-indigo-500' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-medium text-slate-400">#{qz.index}</span>
                          {validation.valid ? (
                            <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="text-[9px] text-slate-300 truncate">
                          {qz.title || 'Untitled'}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Expanded Quiz Editor */}
                {expandedQuiz !== null && structuredQuizzes[expandedQuiz] && (
                  <div className="mt-4 p-4 rounded-xl border border-indigo-600/50 bg-indigo-900/20">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="text-sm font-semibold text-indigo-300">Quiz #{expandedQuiz + 1}</h5>
                      <button
                        onClick={() => setExpandedQuiz(null)}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        Close
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label htmlFor="expanded-quiz-title" className="block text-[10px] text-slate-500 mb-1">TITLE</label>
                        <input
                          id="expanded-quiz-title"
                          value={structuredQuizzes[expandedQuiz].title}
                          onChange={(e) => updateQuizTitle(expandedQuiz, e.target.value)}
                          placeholder="Enter quiz title..."
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-sm text-slate-200"
                        />
                      </div>
                      {structuredQuizzes[expandedQuiz].questions.map((qq, qni) => (
                        <div key={qni} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                          <span className="block text-[10px] text-slate-500 mb-1">Q{qni + 1}</span>
                          <input
                            value={qq.question_text}
                            onChange={(e) => updateQuestion(expandedQuiz, qni, e.target.value)}
                            placeholder={`Question ${qni + 1}...`}
                            className="w-full px-2 py-1.5 rounded border border-slate-600 bg-slate-900 text-xs text-slate-200 mb-2"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            {qq.options.map((op, oi) => (
                              <label key={oi} className="flex items-center gap-2 p-2 rounded border border-slate-600 bg-slate-900/50">
                                {bulkCategory !== 'opinion' && (
                                  <input
                                    type="radio"
                                    name={`q-${expandedQuiz}-${qni}`}
                                    checked={op.is_correct}
                                    onChange={() => setCorrectOption(expandedQuiz, qni, oi)}
                                    className="w-3 h-3"
                                  />
                                )}
                                <input
                                  value={op.option_text}
                                  onChange={(e) => updateOption(expandedQuiz, qni, oi, e.target.value)}
                                  placeholder={`Option ${oi + 1}`}
                                  className="flex-1 bg-transparent outline-none text-xs text-slate-200"
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-700 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                {bulkCategory === 'opinion' && (
                  <span className="text-pink-400">⚠ Opinion: No correct answers needed</span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStructuredQuizzes(initStructuredQuizzes());
                    setExpandedQuiz(null);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition"
                >
                  Reset All
                </button>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-600 text-slate-200 hover:bg-slate-500 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeploy}
                  disabled={bulkProcessing || validQuizCount !== TOTAL_QUIZZES_PER_DAY}
                  className="px-6 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {bulkProcessing ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deploying...
                    </span>
                  ) : (
                    `🚀 Deploy ${TOTAL_QUIZZES_PER_DAY} Quizzes`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
