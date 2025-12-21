// 🎰 HEXAGON HUB - Futuristic Gaming Style
import React, { useCallback, useState, useEffect } from 'react';
import SEO from '@/components/SEO';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Brain, Trophy, Clapperboard, Zap } from 'lucide-react';
import { getSupabase } from '@/lib/customSupabaseClient';

const CATEGORIES = [
  { id: 'opinion', label: 'OPINION', icon: MessageSquare, color: '#FF6B2C' },
  { id: 'gk', label: 'G.K', icon: Brain, color: '#A855F7' },
  { id: 'sports', label: 'SPORTS', icon: Trophy, color: '#22D3EE' },
  { id: 'movies', label: 'MOVIES', icon: Clapperboard, color: '#EC4899' },
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

// Hexagon Button Component
const HexButton = ({ cat, index, onPlay }) => {
  const Icon = cat.icon;
  const row = Math.floor(index / 2);
  const col = index % 2;
  
  return (
    <button
      onClick={() => onPlay(cat.id)}
      className="hex-btn"
      style={{ 
        '--hex-color': cat.color,
        '--hex-row': row,
        '--hex-col': col,
        '--hex-index': index,
      }}
      aria-label={`Play ${cat.label}`}
    >
      <div className="hex-btn-bg" />
      <div className="hex-btn-border" />
      <div className="hex-btn-shine" />
      <div className="hex-btn-content">
        <div className="hex-btn-icon-ring">
          <Icon className="hex-btn-icon" strokeWidth={2.5} />
        </div>
        <span className="hex-btn-label">{cat.label}</span>
        <div className="hex-btn-play">
          <Zap className="w-3 h-3" fill="currentColor" />
          <span>PLAY</span>
        </div>
      </div>
      <div className="hex-btn-glow" />
    </button>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePlay = useCallback(async (id) => {
    try { await getSupabase(); } catch { /* ignore */ }
    navigate(`/category/${id}/`);
  }, [navigate]);

  return (
    <div className="hex-home">
      <SEO
        title="Quiz Dangal – Play Quiz & Win Rewards | Opinion, GK, Sports, Movies"
        description="Quiz Dangal is India's play-and-win quiz arena. Take opinion and GK quizzes daily, grow streaks, invite friends, and redeem coins for rewards."
        canonical="https://quizdangal.com/"
        keywords={['Quiz Dangal', 'quizdangal', 'quiz app', 'play quiz and win', 'opinion quiz', 'daily quiz india']}
        alternateLocales={['hi_IN', 'en_US']}
        jsonLd={HOME_JSON_LD}
      />

      {/* Cyberpunk Background */}
      <div className="hex-bg" aria-hidden="true">
        <div className="hex-bg-base" />
        <div className="hex-bg-scan" />
        <div className="hex-bg-grid" />
        <div className="hex-bg-vignette" />
      </div>

      {/* Main Content */}
      <main className={`hex-main ${mounted ? 'hex-main-visible' : ''}`}>

        {/* Title */}
        <h1 className="hex-title">
          SELECT <span className="hex-title-glow">ARENA</span>
        </h1>

        {/* Hexagon Grid */}
        <div className="hex-grid">
          {CATEGORIES.map((cat, i) => (
            <HexButton key={cat.id} cat={cat} index={i} onPlay={handlePlay} />
          ))}
        </div>

        {/* Footer */}
        <footer className="hex-footer">
          <div className="hex-footer-line" />
          <p className="hex-footer-text">TAP TO ENTER ARENA</p>
          <div className="hex-footer-line" />
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
