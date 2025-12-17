import React from 'react';
import SeoLanding from './SeoLanding';

export default function QuizGame() {
  return (
    <SeoLanding
      path="/quiz-game"
      title="Quiz Game – Play Online Quiz Game Daily | Quiz Dangal"
      h1="Quiz Game"
      description="Quiz Dangal is an online quiz game for India — play daily opinion and knowledge rounds, earn coins, and compete on leaderboards." 
      keywords={['quiz game', 'quiz games', 'online quiz', 'quiz competition', 'quiz app']}
      relatedLinks={[
        { href: '/', label: 'Start Playing' },
        { href: '/online-quiz/', label: 'Online Quiz' },
        { href: '/leaderboards/', label: 'Leaderboards' },
      ]}
      faqs={[
        {
          question: 'Is Quiz Dangal a quiz game app?',
          answer: 'Yes — it works like an app in your browser. You can also install it as a PWA on supported devices.',
        },
      ]}
    />
  );
}
