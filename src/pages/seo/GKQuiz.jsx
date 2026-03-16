import React from 'react';
import SeoLanding from './SeoLanding';
import { BookOpen, Globe, Lightbulb, Clock } from 'lucide-react';

export default function GKQuiz() {
  const features = [
    { icon: BookOpen, title: 'Comprehensive Topics', desc: 'History, Geography, Science, Politics, Economy and more' },
    { icon: Globe, title: 'India & World Focus', desc: 'Questions about India plus international current affairs' },
    { icon: Lightbulb, title: 'Learn While Playing', desc: 'Detailed explanations to help you understand each answer' },
    { icon: Clock, title: 'Daily Updates', desc: 'Fresh GK questions added every day based on current events' },
  ];

  const additionalContent = (
    <>
      <h2 className="text-xl font-bold text-white mb-4">GK Quiz Topics We Cover</h2>
      <div className="grid gap-3 text-sm text-slate-300">
        <div className="flex flex-wrap gap-2">
          {[
            'Indian History', 'World History', 'Geography', 'Indian Constitution',
            'Science & Technology', 'Current Affairs', 'Economy & Banking',
            'Sports GK', 'Art & Culture', 'Famous Personalities', 'Awards & Honours',
            'Important Days', 'Books & Authors', 'Inventions & Discoveries'
          ].map((topic) => (
            <span key={topic} className="px-3 py-1.5 bg-slate-800/70 rounded-lg text-xs font-medium">
              {topic}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-6 bg-slate-800/50 rounded-xl p-4">
        <h3 className="font-semibold text-white mb-2">📖 Why Practice GK Quiz?</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          General Knowledge is essential for competitive exams like UPSC, SSC, Banking, Railways, and state PSC exams. 
          Our GK quizzes help you prepare while having fun! Regular practice improves memory, builds confidence, 
          and keeps you updated with current affairs. Whether you&apos;re a student preparing for exams or just love 
          learning new facts, Quiz Dangal&apos;s GK section has something for everyone.
        </p>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">🏏 IPL Season Inside GK</h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            During IPL season, Quiz Dangal folds cricket awareness into active GK rounds instead of sending users to thin one-topic pages. Expect questions around teams, venues, records, player milestones, tournament history, and major match moments alongside core current-affairs coverage.
          </p>
        </div>
        <div className="bg-indigo-900/20 border border-indigo-700/30 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">🧭 High-Value Daily Content</h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            This page explains the real product, the topics we publish, and how live GK rounds help both learners and quiz players. That means users reach useful content even when a quiz slot is not currently live.
          </p>
        </div>
      </div>
    </>
  );

  return (
    <SeoLanding
      path="/gk-quiz"
      title="GK Quiz – Daily General Knowledge Quiz | Quiz Dangal"
      h1="GK Quiz (General Knowledge)"
      description="Take a daily GK quiz on Quiz Dangal and improve your general knowledge with fast, mobile-friendly rounds. Compete and earn coins."
      keywords={[
        'gk quiz', 'general knowledge quiz', 'gk questions', 'current affairs quiz', 
        'quiz in hindi', 'gk questions with answers', 'india gk', 'gk quiz online',
        'general knowledge questions', 'gk test'
      ]}
      features={features}
      additionalContent={additionalContent}
      relatedLinks={[
        { to: '/category/gk/', label: 'Play GK Quizzes' },
        { to: '/opinion-quiz-app/', label: 'Opinion Quiz Guide' },
        { to: '/play-win-quiz-app/', label: 'Play & Win Guide' },
        { to: '/leaderboards/', label: 'Leaderboard' },
        { to: '/refer-earn-quiz-app/', label: 'Refer & Earn' },
      ]}
      faqs={[
        {
          question: 'Is the GK quiz updated daily?',
          answer: 'Yes! We add new GK questions every day, including current affairs from the latest news. Our team ensures you always have fresh content to practice. Daily quizzes help you stay updated with recent events and important developments.',
        },
        {
          question: 'Do you have GK quiz in Hindi?',
          answer: 'Yes. Many GK rounds are written for Indian audiences in easy-to-understand language and may include bilingual support where available inside the main product flow.',
        },
        {
          question: 'Is this GK quiz helpful for competitive exams?',
          answer: 'Yes, our GK questions cover topics commonly asked in UPSC, SSC, Banking, Railways, NEET, and various state PSC exams. While we focus on making learning fun, the content is educational and exam-relevant.',
        },
        {
          question: 'What topics are covered in GK quiz?',
          answer: 'We cover Indian History, World History, Geography, Indian Constitution, Science & Technology, Current Affairs, Economy, Sports GK, Art & Culture, Famous Personalities, Awards, Important Days, and much more.',
        },
        {
          question: 'How can I improve my general knowledge?',
          answer: 'The best way is consistent practice! Play our daily GK quizzes, read the explanations for each answer, and maintain a streak. Our platform gamifies learning so you stay motivated. We also recommend reading newspapers alongside our quizzes.',
        },
        {
          question: 'Are answers shown after the GK quiz?',
          answer: 'Yes! After completing each quiz, you can review all questions with correct answers. This helps you learn from mistakes and understand concepts better. Some quizzes also include brief explanations.',
        },
        {
          question: 'Is the GK quiz free to play?',
          answer: 'Yes, 100% free! There are no entry fees or subscriptions required. You can play unlimited GK quizzes on Quiz Dangal and earn coins for correct answers. Our platform is ad-supported, so you never pay to play.',
        },
      ]}
    />
  );
}
