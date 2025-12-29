import React from 'react';
import SeoLanding from './SeoLanding';
import { Trophy, Target, Zap, Medal } from 'lucide-react';

export default function SportsQuizLanding() {
  const features = [
    { icon: Trophy, title: 'All Major Sports', desc: 'Cricket, Football, Olympics, Badminton, Tennis and more' },
    { icon: Target, title: 'Live Event Quizzes', desc: 'Special quizzes during IPL, World Cup, Olympics' },
    { icon: Medal, title: 'Sports Legends', desc: 'Trivia about iconic players and historic moments' },
    { icon: Zap, title: 'Quick Rounds', desc: 'Fast-paced quizzes perfect for sports fans' },
  ];

  const additionalContent = (
    <>
      <h2 className="text-xl font-bold text-white mb-4">Sports We Cover</h2>
      <div className="grid gap-4 md:grid-cols-2 text-sm text-slate-300">
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">🏏 Cricket</h3>
          <p>IPL, T20 World Cup, ODI World Cup, Test matches, Indian cricket legends, records, and current series updates.</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">⚽ Football</h3>
          <p>FIFA World Cup, Premier League, La Liga, Champions League, and legendary footballers like Messi, Ronaldo, Neymar.</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">🏅 Olympics</h3>
          <p>Summer and Winter Olympics, Indian Olympic heroes, medal tallies, and memorable Olympic moments.</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">🎾 Other Sports</h3>
          <p>Tennis (Grand Slams), Badminton (BWF events), Hockey, Kabaddi, Wrestling, and emerging sports in India.</p>
        </div>
      </div>
    </>
  );

  return (
    <SeoLanding
      path="/sports-quiz"
      title="Sports Quiz – Daily Sports Quiz Online | Quiz Dangal"
      h1="Sports Quiz"
      description="Play sports quizzes on Quiz Dangal — cricket, football, Olympics and more. Join daily rounds, compete on leaderboards, and earn coins as you play." 
      keywords={[
        'sports quiz', 'cricket quiz', 'online quiz', 'quiz game',
        'football quiz', 'ipl quiz', 'olympics quiz', 'sports trivia'
      ]}
      features={features}
      additionalContent={additionalContent}
      relatedLinks={[
        { href: '/category/sports/', label: 'Play Sports Quizzes' },
        { href: '/cricket-quiz/', label: 'Cricket Quiz' },
        { href: '/leaderboards/', label: 'Leaderboards' },
        { href: '/quiz-questions/', label: 'All Quiz Questions' },
      ]}
      faqs={[
        {
          question: 'What sports are covered in the quiz?',
          answer: 'We cover Cricket (IPL, World Cup, Test), Football (FIFA, Premier League), Olympics, Badminton, Tennis, Hockey, Kabaddi, and more. Cricket is our most popular category with questions about Indian cricket legends, records, and ongoing series.',
        },
        {
          question: 'Do you have cricket quizzes?',
          answer: 'Yes! Cricket is our largest sports category. We have quizzes on IPL (all teams and seasons), World Cup, Test matches, player trivia, cricket records, and live event-based quizzes during major tournaments.',
        },
        {
          question: 'Are there quizzes during live sports events?',
          answer: 'Yes! During major events like IPL, Cricket World Cup, Olympics, and FIFA World Cup, we run special live quizzes with event-specific questions. These are great fun and often have bonus rewards!',
        },
        {
          question: 'Is the sports quiz free to play?',
          answer: 'Absolutely! All sports quizzes are 100% free. No entry fees, no subscriptions. Play unlimited rounds, earn coins, and compete on leaderboards without paying anything.',
        },
        {
          question: 'How often are sports quiz questions updated?',
          answer: 'We add new questions regularly, especially after major matches and tournaments. Current series updates, record-breaking moments, and tournament results are quickly added to keep content fresh and relevant.',
        },
        {
          question: 'Can I test my IPL knowledge?',
          answer: 'Yes! Our IPL quizzes cover all franchises (CSK, MI, RCB, KKR, DC, SRH, RR, PBKS, GT, LSG), player stats, orange cap holders, purple cap winners, auction records, and memorable IPL moments from all seasons.',
        },
        {
          question: 'Are there quizzes about Indian sports stars?',
          answer: 'Definitely! We have extensive trivia about Sachin Tendulkar, Virat Kohli, MS Dhoni, Rohit Sharma, Neeraj Chopra, PV Sindhu, Saina Nehwal, Mary Kom, and many other Indian sports heroes.',
        },
      ]}
    />
  );
}
