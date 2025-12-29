import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';
import { 
  ArrowRight, Star, Trophy, Users, Coins, Shield 
} from 'lucide-react';

function toCanonical(pathname) {
  const p = String(pathname || '/');
  const clean = p.startsWith('/') ? p : `/${p}`;
  return `https://quizdangal.com${clean.endsWith('/') ? clean : `${clean}/`}`;
}

// Default features to show on all SEO landing pages
const defaultFeatures = [
  { icon: Trophy, title: 'Daily Quizzes', desc: 'Fresh challenges added every single day across multiple categories' },
  { icon: Coins, title: 'Earn Rewards', desc: 'Answer correctly and earn coins that you can redeem for prizes' },
  { icon: Users, title: 'Compete & Climb', desc: 'Compete with players nationwide on real-time leaderboards' },
  { icon: Shield, title: 'Free & Fair', desc: 'No entry fees, no hidden charges—100% skill-based competition' },
];

// Default how it works steps
const defaultSteps = [
  { step: 1, title: 'Sign Up Free', desc: 'Create your account in seconds with email or phone' },
  { step: 2, title: 'Choose a Quiz', desc: 'Browse categories like GK, Sports, Movies, Opinion and more' },
  { step: 3, title: 'Play & Earn', desc: 'Answer questions, earn coins, and climb the leaderboards' },
  { step: 4, title: 'Redeem Rewards', desc: 'Use your coins to get exciting prizes and rewards' },
];

export default function SeoLanding({
  path = '/',
  title,
  h1,
  description,
  keywords = [],
  relatedLinks = [],
  faqs = [],
  features = defaultFeatures,
  steps = defaultSteps,
  additionalContent = null,
}) {
  const canonical = useMemo(() => toCanonical(path), [path]);

  const faqSchema = useMemo(() => {
    const entries = Array.isArray(faqs) ? faqs.filter(Boolean) : [];
    if (!entries.length) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: entries.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    };
  }, [faqs]);

  const webPageSchema = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      url: canonical,
      description,
      isPartOf: {
        '@type': 'WebSite',
        name: 'Quiz Dangal',
        url: 'https://quizdangal.com/',
      },
    }),
    [canonical, description, title],
  );

  const jsonLd = useMemo(() => {
    const blocks = [webPageSchema];
    if (faqSchema) blocks.push(faqSchema);
    return blocks;
  }, [faqSchema, webPageSchema]);

  return (
    <div className="min-h-screen pt-14 text-slate-100">
      <div className="container mx-auto px-4 py-6 space-y-8 max-w-4xl">
        <SEO
          title={title}
          description={description}
          canonical={canonical}
          keywords={keywords}
          jsonLd={jsonLd}
        />

        {/* Hero Section */}
        <header className="text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-violet-400 via-indigo-300 to-fuchsia-400 bg-clip-text text-transparent mb-4">
            {h1}
          </h1>
          <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto mb-6">
            {description}
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3 text-lg font-bold text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:via-purple-400 hover:to-pink-400 transition shadow-lg shadow-purple-500/25"
            aria-label="Play on Quiz Dangal"
          >
            Play Now <ArrowRight className="w-5 h-5" />
          </Link>
        </header>

        {/* Features Grid */}
        <section className="bg-gradient-to-br from-indigo-900/50 via-violet-900/40 to-fuchsia-900/40 backdrop-blur-xl border border-indigo-700/60 rounded-2xl p-6 md:p-8">
          <h2 className="text-xl md:text-2xl font-bold text-white text-center mb-6">
            Why Choose Quiz Dangal?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={index} 
                  className="flex items-start gap-3 bg-slate-800/40 rounded-xl p-4"
                >
                  <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg flex-shrink-0">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white mb-1">{feature.title}</h3>
                    <p className="text-sm text-slate-300">{feature.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-6 md:p-8">
          <h2 className="text-xl md:text-2xl font-bold text-white text-center mb-6">
            How It Works
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {steps.map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold mx-auto mb-2">
                  {item.step}
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                <p className="text-xs text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Additional Content (if provided) */}
        {additionalContent && (
          <section className="bg-gradient-to-br from-indigo-900/50 via-violet-900/40 to-fuchsia-900/40 backdrop-blur-xl border border-indigo-700/60 rounded-2xl p-6 md:p-8">
            {additionalContent}
          </section>
        )}

        {/* Related Links */}
        {Array.isArray(relatedLinks) && relatedLinks.length > 0 && (
          <section className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Popular on Quiz Dangal</h2>
            <div className="flex flex-wrap gap-3">
              {relatedLinks.map((l) => (
                <Link
                  key={l.href}
                  to={l.href}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-slate-800 hover:bg-indigo-600/50 text-sm font-medium text-white transition-colors"
                >
                  {l.label} <ArrowRight className="w-4 h-4" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* FAQs */}
        {Array.isArray(faqs) && faqs.length > 0 && (
          <section className="bg-gradient-to-br from-indigo-900/50 via-violet-900/40 to-fuchsia-900/40 backdrop-blur-xl border border-indigo-700/60 rounded-2xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold text-white text-center mb-6">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4 max-w-3xl mx-auto">
              {faqs.map((item) => (
                <div key={item.question} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                  <h3 className="font-semibold text-white mb-2">{item.question}</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-indigo-600/80 via-purple-600/80 to-pink-600/80 backdrop-blur-xl border border-indigo-500/60 rounded-2xl p-6 md:p-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Star className="w-5 h-5 text-amber-300" />
            <h2 className="text-xl font-bold text-white">Start Playing Today!</h2>
            <Star className="w-5 h-5 text-amber-300" />
          </div>
          <p className="text-slate-100 text-sm md:text-base mb-4 max-w-lg mx-auto">
            Join thousands of quiz enthusiasts on Quiz Dangal. Play free quizzes, 
            compete on leaderboards, and win exciting rewards!
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-indigo-700 font-bold hover:bg-slate-100 transition-colors"
          >
            Play Now — It&apos;s Free!
          </Link>
        </section>

        {/* Footer Links */}
        <footer className="text-center text-sm">
          <div className="flex flex-wrap justify-center gap-4 text-slate-400">
            <Link to="/about-us/" className="hover:text-indigo-400 transition-colors">About Us</Link>
            <Link to="/contact-us/" className="hover:text-indigo-400 transition-colors">Contact</Link>
            <Link to="/privacy-policy/" className="hover:text-indigo-400 transition-colors">Privacy Policy</Link>
            <Link to="/terms-conditions/" className="hover:text-indigo-400 transition-colors">Terms</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
