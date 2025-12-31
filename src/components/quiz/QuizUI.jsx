import React from 'react';
import PropTypes from 'prop-types';
import { m, AnimatePresence } from '@/lib/motion-lite';
import { Button } from '@/components/ui/button';
import { formatDateOnly, formatTimeOnly, getPrizeDisplay } from '@/lib/utils';
import { Loader2, CheckCircle, Clock, Users, X, ChevronRight, Send } from 'lucide-react';
import SeoHead from '@/components/SEO';

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
      <Loader2 className="h-16 w-16 animate-spin text-indigo-500 mx-auto mb-4" />
      <p className="text-gray-400">Loading quiz...</p>
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
    <div className="w-full max-w-sm">
      <div className="p-[1px] rounded-xl bg-gradient-to-r from-indigo-500/50 via-violet-500/40 to-fuchsia-500/50">
        <div className="relative rounded-xl bg-slate-900/95 p-4 text-center">
          <button
            aria-label="Close"
            onClick={onClose}
            className="absolute top-3 right-3 text-slate-500 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Clock className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-base font-bold text-white mb-1">{title}</h2>
          <p className="text-[11px] text-slate-400 mb-2">
            {isActive ? 'Quiz is live!' : 'Quiz starts in'}
          </p>
          <div className="text-2xl font-bold text-indigo-300 mb-2">{formatTime(timeLeft)}</div>
          <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-2">
            <Users className="h-3 w-3" />
            {displayJoined} joined
          </div>
          <PrizeChips prizes={prizes} prizeType={prizeType} />
          <InfoChips startTime={quiz?.start_time} endTime={quiz?.end_time} />
          <div className="mt-4">
            <Button
              onClick={onJoin}
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

export const WaitingView = ({
  quiz,
  title,
  timeLeft,
  totalJoined,
  prizes,
  prizeType,
  formatTime,
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm"
    >
      <div className="p-[1px] rounded-xl bg-gradient-to-r from-indigo-500/50 via-violet-500/40 to-fuchsia-500/50">
        <div className="relative rounded-xl bg-slate-900/95 backdrop-blur-sm p-4 text-center">
          <button
            aria-label="Close"
            onClick={onClose}
            className="absolute top-2 right-2 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-2">
            <Clock className="h-6 w-6 text-indigo-300" />
          </div>
          <h2 className="text-base font-bold text-white mb-1 line-clamp-2">{title}</h2>
          <p className="text-xs text-slate-400 mb-1">Quiz starts in:</p>
          <div className="text-2xl font-bold text-indigo-300 mb-2">{formatTime(timeLeft)}</div>
          <div className="flex items-center justify-center gap-1 text-xs text-slate-400 mb-2">
            <Users className="h-3 w-3" />
            {totalJoined} joined
          </div>
          <PrizeChips prizes={prizes} prizeType={prizeType} />
          <InfoChips startTime={quiz?.start_time} endTime={quiz?.end_time} />
          <p className="mt-2 text-[10px] text-slate-500">Auto-starts when timer hits zero</p>
        </div>
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
      <div className="p-[1px] rounded-xl bg-gradient-to-r from-emerald-500/50 via-green-500/40 to-teal-500/50">
        <div className="rounded-xl bg-slate-900/95 backdrop-blur-sm p-4 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-2">
            <CheckCircle className="h-6 w-6 text-emerald-300" />
          </div>
          <h2 className="text-base font-bold text-white mb-1">Quiz Submitted!</h2>
          <p className="text-xs text-slate-400 mb-2">Thank you for participating!</p>
          <p className="text-sm text-slate-300 mb-3">Results will be published soon.</p>
          <button
            onClick={onNavigateHome}
            className="mt-3 w-full h-9 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-green-500 hover:opacity-90 transition"
          >
            Back to Home
          </button>
        </div>
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
                <div className="quiz-timer" role="timer" aria-live="polite" aria-label={`Time remaining: ${formatTime(timeLeft)}`}>
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{formatTime(timeLeft)}</span>
                </div>
              </div>
            </div>
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
                    whileTap={{ scale: 0.98 }}
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
