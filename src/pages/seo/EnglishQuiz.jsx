import React from 'react';
import SeoLanding from './SeoLanding';

export default function EnglishQuiz() {
  return (
    <SeoLanding
      path="/english-quiz"
      title="English Quiz – Online Quiz Practice | Quiz Dangal"
      h1="English Quiz"
      description="Play quick English-friendly quiz rounds on Quiz Dangal. Practice daily with GK, sports, movies, and opinion quizzes in a smooth web experience."
      keywords={['english quiz', 'quiz test', 'online quiz', 'quiz questions']}
      relatedLinks={[
        { href: '/quiz-questions/', label: 'Quiz Questions' },
        { href: '/online-quiz/', label: 'Online Quiz' },
        { href: '/category/opinion/', label: 'Opinion Quiz' },
      ]}
      faqs={[
        {
          question: 'Is Quiz Dangal available in English?',
          answer: 'Yes. The app experience and many quizzes are English-friendly for Indian audiences.',
        },
      ]}
    />
  );
}
