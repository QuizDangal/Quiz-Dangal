// 🔥 QUIZ DANGAL - Ultimate Gaming Home
import React, { useCallback, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import SeoHead from '@/components/SEO';
import { useNavigate, Link } from 'react-router-dom';
import { 
  MessageSquare, Brain, Trophy, Clapperboard, 
  Crown, ArrowRight, Star, 
  UserPlus, Gamepad2, HelpCircle,
  Sparkles, Zap
} from 'lucide-react';
import { getSupabase } from '@/lib/customSupabaseClient';

const CATEGORIES = [
  { 
    id: 'opinion', 
    label: 'Opinion',
    emoji: '💭',
    icon: MessageSquare, 
    gradient: 'from-amber-500 via-orange-500 to-red-500',
    shadowColor: 'rgba(249, 115, 22, 0.5)',
  },
  { 
    id: 'gk', 
    label: 'GK',
    emoji: '🧠',
    icon: Brain, 
    gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
    shadowColor: 'rgba(168, 85, 247, 0.5)',
  },
  { 
    id: 'sports', 
    label: 'Sports',
    emoji: '🏆',
    icon: Trophy, 
    gradient: 'from-emerald-400 via-cyan-500 to-blue-500',
    shadowColor: 'rgba(6, 182, 212, 0.5)',
  },
  { 
    id: 'movies', 
    label: 'Movies',
    emoji: '🎬',
    icon: Clapperboard, 
    gradient: 'from-pink-500 via-rose-500 to-red-500',
    shadowColor: 'rgba(236, 72, 153, 0.5)',
  },
];

const HOME_FAQ_ENTRIES = [
  { question: '🎯 What is Quiz Dangal?', answer: "Quiz Dangal is India's #1 daily quiz platform! Play opinion polls, GK, sports & movie quizzes to earn coins and compete on national leaderboards. 100% free, works on all devices - mobile, tablet & PC!" },
  { question: '🎮 How do I start playing?', answer: 'Super easy! Just sign up (takes 10 seconds), pick a category you love, and start answering questions. Faster answers = more coins. No complicated rules!' },
  { question: '💰 Is it really free? Any hidden charges?', answer: 'YES, 100% FREE forever! No entry fees, no subscriptions, no in-app purchases required. We believe knowledge should be rewarded, not charged. Play unlimited quizzes daily!' },
  { question: '🏆 How do I earn coins & rewards?', answer: '4 ways to earn: 1) Correct answers = coins, 2) Speed bonus = extra coins, 3) Daily login streak = streak bonus, 4) Referrals = bonus coins. Redeem coins for exciting prizes in our Rewards section!' },
  { question: '📱 Does it work on my phone?', answer: 'Absolutely! Quiz Dangal is a Progressive Web App (PWA) - works perfectly on any phone browser. Pro tip: Tap "Add to Home Screen" for app-like experience with offline support!' },
  { question: '⚡ What is Play & Win format?', answer: 'Play & Win quizzes are timed competitions with LIVE leaderboards! Everyone plays the same questions, fastest correct answers win. Top 10 players get bonus rewards daily. Join now!' },
  { question: '👥 Can I play with friends?', answer: 'Yes! Share your referral code to invite friends. When they join and play, BOTH of you earn bonus coins. Check the Refer & Earn section for your unique code!' },
];

const HOME_FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: HOME_FAQ_ENTRIES.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: { '@type': 'Answer', text: item.answer },
  })),
};

const HOME_HOW_TO_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Play and Earn on Quiz Dangal',
  description: 'Step-by-step guide to start playing quizzes and earning coins on Quiz Dangal',
  totalTime: 'PT5M',
  step: [
    { '@type': 'HowToStep', position: 1, name: 'Sign Up', text: 'Create a free account in 10 seconds using your email or phone number' },
    { '@type': 'HowToStep', position: 2, name: 'Choose Category', text: 'Pick from Opinion, GK, Sports, or Movies quiz categories' },
    { '@type': 'HowToStep', position: 3, name: 'Play Quizzes', text: 'Answer questions correctly and quickly to earn more coins' },
    { '@type': 'HowToStep', position: 4, name: 'Earn Rewards', text: 'Accumulate coins and redeem them for exciting prizes' },
  ],
};

