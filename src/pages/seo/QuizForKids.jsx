import React from 'react';
import SeoLanding from './SeoLanding';

export default function QuizForKids() {
  return (
    <SeoLanding
      path="/quiz-for-kids"
      title="Quiz For Kids – Fun Online Quizzes | Quiz Dangal"
      h1="Quiz for Kids"
      description="Find fun, quick quiz-style rounds on Quiz Dangal. Great for light practice and family play — explore categories and play daily." 
      keywords={['quiz for kids', 'quiz game', 'online quiz', 'general knowledge quiz']}
      relatedLinks={[
        { href: '/quiz-questions/', label: 'Quiz Questions' },
        { href: '/category/opinion/', label: 'Opinion Quizzes' },
        { href: '/category/movies/', label: 'Movie Quizzes' },
      ]}
      faqs={[
        {
          question: 'Is this made specifically for children?',
          answer: 'Quiz Dangal is a general quiz platform. Some quizzes are light and family-friendly, but content varies by category and day.',
        },
      ]}
    />
  );
}
