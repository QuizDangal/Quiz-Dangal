import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const PWAInstallButton = () => {
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mm =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(display-mode: standalone)')
        : null;
    const isStandaloneView = () => {
      try {
        return Boolean(mm?.matches || window.navigator?.standalone === true);
      } catch {
        return false;
      }
    };

    setIsStandalone(isStandaloneView());

    const onModeChange = (event) => {
      setIsStandalone(Boolean(event?.matches) || window.navigator?.standalone === true);
    };

    if (mm) {
      try {
        mm.addEventListener('change', onModeChange);
      } catch {
        if (mm.addListener) mm.addListener(onModeChange);
      }
    }

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
    };

    // If the prompt was captured before this component mounted, pick it up.
    try {
      if (window.__qdDeferredPrompt) {
        setDeferredPrompt(window.__qdDeferredPrompt);
      }
    } catch {
      // ignore
    }

    const onGlobalBip = () => {
      try {
        if (window.__qdDeferredPrompt) {
          setDeferredPrompt(window.__qdDeferredPrompt);
        }
      } catch {
        // ignore
      }
    };
    const onGlobalInstalled = () => {
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('qd:beforeinstallprompt', onGlobalBip);
    window.addEventListener('qd:appinstalled', onGlobalInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('qd:beforeinstallprompt', onGlobalBip);
      window.removeEventListener('qd:appinstalled', onGlobalInstalled);
      if (mm) {
        try {
          mm.removeEventListener('change', onModeChange);
        } catch {
          if (mm.removeListener) mm.removeListener(onModeChange);
        }
      }
    };
  }, []);

  const waitForInstallPrompt = (timeoutMs = 2500) => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(null);

      // Prefer globally captured prompt if available.
      try {
        if (window.__qdDeferredPrompt) {
          return resolve(window.__qdDeferredPrompt);
        }
      } catch {
        // ignore
      }

      let settled = false;
      const done = (value) => {
        if (settled) return;
        settled = true;
        window.removeEventListener('beforeinstallprompt', onBip);
        window.removeEventListener('qd:beforeinstallprompt', onGlobalBip);
        resolve(value);
      };

      const onBip = (e) => {
        try {
          e.preventDefault();
        } catch {
          // ignore
        }
        setDeferredPrompt(e);
        try {
          window.__qdDeferredPrompt = e;
        } catch {
          // ignore
        }
        done(e);
      };

      const onGlobalBip = () => {
        try {
          if (window.__qdDeferredPrompt) {
            setDeferredPrompt(window.__qdDeferredPrompt);
            done(window.__qdDeferredPrompt);
            return;
          }
        } catch {
          // ignore
        }
      };

      try {
        window.addEventListener('beforeinstallprompt', onBip, { once: true });
      } catch {
        window.addEventListener('beforeinstallprompt', onBip);
      }

      // Also listen for the custom global event.
      window.addEventListener('qd:beforeinstallprompt', onGlobalBip);

      window.setTimeout(() => done(null), Math.max(0, timeoutMs));
    });
  };

  const handleClick = async () => {
    try {
      // If we already captured the prompt, use it.
      if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        try {
          window.__qdDeferredPrompt = null;
        } catch {
          // ignore
        }
        return;
      }

      // iOS Safari/Chrome do not support `beforeinstallprompt`.
      // Keep the button visible (as requested), but don't dead-click.
      try {
        const ua = String(navigator.userAgent || '').toLowerCase();
        const isIOS = /iphone|ipad|ipod/.test(ua);
        const isIOSBrowser = isIOS && !/android/.test(ua);
        if (isIOSBrowser) {
          toast({
            title: 'Install on iPhone',
            description: 'Use Share → Add to Home Screen.',
          });
          return;
        }
      } catch {
        // ignore
      }

      toast({ title: 'Preparing install…', description: 'Checking if install prompt is available.' });

      // On some loads the beforeinstallprompt fires only after SW registration.
      // Force SW registration on user click (won't affect Lighthouse/PSI runs).
      try {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.isSecureContext) {
          await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none',
          });
        }
      } catch {
        // ignore
      }

      // Wait briefly for the prompt to become available, then show it.
      const bipEvent = await waitForInstallPrompt(2500);
      if (bipEvent) {
        bipEvent.prompt();
        await bipEvent.userChoice;
        setDeferredPrompt(null);
        try {
          window.__qdDeferredPrompt = null;
        } catch {
          // ignore
        }
      } else {
        toast({
          title: 'Install not available',
          description: 'Use your browser menu → Install app / Add to Home Screen.',
        });
      }
    } catch {
      // ignore
    }
  };

  // Hide only if already installed as PWA
  if (isStandalone) return null;

  return (
    <button
      onClick={handleClick}
      className="w-14 h-14 rounded-full btn-fire transition-all duration-300 transform hover:scale-105 flex items-center justify-center group relative overflow-hidden shadow-lg"
      style={{ position: 'fixed', bottom: '100px', right: '20px', zIndex: 9999 }}
      aria-label="Install App"
      title="Install App"
    >
      <svg
        className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-6 opacity-70"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M12 2c1.5 2 2 3.5 2 5 0 1.5-.5 3-2 4-1.5-1-2-2.5-2-4 0-1.5.5-3 2-5Z"
          fill="url(#flameGrad)"
        />
        <defs>
          <linearGradient id="flameGrad" x1="12" y1="2" x2="12" y2="11" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fde047" />
            <stop offset="1" stopColor="#f97316" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0" />
      <Download className="w-5 h-5 relative z-10 drop-shadow text-white" />
      <span className="hidden group-hover:block absolute right-16 bg-gray-900/90 backdrop-blur text-white px-2 py-1 rounded text-xs whitespace-nowrap border border-white/10 shadow">
        Install App
      </span>
    </button>
  );
};

export default PWAInstallButton;
