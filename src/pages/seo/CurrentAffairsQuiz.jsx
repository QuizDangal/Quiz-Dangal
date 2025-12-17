import React from 'react';
import SeoLanding from './SeoLanding';

export default function CurrentAffairsQuiz() {
  return (
    <SeoLanding
      path="/current-affairs-quiz"
      title="Current Affairs Quiz – Daily Practice for India | Quiz Dangal"
      h1="Current Affairs Quiz"
      description="Stay sharp with current affairs style quiz practice on Quiz Dangal. Play daily, improve speed, and compete on leaderboards."
      keywords={['current affairs quiz', 'current affairs', 'gk quiz', 'quiz test', 'india quiz']}
      relatedLinks={[
        { href: '/gk-quiz/', label: 'GK Quiz' },
        { href: '/category/gk/', label: 'Play GK Quizzes' },
        { href: '/leaderboards/', label: 'Leaderboards' },
      ]}
      faqs={[
        {
          question: 'Is this a full current affairs course?',
          answer: 'It’s quick quiz-style practice. For detailed learning, use it alongside reading/news sources, then test yourself here.',
        },
      ]}
    />
  );
}
