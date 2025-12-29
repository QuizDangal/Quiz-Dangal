import React from 'react';
import SeoLanding from './SeoLanding';
import { Languages, BookOpen, MessageSquare, Globe } from 'lucide-react';

export default function EnglishQuiz() {
  const features = [
    { icon: Languages, title: 'English Content', desc: 'All quizzes available in easy-to-understand English' },
    { icon: BookOpen, title: 'Diverse Topics', desc: 'GK, Sports, Movies, Current Affairs — all in English' },
    { icon: MessageSquare, title: 'Simple Language', desc: 'Questions designed for Indian English speakers' },
    { icon: Globe, title: 'Global Knowledge', desc: 'International topics and world affairs coverage' },
  ];

  const additionalContent = (
    <>
      <h2 className="text-xl font-bold text-white mb-4">English Quiz Categories</h2>
      <div className="grid gap-4 md:grid-cols-2 text-sm text-slate-300">
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">📚 General Knowledge</h3>
          <p>History, Geography, Science, Politics, and World Affairs — all in clear, simple English.</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">🏏 Sports in English</h3>
          <p>Cricket, Football, Olympics, and international sports trivia in English language.</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">🎬 Movies & Entertainment</h3>
          <p>Bollywood and Hollywood trivia, actors, dialogues, and entertainment facts in English.</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">📰 Current Affairs</h3>
          <p>Latest news, government policies, international events — updated daily in English.</p>
        </div>
      </div>
      <div className="mt-4 bg-indigo-900/20 border border-indigo-700/30 rounded-xl p-4">
        <h3 className="font-semibold text-white mb-2">🌐 Designed for Indian Audiences</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          Our English content is crafted for Indian English speakers. We use simple, clear language 
          that&apos;s easy to understand while covering topics relevant to Indian and international audiences. 
          Perfect for students, professionals, and anyone looking to improve their general knowledge in English.
        </p>
      </div>
    </>
  );

  return (
    <SeoLanding
      path="/english-quiz"
      title="English Quiz – Online Quiz Practice | Quiz Dangal"
      h1="English Quiz"
      description="Play quick English-friendly quiz rounds on Quiz Dangal. Practice daily with GK, sports, movies, and opinion quizzes in a smooth web experience."
      keywords={[
        'english quiz', 'quiz test', 'online quiz', 'quiz questions',
        'quiz in english', 'gk quiz english', 'english language quiz'
      ]}
      features={features}
      additionalContent={additionalContent}
      relatedLinks={[
        { href: '/quiz-questions/', label: 'Quiz Questions' },
        { href: '/online-quiz/', label: 'Online Quiz' },
        { href: '/category/opinion/', label: 'Opinion Quiz' },
        { href: '/gk-quiz/', label: 'GK Quiz' },
        { href: '/hindi-quiz/', label: 'Hindi Quiz' },
      ]}
      faqs={[
        {
          question: 'Is Quiz Dangal available in English?',
          answer: 'Yes! Quiz Dangal is fully available in English. The entire app experience, interface, and most quizzes are in English. We use simple, clear language designed for Indian English speakers.',
        },
        {
          question: 'Are all quizzes in English?',
          answer: 'Most of our quizzes are in English. We also have Hindi content for Hindi-speaking users. You can easily navigate between categories and find English-language quizzes across all topics.',
        },
        {
          question: 'Is the English used easy to understand?',
          answer: 'Yes! We write questions in simple, clear English that\'s easy for Indian audiences to understand. We avoid complex vocabulary and focus on making content accessible to all education levels.',
        },
        {
          question: 'Do you cover international topics in English?',
          answer: 'Absolutely! Our English quizzes cover both Indian and international topics — world history, global current affairs, international sports, Hollywood movies, and more. Great for building global knowledge.',
        },
        {
          question: 'Can I switch between English and Hindi?',
          answer: 'Yes! Quiz Dangal has both English and Hindi content. You can play English quizzes in most categories and switch to Hindi content when available. Visit our Hindi Quiz page for dedicated Hindi quizzes.',
        },
        {
          question: 'Is English quiz helpful for competitive exams?',
          answer: 'Yes! Our English GK and Current Affairs quizzes cover topics asked in UPSC, SSC, Banking, and other competitive exams. Regular practice improves your general knowledge and reading speed.',
        },
        {
          question: 'Is the English quiz free to play?',
          answer: 'Yes, 100% free! Play unlimited English quizzes, earn coins, and compete on leaderboards without paying anything. No subscriptions or hidden charges.',
        },
      ]}
    />
  );
}
