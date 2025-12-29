import React from 'react';
import SeoLanding from './SeoLanding';
import { Trophy, Users, TrendingUp, Award } from 'lucide-react';

export default function QuizCompetition() {
  const features = [
    { icon: Trophy, title: 'Daily Competitions', desc: 'Fresh quiz competitions every day across all categories' },
    { icon: Users, title: 'Nationwide Leaderboards', desc: 'Compete with thousands of players across India' },
    { icon: TrendingUp, title: 'Climb the Ranks', desc: 'Improve your ranking with consistent performance' },
    { icon: Award, title: 'Win Rewards', desc: 'Top performers earn bonus coins and recognition' },
  ];

  const additionalContent = (
    <>
      <h2 className="text-xl font-bold text-white mb-4">How Our Quiz Competition Works</h2>
      <div className="space-y-4 text-sm text-slate-300">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-slate-800/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-indigo-400 mb-1">1</div>
            <h3 className="font-semibold text-white mb-1">Choose a Quiz</h3>
            <p className="text-xs">Pick from GK, Sports, Movies, or Opinion categories</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-purple-400 mb-1">2</div>
            <h3 className="font-semibold text-white mb-1">Answer Fast & Right</h3>
            <p className="text-xs">Speed and accuracy both matter for your score</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-pink-400 mb-1">3</div>
            <h3 className="font-semibold text-white mb-1">Check Leaderboards</h3>
            <p className="text-xs">See where you rank among all participants</p>
          </div>
        </div>
        <div className="bg-indigo-900/30 border border-indigo-700/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">🏆 Competition Tips</h3>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Play daily to build streaks and earn bonus coins</li>
            <li>Answer quickly — faster responses get higher scores</li>
            <li>Focus on categories you&apos;re strong in first</li>
            <li>Learn from wrong answers to improve</li>
          </ul>
        </div>
      </div>
    </>
  );

  return (
    <SeoLanding
      path="/quiz-competition"
      title="Quiz Competition – Compete Daily & Win Coins | Quiz Dangal"
      h1="Quiz Competition"
      description="Join a daily quiz competition on Quiz Dangal: play rounds, climb the leaderboard, and earn coins through streaks and performance." 
      keywords={[
        'quiz competition', 'online quiz', 'quiz game', 'leaderboards', 'play and win quiz',
        'quiz contest', 'competitive quiz', 'daily quiz competition'
      ]}
      features={features}
      additionalContent={additionalContent}
      relatedLinks={[
        { href: '/leaderboards/', label: 'See Leaderboards' },
        { href: '/play-win-quiz-app/', label: 'Play & Win' },
        { href: '/quiz-game/', label: 'Quiz Game' },
        { href: '/online-quiz/', label: 'Online Quiz' },
      ]}
      faqs={[
        {
          question: 'How do I participate in the quiz competition?',
          answer: 'It\'s easy! Open quizdangal.com, pick a category (GK, Sports, Movies, Opinion), and play the active quiz. Sign in to track your streaks, coins, and rankings. Your performance is automatically tracked on the leaderboards.',
        },
        {
          question: 'Is the quiz competition free?',
          answer: 'Yes, 100% free! There are no entry fees or subscriptions required. You can compete in unlimited quiz competitions without paying anything. We\'re ad-supported, so you get full access for free.',
        },
        {
          question: 'How are rankings calculated?',
          answer: 'Rankings are based on your quiz scores, which depend on accuracy (correct answers) and speed (faster responses earn more points). Consistent daily play and streak bonuses also contribute to your overall ranking.',
        },
        {
          question: 'What rewards can I win from quiz competitions?',
          answer: 'You earn coins for every correct answer. Bonus coins are awarded for speed, daily streaks, and leaderboard performance. Accumulated coins can be redeemed for exciting rewards from our rewards catalog.',
        },
        {
          question: 'Can I compete with my friends?',
          answer: 'Yes! Share your referral link to invite friends. When they join, both of you earn bonus coins. You can compare scores on the same quizzes and see who ranks higher on the leaderboards.',
        },
        {
          question: 'How often are new competitions held?',
          answer: 'We run quiz competitions daily! New quizzes are added every day across all categories. During special events and festivals, we also run themed competitions with extra rewards.',
        },
        {
          question: 'What categories have quiz competitions?',
          answer: 'Competitions are available in all our categories: General Knowledge (GK), Sports (Cricket, Football, Olympics), Movies (Bollywood, Hollywood), Current Affairs, Science, and Opinion polls.',
        },
      ]}
    />
  );
}
