import React from 'react';
import SeoLanding from './SeoLanding';
import { Calculator, Brain, Zap, Target } from 'lucide-react';

export default function MathsQuiz() {
  const features = [
    { icon: Calculator, title: 'Mental Math', desc: 'Quick calculations, percentages, and number puzzles' },
    { icon: Brain, title: 'Logical Reasoning', desc: 'Number series, patterns, and mathematical logic' },
    { icon: Zap, title: 'Speed Practice', desc: 'Improve your calculation speed under time pressure' },
    { icon: Target, title: 'Exam Preparation', desc: 'Questions relevant for aptitude tests and exams' },
  ];

  const additionalContent = (
    <>
      <h2 className="text-xl font-bold text-white mb-4">Math Topics Covered</h2>
      <div className="grid gap-4 md:grid-cols-2 text-sm text-slate-300">
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">🔢 Arithmetic</h3>
          <p>Addition, subtraction, multiplication, division, percentages, fractions, and decimal calculations.</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">📊 Number Series</h3>
          <p>Find patterns, complete sequences, and solve number-based logical puzzles.</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">💰 Quantitative Aptitude</h3>
          <p>Profit & loss, ratio & proportion, time & work, speed & distance problems.</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">🧩 Logical Reasoning</h3>
          <p>Mathematical puzzles, brain teasers, and logical thinking questions.</p>
        </div>
      </div>
      <div className="mt-4 bg-blue-900/20 border border-blue-700/30 rounded-xl p-4">
        <h3 className="font-semibold text-white mb-2">📚 Great for Exam Prep</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          Our math-style questions are designed to help with competitive exam preparation. 
          Quantitative aptitude is a key component of SSC, Banking, CAT, and other aptitude tests. 
          Regular practice improves your speed and accuracy in calculations.
        </p>
      </div>
    </>
  );

  return (
    <SeoLanding
      path="/maths-quiz"
      title="Maths Quiz – Quick Math Practice Online | Quiz Dangal"
      h1="Maths Quiz"
      description="Do quick maths-quiz style practice on Quiz Dangal with fast rounds and a smooth mobile experience. Combine with daily GK and themed quizzes." 
      keywords={[
        'maths quiz', 'math quiz', 'quiz test', 'online quiz', 'quiz questions',
        'aptitude quiz', 'quantitative aptitude', 'math questions'
      ]}
      features={features}
      additionalContent={additionalContent}
      relatedLinks={[
        { to: '/quiz-questions/', label: 'Quiz Questions' },
        { to: '/online-quiz/', label: 'Online Quiz' },
        { to: '/category/gk/', label: 'GK Quizzes' },
        { to: '/science-quiz/', label: 'Science Quiz' },
        { to: '/gk-quiz/', label: 'GK Quiz' },
      ]}
      faqs={[
        {
          question: 'Do you have math quiz questions?',
          answer: 'Yes! Math-style questions appear in our GK and knowledge rounds. We have arithmetic problems, number series, logical reasoning, and quantitative aptitude questions. New math content is added regularly as part of our expanding question bank.',
        },
        {
          question: 'Is this helpful for aptitude exam preparation?',
          answer: 'Absolutely! Our math questions cover topics commonly asked in SSC, Banking, CAT, GMAT, and other aptitude tests. Regular practice helps improve calculation speed and accuracy under time pressure.',
        },
        {
          question: 'What difficulty levels are available?',
          answer: 'Our math questions range from easy arithmetic to challenging logical puzzles. We cater to beginners as well as advanced learners preparing for competitive exams.',
        },
        {
          question: 'Can I practice mental math?',
          answer: 'Yes! Our timed quiz format is perfect for mental math practice. You\'ll need to calculate quickly without a calculator, which improves your mental arithmetic skills over time.',
        },
        {
          question: 'Are answers shown after the math quiz?',
          answer: 'Yes! After completing each quiz, you can see all questions with correct answers. This helps you understand where you went wrong and learn the correct approach.',
        },
        {
          question: 'Is the math quiz free?',
          answer: 'Yes, completely free! Play unlimited math quiz rounds, earn coins for correct answers, and improve your skills without paying anything. No subscriptions or hidden charges.',
        },
        {
          question: 'Can I play math quiz on mobile?',
          answer: 'Absolutely! Quiz Dangal is optimized for mobile browsers. The interface is touch-friendly and works smoothly on all smartphone screens. Perfect for practicing math on the go!',
        },
      ]}
    />
  );
}
