import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const ADSENSE_SRC = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6769428019015455';
const CONSENT_KEY = 'qd_cookie_consent';

function normalizePath(pathname = '') {
  if (!pathname) return '/';
  const p = pathname.toLowerCase();
  if (p === '/') return '/';
  // Ensure trailing slash for consistent matching
  return p.endsWith('/') ? p : p + '/';
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

function hasAdConsent() {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === 'accepted';
  } catch {
    return false;
  }
}

function shouldDeferAdsForDevice() {
  try {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!connection) return false;
    if (connection.saveData) return true;
    const effectiveType = String(connection.effectiveType || '').toLowerCase();
    return effectiveType === 'slow-2g' || effectiveType === '2g';
  } catch {
    return false;
  }
}

export default function AdSenseLoader() {
  const location = useLocation();
  const [hasConsent, setHasConsent] = useState(() =>
    typeof window !== 'undefined' ? hasAdConsent() : false,
  );

  useEffect(() => {
    const syncConsent = () => setHasConsent(hasAdConsent());

    window.addEventListener('storage', syncConsent);
    window.addEventListener('qd-consent-updated', syncConsent);

    return () => {
      window.removeEventListener('storage', syncConsent);
      window.removeEventListener('qd-consent-updated', syncConsent);
    };
  }, []);

  useEffect(() => {
    if (!hasConsent) return;
    if (!isAdEligiblePath(location.pathname)) return;
    if (shouldDeferAdsForDevice()) return;
    if (document.querySelector(`script[src^="${ADSENSE_SRC}"]`)) return;

    let cancelled = false;
    let fallbackTimer = null;

    const injectScript = () => {
      if (cancelled) return;
      if (document.querySelector(`script[src^="${ADSENSE_SRC}"]`)) return;
      const script = document.createElement('script');
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src = ADSENSE_SRC;
      document.body.appendChild(script);
    };

    const scheduleInjection = () => {
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(injectScript, { timeout: 5000 });
      } else {
        fallbackTimer = window.setTimeout(injectScript, 1500);
      }
    };

    if (document.readyState === 'complete') {
      scheduleInjection();
    } else {
      window.addEventListener('load', scheduleInjection, { once: true });
    }

    return () => {
      cancelled = true;
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      window.removeEventListener('load', scheduleInjection);
    };
  }, [hasConsent, location.pathname]);

  return null;
}