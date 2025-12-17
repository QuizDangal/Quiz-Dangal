import React from 'react';
import SeoLanding from './SeoLanding';

export default function GKQuestions() {
  return (
    <SeoLanding
      path="/gk-questions"
      title="GK Questions – Daily GK Question Practice | Quiz Dangal"
      h1="GK Questions"
      description="Practice GK questions with daily quiz rounds on Quiz Dangal. Play, learn, and compete on leaderboards." 
      keywords={['gk questions', 'gk quiz questions', 'gk quiz', 'general knowledge quiz']}
      relatedLinks={[
        { href: '/gk-quiz/', label: 'GK Quiz' },
        { href: '/category/gk/', label: 'Play GK Quizzes' },
        { href: '/current-affairs-quiz/', label: 'Current Affairs Quiz' },
      ]}
      faqs={[
        {
          question: 'Do you provide GK quiz questions?',
          answer: 'Yes — GK rounds contain a rotating set of knowledge questions. Play regularly to see new quizzes.',
        },
      ]}
    />
  );
}
