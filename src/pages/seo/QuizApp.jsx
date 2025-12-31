import React from 'react';
import SeoLanding from './SeoLanding';
import { Download, Zap, Shield, Star } from 'lucide-react';

export default function QuizApp() {
  const features = [
    { icon: Zap, title: 'Instant Access', desc: 'No app store downloads — open in browser and start playing instantly' },
    { icon: Download, title: 'Add to Home Screen', desc: 'Install as PWA for app-like experience with quick access' },
    { icon: Shield, title: 'Safe & Secure', desc: 'No permissions needed — just a secure browser experience' },
    { icon: Star, title: 'Always Updated', desc: 'No manual updates required — always get the latest features' },
  ];

  const additionalContent = (
    <>
      <h2 className="text-xl font-bold text-white mb-4">Quiz Dangal: Your Go-To Quiz App</h2>
      <div className="space-y-4 text-sm text-slate-300">
        <p className="leading-relaxed">
          Looking for the best quiz app in India? Quiz Dangal is a Progressive Web App (PWA) that gives you 
          all the benefits of a native app without the hassle of downloading from app stores. Play quizzes, 
          earn coins, compete on leaderboards, and redeem exciting rewards — all from your browser!
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <h3 className="font-semibold text-white mb-2">📱 How to Install</h3>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Open quizdangal.com in Chrome/Safari</li>
              <li>Tap the menu (three dots or share icon)</li>
              <li>Select &quot;Add to Home Screen&quot;</li>
              <li>Launch like any other app!</li>
            </ol>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <h3 className="font-semibold text-white mb-2">✨ PWA Benefits</h3>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>No storage space wasted</li>
              <li>Automatic updates</li>
              <li>Works on all devices</li>
              <li>Fast and responsive</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <SeoLanding
      path="/quiz-app"
      title="Quiz App – Free Online Quiz App (Web) | Quiz Dangal"
      h1="Quiz App"
      description="Looking for a quiz app? Quiz Dangal is a fast web quiz app (PWA) — play daily quizzes, earn coins, and compete with friends." 
      keywords={[
        'quiz app', 'online quiz', 'quiz game', 'india quiz', 'refer and earn',
        'best quiz app', 'quiz app download', 'free quiz app', 'pwa quiz'
      ]}
      features={features}
      additionalContent={additionalContent}
      relatedLinks={[
        { to: '/online-quiz/', label: 'Online Quiz' },
        { to: '/quiz-game/', label: 'Quiz Game' },
        { to: '/refer-earn-quiz-app/', label: 'Refer & Earn' },
        { to: '/quiz-questions/', label: 'Quiz Questions' },
        { to: '/leaderboards/', label: 'Leaderboards' },
      ]}
      faqs={[
        {
          question: 'Do I need to install anything to use this quiz app?',
          answer: 'No installation required! Quiz Dangal is a Progressive Web App (PWA) that runs directly in your browser. However, if you want an app-like experience, you can add it to your home screen from the browser menu.',
        },
        {
          question: 'Is this quiz app available on Android and iPhone?',
          answer: 'Yes! Quiz Dangal works on all devices including Android phones, iPhones, tablets, and desktop computers. Simply open quizdangal.com in your browser and start playing. The PWA experience is optimized for all screen sizes.',
        },
        {
          question: 'Is the quiz app free to download and use?',
          answer: 'Quiz Dangal is completely free! There\'s nothing to download (it\'s web-based), no entry fees to play quizzes, and no subscriptions. We\'re ad-supported, so you get full access without paying anything.',
        },
        {
          question: 'How is Quiz Dangal different from other quiz apps?',
          answer: 'Quiz Dangal offers a unique combination of daily fresh content, multiple quiz categories (GK, Sports, Movies, Opinion), real rewards, national leaderboards, and a refer-and-earn program. Plus, as a PWA, it\'s faster and takes no storage space!',
        },
        {
          question: 'Can I earn rewards from this quiz app?',
          answer: 'You earn coins by playing quizzes correctly and quickly. These coins can be redeemed for exciting rewards like gift vouchers. This is an educational trivia game, not gambling. Consistent players can accumulate rewards through our refer-and-earn program!',
        },
        {
          question: 'Does the quiz app work offline?',
          answer: 'You need an internet connection to play quizzes and sync your progress. This ensures fair play, real-time scoring, and up-to-date content. Some pages may be cached for faster loading on repeat visits.',
        },
        {
          question: 'How do I refer friends to the quiz app?',
          answer: 'Go to the Refer & Earn section in your profile. Share your unique referral link with friends. When they sign up and play, both you and your friend earn bonus coins! It\'s a great way to grow your rewards.',
        },
      ]}
    />
  );
}
