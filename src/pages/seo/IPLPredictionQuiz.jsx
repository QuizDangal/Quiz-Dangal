import React from 'react';
import SeoLanding from './SeoLanding';
import { Trophy, Flame, Target, Zap } from 'lucide-react';
import { HUB_SEO_ARTICLES } from '@/lib/hubSeoArticles';

export default function IPLPredictionQuiz() {
  const features = [
    { icon: Trophy, title: 'Match Predictions', desc: 'Predict match winners, top scorers, and key moments before every game' },
    { icon: Flame, title: 'Live Match Polls', desc: 'Real-time opinion polls during every IPL 2026 match' },
    { icon: Target, title: 'Crowd Comparison', desc: 'See how your predictions stack up against the community' },
    { icon: Zap, title: '5-Minute Rounds', desc: 'New IPL prediction quizzes every 5 minutes — play anytime' },
  ];

  return (
    <SeoLanding
      path="/ipl-prediction-quiz"
      title="IPL Prediction Quiz – Predict IPL 2026 Matches & Win | Quiz Dangal"
      h1="IPL Prediction Quiz – Predict & Win"
      description="Play IPL 2026 prediction quizzes on Quiz Dangal. Predict match winners, top scorers, and player performances. Vote, compare with the crowd, and earn coins — free!"
      keywords={[
        'IPL prediction quiz', 'IPL 2026 quiz', 'IPL match prediction',
        'cricket prediction quiz', 'IPL poll', 'IPL fantasy quiz',
        'predict IPL winner', 'IPL quiz app', 'IPL prediction game',
        'live IPL quiz', 'IPL opinion quiz', 'IPL trivia',
      ]}
      features={features}
      seoArticle={HUB_SEO_ARTICLES.ipl}
      relatedLinks={[
        { to: '/category/ipl/', label: 'Play IPL Predictions' },
        { to: '/category/opinion/', label: 'Opinion Quizzes' },
        { to: '/category/gk/', label: 'GK Quizzes' },
        { to: '/cricket-quiz/', label: 'Cricket Quiz Guide' },
        { to: '/leaderboards/', label: 'Leaderboard' },
      ]}
      faqs={[
        {
          question: 'How do IPL prediction quizzes work?',
          answer: 'Each quiz presents prediction questions about upcoming or live IPL matches — who will win, who will score the most runs, who will take the most wickets, etc. You vote your prediction, and after the round ends, see how the community voted. Points are awarded when your prediction matches the majority.',
        },
        {
          question: 'When are IPL prediction quizzes available?',
          answer: 'IPL prediction quizzes run every 5 minutes throughout the day during IPL season. Match-day specials go live before and during every game with questions specific to that match.',
        },
        {
          question: 'Is the IPL prediction quiz free?',
          answer: 'Absolutely — 100% free. No entry fees, no subscriptions. Play unlimited prediction rounds and earn coins for top finishes.',
        },
        {
          question: 'Can I win real prizes with IPL predictions?',
          answer: 'Yes! Top predictors in each quiz earn coins and can win cash prizes. The more your predictions match the majority, the higher you rank on the leaderboard.',
        },
        {
          question: 'What IPL topics are covered?',
          answer: 'Match winners, top run scorers, highest wicket takers, toss predictions, powerplay scores, man of the match, fan sentiment polls, team rankings, venue stats, head-to-head records, and season milestones.',
        },
      ]}
    />
  );
}
