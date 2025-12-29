import React from 'react';
import SeoLanding from './SeoLanding';
import { MapPin, Users, Gift, BookOpen } from 'lucide-react';

export default function IndiaQuiz() {
  const features = [
    { icon: MapPin, title: 'Made for India', desc: 'Content designed specifically for Indian audiences and interests' },
    { icon: BookOpen, title: 'Indian Topics', desc: 'Indian history, culture, sports, Bollywood, and current affairs' },
    { icon: Users, title: 'Hindi & English', desc: 'Quizzes available in both Hindi and English languages' },
    { icon: Gift, title: 'Indian Rewards', desc: 'Earn coins and redeem rewards relevant to Indian users' },
  ];

  const additionalContent = (
    <>
      <h2 className="text-xl font-bold text-white mb-4">India-Focused Quiz Categories</h2>
      <div className="grid gap-4 md:grid-cols-2 text-sm text-slate-300">
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">🇮🇳 India GK</h3>
          <p>Indian history, freedom struggle, Constitution, geography, states & capitals, famous personalities, and national symbols.</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">🏏 Indian Sports</h3>
          <p>Cricket (IPL, Team India), hockey, badminton, wrestling, kabaddi, and Indian Olympic heroes like Neeraj Chopra.</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">🎬 Bollywood</h3>
          <p>Hindi cinema, famous dialogues, actors, directors, music, and iconic Bollywood moments from classic to latest films.</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">📰 Current Affairs</h3>
          <p>Indian government policies, budget, elections, appointments, and important national and state-level developments.</p>
        </div>
      </div>
      <div className="mt-4 bg-orange-900/20 border border-orange-700/30 rounded-xl p-4">
        <h3 className="font-semibold text-white mb-2">🎯 Why Quiz Dangal for India?</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          Quiz Dangal is built from the ground up for Indian users. Our content team is based in India, 
          understands Indian culture, and creates quizzes that resonate with Indian audiences. 
          From IPL to Bollywood, from UPSC preparation to opinion polls on trending Indian topics — 
          we&apos;ve got it all!
        </p>
      </div>
    </>
  );

  return (
    <SeoLanding
      path="/india-quiz"
      title="India Quiz – Daily Quizzes for India | Quiz Dangal"
      h1="India Quiz"
      description="Quiz Dangal is built for India — play daily quizzes in GK, sports, movies, and opinion formats. Earn coins and climb leaderboards." 
      keywords={[
        'india quiz', 'online quiz', 'quiz app', 'gk quiz', 'hindi quiz',
        'indian quiz', 'quiz for india', 'india gk quiz', 'desi quiz'
      ]}
      features={features}
      additionalContent={additionalContent}
      relatedLinks={[
        { href: '/', label: 'Home' },
        { href: '/gk-quiz/', label: 'GK Quiz' },
        { href: '/hindi-quiz/', label: 'Hindi Quiz' },
        { href: '/cricket-quiz/', label: 'Cricket Quiz' },
        { href: '/current-affairs-quiz/', label: 'Current Affairs' },
      ]}
      faqs={[
        {
          question: 'Is Quiz Dangal specifically for Indian audiences?',
          answer: 'Yes! Quiz Dangal is designed specifically for India. Our quizzes cover Indian topics like India GK, Bollywood, Cricket/IPL, Indian current affairs, and Hindi language content. The rewards system and content are all tailored for Indian users.',
        },
        {
          question: 'Are quizzes available in Hindi?',
          answer: 'Yes! Many of our quizzes are available in Hindi. We cater to both Hindi and English speaking audiences. Visit our Hindi Quiz page for dedicated Hindi-language quizzes across all categories.',
        },
        {
          question: 'What Indian topics are covered?',
          answer: 'We cover Indian History, Geography, Constitution, Politics, Economy, Indian Sports (Cricket, Hockey, Kabaddi), Bollywood, Indian festivals and culture, current affairs, government schemes, and trending Indian topics.',
        },
        {
          question: 'Is this quiz helpful for Indian competitive exams?',
          answer: 'Yes! Our GK and Current Affairs content covers topics asked in UPSC, SSC, Banking, Railways, and state PSC exams. Regular practice on Quiz Dangal complements your exam preparation effectively.',
        },
        {
          question: 'Do you have IPL and Indian cricket quizzes?',
          answer: 'Absolutely! We have extensive cricket content covering Team India, IPL (all franchises), Indian cricket legends (Sachin, Virat, Dhoni), domestic cricket, and India\'s performances in World Cup tournaments.',
        },
        {
          question: 'Are the rewards relevant for Indian users?',
          answer: 'Yes! Our coin system and rewards are designed with Indian users in mind. You can earn coins by playing and redeem them for rewards that are relevant and valuable for Indian users.',
        },
        {
          question: 'Is the quiz platform free for Indian users?',
          answer: 'Yes, 100% free! There are no entry fees or subscriptions. Indian users can play unlimited quizzes without paying anything. We\'re ad-supported, so you get full access for free.',
        },
      ]}
    />
  );
}
