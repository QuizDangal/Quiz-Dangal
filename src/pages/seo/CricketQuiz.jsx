import React from 'react';
import SeoLanding from './SeoLanding';
import { Trophy, Users, Zap, Star } from 'lucide-react';

export default function CricketQuiz() {
  const features = [
    { icon: Trophy, title: 'IPL & World Cup', desc: 'Questions from IPL seasons, T20 World Cup, ODI World Cup and Test matches' },
    { icon: Users, title: 'Cricket Legends', desc: 'Trivia about Sachin, Virat, Dhoni, Rohit and international cricket stars' },
    { icon: Zap, title: 'Live Match Quizzes', desc: 'Special quizzes during live cricket matches and tournaments' },
    { icon: Star, title: 'Cricket Records', desc: 'Test your knowledge of cricket records, stats and memorable moments' },
  ];

  const additionalContent = (
    <>
      <h2 className="text-xl font-bold text-white mb-4">Cricket Quiz Categories</h2>
      <div className="grid gap-4 md:grid-cols-2 text-sm text-slate-300">
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">🏆 IPL Quiz</h3>
          <p>Questions about Indian Premier League teams, players, records, orange cap winners, purple cap holders, and memorable IPL moments from all seasons.</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">🌍 World Cup Quiz</h3>
          <p>Test your knowledge about Cricket World Cup history, ODI World Cup, T20 World Cup winners, and India&apos;s World Cup journey.</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">👤 Player Trivia</h3>
          <p>Facts about legendary cricketers — from Sachin Tendulkar&apos;s records to Virat Kohli&apos;s centuries, MS Dhoni&apos;s captaincy to Rohit Sharma&apos;s double centuries.</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-2">📊 Records & Stats</h3>
          <p>Questions about highest scores, fastest centuries, most wickets, team records, and statistical milestones in cricket history.</p>
        </div>
      </div>
    </>
  );

  return (
    <SeoLanding
      path="/cricket-quiz"
      title="Cricket Quiz – Play Cricket Quiz Online | Quiz Dangal"
      h1="Cricket Quiz"
      description="Test your cricket knowledge with sports quizzes on Quiz Dangal. Play fast rounds about IPL, World Cup, cricket legends, and earn coins." 
      keywords={[
        'cricket quiz', 'sports quiz', 'online quiz', 'quiz game', 'ipl quiz',
        'cricket trivia', 'cricket questions', 'world cup quiz', 'cricket gk'
      ]}
      features={features}
      additionalContent={additionalContent}
      relatedLinks={[
        { to: '/category/sports/', label: 'Sports Quizzes' },
        { to: '/sports-quiz/', label: 'Sports Quiz' },
        { to: '/quiz-questions/', label: 'All Quiz Questions' },
        { to: '/leaderboards/', label: 'Leaderboards' },
      ]}
      faqs={[
        {
          question: 'Is this a live cricket quiz?',
          answer: 'We offer both scheduled quizzes and special live quizzes during major cricket tournaments like IPL, World Cup, and bilateral series. Check the Sports category for current availability and upcoming live rounds.',
        },
        {
          question: 'What cricket topics are covered?',
          answer: 'Our cricket quizzes cover IPL (all seasons), World Cup (ODI & T20), Test cricket, player trivia, cricket records, team statistics, famous matches, and current series. We add new questions for every major cricket event.',
        },
        {
          question: 'Are there IPL-specific quizzes?',
          answer: 'Yes! During IPL season, we have dedicated IPL quizzes covering teams like CSK, MI, RCB, KKR, DC, SRH, RR, PBKS, GT, and LSG. Questions include player stats, team records, orange cap, purple cap, and match predictions.',
        },
        {
          question: 'Do you have questions about Indian cricket legends?',
          answer: 'Absolutely! We have extensive trivia about Sachin Tendulkar, Virat Kohli, MS Dhoni, Rohit Sharma, Kapil Dev, Sourav Ganguly, Rahul Dravid, and other Indian cricket heroes. Test how well you know their records and achievements!',
        },
        {
          question: 'Is the cricket quiz free to play?',
          answer: 'Yes, all our cricket quizzes are 100% free. No entry fees or subscriptions. Play unlimited rounds, earn coins for correct answers, and compete on the leaderboards. Quiz Dangal is completely free to use.',
        },
        {
          question: 'How can I earn rewards from cricket quiz?',
          answer: 'Answer questions correctly and quickly to earn coins. The faster you answer, the more bonus coins you get. Accumulated coins can be redeemed for exciting rewards. Top scorers also feature on our national leaderboards!',
        },
        {
          question: 'Are cricket quiz questions updated regularly?',
          answer: 'Yes! We add new questions after every major cricket match and tournament. Our content stays current with the latest cricket news, records, and events. Play daily to catch all the new content!',
        },
      ]}
    />
  );
}
