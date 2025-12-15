import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from '@/lib/motion-lite';
import { Button } from '@/components/ui/button';
import { formatDateOnly, formatTimeOnly, getPrizeDisplay } from '@/lib/utils';
import { useQuizEngine } from '@/hooks/useQuizEngine';
import { Loader2, CheckCircle, Clock, Users, X } from 'lucide-react';
import SEO from '@/components/SEO';

const Quiz = () => {
  const { id: quizId } = useParams();
  const navigate = useNavigate();
  const {
    quiz,
    questions,
    currentQuestionIndex,
    answers,
    quizState,
    timeLeft,
    submitting,
    joined,
    participantStatus,
    totalJoined,
    displayJoined,
    handleJoinOrPrejoin,
    handleAnswerSelect,
    handleSubmit,
    formatTime,
  } = useQuizEngine(quizId, navigate);

  const [resultsCountdownMs, setResultsCountdownMs] = useState(null);

  useEffect(() => {
    if (!quiz?.end_time) {
      setResultsCountdownMs(null);
      return;
    }
    if (!(quizState === 'completed' || quizState === 'finished')) {
      setResultsCountdownMs(null);
      return;
    }
    const target = new Date(quiz.end_time).getTime();
    const update = () => {
      const diff = Math.max(0, target - Date.now());
      setResultsCountdownMs(diff);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [quiz?.end_time, quizState]);

  const renderResultCountdown = () => {
    if (!quiz?.end_time) {
      return <p className="text-slate-300">Results will be published soon.</p>;
    }
    const ms = resultsCountdownMs ?? Math.max(0, new Date(quiz.end_time).getTime() - Date.now());
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const Part = ({ value, label }) => (
      <div className="px-3 py-2 rounded-md bg-slate-800/70 border border-slate-700 min-w-[64px]">
        <div className="text-xl font-bold text-white tabular-nums">
          {value.toString().padStart(2, '0')}
        </div>
        <div className="text-xs text-slate-400">{label}</div>
      </div>
    );

    return (
      <div className="space-y-4">
        <p className="text-slate-300">Results will be published soon.</p>
        <div className="flex items-center justify-center gap-2">
          {days > 0 && <Part value={days} label="Days" />}
          <Part value={hours} label="Hours" />
          <Part value={minutes} label="Minutes" />
          <Part value={seconds} label="Seconds" />
        </div>
        <div className="text-xs text-slate-400">
          Expected publish time: {new Date(quiz.end_time).toLocaleString()}
        </div>
      </div>
    );
  };

  // All lifecycle & actions handled by useQuizEngine

  if (quizState === 'loading' || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SEO
          title="Quiz – Loading | Quiz Dangal"
          description="Loading quiz details."
          canonical={
            typeof window !== 'undefined'
              ? `${window.location.origin}/quiz/${quizId}`
              : 'https://quizdangal.com/quiz'
          }
          robots="noindex, nofollow"
        />
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-accent-b mx-auto mb-4" />
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  const InfoChips = () => (
    <div className="mt-2 text-[10px] text-slate-400">
      <div className="mb-1">{quiz.start_time ? formatDateOnly(quiz.start_time) : '—'}</div>
      <div className="flex items-center justify-center gap-2">
        <div className="bg-slate-800/60 border border-slate-700 rounded-md px-2 py-1">
          <span className="uppercase text-[9px] text-slate-500">Start</span>
          <div className="text-slate-300">{quiz.start_time ? formatTimeOnly(quiz.start_time) : '—'}</div>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-md px-2 py-1">
          <span className="uppercase text-[9px] text-slate-500">End</span>
          <div className="text-slate-300">{quiz.end_time ? formatTimeOnly(quiz.end_time) : '—'}</div>
        </div>
      </div>
    </div>
  );

  const PrizeChips = () => {
    const prizes = Array.isArray(quiz.prizes) ? quiz.prizes : [];
    const prizeType = quiz.prize_type || 'coins';
    const p1 = prizes[0] ?? 0;
    const p2 = prizes[1] ?? 0;
    const p3 = prizes[2] ?? 0;
    const formatPrize = (value) => {
      const display = getPrizeDisplay(prizeType, value, { fallback: 0 });
      return display.formatted;
    };
    return (
      <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px]">
        <span className="px-2 py-1 rounded-md bg-amber-500/15 text-amber-300 border border-amber-600/30">
          🥇 {formatPrize(p1)}
        </span>
        <span className="px-2 py-1 rounded-md bg-sky-500/15 text-sky-300 border border-sky-600/30">
          🥈 {formatPrize(p2)}
        </span>
        <span className="px-2 py-1 rounded-md bg-violet-500/15 text-violet-300 border border-violet-600/30">
          🥉 {formatPrize(p3)}
        </span>
      </div>
    );
  };

  // Show pre-lobby if not joined yet
  // TODO: Extract LobbyView component (pre-join & join) to components/quiz/LobbyView.jsx
  if (!joined && quizState !== 'completed') {
    const now = new Date();
    const st = quiz.start_time ? new Date(quiz.start_time) : null;
    const et = quiz.end_time ? new Date(quiz.end_time) : null;
    const isActive = quiz.status === 'active' && st && et && now >= st && now < et;
    return (
      <div className="min-h-screen flex items-center justify-center px-3 pt-16">
        <SEO
          title={`${quiz.title || 'Quiz'} – Lobby | Quiz Dangal`}
          description="Join the quiz lobby."
          canonical={
            typeof window !== 'undefined'
              ? `${window.location.origin}/quiz/${quizId}`
              : 'https://quizdangal.com/quiz'
          }
          robots="noindex, nofollow"
        />
        <div className="w-full max-w-sm">
          <div className="p-[1px] rounded-xl bg-gradient-to-r from-indigo-500/50 via-violet-500/40 to-fuchsia-500/50">
            <div className="relative rounded-xl bg-slate-900/95 p-4 text-center">
              {/* Close (X) */}
              <button
                aria-label="Close"
                onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
                className="absolute top-3 right-3 text-slate-500 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-base font-bold text-white mb-1">{quiz.title}</h2>
              <p className="text-[11px] text-slate-400 mb-2">
                {isActive ? 'Quiz is live!' : 'Quiz starts in'}
              </p>
              <div className="text-2xl font-bold text-indigo-300 mb-2">{formatTime(timeLeft)}</div>
              <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-2">
                <Users className="h-3 w-3" />
                {displayJoined} joined
              </div>
              <PrizeChips />
              <InfoChips />
              <div className="mt-4">
                <Button
                  onClick={handleJoinOrPrejoin}
                  className={`w-full h-10 text-sm font-bold ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-600 to-green-500'
                      : 'bg-gradient-to-r from-indigo-600 to-violet-600'
                  } hover:opacity-90`}
                >
                  {isActive ? 'Join & Start' : 'Pre-Join'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (quizState === 'waiting') {
    // Waiting for quiz to start
    return (
      <div className="min-h-screen flex items-center justify-center p-4 pt-16 sm:pt-20">
        <SEO
          title={`${quiz.title || 'Quiz'} – Waiting | Quiz Dangal`}
          description="Waiting for the quiz to start."
          canonical={
            typeof window !== 'undefined'
              ? `${window.location.origin}/quiz/${quizId}`
              : 'https://quizdangal.com/quiz'
          }
          robots="noindex, nofollow"
        />
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="p-[1px] rounded-xl bg-gradient-to-r from-indigo-500/50 via-violet-500/40 to-fuchsia-500/50">
            <div className="relative rounded-xl bg-slate-900/95 backdrop-blur-sm p-4 text-center">
              {/* Close */}
              <button
            aria-label="Close"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
            className="absolute top-2 right-2 text-slate-400 hover:text-slate-200 transition"
              >
                <X className="h-4 w-4" />
              </button>
          <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-2">
                <Clock className="h-6 w-6 text-indigo-300" />
              </div>
              <h2 className="text-base font-bold text-white mb-1 line-clamp-2">{quiz.title}</h2>
          <p className="text-xs text-slate-400 mb-1">Quiz starts in:</p>
              <div className="text-2xl font-bold text-indigo-300 mb-2">{formatTime(timeLeft)}</div>
              <div className="flex items-center justify-center gap-1 text-xs text-slate-400 mb-2">
                <Users className="h-3 w-3" />
                {totalJoined} joined
              </div>
              <PrizeChips />
              <InfoChips />
              <p className="mt-2 text-[10px] text-slate-500">Auto-starts when timer hits zero</p>
            </div>
          </div>
        </m.div>
      </div>
    );
  }

  // Show completed/finished state with countdown
  if (quizState === 'completed' || quizState === 'finished') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 pt-16 sm:pt-20">
        <SEO
          title={`${quiz.title || 'Quiz'} – Completed | Quiz Dangal`}
          description="Quiz completed. Results will be published soon."
          canonical={
            typeof window !== 'undefined'
              ? `${window.location.origin}/quiz/${quizId}`
              : 'https://quizdangal.com/quiz'
          }
          robots="noindex, nofollow"
        />
        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm"
        >
          <div className="p-[1px] rounded-xl bg-gradient-to-r from-emerald-500/50 via-green-500/40 to-teal-500/50">
            <div className="rounded-xl bg-slate-900/95 backdrop-blur-sm p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="h-6 w-6 text-emerald-300" />
              </div>
              <h2 className="text-base font-bold text-white mb-1">Quiz Submitted!</h2>
              <p className="text-xs text-slate-400 mb-2">Thank you for participating!</p>
              {renderResultCountdown()}
              <button
                onClick={() => navigate('/')}
                className="mt-3 w-full h-9 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-green-500 hover:opacity-90 transition"
              >
                Back to Home
              </button>
            </div>
          </div>
        </m.div>
      </div>
    );
  }

  // Active quiz state
  if (questions.length === 0) {
    // TODO: Extract EmptyQuestionsView component
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No questions available for this quiz.</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen px-3 pt-16 pb-6">
      <SEO
        title={`${quiz.title || 'Quiz'} – Play | Quiz Dangal`}
        description="Answer questions and compete to win."
        canonical={
          typeof window !== 'undefined'
            ? `${window.location.origin}/quiz/${quizId}`
            : 'https://quizdangal.com/quiz'
        }
        robots="noindex, nofollow"
      />
      <div className="max-w-md mx-auto space-y-3">
        {/* Compact Header */}
        <div className="p-[1px] rounded-xl bg-gradient-to-r from-indigo-500/50 via-violet-500/40 to-fuchsia-500/50">
          <div className="rounded-xl bg-slate-900/95 p-3">
            <div className="flex justify-between items-center gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="text-sm font-bold text-white truncate">{quiz.title}</h1>
                <p className="text-[10px] text-slate-400">
                  Q{currentQuestionIndex + 1} of {questions.length}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-lg font-bold text-rose-400 tabular-nums">{formatTime(timeLeft)}</div>
                <div className="text-[9px] text-slate-500 uppercase">Time Left</div>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <m.div
                className="h-1.5 rounded-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-500"
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <m.div
            key={currentQuestion.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl border border-slate-700/60 bg-slate-900/90 p-4"
          >
            <h2 className="text-sm font-bold text-center text-white mb-4 leading-relaxed">
              {currentQuestion.question_text}
            </h2>

            <div className="space-y-2">
              {currentQuestion.options?.map((option, index) => {
                const selected = answers[currentQuestion.id] === option.id;
                return (
                  <m.button
                    key={option.id}
                    onClick={() => handleAnswerSelect(currentQuestion.id, option.id)}
                    disabled={
                      submitting || quizState !== 'active' || participantStatus === 'completed'
                    }
                    whileTap={{ scale: 0.98 }}
                    className={`w-full p-3 rounded-lg text-left text-sm font-medium transition-all border ${
                      selected
                        ? 'bg-emerald-600/90 text-white border-emerald-500 shadow-lg'
                        : 'bg-slate-800/60 hover:bg-slate-800 text-slate-200 border-slate-700/60'
                    }`}
                  >
                    <span className={`font-bold mr-2 ${selected ? 'text-white' : 'text-indigo-400'}`}>
                      {String.fromCharCode(65 + index)}.
                    </span>
                    {option.option_text}
                  </m.button>
                );
              })}
            </div>

            {/* Submit Button (only on last question) */}
            {currentQuestionIndex === questions.length - 1 &&
              Object.keys(answers).length === questions.length && (
                <m.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-4"
                >
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full h-11 text-sm font-bold bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:opacity-90"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Submit Quiz
                      </>
                    )}
                  </Button>
                </m.div>
              )}
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Quiz;
