import React from 'react';
import { Link } from 'react-router-dom';
import SeoHead from '@/components/SEO';
import { BUILD_DATE } from '@/constants';
import { HUB_SEO_ARTICLES } from '@/lib/hubSeoArticles';

export default function PlayWinQuiz() {
  const canonical = 'https://quizdangal.com/play-win-quiz-app/';
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How does Play & Win work on Quiz Dangal?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Play & Win lets you compete in daily Opinion and GK quizzes. Answer questions accurately and quickly to earn coins, climb leaderboards, and join special IPL-season opinion and current affairs rounds.',
        },
      },
      {
        '@type': 'Question',
        name: 'How is scoring calculated in Quiz Dangal?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Scores are based on accuracy and response time. Correct answers give more weight than speed. All scoring is transparent and verified server-side to ensure fair play.',
        },
      },
      {
        '@type': 'Question',
        name: 'What are the best tips to win more quizzes?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Focus on accuracy first, then speed. Play daily to build streaks, warm up with opinion rounds, and ensure stable internet connection during quizzes.',
        },
      },
    ],
  };

  return (
    <div className="min-h-screen text-slate-100">
      <SeoHead
        title="Play & Win Quiz App – Quiz Dangal"
        description="Play daily quizzes, climb leaderboards, and win rewards. Opinion-based and GK quizzes made for India – start free on Quiz Dangal. Learn rules, scoring, and tips to win more."
        canonical={canonical}
        keywords={[
          'play and win quiz',
          'daily quiz India',
          'quiz app rewards',
          'leaderboards',
          'quizdangal',
        ]}
        jsonLd={[faqSchema, {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://quizdangal.com/' },
            { '@type': 'ListItem', position: 2, name: 'Play & Win Quiz', item: 'https://quizdangal.com/play-win-quiz-app/' },
          ],
        }, {
          '@context': 'https://schema.org',
          '@type': 'Quiz',
          name: 'Play & Win Quiz App – Quiz Dangal',
          url: canonical,
          description: 'Play daily quizzes, climb leaderboards, and win rewards. Opinion-based and GK quizzes made for India.',
          educationalLevel: 'Intermediate',
          learningResourceType: 'Quiz',
          interactivityType: 'active',
          isAccessibleForFree: true,
          inLanguage: ['en', 'hi'],
          provider: { '@type': 'Organization', name: 'Quiz Dangal', url: 'https://quizdangal.com/' },
          about: { '@type': 'Thing', name: 'Trivia Quizzes' },
        }]}
        author="Quiz Dangal"
        datePublished="2025-01-15"
        dateModified={BUILD_DATE}
      />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-indigo-300 to-fuchsia-400 bg-clip-text text-transparent pt-14">
          Play & Win Quiz App
        </h1>
        <p className="text-slate-300 max-w-3xl">
          Compete in daily quizzes, earn coins, and track your progress on live leaderboards. Quiz
          Dangal is built for India with opinion-based and GK rounds that are fun and fair. If you
          love short, exciting contests you can play between classes or on your daily commute, this
          guide explains how Play & Win works and how to improve your scores.
        </p>

        <h2 className="text-2xl font-semibold text-white">How Play & Win Works</h2>
        <p className="text-slate-300 max-w-3xl">
          Each contest has a small set of questions and a clear timer. Answer as accurately and as
          quickly as possible to collect coins. You can join public rounds throughout the day, see
          your ranking on leaderboards, and rejoin future rounds to beat your best. Opinion-based
          rounds keep the pressure low, while GK rounds test your recall and speed.
        </p>

        <h2 className="text-2xl font-semibold text-white">Scoring & Fair Play</h2>
        <p className="text-slate-300 max-w-3xl">
          Scores are calculated transparently. For knowledge quizzes, correct answers give more
          weight than response time, so accuracy matters. We use anti-cheat checks and server-side
          verification to ensure fair play. Your total coins reflect your consistent performance
          across multiple contests, not a single lucky streak.
        </p>

        <h2 className="text-2xl font-semibold text-white">Tips to Win More</h2>
        <ul className="list-disc pl-6 text-slate-300 space-y-2 max-w-3xl">
          <li>Warm up with opinion rounds to get into the flow without pressure.</li>
          <li>Focus on accuracy first, then speed. Guessing wildly reduces your average.</li>
          <li>
            Play at steady internet, keep the app updated, and avoid switching apps mid-round.
          </li>
          <li>Join daily to build streaks and unlock small bonuses over time.</li>
        </ul>

        <h2 className="text-2xl font-semibold text-white">What You Can Do Next</h2>
        <p className="text-slate-300 max-w-3xl">
          New to Quiz Dangal? Start with the basics on our{' '}
          <Link to="/opinion-quiz-app/" className="text-indigo-300 underline">
            Opinion Quiz
          </Link>{' '}
          explainer. Then jump into categories:{' '}
          <Link to="/category/opinion/" className="text-indigo-300 underline">
            Opinion
          </Link>
          ,{' '}
          <Link to="/category/gk/" className="text-indigo-300 underline">
            GK
          </Link>
          . During IPL season, most cricket and current affairs moments are covered inside{' '}
          <Link to="/category/gk/" className="text-indigo-300 underline">
            GK
          </Link>{' '}
          and opinion rounds. Invite friends via{' '}
          <Link to="/refer-earn-quiz-app/" className="text-indigo-300 underline">
            Refer & Earn
          </Link>
          , and browse the{' '}
          <Link to="/leaderboards/" className="text-indigo-300 underline">
            Leaderboards
          </Link>{' '}
          to see top players.
        </p>

        <div className="rounded-xl bg-slate-900/60 border border-slate-700/60 p-4">
          <h3 className="text-lg font-semibold text-white mb-2">Quick Highlights</h3>
          <ul className="list-disc pl-6 text-slate-300 space-y-1">
            <li>Fast rounds and instant results</li>
            <li>Earn coins and redeem rewards</li>
            <li>Transparent scoring and fair gameplay</li>
            <li>IPL season topics inside GK and Opinion instead of thin extra pages</li>
          </ul>
        </div>

        {/* SEO Article — Bottom of page for content depth */}
        <article className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4 sm:p-6 space-y-5 max-w-3xl">
          <h2 className="text-lg font-bold text-white">{HUB_SEO_ARTICLES.playwin.title}</h2>
          {HUB_SEO_ARTICLES.playwin.sections.map((s, i) => (
            <div key={i}>
              <h3 className="text-sm font-semibold text-slate-200 mb-1.5">{s.heading}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{s.text}</p>
            </div>
          ))}
        </article>
      </div>
    </div>
  );
}
