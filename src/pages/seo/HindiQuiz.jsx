import React from 'react';
import SeoLanding from './SeoLanding';

export default function HindiQuiz() {
  return (
    <SeoLanding
      path="/hindi-quiz"
      title="Hindi Quiz – Online Quiz in Hindi | Quiz Dangal"
      h1="Hindi Quiz (Quiz in Hindi)"
      description="Hindi quiz ke liye Quiz Dangal par daily fun quizzes khelo — GK, sports, movies, aur opinion rounds. Fast, mobile-friendly, and free to start."
      keywords={['hindi quiz', 'quiz in hindi', 'online quiz', 'india quiz', 'gk quiz']}
      relatedLinks={[
        { href: '/category/gk/', label: 'GK Quiz' },
        { href: '/quiz-questions/', label: 'Quiz Questions' },
        { href: '/leaderboards/', label: 'Leaderboards' },
      ]}
      faqs={[
        {
          question: 'Kya Hindi me quiz available hai?',
          answer: 'Hum Indian audience ke liye quizzes banate hain. Content ko simple aur easy-to-play format me rakhte hain.',
        },
        {
          question: 'Quiz kaise play karein?',
          answer: 'Home page par categories select karo aur quiz start karo. Login karne par aap streaks, coins, aur leaderboards ka benefit le sakte ho.',
        },
      ]}
    />
  );
}
