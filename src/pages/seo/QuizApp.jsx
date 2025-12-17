import React from 'react';
import SeoLanding from './SeoLanding';

export default function QuizApp() {
  return (
    <SeoLanding
      path="/quiz-app"
      title="Quiz App – Free Online Quiz App (Web) | Quiz Dangal"
      h1="Quiz App"
      description="Looking for a quiz app? Quiz Dangal is a fast web quiz app (PWA) — play daily quizzes, earn coins, and compete with friends." 
      keywords={['quiz app', 'online quiz', 'quiz game', 'india quiz', 'refer and earn']}
      relatedLinks={[
        { href: '/online-quiz/', label: 'Online Quiz' },
        { href: '/quiz-game/', label: 'Quiz Game' },
        { href: '/refer-earn-quiz-app/', label: 'Refer & Earn' },
      ]}
      faqs={[
        {
          question: 'Do I need to install anything?',
          answer: 'No. You can play directly in your browser. On supported devices you can install it as a PWA for an app-like feel.',
        },
      ]}
    />
  );
}
