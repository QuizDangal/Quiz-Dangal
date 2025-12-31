import React from 'react';
import SeoLanding from './SeoLanding';
import { CheckCircle, BookOpen, Brain, Award } from 'lucide-react';

export default function QuizQuestionsWithAnswers() {
  const features = [
    { icon: CheckCircle, title: 'Instant Answer Reveal', desc: 'See correct answers immediately after each quiz' },
    { icon: BookOpen, title: 'Learn From Mistakes', desc: 'Review wrong answers to improve your knowledge' },
    { icon: Brain, title: 'Detailed Explanations', desc: 'Understand why an answer is correct with explanations' },
    { icon: Award, title: 'Track Progress', desc: 'Monitor your improvement over time' },
  ];

  const additionalContent = (
    <>
      <h2 className="text-xl font-bold text-white mb-4">Why Practice With Answers?</h2>
      <div className="space-y-4 text-sm text-slate-300">
        <p className="leading-relaxed">
          The most effective way to learn is through immediate feedback. When you see the correct answer 
          right after answering a question, your brain makes stronger connections. This active recall 
          method is proven to be more effective than passive reading for long-term retention.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <h3 className="font-semibold text-white mb-2">✅ Benefits of Answer Review</h3>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Immediate correction of misconceptions</li>
              <li>Better retention through active recall</li>
              <li>Identify knowledge gaps quickly</li>
              <li>Build confidence with correct answers</li>
            </ul>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <h3 className="font-semibold text-white mb-2">📊 Track Your Learning</h3>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>See your quiz scores over time</li>
              <li>Identify weak topic areas</li>
              <li>Watch improvement on leaderboards</li>
              <li>Compare with other players</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <SeoLanding
      path="/quiz-questions-with-answers"
      title="Quiz Questions With Answers – Practice Online | Quiz Dangal"
      h1="Quiz Questions With Answers"
      description="Play quizzes on Quiz Dangal and review your results to learn from correct answers. Great for quick practice in GK, sports, movies, and more."
      keywords={[
        'quiz questions with answers', 'quiz questions and answers', 'gk quiz', 'online quiz',
        'quiz with answers', 'mcq with answers', 'gk questions with answers'
      ]}
      features={features}
      additionalContent={additionalContent}
      relatedLinks={[
        { to: '/quiz-questions/', label: 'Quiz Questions' },
        { to: '/category/gk/', label: 'GK Quiz' },
        { to: '/category/sports/', label: 'Sports Quiz' },
        { to: '/category/movies/', label: 'Movie Quiz' },
        { to: '/gk-questions/', label: 'GK Questions' },
      ]}
      faqs={[
        {
          question: 'Where can I see the correct answers?',
          answer: 'After finishing each quiz, Quiz Dangal shows a results screen with all questions, your answers, and the correct answers. You can review which questions you got right or wrong and learn from your mistakes.',
        },
        {
          question: 'Do all quizzes show answers?',
          answer: 'Yes! All quiz formats on Quiz Dangal show results after completion. You can see your score, correct answers, and in some cases, brief explanations for why an answer is correct.',
        },
        {
          question: 'Is this suitable for exam practice?',
          answer: 'Absolutely! Quiz Dangal is excellent for daily practice and building speed. The immediate feedback helps reinforce learning. For comprehensive exam prep, use our quizzes alongside detailed study materials.',
        },
        {
          question: 'What topics have questions with answers?',
          answer: 'All our categories have questions with answers: GK (General Knowledge), Sports (Cricket, Football), Movies (Bollywood, Hollywood), Current Affairs, Science, and Opinion polls. New content is added daily.',
        },
        {
          question: 'Can I retake quizzes to improve?',
          answer: 'We add new quizzes daily, so you\'ll always have fresh content to practice. While you can\'t retake the exact same quiz, similar topic questions appear regularly, helping you reinforce learning.',
        },
        {
          question: 'Are explanations provided for answers?',
          answer: 'Many of our quiz questions include brief explanations with the correct answer. This helps you understand the reasoning and remember the information better for future quizzes.',
        },
        {
          question: 'Is practicing with answers free?',
          answer: 'Yes, completely free! Play unlimited quizzes, see all answers, and learn without paying anything. We\'re ad-supported, so you get full access to questions with answers at no cost.',
        },
      ]}
    />
  );
}
