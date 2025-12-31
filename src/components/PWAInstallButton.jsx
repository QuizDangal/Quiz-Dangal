import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const PWAInstallButton = () => {
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (globalThis.window === undefined) {
      return undefined;
    }

    const mm =
      typeof globalThis.matchMedia === 'function'
        ? globalThis.matchMedia('(display-mode: standalone)')
        : null;
    const isStandaloneView = () => {
      try {
        return Boolean(mm?.matches || globalThis.navigator?.standalone === true);
      } catch {
        return false;
      }
    };

    setIsStandalone(isStandaloneView());

    const onModeChange = (event) => {
      setIsStandalone(Boolean(event?.matches) || globalThis.navigator?.standalone === true);
    };

    if (mm) {
      try {
        mm.addEventListener('change', onModeChange);
      } catch {
        // Fallback removed - deprecated addListener not used
      }
    }

    const onBeforeInstall = (e) => {
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
    };

    // If the prompt was captured before this component mounted, pick it up.
    try {
      if (globalThis.__qdDeferredPrompt) {
        setDeferredPrompt(globalThis.__qdDeferredPrompt);
      }
    } catch {
      // ignore
    }

    const onGlobalBip = () => {
      try {
        if (globalThis.__qdDeferredPrompt) {
          setDeferredPrompt(globalThis.__qdDeferredPrompt);
        }
      } catch {
        // ignore
      }
    };
    const onGlobalInstalled = () => {
      setDeferredPrompt(null);
    };

    globalThis.addEventListener('beforeinstallprompt', onBeforeInstall);
    globalThis.addEventListener('appinstalled', onInstalled);
    globalThis.addEventListener('qd:beforeinstallprompt', onGlobalBip);
    globalThis.addEventListener('qd:appinstalled', onGlobalInstalled);

    return () => {
      globalThis.removeEventListener('beforeinstallprompt', onBeforeInstall);
      globalThis.removeEventListener('appinstalled', onInstalled);
      globalThis.removeEventListener('qd:beforeinstallprompt', onGlobalBip);
      globalThis.removeEventListener('qd:appinstalled', onGlobalInstalled);
      if (mm) {
        try {
          mm.removeEventListener('change', onModeChange);
        } catch {
          // Fallback removed - deprecated removeListener not used
        }
      }
    };
  }, []);

  const waitForInstallPrompt = (timeoutMs = 2500) => {
    return new Promise((resolve) => {
      if (globalThis.window === undefined) return resolve(null);

      // Prefer globally captured prompt if available.
      try {
        if (globalThis.__qdDeferredPrompt) {
          return resolve(globalThis.__qdDeferredPrompt);
        }
      } catch {
        // ignore
      }

      let settled = false;
      const done = (value) => {
        if (settled) return;
        settled = true;
        globalThis.removeEventListener('beforeinstallprompt', onBip);
        globalThis.removeEventListener('qd:beforeinstallprompt', onGlobalBip);
        resolve(value);
      };

      const onBip = (e) => {
        setDeferredPrompt(e);
        try {
          globalThis.__qdDeferredPrompt = e;
        } catch {
          // ignore
        }
        done(e);
      };

      const onGlobalBip = () => {
        try {
          if (globalThis.__qdDeferredPrompt) {
            setDeferredPrompt(globalThis.__qdDeferredPrompt);
            done(globalThis.__qdDeferredPrompt);
            return;
          }
        } catch {
          // ignore
        }
      };

      try {
        globalThis.addEventListener('beforeinstallprompt', onBip, { once: true });
      } catch {
        globalThis.addEventListener('beforeinstallprompt', onBip);
      }

      // Also listen for the custom global event.
      globalThis.addEventListener('qd:beforeinstallprompt', onGlobalBip);

      globalThis.setTimeout(() => done(null), Math.max(0, timeoutMs));
    });
  };

  // Helper: Check if iOS device and show toast
  const checkIOSAndShowToast = () => {
    try {
      const ua = String(navigator.userAgent || '').toLowerCase();
      const isIOS = /iphone|ipad|ipod/.test(ua);
      const isIOSBrowser = isIOS && !/android/.test(ua);
      if (isIOSBrowser) {
        toast({
          title: 'Install on iPhone',
          description: 'Use Share → Add to Home Screen.',
        });
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  };

  // Helper: Clear deferred prompt state
  const clearDeferredPrompt = () => {
    setDeferredPrompt(null);
    try {
      globalThis.__qdDeferredPrompt = null;
    } catch {
      // ignore
    }
  };

  // Helper: Register SW if needed for install prompt
  const ensureSWRegistered = async () => {
    if (globalThis.window === undefined) return;
    if (!('serviceWorker' in navigator) || !globalThis.isSecureContext) return;
    
    let isLocal = false;
    try {
      const h = globalThis.location.hostname;
      isLocal = /(^localhost$)|(^127\.)|(^0\.0\.0\.0$)|(^192\.168\.)|(^10\.)|(^172\.(1[6-9]|2\d|3[0-1])\.)|(\. local$)/.test(h);
    } catch {
      // assume not local
    }
    
    let forceDevSW = false;
    try {
      forceDevSW = localStorage.getItem('qd_sw_dev') === '1';
    } catch {
      // ignore
    }

    if (!isLocal || forceDevSW) {
      await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
    }
  };

  // Helper: Trigger install prompt and wait for user choice
  const triggerInstallPrompt = async (prompt) => {
    try {
      if (!prompt || typeof prompt.prompt !== 'function') {
        return;
      }
      prompt.prompt();
      await prompt.userChoice;
    } finally {
      clearDeferredPrompt();
    }
  };

  const handleClick = async () => {
    try {
      // If we already captured the prompt, use it.
      if (deferredPrompt) {
        await triggerInstallPrompt(deferredPrompt);
        return;
      }

      // iOS Safari/Chrome do not support `beforeinstallprompt`.
      if (checkIOSAndShowToast()) return;

      toast({ title: 'Preparing install…', description: 'Checking if install prompt is available.' });

      // Force SW registration on user click
      try {
        await ensureSWRegistered();
      } catch {
        // ignore
      }

      // Wait briefly for the prompt to become available, then show it.
      const bipEvent = await waitForInstallPrompt(2500);
      if (bipEvent) {
        await triggerInstallPrompt(bipEvent);
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
      className="p-2 transition-all duration-300 transform hover:scale-125 flex items-center justify-center group relative"
      style={{
        position: 'fixed',
        bottom: 'calc(var(--qd-footer-h, 56px) + env(safe-area-inset-bottom) + 4px)',
        right: '14px',
        zIndex: 9999,
      }}
      aria-label="Install App"
      title="Install App"
    >
      <Download 
        className="w-8 h-8 text-amber-400 animate-bounce" 
        style={{ 
          filter: 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.9)) drop-shadow(0 0 20px rgba(251, 191, 36, 0.5))',
          animationDuration: '1.5s'
        }} 
      />
      <span className="hidden group-hover:block absolute right-12 bg-gray-900/90 backdrop-blur text-white px-2 py-1 rounded text-xs whitespace-nowrap border border-white/10 shadow">
        Install App
      </span>
    </button>
  );
};

export default PWAInstallButton;
