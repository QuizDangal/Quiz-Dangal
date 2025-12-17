import React from 'react';
import SeoLanding from './SeoLanding';

export default function SportsQuizLanding() {
  return (
    <SeoLanding
      path="/sports-quiz"
      title="Sports Quiz – Daily Sports Quiz Online | Quiz Dangal"
      h1="Sports Quiz"
      description="Play sports quizzes on Quiz Dangal — cricket and more. Join daily rounds, compete on leaderboards, and earn coins as you play." 
      keywords={['sports quiz', 'cricket quiz', 'online quiz', 'quiz game']}
      relatedLinks={[
        { href: '/category/sports/', label: 'Play Sports Quizzes' },
        { href: '/cricket-quiz/', label: 'Cricket Quiz' },
        { href: '/leaderboards/', label: 'Leaderboards' },
      ]}
      faqs={[
        {
          question: 'Do you have cricket quizzes?',
          answer: 'Yes — sports category includes cricket-style quizzes and other sports themes depending on the day.',
        },
      ]}
    />
  );
}
