import React from 'react';
import SeoLanding from './SeoLanding';
import { BookOpen, Brain, Clock, Target } from 'lucide-react';

export default function GeneralKnowledgeQuiz() {
  const features = [
    { icon: BookOpen, title: 'Wide Topic Range', desc: 'History, Science, Geography, Politics, Economy and more' },
    { icon: Brain, title: 'Learn As You Play', desc: 'Expand your knowledge while having fun' },
    { icon: Clock, title: 'Quick Revision', desc: 'Perfect for daily GK revision in short sessions' },
    { icon: Target, title: 'Exam Preparation', desc: 'Questions relevant for competitive exams' },
  ];

  const additionalContent = (
    <>
      <h2 className="text-xl font-bold text-white mb-4">General Knowledge Topics</h2>
      <div className="flex flex-wrap gap-2 text-xs text-slate-300 mb-4">
        {[
          'Indian History', 'World History', 'Geography', 'Indian Constitution',
          'Science & Technology', 'Biology', 'Physics', 'Chemistry',
          'Economy', 'Banking', 'Politics', 'Environment',
          'Sports', 'Art & Culture', 'Books & Authors', 'Awards',
          'Important Days', 'Inventions', 'Space & ISRO', 'Defense'
        ].map((topic) => (
          <span key={topic} className="px-3 py-1.5 bg-slate-800/70 rounded-lg font-medium">
            {topic}
          </span>
        ))}
      </div>
      <div className="bg-slate-800/50 rounded-xl p-4">
        <h3 className="font-semibold text-white mb-2">📚 Why Practice General Knowledge?</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          General knowledge is the foundation for success in competitive exams, interviews, and everyday conversations. 
          Regular GK practice improves memory, broadens your worldview, and keeps you informed about current events. 
          Our quiz format makes learning enjoyable and helps you retain information better than passive reading.
        </p>
      </div>
    </>
  );

  return (
    <SeoLanding
      path="/general-knowledge-quiz"
      title="General Knowledge Quiz – GK Practice Online | Quiz Dangal"
      h1="General Knowledge Quiz"
      description="Practice general knowledge quizzes on Quiz Dangal with daily rounds and leaderboard competition. Great for quick GK revision." 
      keywords={[
        'general knowledge quiz', 'general quiz', 'gk quiz', 'gk questions', 'quiz test',
        'general knowledge questions', 'gk practice', 'gk online test', 'gk mcq'
      ]}
      features={features}
      additionalContent={additionalContent}
      relatedLinks={[
        { to: '/gk-quiz/', label: 'GK Quiz' },
        { to: '/category/gk/', label: 'Play GK' },
        { to: '/quiz-questions-with-answers/', label: 'Quiz Questions With Answers' },
        { to: '/current-affairs-quiz/', label: 'Current Affairs' },
        { to: '/gk-questions/', label: 'GK Questions' },
      ]}
      faqs={[
        {
          question: 'Is this useful for quick GK revision?',
          answer: 'Absolutely! Playing short quiz rounds daily helps you practice speed and recall. Each quiz takes just a few minutes, making it perfect for revision during breaks, commutes, or before exams. Regular practice builds long-term retention.',
        },
        {
          question: 'What topics are covered in general knowledge quizzes?',
          answer: 'We cover a comprehensive range: Indian & World History, Geography, Science (Physics, Chemistry, Biology), Indian Constitution, Politics, Economy, Banking, Current Affairs, Sports, Art & Culture, Important Days, Awards, and more.',
        },
        {
          question: 'Is this helpful for competitive exam preparation?',
          answer: 'Yes! Our general knowledge questions cover topics commonly asked in UPSC, SSC CGL/CHSL, Bank PO/Clerk, Railways, NEET, and state PSC exams. Use our quizzes alongside your regular study material for effective revision.',
        },
        {
          question: 'How often are new questions added?',
          answer: 'We add new general knowledge questions daily. Our content team ensures fresh content across all topics, with special focus on current affairs and recent events that might be asked in exams.',
        },
        {
          question: 'Are answers shown after the quiz?',
          answer: 'Yes! After completing each quiz, you can review all questions with correct answers. This helps you learn from mistakes and understand concepts better. Some quizzes also include brief explanations.',
        },
        {
          question: 'Can I track my GK improvement?',
          answer: 'Yes! Your quiz history and scores are tracked. You can see your performance over time, identify weak areas, and watch yourself improve on the leaderboards as you practice consistently.',
        },
        {
          question: 'Is the general knowledge quiz free?',
          answer: 'Yes, completely free! No entry fees, no subscriptions. Play unlimited GK quizzes and earn coins for correct answers. Our platform is ad-supported, so you never pay to practice.',
        },
      ]}
    />
  );
}
