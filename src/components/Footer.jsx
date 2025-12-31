import React from 'react';
import { prefetchRoute } from '@/lib/utils';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Wallet, User, Medal, Trophy } from 'lucide-react';

const Footer = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Use trailing slashes to avoid 301s on first load (GitHub Pages serves directories with a slash)
  const navItems = [
    { icon: Trophy, label: 'My Quizzes', path: '/my-quizzes/' },
    { icon: Medal, label: 'Leaderboards', path: '/leaderboards/' },
    { icon: Home, label: 'Home', path: '/' },
    { icon: Wallet, label: 'Wallet', path: '/wallet/' },
    { icon: User, label: 'Profile', path: '/profile/' },
  ];

  // Refined active palette inspired by the logo's ring and trophy
  // Home: Blue, Leaderboards: Pink, Wallet: Gold, Profile: Indigo
  const stripSlash = (p = '') => (p === '/' ? '/' : p.replace(/\/+$/, ''));
  const activeColor = (path) => {
    switch (stripSlash(path)) {
      case '/':
        return 'text-accent-d'; // blue
      case '/leaderboards':
        return 'text-accent-a'; // pink/fuchsia
      case '/my-quizzes':
        return 'text-accent-c'; // purple
      case '/wallet':
        return 'text-accent-e'; // gold
      case '/profile':
        return 'text-accent-b'; // indigo
      default:
        return 'text-accent-d';
    }
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 p-0">
      <div className="qd-bar border-t border-white/10">
        <nav className="qd-footer-nav" aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = stripSlash(location.pathname) === stripSlash(item.path);
            const isHome = stripSlash(item.path) === '/';

            // Pre-compute class names to avoid nested ternaries
            const getButtonClassName = () => {
              if (isHome) {
                return isActive ? 'qd-footer-home qd-footer-home-active' : 'qd-footer-home';
              }
              return isActive ? `qd-footer-item ${activeColor(item.path)}` : 'qd-footer-item';
            };

            const getIconClassName = () => {
              if (isHome) {
                return 'qd-footer-home-icon';
              }
              return isActive ? `qd-footer-icon ${activeColor(item.path)}` : 'qd-footer-icon text-white/80';
            };

            return (
              <button
                type="button"
                key={item.path}
                onClick={() => navigate(item.path)}
                onMouseEnter={() => prefetchRoute(item.path)}
                onFocus={() => prefetchRoute(item.path)}
                className={getButtonClassName()}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={isHome ? 'qd-footer-home-iconWrap' : 'qd-footer-iconWrap'}>
                  <Icon
                    size={isHome ? 28 : 24}
                    strokeWidth={isHome ? 3 : 2.6}
                    className={getIconClassName()}
                    aria-hidden="true"
                  />
                </span>

                {isHome ? (
                  <span className="sr-only">Home</span>
                ) : (
                  <span className="qd-footer-label text-white/80">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
