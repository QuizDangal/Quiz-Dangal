import React from 'react';
import SeoLanding from './SeoLanding';

export default function QuizCompetition() {
  return (
    <SeoLanding
      path="/quiz-competition"
      title="Quiz Competition – Compete Daily & Win Coins | Quiz Dangal"
      h1="Quiz Competition"
      description="Join a daily quiz competition on Quiz Dangal: play rounds, climb the leaderboard, and earn coins through streaks and performance." 
      keywords={['quiz competition', 'online quiz', 'quiz game', 'leaderboards', 'play and win quiz']}
      relatedLinks={[
        { href: '/leaderboards/', label: 'See Leaderboards' },
        { href: '/play-win-quiz-app/', label: 'Play & Win' },
        { href: '/quiz-game/', label: 'Quiz Game' },
      ]}
      faqs={[
        {
          question: 'How do I participate?',
          answer: 'Open the app, pick a category, and play the active quiz. Sign in to track streaks, coins, and rankings.',
        },
      ]}
    />
  );
}
