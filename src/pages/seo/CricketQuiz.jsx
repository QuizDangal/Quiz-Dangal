import React from 'react';
import SeoLanding from './SeoLanding';

export default function CricketQuiz() {
  return (
    <SeoLanding
      path="/cricket-quiz"
      title="Cricket Quiz – Play Cricket Quiz Online | Quiz Dangal"
      h1="Cricket Quiz"
      description="Test your cricket knowledge with sports quizzes on Quiz Dangal. Play fast rounds, compete, and earn coins." 
      keywords={['cricket quiz', 'sports quiz', 'online quiz', 'quiz game']}
      relatedLinks={[
        { href: '/category/sports/', label: 'Sports Quizzes' },
        { href: '/sports-quiz/', label: 'Sports Quiz Landing' },
      ]}
      faqs={[
        {
          question: 'Is this a live cricket quiz?',
          answer: 'Quizzes can be live or scheduled depending on the day. Check the Sports category for current availability.',
        },
      ]}
    />
  );
}
