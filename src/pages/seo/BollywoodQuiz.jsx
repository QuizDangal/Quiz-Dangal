import React from 'react';
import SeoLanding from './SeoLanding';
import { Film, Music, Star, Sparkles } from 'lucide-react';
import { HUB_SEO_ARTICLES } from '@/lib/hubSeoArticles';

export default function BollywoodQuiz() {
  const features = [
    { icon: Film, title: 'Classic to Modern', desc: 'Questions from Mughal-e-Azam to the latest 2026 blockbusters' },
    { icon: Music, title: 'Songs & Music', desc: 'Identify soundtracks, playback singers, and chart-topping hits' },
    { icon: Star, title: 'Celebrity Trivia', desc: 'Awards, box office records, and behind-the-scenes facts' },
    { icon: Sparkles, title: 'Opinion Polls', desc: 'Vote on best villains, favourite dialogues, and sequel-worthy movies' },
  ];

  return (
    <SeoLanding
      path="/bollywood-quiz"
      title="Bollywood Quiz – Movie Trivia & Entertainment | Quiz Dangal"
      h1="Bollywood Quiz – Movie & Entertainment Trivia"
      description="Test your Bollywood knowledge with Quiz Dangal's movie trivia quiz. Questions on iconic dialogues, songs, box office records, celebrities, and OTT shows. Play free!"
      keywords={[
        'bollywood quiz', 'movie quiz', 'bollywood trivia', 'hindi movie quiz',
        'bollywood quiz questions', 'entertainment quiz', 'film quiz',
        'bollywood quiz online', 'celebrity quiz India',
      ]}
      features={features}
      seoArticle={HUB_SEO_ARTICLES.bollywood}
      relatedLinks={[
        { to: '/category/opinion/', label: 'Play Opinion Quizzes' },
        { to: '/category/gk/', label: 'Play GK Quizzes' },
        { to: '/current-affairs-quiz/', label: 'Current Affairs Quiz' },
        { to: '/opinion-quiz-app/', label: 'Opinion Quiz Guide' },
        { to: '/refer-earn-quiz-app/', label: 'Refer & Earn' },
        { to: '/leaderboards/', label: 'Leaderboard' },
        { to: '/cricket-quiz/', label: 'Cricket Quiz' },
      ]}
      faqs={[
        {
          question: 'What kind of Bollywood questions are asked?',
          answer: 'We cover iconic dialogues, songs, box office records, Filmfare awards, actor/director trivia, OTT shows, music composers, and behind-the-scenes facts from every era of Hindi cinema.',
        },
        {
          question: 'Are there opinion polls about Bollywood?',
          answer: 'Yes! Our opinion rounds regularly feature entertainment debates — best villain of all time, favourite romantic movie, which 2026 release deserves a sequel, and more.',
        },
        {
          question: 'Is the Bollywood quiz free?',
          answer: 'Completely free — no entry fees, no subscription. Play unlimited rounds, earn coins, and compete on leaderboards.',
        },
        {
          question: 'How often are new Bollywood questions added?',
          answer: 'Entertainment questions appear in regular GK and opinion rounds. During major releases, award seasons, and festival periods, we add concentrated Bollywood-themed rounds.',
        },
        {
          question: 'Can I play with friends?',
          answer: 'Absolutely! Share your results on WhatsApp to challenge friends. Everyone can join the same live round by opening Quiz Dangal at the same time.',
        },
      ]}
    />
  );
}
