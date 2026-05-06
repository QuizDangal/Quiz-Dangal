import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Loader2, Plus } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { buildIplPredictionMeta, getIplPredictionMeta, getIplTeam, IPL_TEAMS, isIplPredictionQuiz } from '@/lib/iplTeams';
import { formatDateTime, getPrizeDisplay } from '@/lib/utils';
import { callAdminRpc } from '@/lib/adminRpc';

const createQuestion = () => ({ text: '', points: 1, options: ['', ''] });

const defaultPrizes = ['121', '71', '51'];
const MAX_PRIZE_TIERS = 10;

const MAX_DAYS_AHEAD = 3;

function TeamBadge({ team, align = 'left' }) {
  if (!team) return null;
  return (
    <div className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 ${team.chipClass} ${align === 'center' ? 'justify-center' : ''}`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${team.badgeClass} text-sm font-black text-white shadow-lg`}>
        {team.short}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-[0.16em] opacity-70">IPL Team</div>
        <div className="truncate text-sm font-bold">{team.name}</div>
      </div>
    </div>
  );
}

function PredictionCard({ quiz, action }) {
  const meta = getIplPredictionMeta(quiz);
  const teamA = meta?.teamA;
  const teamB = meta?.teamB;
  const prizes = Array.isArray(quiz?.prizes) ? quiz.prizes : [];
  const resultPublishAt = meta?.resultPublishAt ? formatDateTime(meta.resultPublishAt) : 'Manual';

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0c1020] shadow-[0_24px_70px_rgba(8,15,35,0.35)]">
      <div className={`relative overflow-hidden bg-gradient-to-br ${teamA?.accentClass || 'from-orange-500 via-amber-500 to-yellow-500'} p-[1px]`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_26%)]" />
        <div className="relative rounded-[27px] bg-[#09101c] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/25 bg-orange-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-orange-200">
                <span>🏏</span>
                <span>IPL Prediction</span>
              </div>
              <h3 className="mt-3 text-lg font-black text-white">{meta?.fixtureLabel || 'IPL Match'}</h3>
            </div>
            <div className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${quiz.status === 'completed' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30' : quiz.status === 'finished' ? 'bg-amber-500/15 text-amber-300 border border-amber-400/30' : 'bg-sky-500/15 text-sky-300 border border-sky-400/30'}`}>
              {quiz.status === 'completed' ? 'Published' : quiz.status === 'finished' ? 'Need Result' : 'Scheduled'}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-3">
            <TeamBadge team={teamA} />
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-center">
              <div className="text-xs font-black text-orange-300">VS</div>
            </div>
            <TeamBadge team={teamB} />
          </div>

          <div className="mt-4 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Start</div>
              <div className="mt-1 font-semibold text-white">{quiz.start_time ? formatDateTime(quiz.start_time) : '—'}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">End</div>
              <div className="mt-1 font-semibold text-white">{quiz.end_time ? formatDateTime(quiz.end_time) : '—'}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 sm:col-span-2">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Final Result Time</div>
              <div className="mt-1 font-semibold text-white">{resultPublishAt}</div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
            {prizes.map((value, index) => {
              const prize = getPrizeDisplay(quiz.prize_type || 'coins', value, { fallback: 0 });
              const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
              return (
                <span key={`${quiz.id}-${index}`} className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 font-semibold text-violet-200">
                  {medal} {prize.formatted}
                </span>
              );
            })}
            {meta?.consolationCoins > 0 ? (
              <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-200">
                🎁 +{meta.consolationCoins} for all participants
              </span>
            ) : null}
          </div>

          {action ? <div className="mt-4">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

export default function IPLPredictionManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [busyQuizId, setBusyQuizId] = useState('');
  const [busyTarget, setBusyTarget] = useState('');
  const [quizzes, setQuizzes] = useState([]);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [answerDrafts, setAnswerDrafts] = useState([]);
  const [editingQuestionsQuiz, setEditingQuestionsQuiz] = useState(null);
  const [questionDrafts, setQuestionDrafts] = useState([]);
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkAnswerText, setBulkAnswerText] = useState('');
  const [form, setForm] = useState({
    teamA: IPL_TEAMS[0]?.name || '',
    teamB: IPL_TEAMS[1]?.name || '',
    start_time: '',
    end_time: '',
    result_publish_at: '',
    prizes: [...defaultPrizes],
    consolation_coins: '',
    questions: Array.from({ length: 5 }).map(() => createQuestion()),
  });

  const fixtureLabel = useMemo(() => {
    const teamA = getIplTeam(form.teamA);
    const teamB = getIplTeam(form.teamB);
    if (!teamA || !teamB) return 'Select teams';
    return `${teamA.short} vs ${teamB.short}`;
  }, [form.teamA, form.teamB]);

  const loadQuizzes = useCallback(async () => {
    if (!supabase) {
      setQuizzes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('category', 'opinion')
      .eq('is_prediction', true)
      .order('start_time', { ascending: false })
      .limit(200);

    if (error) {
      toast({ title: 'IPL quizzes load failed', description: error.message, variant: 'destructive' });
      setQuizzes([]);
    } else {
      setQuizzes((data || []).filter((item) => isIplPredictionQuiz(item)));
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

  const resetForm = useCallback(() => {
    setBulkText('');
    setForm({
      teamA: IPL_TEAMS[0]?.name || '',
      teamB: IPL_TEAMS[1]?.name || '',
      start_time: '',
      end_time: '',
      result_publish_at: '',
      prizes: [...defaultPrizes],
      consolation_coins: '',
      questions: Array.from({ length: 5 }).map(() => createQuestion()),
    });
  }, []);

  const parseBulkText = useCallback((raw) => {
    const input = String(raw || '').trim();
    if (!input) return [];

    // Try JSON first
    if (input.startsWith('[') || input.startsWith('{')) {
      try {
        const data = JSON.parse(input);
        const arr = Array.isArray(data) ? data : [data];
        return arr.flatMap((entry) => {
          const questions = Array.isArray(entry.questions) ? entry.questions : [];
          return questions.map((q) => ({
            text: q.question_text || q.text || '',
            points: Math.max(1, Number(q.points) || 1),
            options: (q.options || []).slice(0, 6).map((o) => o.option_text || o.text || String(o).trim()),
          }));
        });
      } catch {
        return [];
      }
    }

    // Text format: Q1. question text \n - option1 \n - option2
    const questions = [];
    let currentQ = null;
    const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    for (const ln of lines) {
      const qMatch = ln.match(/^Q\d+\.\s*(.+)$/i);
      if (qMatch) {
        if (currentQ && currentQ.text) questions.push(currentQ);
        let qText = qMatch[1].trim();
        // Extract points from patterns like [5pts], (5pts), [5 points], (5 points), [pts:5], [5p]
        let pts = 1;
        const ptsMatch = qText.match(/\[\s*(?:pts?[:\s*]?)?\s*(\d+)\s*(?:pts?|points?)?\s*\]|\(\s*(?:pts?[:\s*]?)?\s*(\d+)\s*(?:pts?|points?)?\s*\)/i);
        if (ptsMatch) {
          pts = Math.max(1, parseInt(ptsMatch[1] || ptsMatch[2], 10) || 1);
          qText = qText.replace(ptsMatch[0], '').trim();
        }
        currentQ = { text: qText, points: pts, options: [] };
        continue;
      }
      const optMatch = ln.match(/^(?:[-*•]|[A-F]\)|[A-F][.:])\s*(.+)$/i);
      if (optMatch && currentQ) {
        currentQ.options.push(optMatch[1].trim());
      }
    }
    if (currentQ && currentQ.text) questions.push(currentQ);
    return questions;
  }, []);

  const handleParseBulk = () => {
    const parsed = parseBulkText(bulkText);
    if (parsed.length === 0) {
      toast({ title: 'No questions found', description: 'Could not parse any questions from the text.', variant: 'destructive' });
      return;
    }
    const newQuestions = parsed.map((q) => ({
      text: q.text,
      points: q.points,
      options: q.options.length >= 2 ? q.options : ['', ''],
    }));
    setForm((current) => ({ ...current, questions: newQuestions }));
    toast({ title: `${newQuestions.length} questions loaded`, description: 'Questions populated from paste. Review and adjust as needed.' });
  };

  const handleParseBulkAnswers = () => {
    const input = String(bulkAnswerText || '').trim();
    if (!input) {
      toast({ title: 'No input', description: 'Pehle answers paste karo.', variant: 'destructive' });
      return;
    }

    const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    setAnswerDrafts((currentDrafts) => {
      const newDrafts = [...currentDrafts];
      let lineIndex = 0;

      for (let i = 0; i < newDrafts.length; i++) {
        if (lineIndex >= lines.length) break;

        const line = lines[lineIndex].replace(/^(?:Q?\d+[.:)]|\*|-|•|[A-F]\)|[A-F][.:])\s*/i, '').trim().toLowerCase();
        
        const matchingOption = newDrafts[i].options.find(
          opt => {
            const optText = opt.option_text.trim().toLowerCase();
            return optText === line || optText.startsWith(line) || line.startsWith(optText);
          }
        );

        if (matchingOption) {
          newDrafts[i].correct_option_id = matchingOption.id;
        }
        
        lineIndex++;
      }
      return newDrafts;
    });

    toast({ title: 'Answers mapped', description: 'Pasted answers mapped to options. Please review before saving.' });
    setBulkAnswerText('');
  };

  const handleCreate = async () => {
    if (!supabase || saving) return;
    const teamA = getIplTeam(form.teamA);
    const teamB = getIplTeam(form.teamB);
    const questions = form.questions
      .map((item) => ({
        question_text: item.text.trim(),
        points: Math.max(1, Number(item.points) || 1),
        options: item.options.map((option) => option.trim()).filter(Boolean),
      }))
      .filter((item) => item.question_text && item.options.length >= 2);
    const prizes = form.prizes.map((value) => parseInt(value || '0', 10)).filter((value) => Number.isFinite(value) && value > 0);
    const consolationCoins = Math.max(0, parseInt(form.consolation_coins || '0', 10) || 0);
    const resultPublishAt = form.result_publish_at ? new Date(form.result_publish_at) : null;

    if (!teamA || !teamB) {
      toast({ title: 'Select teams', description: 'Please choose both IPL teams.', variant: 'destructive' });
      return;
    }
    if (teamA.id === teamB.id) {
      toast({ title: 'Different teams required', description: 'Team A and Team B cannot be the same.', variant: 'destructive' });
      return;
    }
    if (!form.start_time || !form.end_time) {
      toast({ title: 'Set timings', description: 'Start and end time are required.', variant: 'destructive' });
      return;
    }
    if (!form.result_publish_at || !resultPublishAt || Number.isNaN(resultPublishAt.getTime())) {
      toast({ title: 'Set final result time', description: 'Final result publish time is required for IPL quizzes.', variant: 'destructive' });
      return;
    }
    if (new Date(form.end_time) <= new Date(form.start_time)) {
      toast({ title: 'Invalid schedule', description: 'End time must be after start time.', variant: 'destructive' });
      return;
    }

    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + MAX_DAYS_AHEAD);
    maxDate.setHours(23, 59, 59, 999);
    if (new Date(form.start_time) > maxDate) {
      toast({ title: 'Too far ahead', description: `IPL quiz sirf ${MAX_DAYS_AHEAD} din aage tak schedule ho sakti hai.`, variant: 'destructive' });
      return;
    }

    if (resultPublishAt <= new Date(form.end_time)) {
      toast({ title: 'Invalid final result time', description: 'Final result time must be after quiz end time.', variant: 'destructive' });
      return;
    }
    if (prizes.length === 0) {
      toast({ title: 'Set prizes', description: 'At least one prize is required.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const metaExtras = {
        team_a_id: teamA.id,
        team_b_id: teamB.id,
        fixture_label: `${teamA.short} vs ${teamB.short}`,
        result_publish_at: resultPublishAt.toISOString(),
      };
      if (consolationCoins > 0) {
        metaExtras.consolation_coins = String(consolationCoins);
      }
      const meta = buildIplPredictionMeta(teamA.name, teamB.name, metaExtras);
      const title = `IPL Prediction • ${teamA.short} vs ${teamB.short}`;
      const prizePool = prizes.reduce((sum, value) => sum + value, 0);

      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          title,
          category: 'opinion',
          start_time: new Date(form.start_time).toISOString(),
          end_time: new Date(form.end_time).toISOString(),
          prizes,
          prize_pool: prizePool,
          prize_type: 'coins',
          is_prediction: true,
          meta,
          status: 'upcoming',
        })
        .select('id,title')
        .single();

      if (quizError) throw quizError;

      for (const [questionIndex, question] of questions.entries()) {
        const { data: questionRow, error: questionError } = await supabase
          .from('questions')
          .insert({
            quiz_id: quiz.id,
            question_text: question.question_text,
            position: questionIndex + 1,
            points: question.points,
          })
          .select('id')
          .single();

        if (questionError) throw questionError;

        const { error: optionsError } = await supabase.from('options').insert(
          question.options.map((optionText) => ({
            question_id: questionRow.id,
            option_text: optionText,
            is_correct: false,
          })),
        );

        if (optionsError) throw optionsError;
      }

      toast({ title: 'IPL prediction created', description: `${title} is ready inside Opinion quizzes.` });
      resetForm();
      setShowCreate(false);
      await loadQuizzes();
    } catch (error) {
      toast({ title: 'Create failed', description: error.message || 'Could not create prediction quiz.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openFinalize = async (quiz) => {
    if (!supabase) return;
    setBusyQuizId(quiz.id);
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*, options(id,option_text,is_correct)')
        .eq('quiz_id', quiz.id)
        .order('position', { ascending: true, nullsFirst: false });

      if (error) throw error;

      setEditingQuiz(quiz);
      setAnswerDrafts(
        (data || []).map((question) => ({
          id: question.id,
          question_text: question.question_text,
          points: Math.max(1, Number(question.points) || 1),
          options: Array.isArray(question.options) ? question.options : [],
          correct_option_id:
            (question.options || []).find((option) => option.is_correct)?.id || '',
        })),
      );
    } catch (error) {
      toast({ title: 'Could not open finalizer', description: error.message, variant: 'destructive' });
    } finally {
      setBusyQuizId('');
    }
  };

  const saveOfficialAnswers = async ({ questionId = null, publishNow = false } = {}) => {
    if (!supabase || !editingQuiz || answerDrafts.length === 0) return;

    const drafts = questionId
      ? answerDrafts.filter((question) => question.id === questionId)
      : answerDrafts;

    const payload = drafts
      .filter((question) => question.correct_option_id)
      .map((question) => ({
        question_id: question.id,
        correct_option_id: question.correct_option_id,
      }));

    if (publishNow && payload.length !== answerDrafts.length) {
      toast({ title: 'Select all official answers', description: 'Final publish se pehle har question ka official answer set karo.', variant: 'destructive' });
      return;
    }

    if (payload.length === 0) {
      toast({ title: 'Select an official answer', description: 'At least one question needs an official answer before saving.', variant: 'destructive' });
      return;
    }

    setBusyQuizId(editingQuiz.id);
    setBusyTarget(publishNow ? 'publish' : questionId || 'save-all');
    try {
      await callAdminRpc('updateCorrectAnswers', {
        p_quiz_id: editingQuiz.id,
        p_answers: payload,
      });

      if (publishNow) {
        await callAdminRpc('finalizePredictionQuiz', {
          p_quiz_id: editingQuiz.id,
        });

        toast({ title: 'Results published', description: 'Official IPL answers saved and final results are now live.' });
        setEditingQuiz(null);
        setAnswerDrafts([]);
      } else if (questionId) {
        toast({ title: 'Official answer saved', description: 'Pre-result leaderboard has been refreshed for players.' });
      } else {
        toast({ title: 'Official answers saved', description: 'Current pre-result leaderboard has been refreshed.' });
      }

      await loadQuizzes();
    } catch (error) {
      toast({ title: publishNow ? 'Publish failed' : 'Save failed', description: error.message, variant: 'destructive' });
    } finally {
      setBusyQuizId('');
      setBusyTarget('');
    }
  };

  const handleFinalize = async () => {
    await saveOfficialAnswers({ publishNow: true });
  };

  const openEditQuestions = async (quiz) => {
    if (!supabase) return;
    setBusyQuizId(quiz.id);
    setBusyTarget('editq');
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*, options(id,option_text,is_correct)')
        .eq('quiz_id', quiz.id)
        .order('position', { ascending: true, nullsFirst: false });
      if (error) throw error;
      const drafts = (data || []).map((q) => ({
        id: q.id,
        text: q.question_text,
        points: Math.max(1, Number(q.points) || 1),
        options: (q.options || []).map((o) => ({ id: o.id, text: o.option_text })),
        isNew: false,
      }));
      setQuestionDrafts(drafts.length > 0 ? drafts : [{ id: null, text: '', points: 1, options: [{ id: null, text: '' }, { id: null, text: '' }], isNew: true }]);
      setEditingQuestionsQuiz(quiz);
    } catch (err) {
      toast({ title: 'Could not load questions', description: err.message, variant: 'destructive' });
    } finally {
      setBusyQuizId('');
      setBusyTarget('');
    }
  };

  const saveQuestionDrafts = async () => {
    if (!supabase || !editingQuestionsQuiz) return;
    setSavingQuestions(true);
    try {
      for (const [idx, q] of questionDrafts.entries()) {
        const questionText = q.text.trim();
        const validOptions = q.options.map((o) => o.text.trim()).filter(Boolean);
        if (!questionText || validOptions.length < 2) continue;

        if (q.isNew || !q.id) {
          const { data: newQ, error: qErr } = await supabase
            .from('questions')
            .insert({ quiz_id: editingQuestionsQuiz.id, question_text: questionText, points: q.points, position: idx + 1 })
            .select('id').single();
          if (qErr) throw qErr;
          const { error: newOptErr } = await supabase
            .from('options')
            .insert(validOptions.map((t) => ({ question_id: newQ.id, option_text: t, is_correct: false })));
          if (newOptErr) throw newOptErr;
        } else {
          const { error: updQuestionErr } = await supabase
            .from('questions')
            .update({ question_text: questionText, points: q.points, position: idx + 1 })
            .eq('id', q.id);
          if (updQuestionErr) throw updQuestionErr;
          for (const opt of q.options) {
            const optText = opt.text.trim();
            if (!optText) continue;
            if (opt.id) {
              const { error: updOptErr } = await supabase
                .from('options')
                .update({ option_text: optText })
                .eq('id', opt.id);
              if (updOptErr) throw updOptErr;
            } else {
              const { error: addOptErr } = await supabase
                .from('options')
                .insert({ question_id: q.id, option_text: optText, is_correct: false });
              if (addOptErr) throw addOptErr;
            }
          }
        }
      }
      toast({ title: 'Questions saved!' });
      setEditingQuestionsQuiz(null);
      setQuestionDrafts([]);
      await loadQuizzes();
    } catch (err) {
      const msg = String(err?.message || 'Could not save questions.');
      const friendly = msg.includes('prediction_questions_locked_after_start')
        ? 'Quiz start ho chuki hai. Questions edit/delete allowed nahi hai.'
        : msg;
      toast({ title: 'Save failed', description: friendly, variant: 'destructive' });
    } finally {
      setSavingQuestions(false);
    }
  };

  const deleteQuestion = async (q, idx) => {
    if (q.id && supabase) {
      try {
        const { error: delErr } = await supabase.from('questions').delete().eq('id', q.id);
        if (delErr) throw delErr;
      } catch (err) {
        const msg = String(err?.message || 'Could not delete question.');
        const friendly = msg.includes('prediction_questions_locked_after_start')
          ? 'Quiz start ho chuki hai. Ab question delete nahi ho sakta.'
          : msg;
        toast({ title: 'Delete failed', description: friendly, variant: 'destructive' });
        return;
      }
    }
    setQuestionDrafts((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDeleteQuiz = async (quiz) => {
    if (!supabase) return;
    const label = getIplPredictionMeta(quiz)?.fixtureLabel || quiz.title || 'this IPL quiz';
    if (!window.confirm(`Delete "${label}"?\nAll questions, options, participants and results will be removed permanently. This cannot be undone.`)) {
      return;
    }
    setBusyQuizId(quiz.id);
    setBusyTarget('delete');
    try {
      await callAdminRpc('deleteQuiz', { p_quiz_id: quiz.id });
      toast({ title: 'IPL quiz deleted', description: `${label} removed with all related data.` });
      await loadQuizzes();
    } catch (err) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    } finally {
      setBusyQuizId('');
      setBusyTarget('');
    }
  };

  const handleHideFromCategory = async (quiz) => {
    if (!supabase) return;
    setBusyQuizId(quiz.id);
    setBusyTarget('hide');
    try {
      const currentMeta = (quiz.meta && typeof quiz.meta === 'object') ? quiz.meta : {};
      const { error } = await supabase
        .from('quizzes')
        .update({ meta: { ...currentMeta, hidden_from_category: true } })
        .eq('id', quiz.id);
      if (error) throw error;
      toast({ title: 'Hidden from category', description: 'Quiz ab category se nahi dikhegi.' });
      await loadQuizzes();
    } catch (err) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    } finally {
      setBusyQuizId('');
      setBusyTarget('');
    }
  };

  const upcomingOrLive = useMemo(
    () => quizzes.filter((quiz) => !['finished', 'completed'].includes(String(quiz.status || '').toLowerCase())),
    [quizzes],
  );

  const needsOfficialResult = useMemo(
    () => quizzes.filter((quiz) => String(quiz.status || '').toLowerCase() === 'finished'),
    [quizzes],
  );

  const published = useMemo(
    () => quizzes.filter((quiz) => String(quiz.status || '').toLowerCase() === 'completed'),
    [quizzes],
  );

  return (
    <div className="rounded-3xl border border-orange-500/20 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.08),transparent_30%),linear-gradient(180deg,rgba(17,24,39,0.96),rgba(2,6,23,0.98))] p-5 text-white shadow-[0_30px_90px_rgba(2,6,23,0.45)]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏏</span>
          <h2 className="text-lg font-bold text-white">IPL Prediction</h2>
        </div>
        <Button onClick={() => setShowCreate((value) => !value)} className="bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 hover:opacity-90">
          <Plus className="mr-1 h-4 w-4" />
          {showCreate ? 'Close' : 'New'}
        </Button>
      </div>

      {showCreate && (
        <div className="mt-5 rounded-[28px] border border-white/10 bg-white/5 p-4 sm:p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="ipl-team-a" className="mb-2 block text-slate-200">Team A</Label>
              <select
                id="ipl-team-a"
                value={form.teamA}
                onChange={(event) => setForm((current) => ({ ...current, teamA: event.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
              >
                {IPL_TEAMS.map((team) => (
                  <option key={team.id} value={team.name}>{team.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="ipl-team-b" className="mb-2 block text-slate-200">Team B</Label>
              <select
                id="ipl-team-b"
                value={form.teamB}
                onChange={(event) => setForm((current) => ({ ...current, teamB: event.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
              >
                {IPL_TEAMS.map((team) => (
                  <option key={team.id} value={team.name}>{team.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 rounded-[24px] border border-orange-400/20 bg-black/20 p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-300">Fixture Preview</div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <TeamBadge team={getIplTeam(form.teamA)} />
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-black text-white">VS</div>
              <TeamBadge team={getIplTeam(form.teamB)} />
            </div>
            <div className="mt-3 text-lg font-black text-white">{fixtureLabel}</div>
          </div>

          <div className="mt-4 rounded-[24px] border border-violet-400/20 bg-violet-500/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-violet-200">Rank Prizes (coins)</div>
                <div className="text-xs text-slate-400">P1 = rank #1 coins, P2 = rank #2, etc. Add / remove tiers as needed.</div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForm((current) => ({
                    ...current,
                    prizes: current.prizes.length >= MAX_PRIZE_TIERS ? current.prizes : [...current.prizes, ''],
                  }))}
                  disabled={form.prizes.length >= MAX_PRIZE_TIERS}
                  className="border-violet-400/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Tier
                </Button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {form.prizes.map((value, index) => (
                <div key={`prize-${index}`} className="relative">
                  <Label className="mb-2 block text-slate-200">P{index + 1}</Label>
                  <Input
                    value={value}
                    type="number"
                    min="0"
                    onChange={(event) =>
                      setForm((current) => {
                        const prizes = [...current.prizes];
                        prizes[index] = event.target.value;
                        return { ...current, prizes };
                      })
                    }
                    className="border-slate-700 bg-slate-950 text-slate-100"
                  />
                  {form.prizes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setForm((current) => ({
                        ...current,
                        prizes: current.prizes.filter((_, i) => i !== index),
                      }))}
                      className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/80 text-[10px] font-bold text-white hover:bg-rose-500"
                      aria-label={`Remove prize tier P${index + 1}`}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <Label htmlFor="ipl-consolation" className="mb-2 block text-slate-200">Participation Coins (non-winners)</Label>
                <Input
                  id="ipl-consolation"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.consolation_coins}
                  onChange={(event) => setForm((current) => ({ ...current, consolation_coins: event.target.value }))}
                  className="border-slate-700 bg-slate-950 text-slate-100"
                />
                <div className="mt-1 text-[11px] text-slate-500">Every participant who did not win rank {form.prizes.length > 0 ? `1-${form.prizes.length}` : 'a prize'} gets this many coins. Leave 0 to disable.</div>
              </div>
              <div className="flex items-end">
                <div className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300">
                  <div className="font-bold text-slate-200">Pool Preview</div>
                  <div>Rank prizes total: <span className="text-amber-300 font-bold">{form.prizes.reduce((sum, v) => sum + (parseInt(v || '0', 10) || 0), 0)}</span> coins</div>
                  <div>Per-participant consolation: <span className="text-emerald-300 font-bold">{parseInt(form.consolation_coins || '0', 10) || 0}</span> coins</div>
                </div>
              </div>
            </div>
          </div>


          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="ipl-start" className="mb-2 block text-slate-200">Start Time</Label>
              <Input
                id="ipl-start"
                type="datetime-local"
                value={form.start_time}
                onChange={(event) => setForm((current) => ({ ...current, start_time: event.target.value }))}
                className="border-slate-700 bg-slate-950 text-slate-100"
              />
            </div>
            <div>
              <Label htmlFor="ipl-end" className="mb-2 block text-slate-200">End Time</Label>
              <Input
                id="ipl-end"
                type="datetime-local"
                value={form.end_time}
                onChange={(event) => setForm((current) => ({ ...current, end_time: event.target.value }))}
                className="border-slate-700 bg-slate-950 text-slate-100"
              />
            </div>
            <div>
              <Label htmlFor="ipl-result-publish" className="mb-2 block text-slate-200">Final Result Time</Label>
              <Input
                id="ipl-result-publish"
                type="datetime-local"
                value={form.result_publish_at}
                onChange={(event) => setForm((current) => ({ ...current, result_publish_at: event.target.value }))}
                className="border-slate-700 bg-slate-950 text-slate-100"
              />
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-sky-400/20 bg-sky-500/5 p-4">
            <div className="text-sm font-bold text-sky-200">Paste / Upload Questions</div>
            <div className="mt-1 text-xs text-slate-400">JSON ya text format me questions paste karo. Format: Q1. question \n - option1 \n - option2</div>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`JSON format:\n[{"questions":[{"text":"Question?","points":3,"options":["A","B","C"]}]}]\n\nText format (points optional):\nQ1. [3pts] Aaj sabse zyada runs kaun banayega?\n- Virat Kohli\n- Rohit Sharma\nQ2. (5 points) Kaun sa bowler wicket lega?\n- Jasprit Bumrah\n- Mohammed Siraj`}
              className="mt-2 h-32 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            />
            <Button
              type="button"
              onClick={handleParseBulk}
              className="mt-2 bg-gradient-to-r from-sky-500 to-cyan-500 text-white hover:opacity-90"
            >
              Parse & Load Questions
            </Button>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-white">Questions ({form.questions.length})</div>
              <div className="text-xs text-slate-400">Correct answers abhi mat do. Match ke baad finalize karoge.</div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setForm((current) => ({ ...current, questions: [...current.questions, createQuestion()] }))}
              className="border-orange-400/30 bg-orange-500/10 text-orange-200 hover:bg-orange-500/20"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Question
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            {form.questions.map((question, questionIndex) => (
              <div key={`question-${questionIndex}`} className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-full bg-orange-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-orange-200">Q{questionIndex + 1}</div>
                  <div className="w-24">
                    <Label className="mb-1 block text-slate-400">Points</Label>
                    <Input
                      type="number"
                      min="1"
                      value={question.points}
                      onChange={(event) =>
                        setForm((current) => {
                          const questions = [...current.questions];
                          questions[questionIndex] = {
                            ...questions[questionIndex],
                            points: Math.max(1, Number(event.target.value) || 1),
                          };
                          return { ...current, questions };
                        })
                      }
                      className="border-slate-700 bg-slate-900 text-slate-100"
                    />
                  </div>
                  <div className="flex-1 min-w-[220px]">
                    <Label className="mb-1 block text-slate-400">Question</Label>
                    <Input
                      value={question.text}
                      onChange={(event) =>
                        setForm((current) => {
                          const questions = [...current.questions];
                          questions[questionIndex] = { ...questions[questionIndex], text: event.target.value };
                          return { ...current, questions };
                        })
                      }
                      placeholder="Example: Aaj sabse zyada runs kaun banayega?"
                      className="border-slate-700 bg-slate-900 text-slate-100"
                    />
                  </div>
                  {form.questions.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          questions: current.questions.filter((_, index) => index !== questionIndex),
                        }))
                      }
                      className="border-rose-400/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  {question.options.map((option, optionIndex) => (
                    <div key={`question-${questionIndex}-option-${optionIndex}`} className="flex items-center gap-2">
                      <Input
                        value={option}
                        onChange={(event) =>
                          setForm((current) => {
                            const questions = [...current.questions];
                            const options = [...questions[questionIndex].options];
                            options[optionIndex] = event.target.value;
                            questions[questionIndex] = { ...questions[questionIndex], options };
                            return { ...current, questions };
                          })
                        }
                        placeholder={`Option ${optionIndex + 1}`}
                        className="border-slate-700 bg-slate-900 text-slate-100"
                      />
                      {question.options.length > 2 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            setForm((current) => {
                              const questions = [...current.questions];
                              questions[questionIndex] = {
                                ...questions[questionIndex],
                                options: questions[questionIndex].options.filter((_, idx) => idx !== optionIndex),
                              };
                              return { ...current, questions };
                            })
                          }
                          className="border-rose-400/30 bg-rose-500/10 px-3 text-rose-200 hover:bg-rose-500/20"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setForm((current) => {
                        const questions = [...current.questions];
                        questions[questionIndex] = {
                          ...questions[questionIndex],
                          options: [...questions[questionIndex].options, ''],
                        };
                        return { ...current, questions };
                      })
                    }
                    className="border-sky-400/30 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Option
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => { resetForm(); setShowCreate(false); }} className="border-slate-600 bg-slate-900 text-slate-200 hover:bg-slate-800">
              Cancel
            </Button>
            <Button type="button" onClick={handleCreate} disabled={saving} className="bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 hover:opacity-90">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create IPL Prediction
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-300">Needs Official Result</h3>
            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200">{needsOfficialResult.length}</span>
          </div>
          <div className="space-y-4">
            {needsOfficialResult.map((quiz) => (
              <PredictionCard
                key={quiz.id}
                quiz={quiz}
                action={
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => openFinalize(quiz)}
                      disabled={busyQuizId === quiz.id}
                      className="flex-1 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 hover:opacity-90"
                    >
                      {busyQuizId === quiz.id && busyTarget !== 'hide' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                      Finalize
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleHideFromCategory(quiz)}
                      disabled={busyQuizId === quiz.id}
                      className="border-rose-400/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
                    >
                      {busyQuizId === quiz.id && busyTarget === 'hide' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Hide'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleDeleteQuiz(quiz)}
                      disabled={busyQuizId === quiz.id}
                      className="border-red-500/40 bg-red-600/10 text-red-300 hover:bg-red-600/20"
                    >
                      {busyQuizId === quiz.id && busyTarget === 'delete' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                    </Button>
                  </div>
                }
              />
            ))}
            {!loading && needsOfficialResult.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-400">Abhi koi finished IPL prediction quiz pending nahi hai.</div>
            )}
          </div>
        </div>

        <div className="xl:col-span-2 space-y-6">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-300">Upcoming / Live</h3>
              <span className="rounded-full bg-sky-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-sky-200">{upcomingOrLive.length}</span>
            </div>
            <div className="space-y-4">
              {upcomingOrLive.map((quiz) => {
                const quizStarted = quiz.start_time && new Date(quiz.start_time).getTime() <= Date.now();
                return (
                  <PredictionCard
                    key={quiz.id}
                    quiz={quiz}
                    action={
                      <div className="flex gap-2">
                        {!quizStarted ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => openEditQuestions(quiz)}
                            disabled={busyQuizId === quiz.id}
                            className="flex-1 border-sky-400/30 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20"
                          >
                            {busyQuizId === quiz.id && busyTarget === 'editq' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Edit Questions
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleDeleteQuiz(quiz)}
                          disabled={busyQuizId === quiz.id}
                          className={`${quizStarted ? 'flex-1' : ''} border-red-500/40 bg-red-600/10 text-red-300 hover:bg-red-600/20`}
                        >
                          {busyQuizId === quiz.id && busyTarget === 'delete' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                        </Button>
                      </div>
                    }
                  />
                );
              })}
              {!loading && upcomingOrLive.length === 0 && (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-400">Koi upcoming IPL prediction quiz schedule nahi hai.</div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400">Published ({published.length})</h3>
            </div>
            <div className="space-y-2">
              {published.map((quiz) => {
                const meta = getIplPredictionMeta(quiz);
                const isHidden = quiz.meta?.hidden_from_category === true;
                return (
                  <div key={quiz.id} className="flex items-center justify-between gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/5 px-3 py-2">
                    <Link to={`/results/${quiz.id}`} className="flex-1 text-sm font-semibold text-white hover:text-emerald-300 transition truncate">
                      {meta?.fixtureLabel || quiz.title}
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleHideFromCategory(quiz)}
                      disabled={busyQuizId === quiz.id || isHidden}
                      className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg transition ${isHidden ? 'text-slate-500 cursor-default' : 'text-rose-300 hover:bg-rose-500/10 border border-rose-400/20'}`}
                    >
                      {isHidden ? 'Hidden' : busyQuizId === quiz.id && busyTarget === 'hide' ? '...' : 'Hide'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuiz(quiz)}
                      disabled={busyQuizId === quiz.id}
                      className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg transition text-red-300 hover:bg-red-600/10 border border-red-500/30"
                    >
                      {busyQuizId === quiz.id && busyTarget === 'delete' ? '...' : 'Delete'}
                    </button>
                  </div>
                );
              })}
              {!loading && published.length === 0 && (
                <div className="text-xs text-slate-500">No published results yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="mt-6 flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading IPL prediction quizzes...
        </div>
      )}

      {editingQuiz && (
        <div className="fixed inset-0 z-[140] flex items-start justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur">
          <div className="my-8 w-full max-w-3xl rounded-[32px] border border-white/10 bg-[#09101c] p-5 shadow-[0_30px_90px_rgba(2,6,23,0.55)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">Official Result Finalizer</div>
                <h3 className="mt-2 text-2xl font-black text-white">{getIplPredictionMeta(editingQuiz)?.fixtureLabel || editingQuiz.title}</h3>
                <p className="mt-1 text-sm text-slate-400">Match ke baad har question ka correct answer choose karo, fir results publish ho jayenge.</p>
                {getIplPredictionMeta(editingQuiz)?.resultPublishAt && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">
                    <span>⏰</span>
                    <span>Final result at {formatDateTime(getIplPredictionMeta(editingQuiz)?.resultPublishAt)}</span>
                  </div>
                )}
              </div>
              <Button type="button" variant="outline" onClick={() => { setEditingQuiz(null); setAnswerDrafts([]); }} className="border-slate-600 bg-slate-900 text-slate-200 hover:bg-slate-800">
                Close
              </Button>
            </div>

            <div className="mt-5 rounded-[24px] border border-sky-400/20 bg-sky-500/5 p-4">
              <div className="text-sm font-bold text-sky-200">Quick Paste Answers</div>
              <div className="mt-1 text-xs text-slate-400">Sabhi questions ke answers ek saath paste karo (line by line).</div>
              <textarea
                value={bulkAnswerText}
                onChange={(e) => setBulkAnswerText(e.target.value)}
                placeholder={`1. Virat Kohli\n2. Jasprit Bumrah\n3. Mumbai Indians`}
                className="mt-2 h-24 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
              />
              <Button
                type="button"
                onClick={handleParseBulkAnswers}
                className="mt-2 bg-gradient-to-r from-sky-500 to-cyan-500 text-white hover:opacity-90"
              >
                Parse & Map Answers
              </Button>
            </div>

            <div className="mt-5 space-y-4">
              {answerDrafts.map((question, index) => (
                <div key={question.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <div className="rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200">Q{index + 1}</div>
                    <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">{question.points} pts</div>
                  </div>
                  <div className="text-base font-bold text-white">{question.question_text}</div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {question.options.map((option) => {
                      const selected = question.correct_option_id === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() =>
                            setAnswerDrafts((current) =>
                              current.map((item) =>
                                item.id === question.id ? { ...item, correct_option_id: option.id } : item,
                              ),
                            )
                          }
                          className={`rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition ${selected ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200 shadow-[0_12px_30px_rgba(16,185,129,0.15)]' : 'border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-900'}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${selected ? 'bg-emerald-400 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
                              {selected ? '✓' : '•'}
                            </span>
                            <span className="truncate">{option.option_text}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => saveOfficialAnswers({ questionId: question.id })}
                      disabled={busyQuizId === editingQuiz.id}
                      className="border-amber-400/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                    >
                      {busyQuizId === editingQuiz.id && busyTarget === question.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                      Save This Answer
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => { setEditingQuiz(null); setAnswerDrafts([]); }} className="border-slate-600 bg-slate-900 text-slate-200 hover:bg-slate-800">
                Cancel
              </Button>
              <Button type="button" variant="outline" onClick={() => saveOfficialAnswers()} disabled={busyQuizId === editingQuiz.id} className="border-amber-400/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20">
                {busyQuizId === editingQuiz.id && busyTarget === 'save-all' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Save Current Answers
              </Button>
              <Button type="button" onClick={handleFinalize} disabled={busyQuizId === editingQuiz.id} className="bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 hover:opacity-90">
                {busyQuizId === editingQuiz.id && busyTarget === 'publish' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Publish Final Results Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {editingQuestionsQuiz && (
        <div className="fixed inset-0 z-[140] flex items-start justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur">
          <div className="my-8 w-full max-w-2xl rounded-[32px] border border-white/10 bg-[#09101c] p-5 shadow-[0_30px_90px_rgba(2,6,23,0.55)]">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-300">Edit Questions</div>
                <h3 className="mt-1 text-xl font-black text-white">{getIplPredictionMeta(editingQuestionsQuiz)?.fixtureLabel || editingQuestionsQuiz.title}</h3>
              </div>
              <Button type="button" variant="outline" onClick={() => { setEditingQuestionsQuiz(null); setQuestionDrafts([]); }} className="border-slate-600 bg-slate-900 text-slate-200 hover:bg-slate-800">Close</Button>
            </div>

            <div className="space-y-4">
              {questionDrafts.map((q, idx) => (
                <div key={idx} className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-black text-sky-200">Q{idx + 1}</span>
                    <input
                      type="number"
                      min="1"
                      value={q.points}
                      onChange={(e) => setQuestionDrafts((prev) => prev.map((item, i) => i === idx ? { ...item, points: Math.max(1, Number(e.target.value) || 1) } : item))}
                      className="w-16 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                      placeholder="Pts"
                    />
                    <span className="text-[10px] text-slate-500">pts</span>
                    <button type="button" onClick={() => deleteQuestion(q, idx)} className="ml-auto text-[10px] text-rose-400 hover:text-rose-300">Delete</button>
                  </div>
                  <textarea
                    value={q.text}
                    onChange={(e) => setQuestionDrafts((prev) => prev.map((item, i) => i === idx ? { ...item, text: e.target.value } : item))}
                    placeholder="Question text..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 resize-none"
                    rows={2}
                  />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {q.options.map((opt, oidx) => (
                      <input
                        key={oidx}
                        value={opt.text}
                        onChange={(e) => setQuestionDrafts((prev) => prev.map((item, i) => i === idx ? { ...item, options: item.options.map((o, oi) => oi === oidx ? { ...o, text: e.target.value } : o) } : item))}
                        placeholder={`Option ${oidx + 1}`}
                        className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuestionDrafts((prev) => prev.map((item, i) => i === idx ? { ...item, options: [...item.options, { id: null, text: '' }] } : item))}
                    className="mt-2 text-[10px] text-sky-400 hover:text-sky-300"
                  >
                    + Add Option
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setQuestionDrafts((prev) => [...prev, { id: null, text: '', points: 1, options: [{ id: null, text: '' }, { id: null, text: '' }], isNew: true }])}
                className="border-sky-400/30 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20"
              >
                + Add Question
              </Button>
              <Button
                type="button"
                onClick={saveQuestionDrafts}
                disabled={savingQuestions}
                className="bg-gradient-to-r from-sky-500 to-cyan-500 text-white hover:opacity-90"
              >
                {savingQuestions ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Save Questions
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
