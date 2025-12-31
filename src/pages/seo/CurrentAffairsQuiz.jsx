import React from 'react';
import SeoLanding from './SeoLanding';
import { Newspaper, Calendar, TrendingUp, Award } from 'lucide-react';

export default function CurrentAffairsQuiz() {
  const features = [
    { icon: Newspaper, title: 'Daily News Updates', desc: 'Questions based on latest national and international news' },
    { icon: Calendar, title: 'Weekly Compilations', desc: 'Weekly current affairs rounds covering all major events' },
    { icon: TrendingUp, title: 'Exam-Oriented', desc: 'Content relevant for UPSC, SSC, Banking, and state exams' },
    { icon: Award, title: 'Learn & Compete', desc: 'Test yourself while competing on leaderboards' },
  ];

  const additionalContent = (
    <>
      <h2 className="text-xl font-bold text-white mb-4">Current Affairs Topics We Cover</h2>
      <div className="grid gap-4 md:grid-cols-2 text-sm text-slate-300">
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">🇮🇳 National Affairs</h3>
          <p>Government policies, cabinet decisions, new schemes, important bills, Supreme Court judgments, appointments, and national events.</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">🌍 International Affairs</h3>
          <p>Global summits, bilateral relations, international organizations (UN, G20, BRICS), world leaders, and global developments.</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">💰 Economy & Business</h3>
          <p>RBI policies, GDP updates, stock market news, budget highlights, banking sector updates, and economic indicators.</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">🏆 Sports & Awards</h3>
          <p>Latest sports tournaments, award ceremonies (Padma, Nobel, Bharat Ratna), appointments, and achievements.</p>
        </div>
      </div>
      <div className="mt-4 bg-indigo-900/30 border border-indigo-700/50 rounded-xl p-4">
        <h3 className="font-semibold text-white mb-2">📚 Perfect for Exam Preparation</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          Our current affairs quizzes are designed to help students preparing for competitive exams like 
          UPSC Civil Services, SSC CGL/CHSL, Bank PO/Clerk, RRB, State PSCs, and other government exams. 
          Regular practice here complements your newspaper reading and keeps you exam-ready!
        </p>
      </div>
    </>
  );

  return (
    <SeoLanding
      path="/current-affairs-quiz"
      title="Current Affairs Quiz – Daily Practice for India | Quiz Dangal"
      h1="Current Affairs Quiz"
      description="Stay sharp with current affairs style quiz practice on Quiz Dangal. Play daily, improve speed, and compete on leaderboards."
      keywords={[
        'current affairs quiz', 'current affairs', 'gk quiz', 'quiz test', 'india quiz',
        'daily current affairs', 'current affairs for upsc', 'current affairs 2025',
        'current affairs questions', 'weekly current affairs'
      ]}
      features={features}
      additionalContent={additionalContent}
      relatedLinks={[
        { to: '/gk-quiz/', label: 'GK Quiz' },
        { to: '/category/gk/', label: 'Play GK Quizzes' },
        { to: '/leaderboards/', label: 'Leaderboards' },
        { to: '/india-quiz/', label: 'India Quiz' },
        { to: '/quiz-questions/', label: 'All Quiz Questions' },
      ]}
      faqs={[
        {
          question: 'Is this a full current affairs course?',
          answer: 'Quiz Dangal provides quick quiz-style practice for current affairs, not a full course. We recommend using it alongside your regular reading of newspapers (The Hindu, Indian Express) and news sources. Play our quizzes to test your retention and identify gaps in your knowledge.',
        },
        {
          question: 'How often are current affairs questions updated?',
          answer: 'We add new current affairs questions daily based on the latest news and events. Weekly compilation rounds cover all major happenings. Our content team ensures you stay updated with recent developments across all important topics.',
        },
        {
          question: 'Is this helpful for UPSC and competitive exam preparation?',
          answer: 'Yes! Our current affairs content covers topics commonly asked in UPSC Prelims, SSC, Banking, Railways, and state PSC exams. While we focus on making learning engaging, the content is factual and exam-relevant. Use it as a supplement to your regular preparation.',
        },
        {
          question: 'What current affairs topics are covered?',
          answer: 'We cover National Affairs (government policies, schemes, appointments), International Affairs (summits, global events), Economy (RBI, budget, GDP), Science & Tech (ISRO, innovations), Environment, Sports updates, and Awards & Honours.',
        },
        {
          question: 'Can I practice monthly current affairs?',
          answer: 'Yes! We have quizzes that compile important events from recent weeks and months. This helps you revise and ensure you haven\'t missed any major developments. Regular practice is key to current affairs retention.',
        },
        {
          question: 'Are current affairs questions available in Hindi?',
          answer: 'Many of our current affairs quizzes are available in Hindi to cater to Hindi-medium students. Check out our Hindi Quiz page for more Hindi-language content. We\'re continuously adding more bilingual content.',
        },
        {
          question: 'How can current affairs quiz improve my exam performance?',
          answer: 'Regular practice improves recall speed, helps identify weak areas, builds exam temperament, and makes revision engaging. The quiz format mimics MCQ-based exams, so you get familiar with quick decision-making under time pressure.',
        },
      ]}
    />
  );
}
