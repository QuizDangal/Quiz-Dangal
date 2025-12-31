import React from 'react';
import SeoLanding from './SeoLanding';
import { Gamepad2, Trophy, Zap, Users } from 'lucide-react';

export default function QuizGame() {
  const features = [
    { icon: Gamepad2, title: 'Fun Gameplay', desc: 'Engaging quiz rounds with instant feedback and exciting animations' },
    { icon: Zap, title: 'Quick Rounds', desc: 'Fast-paced quizzes perfect for short breaks or commutes' },
    { icon: Trophy, title: 'Compete & Win', desc: 'Climb leaderboards and earn coins with every correct answer' },
    { icon: Users, title: 'Play With Friends', desc: 'Refer friends and compete together on the same quizzes' },
  ];

  const additionalContent = (
    <>
      <h2 className="text-xl font-bold text-white mb-4">What Makes Our Quiz Game Special?</h2>
      <div className="space-y-4 text-sm text-slate-300">
        <p className="leading-relaxed">
          Quiz Dangal combines the thrill of competitive gaming with the joy of learning. 
          Unlike traditional quiz apps, we focus on making every round exciting with timed questions, 
          instant scores, and real rewards. Whether you want to test your knowledge or just have fun, 
          our quiz game delivers an engaging experience.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <h3 className="font-semibold text-white mb-2">🎯 Multiple Game Modes</h3>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Daily Quizzes — Fresh challenges every day</li>
              <li>Live Quizzes — Compete in real-time</li>
              <li>Opinion Polls — Share your views</li>
              <li>Category Quizzes — Pick your expertise</li>
            </ul>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <h3 className="font-semibold text-white mb-2">🏆 Rewards System</h3>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Earn coins for correct answers</li>
              <li>Bonus coins for fast responses</li>
              <li>Streak bonuses for daily play</li>
              <li>Redeem coins for prizes</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <SeoLanding
      path="/quiz-game"
      title="Quiz Game – Play Online Quiz Game Daily | Quiz Dangal"
      h1="Quiz Game"
      description="Quiz Dangal is an online quiz game for India — play daily opinion and knowledge rounds, earn coins, and compete on leaderboards." 
      keywords={[
        'quiz game', 'quiz games', 'online quiz', 'quiz competition', 'quiz app',
        'trivia game', 'knowledge game', 'brain game', 'play quiz online'
      ]}
      features={features}
      additionalContent={additionalContent}
      relatedLinks={[
        { to: '/', label: 'Start Playing' },
        { to: '/online-quiz/', label: 'Online Quiz' },
        { to: '/leaderboards/', label: 'Leaderboards' },
        { to: '/quiz-app/', label: 'Quiz App' },
        { to: '/quiz-competition/', label: 'Quiz Competition' },
      ]}
      faqs={[
        {
          question: 'Is Quiz Dangal a quiz game app?',
          answer: 'Yes! Quiz Dangal works like a game app directly in your browser. It\'s a Progressive Web App (PWA), so you get app-like performance without downloading from app stores. You can also install it on your home screen for quick access.',
        },
        {
          question: 'How do I play this quiz game?',
          answer: 'Visit quizdangal.com, choose a quiz category (GK, Sports, Movies, Opinion), and start playing! Questions appear one by one with a timer. Answer correctly and quickly to earn maximum coins. Your scores are tracked on leaderboards.',
        },
        {
          question: 'Is the quiz game free to play?',
          answer: 'Absolutely! Quiz Dangal is 100% free. There are no entry fees, no subscriptions, and no in-app purchases required to play. We\'re ad-supported, so you get full access without paying anything.',
        },
        {
          question: 'Can I play quiz games with friends?',
          answer: 'Yes! You can refer friends using your unique referral link. When they join and play, both of you earn bonus coins. You can also compete on the same leaderboards and see who scores higher on daily quizzes.',
        },
        {
          question: 'What types of quiz games are available?',
          answer: 'We offer GK (General Knowledge), Sports (Cricket, Football), Movies (Bollywood, Hollywood), Current Affairs, Science, and fun Opinion polls. New quiz games are added daily across all categories.',
        },
        {
          question: 'How do I win rewards in this quiz game?',
          answer: 'Every correct answer earns you coins. Answer faster for bonus coins. Maintain daily streaks for streak bonuses. Accumulated coins can be redeemed for exciting rewards from our rewards catalog.',
        },
        {
          question: 'Can I play this quiz game offline?',
          answer: 'You need an internet connection to play and sync your progress. This ensures fair play, real-time scoring, and up-to-date content. Some pages may load faster on repeat visits due to caching.',
        },
      ]}
    />
  );
}
