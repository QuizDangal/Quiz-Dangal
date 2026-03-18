import React from 'react';
import SeoLanding from './SeoLanding';
import { Newspaper, BookOpen, Globe, Clock } from 'lucide-react';
import { HUB_SEO_ARTICLES } from '@/lib/hubSeoArticles';

export default function CurrentAffairsQuiz() {
  const features = [
    { icon: Newspaper, title: 'Latest News Questions', desc: 'Questions crafted within hours of major national and world events' },
    { icon: BookOpen, title: 'Exam-Ready Content', desc: 'Covers UPSC, SSC, Banking, Railways, and state PSC topics' },
    { icon: Globe, title: 'National & International', desc: 'Indian affairs, global politics, economy, science, and sports updates' },
    { icon: Clock, title: 'Updated Every Day', desc: 'Fresh current affairs questions added daily — never play stale content' },
  ];

  return (
    <SeoLanding
      path="/current-affairs-quiz"
      title="Current Affairs Quiz – Daily News Quiz | Quiz Dangal"
      h1="Current Affairs Quiz – Daily News Quiz"
      description="Stay updated with Quiz Dangal's daily current affairs quiz. Test your knowledge of latest news, government policies, and world events. Free for UPSC, SSC, Banking exam prep."
      keywords={[
        'current affairs quiz', 'daily current affairs', 'current affairs quiz today',
        'current affairs for UPSC', 'current affairs MCQ', 'daily news quiz',
        'current affairs 2026', 'GK current affairs', 'current affairs quiz in Hindi',
      ]}
      features={features}
      seoArticle={HUB_SEO_ARTICLES.currentAffairs}
      relatedLinks={[
        { to: '/category/gk/', label: 'Play GK Quizzes' },
        { to: '/gk-quiz/', label: 'GK Quiz Guide' },
        { to: '/cricket-quiz/', label: 'Cricket Quiz' },
        { to: '/leaderboards/', label: 'Leaderboard' },
        { to: '/play-win-quiz-app/', label: 'Play & Win Guide' },
      ]}
      faqs={[
        {
          question: 'How often are current affairs questions updated?',
          answer: 'Our editorial team adds new current affairs questions every single day. Major events are covered within hours of occurrence, so you are always tested on the latest news.',
        },
        {
          question: 'Is this useful for UPSC and SSC exam preparation?',
          answer: 'Yes! Our current affairs questions cover topics commonly asked in UPSC Prelims, SSC CGL/CHSL, IBPS PO/Clerk, RBI Grade B, and state PSC exams. Daily practice builds the broad awareness that exams demand.',
        },
        {
          question: 'Is the current affairs quiz free?',
          answer: '100% free — no subscription, no entry fee, no paywall. Play unlimited rounds and earn coins for correct answers.',
        },
        {
          question: 'Can I play current affairs quiz in Hindi?',
          answer: 'Many rounds are written for Indian audiences in easy-to-understand language. Bilingual support is available where applicable inside the main quiz flow.',
        },
        {
          question: 'How many questions are in each round?',
          answer: 'Each quiz round typically has 5-10 questions with a 5-minute time limit. New rounds start every 5 minutes back-to-back, so you can play multiple rounds in a single study session.',
        },
      ]}
    />
  );
}
