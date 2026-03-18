import React from 'react';
import SeoLanding from './SeoLanding';
import { Trophy, Flame, Target, Zap } from 'lucide-react';
import { HUB_SEO_ARTICLES } from '@/lib/hubSeoArticles';

export default function CricketQuiz() {
  const features = [
    { icon: Trophy, title: 'IPL & ICC Trivia', desc: 'Questions from every IPL season, World Cup, and T20 championship' },
    { icon: Flame, title: 'Match-Day Specials', desc: 'Live quiz rounds updated after every IPL 2026 match' },
    { icon: Target, title: 'Stats & Records', desc: 'Test your memory of batting, bowling, and fielding records' },
    { icon: Zap, title: 'Fast 5-Min Rounds', desc: 'Quick cricket quiz rounds every 5 minutes — play anytime' },
  ];

  return (
    <SeoLanding
      path="/cricket-quiz"
      title="Cricket Quiz – IPL & Cricket Trivia | Quiz Dangal"
      h1="Cricket Quiz – IPL & Cricket Trivia"
      description="Play the best cricket quiz online — IPL 2026 trivia, ICC records, player stats, and match-day specials. Compete free on Quiz Dangal and earn coins."
      keywords={[
        'cricket quiz', 'IPL quiz', 'IPL 2026 quiz', 'cricket trivia',
        'cricket quiz online', 'cricket quiz questions', 'IPL trivia',
        'cricket gk', 'cricket knowledge test', 'cricket quiz app',
      ]}
      features={features}
      seoArticle={HUB_SEO_ARTICLES.cricket}
      relatedLinks={[
        { to: '/category/gk/', label: 'Play GK Quizzes' },
        { to: '/gk-quiz/', label: 'GK Quiz Guide' },
        { to: '/opinion-quiz-app/', label: 'Opinion Quiz Guide' },
        { to: '/leaderboards/', label: 'Leaderboard' },
        { to: '/play-win-quiz-app/', label: 'Play & Win Guide' },
      ]}
      faqs={[
        {
          question: 'Is there a separate cricket quiz section?',
          answer: 'Cricket questions appear inside GK quiz rounds year-round, with concentrated cricket-themed rounds during IPL and ICC events. Head to the GK category lobby to join the next live round.',
        },
        {
          question: 'Are IPL 2026 questions available?',
          answer: 'Yes! During IPL season we add match-day questions within hours of each game — team stats, player performances, venue records, and more.',
        },
        {
          question: 'Is the cricket quiz free?',
          answer: 'Absolutely — 100% free. No entry fees, no subscriptions. Play unlimited rounds and earn coins for top finishes.',
        },
        {
          question: 'Can I challenge friends to a cricket quiz?',
          answer: 'Yes! Share your results on WhatsApp after any round. Friends can join the same live quiz rounds by opening Quiz Dangal at the same time.',
        },
        {
          question: 'What cricket topics are covered?',
          answer: 'IPL all seasons, ICC World Cup, T20 World Cup, Test cricket records, ODI classics, Women\'s cricket, famous grounds, player biographies, batting/bowling stats, and cricket rules.',
        },
      ]}
    />
  );
}
