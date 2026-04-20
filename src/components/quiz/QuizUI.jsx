import React from 'react';
import PropTypes from 'prop-types';
import { m, AnimatePresence } from '@/lib/motion-lite';
import { Button } from '@/components/ui/button';
import { formatDateOnly, formatTimeOnly, getPrizeDisplay } from '@/lib/utils';
import { Loader2, CheckCircle, Clock, Users, X, ChevronRight, Send } from 'lucide-react';
import SeoHead from '@/components/SEO';
import { getIplTeam } from '@/lib/iplTeams';

/**
 * Shared QuizUI components used by Quiz.jsx
 * Handles both regular quizzes and slot-based quizzes.
 */

// --- Sub-components ---

export const InfoChips = ({ startTime, endTime }) => (
  <div className="mt-2 text-[10px] text-slate-400">
    <div className="mb-1">{startTime ? formatDateOnly(startTime) : '—'}</div>
    <div className="flex items-center justify-center gap-2">
      <div className="bg-slate-800/60 border border-slate-700 rounded-md px-2 py-1">
        <span className="uppercase text-[9px] text-slate-500">Start</span>
        <div className="text-slate-300">{startTime ? formatTimeOnly(startTime) : '—'}</div>
      </div>
      <div className="bg-slate-800/60 border border-slate-700 rounded-md px-2 py-1">
        <span className="uppercase text-[9px] text-slate-500">End</span>
        <div className="text-slate-300">{endTime ? formatTimeOnly(endTime) : '—'}</div>
      </div>
    </div>
  </div>
);

