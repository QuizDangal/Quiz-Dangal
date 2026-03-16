import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ADSENSE_SRC = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6769428019015455';

function normalizePath(pathname = '') {
  if (!pathname) return '/';
  return pathname === '/' ? '/' : pathname.replace(/\/+$/, '/')
    .toLowerCase();
}

function isAdEligiblePath(pathname) {
  const path = normalizePath(pathname);
  return [
    '/',
    '/leaderboards/',
    '/play-win-quiz-app/',
    '/opinion-quiz-app/',
    '/gk-quiz/',
    '/refer-earn-quiz-app/',
    '/category/opinion/',
    '/category/gk/',
  ].includes(path);
}

export default function AdSenseLoader() {
  const location = useLocation();

  useEffect(() => {
    if (!isAdEligiblePath(location.pathname)) return;
    if (document.querySelector('script[data-qd-adsense="true"]')) return;

    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = ADSENSE_SRC;
    script.dataset.qdAdsense = 'true';
    document.body.appendChild(script);

    return () => {
      // Keep a single script instance for eligible public pages only.
    };
  }, [location.pathname]);

  return null;
}