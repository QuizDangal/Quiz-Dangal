import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';

const CONSENT_KEY = 'qd_cookie_consent';

// Get GA ID from env or runtime config (same as index.html)
const getGAId = () => {
  const runtimeEnv = typeof window !== 'undefined' && window.__QUIZ_DANGAL_ENV__ 
    ? window.__QUIZ_DANGAL_ENV__ 
    : {};
  return import.meta.env?.VITE_GA_ID || runtimeEnv.VITE_GA_ID || 'G-98624Q56YT';
};

/**
 * Trigger GA loading after consent is given
 * This works with the GA script in index.html which checks for consent
 */
const triggerGALoad = () => {
  // If GA is already loaded, just ensure it's initialized
  if (window.__qdGAReady) return;
  
  // The scheduleGA function from index.html will check localStorage
  // We trigger it by simulating an interaction event or calling loadGA directly
  if (typeof window !== 'undefined') {
    // Dispatch a custom event that can be caught if needed
    window.dispatchEvent(new CustomEvent('qd-consent-accepted'));
    
    // Manually trigger GA load since consent was just given
    const loadGA = () => {
      if (window.__qdGAReady) return;
      window.__qdGAReady = true;
      const gaId = getGAId();
      const s = document.createElement('script');
      s.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      s.async = true;
      document.head.appendChild(s);
      s.onload = () => {
        window.dataLayer = window.dataLayer || [];
        window.gtag = function() { window.dataLayer.push(arguments); };
        window.gtag('js', new Date());
        window.gtag('config', gaId);
      };
    };
    
    // Load after a short delay to allow localStorage to be set
    setTimeout(loadGA, 100);
  }
};

const broadcastConsentUpdate = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('qd-consent-updated'));
  }
};

/**
 * Cookie Consent Banner - Required for AdSense and GDPR compliance
 * Shows once and stores preference in localStorage
 */
const CookieConsent = () => {
  const [visible, setVisible] = useState(false);
  const dialogRef = useRef(null);
  const acceptButtonRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    // Check if user has already consented
    const hasConsented = localStorage.getItem(CONSENT_KEY);
    if (!hasConsented) {
      // Delay showing banner to not interfere with initial page load
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!visible) return undefined;

    previouslyFocusedRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = setTimeout(() => {
      acceptButtonRef.current?.focus();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleDecline();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusableElements = dialogRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      if (!focusableElements.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [visible]);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
    broadcastConsentUpdate();
    // Trigger GA load now that consent is given
    triggerGALoad();
  };

  const handleDecline = () => {
    localStorage.setItem(CONSENT_KEY, 'declined');
    setVisible(false);
    broadcastConsentUpdate();
    // No need to disable anything - GA won't load without 'accepted' status
  };

  if (!visible) return null;

  return (
    <div
      ref={dialogRef}
      className="fixed left-3 right-3 z-[100] mx-auto max-w-lg animate-in slide-in-from-bottom-4 duration-300 sm:left-4 sm:right-4"
      style={{
        bottom: 'calc(var(--qd-footer-offset, 0px) + 4px)',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
    >
      <div className="bg-slate-900/95 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-4 shadow-2xl shadow-black/40">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 rounded-full bg-amber-500/20">
            <Cookie className="w-5 h-5 text-amber-400" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="cookie-consent-title" className="text-white font-semibold text-sm">
              🍪 We use cookies
            </h3>
            <p id="cookie-consent-desc" className="text-slate-400 text-xs mt-1 leading-relaxed">
              We use cookies for analytics and personalized ads to improve your experience. 
              By clicking &quot;Accept&quot;, you consent to our use of cookies.{' '}
              <Link 
                to="/privacy-policy/" 
                className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
              >
                Privacy Policy
              </Link>
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                ref={acceptButtonRef}
                onClick={handleAccept}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                Accept All
              </button>
              <button
                onClick={handleDecline}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                Decline
              </button>
            </div>
          </div>
          <button
            onClick={handleDecline}
            className="flex-shrink-0 p-1 rounded-full text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            aria-label="Dismiss cookie consent"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
