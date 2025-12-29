import React from 'react';
import SeoLanding from './SeoLanding';
import { BookOpen, RefreshCw, Trophy, CheckCircle } from 'lucide-react';

export default function GKQuestions() {
  const features = [
    { icon: BookOpen, title: 'Comprehensive Coverage', desc: 'Questions from all major GK topics and current affairs' },
    { icon: RefreshCw, title: 'Daily Fresh Questions', desc: 'New GK questions added every day for regular practice' },
    { icon: CheckCircle, title: 'Instant Feedback', desc: 'Know immediately if your answer is correct or wrong' },
    { icon: Trophy, title: 'Compete & Learn', desc: 'Test yourself while competing on leaderboards' },
  ];

  const additionalContent = (
    <>
      <h2 className="text-xl font-bold text-white mb-4">GK Question Categories</h2>
      <div className="grid gap-4 md:grid-cols-3 text-sm text-slate-300">
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">📜 History</h3>
          <p className="text-xs">Indian freedom struggle, ancient civilizations, medieval history, modern world history</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">🌍 Geography</h3>
          <p className="text-xs">Indian geography, world geography, rivers, mountains, capitals, natural phenomena</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">🔬 Science</h3>
          <p className="text-xs">Physics, Chemistry, Biology, Space science, Inventions, Scientific discoveries</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">⚖️ Polity</h3>
          <p className="text-xs">Indian Constitution, governance, Parliament, judiciary, fundamental rights</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">💰 Economy</h3>
          <p className="text-xs">Indian economy, banking, RBI, budget, GDP, international organizations</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">📰 Current Affairs</h3>
          <p className="text-xs">Latest news, government schemes, appointments, awards, important events</p>
        </div>
      </div>
    </>
  );

  return (
    <SeoLanding
      path="/gk-questions"
      title="GK Questions – Daily GK Question Practice | Quiz Dangal"
      h1="GK Questions"
      description="Practice GK questions with daily quiz rounds on Quiz Dangal. Play, learn, and compete on leaderboards." 
      keywords={[
        'gk questions', 'gk quiz questions', 'gk quiz', 'general knowledge quiz',
        'gk questions with answers', 'gk mcq', 'general knowledge questions'
      ]}
      features={features}
      additionalContent={additionalContent}
      relatedLinks={[
        { href: '/gk-quiz/', label: 'GK Quiz' },
        { href: '/category/gk/', label: 'Play GK Quizzes' },
        { href: '/current-affairs-quiz/', label: 'Current Affairs Quiz' },
        { href: '/general-knowledge-quiz/', label: 'General Knowledge Quiz' },
        { href: '/quiz-questions/', label: 'All Quiz Questions' },
      ]}
      faqs={[
        {
          question: 'What GK questions are available on Quiz Dangal?',
          answer: 'We have GK questions covering History (Indian & World), Geography, Science, Indian Constitution, Politics, Economy, Sports, Art & Culture, Current Affairs, and more. New questions are added daily across all topics.',
        },
        {
          question: 'Are GK questions updated regularly?',
          answer: 'Yes! We add new GK questions every day. Our content team creates fresh questions based on current affairs, trending topics, and important events. Play daily to catch all the new content.',
        },
        {
          question: 'Do you show answers after the quiz?',
          answer: 'Yes! After completing each quiz, you can review all questions with correct answers. This helps you learn from mistakes and improve your knowledge. Some questions also include brief explanations.',
        },
        {
          question: 'Are these GK questions helpful for exams?',
          answer: 'Absolutely! Our GK questions cover topics commonly asked in UPSC, SSC, Banking, Railways, and state PSC exams. Regular practice here complements your exam preparation effectively.',
        },
        {
          question: 'How many GK questions can I practice daily?',
          answer: 'There\'s no limit! You can play as many GK quiz rounds as you want. Each quiz contains multiple questions, and new quizzes are available every day. The more you practice, the more coins you earn.',
        },
        {
          question: 'Are GK questions available in Hindi?',
          answer: 'Yes! Many of our GK questions are available in Hindi. We cater to both Hindi and English speaking audiences. Check out our Hindi Quiz page for dedicated Hindi-language GK content.',
        },
        {
          question: 'Is practicing GK questions free?',
          answer: 'Yes, 100% free! There are no entry fees or subscriptions. Play unlimited GK questions, earn coins for correct answers, and improve your knowledge without paying anything.',
        },
      ]}
    />
  );
}