export const PrizeChips = ({ prizes = [], prizeType = 'coins' }) => {
  const p1 = prizes[0] ?? 0;
  const p2 = prizes[1] ?? 0;
  const p3 = prizes[2] ?? 0;
  const formatPrize = (value) => getPrizeDisplay(prizeType, value, { fallback: 0 }).formatted;
  
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

const PredictionFixtureBanner = ({ predictionMeta, compact = false }) => {
  if (!predictionMeta) return null;
  const teamA = predictionMeta.teamA || getIplTeam(predictionMeta.team_a) || null;
  const teamB = predictionMeta.teamB || getIplTeam(predictionMeta.team_b) || null;

  return (
    <div className={`relative rounded-[20px] overflow-hidden ${compact ? '' : ''}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-cyan-500/15" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.15),transparent_60%)]" />
      <div className={`relative border border-white/10 rounded-[20px] ${compact ? 'p-3' : 'p-4'}`}>
        {!compact && (
          <div className="text-center mb-3">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-orange-300">IPL Prediction</div>
            <div className="mt-1 text-base font-black text-white">{predictionMeta.fixtureLabel || `${teamA?.short || 'A'} vs ${teamB?.short || 'B'}`}</div>
          </div>
        )}
        <div className={`flex items-center justify-center ${compact ? 'gap-3' : 'gap-4'}`}>
          <div className="text-center">
            <div className={`mx-auto flex ${compact ? 'h-11 w-11 text-sm' : 'h-14 w-14 text-lg'} items-center justify-center rounded-2xl border-2 font-black shadow-lg ${teamA?.chipClass || 'border-orange-400/40 bg-gradient-to-br from-orange-500/25 to-amber-500/15 text-orange-100'}`}>
              {teamA?.short || predictionMeta.team_a_short || 'A'}
            </div>
            {!compact && <div className="mt-1.5 text-[10px] font-bold text-slate-300 truncate max-w-[70px]">{teamA?.name || predictionMeta.team_a || 'Team A'}</div>}
          </div>
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500 to-cyan-500 blur-md opacity-40" />
              <div className={`relative flex ${compact ? 'h-8 w-8' : 'h-10 w-10'} items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-white/20`}>
                <span className={`${compact ? 'text-[10px]' : 'text-xs'} font-black text-white`}>VS</span>
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className={`mx-auto flex ${compact ? 'h-11 w-11 text-sm' : 'h-14 w-14 text-lg'} items-center justify-center rounded-2xl border-2 font-black shadow-lg ${teamB?.chipClass || 'border-cyan-400/40 bg-gradient-to-br from-cyan-500/25 to-sky-500/15 text-cyan-100'}`}>
              {teamB?.short || predictionMeta.team_b_short || 'B'}
            </div>
            {!compact && <div className="mt-1.5 text-[10px] font-bold text-slate-300 truncate max-w-[70px]">{teamB?.name || predictionMeta.team_b || 'Team B'}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export const LoadingView = ({ quizId }) => (
  <div className="min-h-screen flex items-center justify-center">
    <SeoHead
      title="Quiz – Loading | Quiz Dangal"
      description="Loading quiz details."
      canonical={
        typeof window !== 'undefined'
          ? `${window.location.origin}/quiz/${quizId || ''}`
          : 'https://quizdangal.com/quiz'
      }
      robots="noindex, nofollow"
      author="Quiz Dangal"
    />
    <div className="text-center">
      <Loader2 className="h-16 w-16 animate-spin text-indigo-500 mx-auto" />
    </div>
  </div>
);

export const ErrorView = ({ message }) => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center text-red-400">{message || 'An error occurred'}</div>
  </div>
);

export const NoQuestionsView = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <p className="text-gray-400">No questions available for this quiz.</p>
    </div>
  </div>
);

export const PreLobbyView = ({
  quiz,
  title,
  isActive,
  timeLeft,
  displayJoined,
  prizes,
  prizeType,
  formatTime,
  predictionMeta,
  onJoin,
  onClose,
}) => (
  <div className="min-h-screen flex items-center justify-center px-3 pt-16">
    <SeoHead
      title={`${title} – Lobby | Quiz Dangal`}
      description="Join the quiz lobby."
      robots="noindex, nofollow"
      author="Quiz Dangal"
    />
    <m.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full max-w-sm"
    >
      <div className="relative rounded-2xl border border-white/10 bg-[linear-gradient(160deg,rgba(15,23,42,0.95),rgba(30,41,59,0.88))] p-4 text-center shadow-[0_24px_70px_-30px_rgba(56,189,248,0.5)] backdrop-blur-sm">
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-500 hover:text-white transition"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
          <Clock className="h-3.5 w-3.5" />
          <span>Lobby</span>
        </div>
        <h2 className="mt-3 line-clamp-2 text-base font-black text-white">{title}</h2>
        {predictionMeta && <div className="mt-3"><PredictionFixtureBanner predictionMeta={predictionMeta} compact /></div>}
        <m.div
          key={timeLeft}
          initial={{ scale: 0.96, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="mt-4"
        >
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{isActive ? 'Live' : 'Starts In'}</div>
          <div className="mt-1 text-3xl font-black tracking-wide text-cyan-300">{formatTime(timeLeft)}</div>
        </m.div>
        <div className="mt-2 flex items-center justify-center gap-1 text-[11px] text-slate-400">
          <Users className="h-3 w-3" />
          {displayJoined}
        </div>
        <PrizeChips prizes={prizes} prizeType={prizeType} />
        <InfoChips startTime={quiz?.start_time} endTime={quiz?.end_time} />
        <div className="mt-4">
          <Button
            onClick={onJoin}
            className={`h-11 w-full rounded-xl text-sm font-black tracking-wide ${
              isActive
                ? 'bg-gradient-to-r from-emerald-600 to-green-500'
                : 'bg-gradient-to-r from-cyan-600 via-indigo-600 to-violet-600'
            } hover:opacity-95`}
          >
            {isActive ? 'JOIN NOW' : 'PRE JOIN'}
          </Button>
        </div>
      </div>
    </m.div>
  </div>
);

export const WaitingView = ({
  quiz,
  title,
  timeLeft,
  totalJoined,
  prizes,
  prizeType,
  formatTime,
  predictionMeta,
  onClose,
}) => (
  <div className="min-h-screen flex items-center justify-center p-4 pt-16 sm:pt-20">
    <SeoHead
      title={`${title} – Waiting | Quiz Dangal`}
      description="Waiting for the quiz to start."
      robots="noindex, nofollow"
      author="Quiz Dangal"
    />
    <m.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full max-w-sm"
    >
      <div className="relative rounded-2xl border border-white/10 bg-[linear-gradient(160deg,rgba(15,23,42,0.95),rgba(30,41,59,0.88))] p-4 text-center shadow-[0_24px_70px_-30px_rgba(99,102,241,0.5)] backdrop-blur-sm">
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-200 transition"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-200">
          <Clock className="h-3.5 w-3.5" />
          <span>Waiting</span>
        </div>
        <h2 className="mt-3 line-clamp-2 text-base font-black text-white">{title}</h2>
        {predictionMeta && <div className="mt-3"><PredictionFixtureBanner predictionMeta={predictionMeta} compact /></div>}
        <m.div
          key={timeLeft}
          initial={{ scale: 0.95, opacity: 0.75 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="mt-4"
        >
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Starts In</div>
          <div className="mt-1 text-3xl font-black tracking-wide text-violet-300">{formatTime(timeLeft)}</div>
        </m.div>
        <div className="mt-2 flex items-center justify-center gap-1 text-xs text-slate-400">
          <Users className="h-3 w-3" />
          {totalJoined}
        </div>
        <PrizeChips prizes={prizes} prizeType={prizeType} />
        <InfoChips startTime={quiz?.start_time} endTime={quiz?.end_time} />
      </div>
    </m.div>
  </div>
);

export const CompletedView = ({ title, onNavigateHome }) => (
  <div className="min-h-screen flex items-center justify-center p-4 pt-16 sm:pt-20">
    <SeoHead
      title={`${title} – Completed | Quiz Dangal`}
      description="Quiz completed. Results will be published soon."
      robots="noindex, nofollow"
      author="Quiz Dangal"
    />
    <m.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-sm"
    >
      <div className="rounded-xl border border-emerald-500/30 bg-slate-900/95 backdrop-blur-sm p-5 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
          <CheckCircle className="h-7 w-7 text-emerald-400" />
        </div>
        <h2 className="text-lg font-bold text-white mb-4">Submitted!</h2>
        <button
          onClick={onNavigateHome}
          className="w-full h-10 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-green-500 hover:opacity-90 transition"
        >
          Home
        </button>
      </div>
    </m.div>
  </div>
);

export const TimesUpView = ({ title, onNavigateHome }) => (
  <div className="min-h-screen flex items-center justify-center p-4 pt-16 sm:pt-20">
    <SeoHead
      title={`${title} – Time's Up | Quiz Dangal`}
      description="Quiz time ended."
      robots="noindex, nofollow"
      author="Quiz Dangal"
    />
    <m.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-sm"
    >
      <div className="p-[1px] rounded-xl bg-gradient-to-r from-amber-500/50 via-orange-500/40 to-red-500/50">
        <div className="rounded-xl bg-slate-900/95 backdrop-blur-sm p-4 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-2">
            <Clock className="h-6 w-6 text-amber-300" />
          </div>
          <h2 className="text-base font-bold text-white mb-1">Time&apos;s Up!</h2>
          <p className="text-xs text-slate-400 mb-4">This quiz has ended. Try the next one!</p>
          <button
            onClick={onNavigateHome}
            className="w-full h-9 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 transition"
          >
            Browse Quizzes
          </button>
        </div>
      </div>
    </m.div>
  </div>
);

export const ActiveQuizView = ({
  title,
  quizId,
  questions,
  currentQuestionIndex,
  answers,
  timeLeft,
  submitting,
  quizState,
  participantStatus,
  formatTime,
  predictionMeta,
  onAnswerSelect,
  onNext,
  onSubmit,
}) => {
  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const currentAnswered = answers[currentQuestion?.id] !== undefined;
  const answeredCount = Object.keys(answers).length;
  const total = questions.length;
  const canProceed = currentAnswered && quizState === 'active' && participantStatus !== 'completed';

  return (
    <div className="min-h-screen px-3 pt-16 pb-6">
      <SeoHead
        title={`${title} – Play | Quiz Dangal`}
        description="Answer questions and compete to win."
        canonical={
          typeof window !== 'undefined'
            ? `${window.location.origin}/quiz/${quizId}`
            : 'https://quizdangal.com/quiz'
        }
        robots="noindex, nofollow"
        author="Quiz Dangal"
      />
      <div className="max-w-md mx-auto space-y-4">
        {/* Compact Header */}
        <div className="quiz-header-card">
          <div className="quiz-header-glow" />
          <div className="quiz-header-content">
            <div className="flex justify-between items-center gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="text-sm font-bold text-white truncate">{title}</h1>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div className={`quiz-timer${timeLeft != null && timeLeft <= 15 ? ' quiz-timer-danger' : ''}`} role="timer" aria-live="polite" aria-label={`Time remaining: ${formatTime(timeLeft)}`}>
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{formatTime(timeLeft)}</span>
                </div>
              </div>
            </div>
            {predictionMeta && (
              <div className="mt-3">
                <PredictionFixtureBanner predictionMeta={predictionMeta} compact />
              </div>
            )}
            {/* Progress Bar */}
            <div className="mt-3 w-full bg-slate-800/80 rounded-full h-2 overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Quiz progress: ${Math.round(progress)}%`}>
              <m.div
                className="h-2 rounded-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-500"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <m.div
            key={currentQuestion?.id || currentQuestionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="quiz-question-card"
          >
            {/* Question Number Badge */}
            <div className="quiz-question-badge">
              Q{currentQuestionIndex + 1}
            </div>

            {Number(currentQuestion?.points || 1) > 0 && (
              <div className="mb-3 flex justify-center">
                <span className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">
                  {Number(currentQuestion?.points || 1)} Points
                </span>
              </div>
            )}
            
            <h2 className="text-base font-semibold text-center text-white mb-5 leading-relaxed px-2">
              {currentQuestion?.question_text}
            </h2>

            <div className="space-y-3" role="radiogroup" aria-label={`Options for question ${currentQuestionIndex + 1}`}>
              {(currentQuestion?.options || []).map((option, index) => {
                const selected = answers[currentQuestion?.id] === option.id;
                return (
                  <m.button
                    key={option.id}
                    onClick={() => onAnswerSelect(currentQuestion.id, option.id)}
                    disabled={
                      submitting || quizState !== 'active' || participantStatus === 'completed'
                    }
                    whileTap={{ scale: 0.96 }}
                    animate={selected ? { scale: [1, 1.03, 1] } : {}}
                    transition={selected ? { duration: 0.25 } : {}}
                    className={`quiz-option ${selected ? 'quiz-option-selected' : ''}`}
                    role="radio"
                    aria-checked={selected}
                    aria-label={`Option ${String.fromCharCode(65 + index)}: ${option.option_text}`}
                  >
                    <span className={`quiz-option-letter ${selected ? 'quiz-option-letter-selected' : ''}`} aria-hidden="true">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1 text-left">{option.option_text}</span>
                    {selected && (
                      <m.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="quiz-option-check"
                        aria-hidden="true"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </m.div>
                    )}
                  </m.button>
                );
              })}
            </div>

            {/* Next / Submit Button */}
            {canProceed && (
              <m.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-5"
              >
                {isLastQuestion ? (
                  <Button
                    onClick={onSubmit}
                    disabled={submitting}
                    className="quiz-submit-btn"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Submit Quiz ({answeredCount}/{total})
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={onNext}
                    className="quiz-next-btn"
                  >
                    <span>Next Question</span>
                    <ChevronRight className="ml-1 h-5 w-5" />
                  </Button>
                )}
              </m.div>
            )}
          </m.div>
        </AnimatePresence>
        
        {/* Answer Progress Indicator */}
        <div className="quiz-progress-indicator">
          <span>{answeredCount} of {total} answered</span>
        </div>
      </div>
    </div>
  );
};

// PropTypes for all components
InfoChips.propTypes = {
  startTime: PropTypes.string,
  endTime: PropTypes.string,
};

PrizeChips.propTypes = {
  prizes: PropTypes.arrayOf(PropTypes.number),
  prizeType: PropTypes.string,
};

LoadingView.propTypes = {
  quizId: PropTypes.string,
};

ErrorView.propTypes = {
  message: PropTypes.string,
};

PreLobbyView.propTypes = {
  quiz: PropTypes.object,
  title: PropTypes.string.isRequired,
  isActive: PropTypes.bool,
  timeLeft: PropTypes.number,
  displayJoined: PropTypes.number,
  prizes: PropTypes.arrayOf(PropTypes.number),
  prizeType: PropTypes.string,
  formatTime: PropTypes.func.isRequired,
  predictionMeta: PropTypes.object,
  onJoin: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

WaitingView.propTypes = {
  quiz: PropTypes.object,
  title: PropTypes.string.isRequired,
  timeLeft: PropTypes.number,
  totalJoined: PropTypes.number,
  prizes: PropTypes.arrayOf(PropTypes.number),
  prizeType: PropTypes.string,
  formatTime: PropTypes.func.isRequired,
  predictionMeta: PropTypes.object,
  onClose: PropTypes.func.isRequired,
};

CompletedView.propTypes = {
  title: PropTypes.string.isRequired,
  onNavigateHome: PropTypes.func.isRequired,
};

TimesUpView.propTypes = {
  title: PropTypes.string.isRequired,
  onNavigateHome: PropTypes.func.isRequired,
};

ActiveQuizView.propTypes = {
  title: PropTypes.string.isRequired,
  quizId: PropTypes.string,
  questions: PropTypes.arrayOf(PropTypes.object).isRequired,
  currentQuestionIndex: PropTypes.number.isRequired,
  answers: PropTypes.object.isRequired,
  timeLeft: PropTypes.number,
  submitting: PropTypes.bool,
  quizState: PropTypes.string,
  participantStatus: PropTypes.string,
  formatTime: PropTypes.func.isRequired,
  predictionMeta: PropTypes.object,
  onAnswerSelect: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default {
  InfoChips,
  PrizeChips,
  LoadingView,
  ErrorView,
  NoQuestionsView,
  PreLobbyView,
  WaitingView,
  CompletedView,
  TimesUpView,
  ActiveQuizView,
};