const HOME_JSON_LD = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Quiz Dangal',
    alternateName: 'QuizDangal',
    url: 'https://quizdangal.com/',
    logo: { '@type': 'ImageObject', url: 'https://quizdangal.com/android-chrome-512x512.png', width: 512, height: 512 },
    description: "India's premier free-to-play quiz and rewards platform.",
    foundingDate: '2025',
    address: { '@type': 'PostalAddress', addressLocality: 'Jaipur', addressRegion: 'Rajasthan', addressCountry: 'IN' },
    contactPoint: { '@type': 'ContactPoint', telephone: '+91-9587803557', email: 'support@quizdangal.com', contactType: 'customer support', availableLanguage: ['English', 'Hindi'] },
    sameAs: ['https://www.instagram.com/quizdangal', 'https://www.facebook.com/profile.php?id=61576614092243', 'https://x.com/quizdangal'],
    knowsAbout: ['quizzes', 'trivia', 'general knowledge', 'opinion polls', 'sports', 'movies', 'rewards'],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Quiz Dangal',
    alternateName: 'QuizDangal',
    url: 'https://quizdangal.com/',
    inLanguage: ['en-IN', 'hi-IN'],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Quiz Dangal',
    url: 'https://quizdangal.com/',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Web Browser',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR', availability: 'https://schema.org/InStock' },
    author: { '@type': 'Organization', name: 'Quiz Dangal', url: 'https://quizdangal.com/' },
    publisher: { '@type': 'Organization', name: 'Quiz Dangal' },
    datePublished: '2025-01-01',
    dateModified: '2025-12-29',
    inLanguage: ['en-IN', 'hi-IN'],
    featureList: 'Daily Quizzes, Opinion Polls, GK Quizzes, Sports Quizzes, Movie Quizzes, Leaderboards, Coin Rewards, Referral Program',
    audience: { '@type': 'PeopleAudience', suggestedMinAge: 18 },
  },
  HOME_FAQ_SCHEMA,
  HOME_HOW_TO_SCHEMA,
];

// Category Card with 3D effect
const CategoryCard = ({ cat, index, onPlay }) => {
  const Icon = cat.icon;
  
  return (
    <button
      type="button"
      onClick={() => onPlay(cat.id)}
      className="qdh-card group"
      style={{ '--card-index': index, '--shadow-color': cat.shadowColor }}
      aria-label={`Play ${cat.label}`}
    >
      {/* Animated border */}
      <div className="qdh-card-border" />
      
      {/* Glass background */}
      <div className="qdh-card-glass" />
      
      {/* Gradient overlay */}
      <div className={`qdh-card-gradient bg-gradient-to-br ${cat.gradient}`} />
      
      {/* Animated rings */}
      <div className="qdh-card-rings">
        <div className="qdh-ring qdh-ring-1" />
        <div className="qdh-ring qdh-ring-2" />
      </div>
      
      {/* Content */}
      <div className="qdh-card-inner">
        {/* Icon container */}
        <div className={`qdh-card-icon-box bg-gradient-to-br ${cat.gradient}`}>
          <Icon className="qdh-card-icon" strokeWidth={2.5} />
          <div className="qdh-icon-pulse" />
        </div>
        
        {/* Label */}
        <h3 className="qdh-card-label">{cat.label}</h3>
        
        {/* Play indicator */}
        <div className="qdh-card-play">
          <span>PLAY</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
      
      {/* Shine effect */}
      <div className="qdh-card-shine" />
      
      {/* Corner glow */}
      <div className="qdh-card-corner-glow" />
    </button>
  );
};

