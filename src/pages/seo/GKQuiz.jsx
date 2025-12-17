import React from 'react';
import SeoLanding from './SeoLanding';

export default function GKQuiz() {
  return (
    <SeoLanding
      path="/gk-quiz"
      title="GK Quiz – Daily General Knowledge Quiz | Quiz Dangal"
      h1="GK Quiz (General Knowledge)"
      description="Take a daily GK quiz on Quiz Dangal and improve your general knowledge with fast, mobile-friendly rounds. Compete and earn coins."
      keywords={['gk quiz', 'general knowledge quiz', 'gk questions', 'current affairs quiz', 'quiz in hindi']}
      relatedLinks={[
        { href: '/category/gk/', label: 'Play GK Quizzes' },
        { href: '/current-affairs-quiz/', label: 'Current Affairs Quiz' },
        { href: '/quiz-questions/', label: 'Quiz Questions' },
      ]}
      faqs={[
        {
          question: 'Is GK quiz updated daily?',
          answer: 'We run regular GK rounds and refresh quizzes frequently so you can practice every day.',
        },
        {
          question: 'Do you have GK quiz in Hindi?',
          answer: 'We support Indian audiences and keep language-friendly content. You can also try our Hindi quiz landing page for updates.',
        },
      ]}
    />
  );
}
