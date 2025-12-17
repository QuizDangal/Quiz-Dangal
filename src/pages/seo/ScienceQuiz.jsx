import React from 'react';
import SeoLanding from './SeoLanding';

export default function ScienceQuiz() {
  return (
    <SeoLanding
      path="/science-quiz"
      title="Science Quiz – Practice Science Questions Online | Quiz Dangal"
      h1="Science Quiz"
      description="Enjoy science-style quiz practice on Quiz Dangal with fast, mobile-first rounds. Mix science knowledge with daily GK and themed quizzes."
      keywords={['science quiz', 'science quiz questions', 'quiz questions', 'online quiz']}
      relatedLinks={[
        { href: '/quiz-questions/', label: 'Quiz Questions' },
        { href: '/category/gk/', label: 'GK Quiz' },
        { href: '/online-quiz/', label: 'Online Quiz' },
      ]}
      faqs={[
        {
          question: 'Do you have science quiz questions?',
          answer: 'We run knowledge-based quizzes regularly. Science-themed rounds can appear as part of GK and special quizzes.',
        },
        {
          question: 'Can I play on mobile?',
          answer: 'Yes. Quiz Dangal is optimized for mobile and works smoothly in modern browsers.',
        },
      ]}
    />
  );
}