// How It Works Steps
const HOW_IT_WORKS = [
  { step: 1, icon: UserPlus, title: '🚀 Sign Up Free', desc: 'Create your account in just 10 seconds - 100% free, no payment ever!', gradient: 'from-emerald-400 to-cyan-500', highlight: 'FREE' },
  { step: 2, icon: Gamepad2, title: '🎮 Pick a Quiz', desc: 'Choose from 4 exciting categories - Opinion, GK, Sports & Movies', gradient: 'from-violet-500 to-purple-600', highlight: '4 CATEGORIES' },
  { step: 3, icon: Zap, title: '⚡ Play & Score', desc: 'Answer fast & correctly to earn maximum coins. Speed = More Points!', gradient: 'from-amber-400 to-orange-500', highlight: 'SPEED BONUS' },
  { step: 4, icon: Trophy, title: '🏆 Win Rewards', desc: 'Climb leaderboards, maintain streaks & redeem coins for real prizes!', gradient: 'from-pink-500 to-rose-500', highlight: 'REAL PRIZES' },
];

// FAQ Accordion Item - with Schema.org microdata for AI/LLM citation
const FAQItem = ({ question, answer, isOpen, onClick, index }) => {
  const answerId = `faq-answer-${index}`;
  
  return (
    <div 
      className={`qdh-faq-item ${isOpen ? 'qdh-faq-open' : ''}`}
    >
      <button 
        type="button"
        className="qdh-faq-question" 
        onClick={onClick}
        aria-expanded={isOpen}
        aria-controls={answerId}
      >
        <div className="qdh-faq-q-content">
          <span className="qdh-faq-number">{index + 1}</span>
          <span className="qdh-faq-q-text">{question}</span>
        </div>
        <div className={`qdh-faq-chevron ${isOpen ? 'qdh-chevron-open' : ''}`}>
          <ArrowRight className="w-4 h-4" />
        </div>
      </button>
      <div 
        id={answerId}
        className={`qdh-faq-answer ${isOpen ? 'qdh-answer-open' : ''}`} 
        data-speakable="true"
      >
        <p>{answer}</p>
      </div>
    </div>
  );
};

// PropTypes
CategoryCard.propTypes = {
  cat: PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    icon: PropTypes.elementType.isRequired,
    gradient: PropTypes.string.isRequired,
    shadowColor: PropTypes.string,
  }).isRequired,
  index: PropTypes.number.isRequired,
  onPlay: PropTypes.func.isRequired,
};

FAQItem.propTypes = {
  question: PropTypes.string.isRequired,
  answer: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  index: PropTypes.number.isRequired,
};

