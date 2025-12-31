import React from 'react';
import SeoLanding from './SeoLanding';
import { Smartphone, Wifi, Zap, Gift } from 'lucide-react';

export default function OnlineQuiz() {
  const features = [
    { icon: Smartphone, title: 'Play Anywhere', desc: 'Access quizzes from any device — mobile, tablet, or desktop browser' },
    { icon: Wifi, title: 'No Download Needed', desc: 'Play directly in your browser without installing any app' },
    { icon: Zap, title: 'Instant Start', desc: 'Join quizzes instantly — no waiting, no loading delays' },
    { icon: Gift, title: 'Free to Play', desc: 'All quizzes are free with no entry fees or subscriptions' },
  ];

  const additionalContent = (
    <>
      <h2 className="text-xl font-bold text-white mb-4">Why Play Online Quizzes?</h2>
      <div className="space-y-4 text-sm text-slate-300">
        <p className="leading-relaxed">
          Online quizzes offer a fun and convenient way to test your knowledge, learn new facts, and compete with 
          others — all from the comfort of your phone or computer. Unlike traditional quiz competitions, you can 
          play anytime, anywhere, at your own pace.
        </p>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">📱 Benefits of Online Quiz Platforms</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Play on-the-go during commutes, breaks, or free time</li>
            <li>Compete with players across India in real-time</li>
            <li>Track your progress with detailed statistics</li>
            <li>Earn rewards and climb leaderboards</li>
            <li>Learn from mistakes with answer explanations</li>
            <li>Stay updated with current affairs and trends</li>
          </ul>
        </div>
      </div>
    </>
  );

  return (
    <SeoLanding
      path="/online-quiz"
      title="Online Quiz – Play Daily Quizzes Online | Quiz Dangal"
      h1="Online Quiz"
      description="Play online quizzes on Quiz Dangal: opinion rounds, GK, sports, and movies. Quick rounds, leaderboards, and rewards-style coins."
      keywords={[
        'online quiz', 'quiz game', 'daily quiz', 'quiz competition', 'quiz app',
        'play quiz online', 'free online quiz', 'quiz website', 'internet quiz'
      ]}
      features={features}
      additionalContent={additionalContent}
      relatedLinks={[
        { to: '/', label: 'Home' },
        { to: '/quiz-game/', label: 'Quiz Game' },
        { to: '/quiz-competition/', label: 'Quiz Competition' },
        { to: '/category/gk/', label: 'GK Quizzes' },
        { to: '/quiz-app/', label: 'Quiz App' },
        { to: '/leaderboards/', label: 'Leaderboards' },
      ]}
      faqs={[
        {
          question: 'Is Quiz Dangal an online quiz app?',
          answer: 'Yes! Quiz Dangal works like an app right in your browser (it\'s a Progressive Web App or PWA). You can play quizzes online without downloading or installing anything. On mobile, you can even add it to your home screen for quick access.',
        },
        {
          question: 'Do I need to create an account to play?',
          answer: 'You can browse some pages without logging in, but to play quizzes, track your coins, maintain streaks, and appear on leaderboards, you\'ll need to sign in. Creating an account is free and takes just seconds!',
        },
        {
          question: 'Can I play online quizzes on my mobile phone?',
          answer: 'Absolutely! Quiz Dangal is fully optimized for mobile browsers. Whether you\'re on Android or iPhone, just open quizdangal.com in your browser and start playing. The experience is smooth and app-like on all devices.',
        },
        {
          question: 'What types of online quizzes are available?',
          answer: 'We offer GK quizzes, Sports quizzes (Cricket, Football, Olympics), Movie quizzes (Bollywood, Hollywood), Current Affairs, Science, and fun Opinion polls. New quizzes are added daily across all categories.',
        },
        {
          question: 'Are online quizzes free on Quiz Dangal?',
          answer: 'Yes, 100% free! There are no entry fees, subscriptions, or hidden charges. You can play unlimited quizzes and earn coins without paying anything. We\'re supported by advertisements, so you never have to pay.',
        },
        {
          question: 'How do I compete with others in online quizzes?',
          answer: 'Your quiz scores are tracked on our leaderboards! Compete with players across India to climb the rankings. Play regularly, answer quickly and correctly, and watch your name rise on the leaderboard.',
        },
        {
          question: 'Is internet connection required to play?',
          answer: 'Yes, you need an internet connection to play live quizzes, submit answers, and earn coins. The quizzes are hosted online to ensure fair play and real-time scoring across all players.',
        },
      ]}
    />
  );
}
