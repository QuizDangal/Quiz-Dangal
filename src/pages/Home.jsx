// 🔥 QUIZ DANGAL - Ultimate Gaming Home
import React, { useCallback, useState, useEffect } from 'react';
import SEO from '@/components/SEO';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, Brain, Trophy, Clapperboard, 
  Crown, Target, Flame, ArrowRight, Star
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
  { question: 'What is Quiz Dangal?', answer: "Quiz Dangal is India's daily quiz arena where you play opinion and knowledge rounds, earn coins, and climb leaderboards with friends." },
  { question: 'How can new pages get indexed quickly?', answer: 'Submit https://quizdangal.com/sitemap.xml in Google Search Console.' },
  { question: 'Does Quiz Dangal support Play & Win format?', answer: 'Yes. Our Play & Win quizzes run daily with live leaderboards and instant rewards.' },
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

const HOME_JSON_LD = [
  { '@context': 'https://schema.org', '@type': 'Organization', name: 'Quiz Dangal', url: 'https://quizdangal.com/', logo: 'https://quizdangal.com/android-chrome-512x512.png' },
  { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Quiz Dangal', url: 'https://quizdangal.com/' },
  { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Quiz Dangal', url: 'https://quizdangal.com/', applicationCategory: 'Game', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' } },
  HOME_FAQ_SCHEMA,
];

// Category Card with 3D effect
const CategoryCard = ({ cat, index, onPlay }) => {
  const Icon = cat.icon;
  
  return (
    <button
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

// Stats Counter - Minimal Clean Design
const StatCounter = ({ icon: Icon, value, label, gradient }) => (
  <div className="qdh-counter">
    <div className={`qdh-counter-icon bg-gradient-to-br ${gradient}`}>
      <Icon className="w-4 h-4 text-white" strokeWidth={2.5} />
    </div>
    <div className="qdh-counter-text">
      <span className="qdh-counter-value">{value}</span>
      <span className="qdh-counter-label">{label}</span>
    </div>
  </div>
);

const Home = () => {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handlePlay = useCallback(async (id) => {
    try { await getSupabase(); } catch { /* ignore */ }
    navigate(`/category/${id}/`);
  }, [navigate]);

  return (
    <div className="qdh-container">
      <SEO
        title="Quiz Dangal – Play Quiz & Win Rewards | Opinion, GK, Sports, Movies"
        description="Quiz Dangal is India's play-and-win quiz arena. Take opinion and GK quizzes daily, grow streaks, invite friends, and redeem coins for rewards."
        canonical="https://quizdangal.com/"
        keywords={['Quiz Dangal', 'quizdangal', 'quiz app', 'play quiz and win', 'opinion quiz', 'daily quiz india']}
        alternateLocales={['hi_IN', 'en_US']}
        jsonLd={HOME_JSON_LD}
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
        
        {/* Hero Section */}
        <section className="qdh-hero">
          {/* Floating Crown */}
          <div className="qdh-crown-container">
            <div className="qdh-crown-glow" />
            <Crown className="qdh-crown" />
            <div className="qdh-crown-sparkle qdh-sparkle-1" />
            <div className="qdh-crown-sparkle qdh-sparkle-2" />
            <div className="qdh-crown-sparkle qdh-sparkle-3" />
          </div>
          
          {/* Main title - Single Line */}
          <h1 className="qdh-title">
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

        {/* Stats Row - Minimal */}
        <section className="qdh-counters">
          <StatCounter 
            icon={Crown} 
            value="50K+" 
            label="Players" 
            gradient="from-amber-400 to-orange-500"
          />
          <div className="qdh-counter-divider" />
          <StatCounter 
            icon={Target} 
            value="1000+" 
            label="Quizzes" 
            gradient="from-violet-500 to-fuchsia-500"
          />
          <div className="qdh-counter-divider" />
          <StatCounter 
            icon={Flame} 
            value="Daily" 
            label="Rewards" 
            gradient="from-rose-500 to-pink-500"
          />
        </section>

        {/* Bottom animated line */}
        <div className="qdh-bottom-decor">
          <div className="qdh-decor-line" />
          <div className="qdh-decor-dot" />
          <div className="qdh-decor-line" />
        </div>

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