const Home = () => {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [openFAQ, setOpenFAQ] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handlePlay = useCallback(async (id) => {
    try { await getSupabase(); } catch (e) {
      // Supabase warmup failed - non-blocking, continue to category page
      if (import.meta.env?.DEV) console.debug('Supabase warmup failed:', e?.message);
    }
    navigate(`/category/${id}/`);
  }, [navigate]);

  return (
    <div className="qdh-container">
      <SeoHead
        title="Quiz Dangal – Play Quiz & Win Rewards | Opinion, GK, Sports, Movies"
        description="Quiz Dangal is India's play-and-win quiz arena. Take opinion and GK quizzes daily, grow streaks, invite friends, and redeem coins for rewards."
        canonical="https://quizdangal.com/"
        keywords={['Quiz Dangal', 'quizdangal', 'quiz app', 'play quiz and win', 'opinion quiz', 'daily quiz india']}
        alternateLocales={['hi_IN', 'en_US']}
        jsonLd={HOME_JSON_LD}
        author="Quiz Dangal"
        datePublished="2025-01-01"
        dateModified="2025-12-29"
      />

      {/* Animated background elements */}
      <div className="qdh-bg-effects" aria-hidden="true">
        <div className="qdh-glow qdh-glow-1" />
        <div className="qdh-glow qdh-glow-2" />
        <div className="qdh-glow qdh-glow-3" />
        <div className="qdh-stars">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="qdh-star" style={{ '--star-i': i }} />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className={`qdh-main ${mounted ? 'qdh-visible' : ''}`}>
        
        {/* Hero Section - AI Speakable */}
        <section className="qdh-hero" data-speakable="true">
          {/* Floating Crown */}
          <div className="qdh-crown-container">
            <div className="qdh-crown-glow" />
            <Crown className="qdh-crown" />
            <div className="qdh-crown-sparkle qdh-sparkle-1" />
            <div className="qdh-crown-sparkle qdh-sparkle-2" />
            <div className="qdh-crown-sparkle qdh-sparkle-3" />
          </div>
          
          {/* Main title - Single Line */}
          <h1 className="qdh-title" data-speakable="true">
            <span className="qdh-title-text">Quiz Dangal</span>
          </h1>
          
          {/* Animated subtitle */}
          <div className="qdh-subtitle">
            <Star className="qdh-subtitle-star" />
            <span>India&apos;s #1 Quiz Arena</span>
            <Star className="qdh-subtitle-star" />
          </div>
        </section>

        {/* Category Grid */}
        <section className="qdh-grid">
          {CATEGORIES.map((cat, i) => (
            <CategoryCard key={cat.id} cat={cat} index={i} onPlay={handlePlay} />
          ))}
        </section>

        {/* Bottom animated line */}
        <div className="qdh-bottom-decor">
          <div className="qdh-decor-line" />
          <div className="qdh-decor-dot" />
          <div className="qdh-decor-line" />
        </div>

        {/* How It Works Section */}
        <section className="qdh-how-it-works">
          <h2 className="qdh-section-title">
            <div className="qdh-section-icon">
              <Sparkles className="w-5 h-5" />
            </div>
            <span>How To Play & Win</span>
          </h2>
          <p className="qdh-section-subtitle">🎯 Start earning rewards in just 4 easy steps!</p>
          <div className="qdh-steps-grid">
            {HOW_IT_WORKS.map((item, idx) => {
              const StepIcon = item.icon;
              return (
                <div key={item.step} className="qdh-step-card" style={{ '--step-delay': `${idx * 0.1}s` }}>
                  {item.highlight && <div className="qdh-step-badge">{item.highlight}</div>}
                  <div className={`qdh-step-icon-box bg-gradient-to-br ${item.gradient}`}>
                    <StepIcon className="w-6 h-6 text-white" strokeWidth={2.5} />
                    <div className="qdh-step-glow" />
                  </div>
                  <h3 className="qdh-step-title">{item.title}</h3>
                  <p className="qdh-step-desc">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="qdh-faq-section">
          <h2 className="qdh-section-title">
            <div className="qdh-section-icon">
              <HelpCircle className="w-5 h-5" />
            </div>
            <span>Got Questions?</span>
          </h2>
          <p className="qdh-section-subtitle">💡 Everything you need to know about Quiz Dangal</p>
          <div className="qdh-faq-list">
            {HOME_FAQ_ENTRIES.map((item, index) => (
              <FAQItem
                key={item.question}
                question={item.question}
                answer={item.answer}
                isOpen={openFAQ === index}
                onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                index={index}
              />
            ))}
          </div>
        </section>

        {/* Footer Links */}
        <footer className="qdh-footer">
          <div className="qdh-footer-links">
            <Link to="/about-us/">About Us</Link>
            <Link to="/contact-us/">Contact</Link>
            <Link to="/privacy-policy/">Privacy</Link>
            <Link to="/terms-conditions/">Terms</Link>
          </div>
          <p className="qdh-footer-copy">© {new Date().getFullYear()} Quiz Dangal. All rights reserved. 🇮🇳 Made in India</p>
        </footer>

      </main>

      {/* Hidden SEO Content */}
      <div className="sr-only">
        {HOME_FAQ_ENTRIES.map((item) => (
          <div key={item.question}><h3>{item.question}</h3><p>{item.answer}</p></div>
        ))}
      </div>
    </div>
  );
};

export default Home;
