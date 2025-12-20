import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import App from '@/App';
import '@/index.css';
import { HelmetProvider } from 'react-helmet-async';
import { SoundProvider } from './contexts/SoundContext';

// Capture the install prompt event globally.
// `beforeinstallprompt` can fire once before React/lazy components mount.
if (typeof window !== 'undefined') {
  try {
    if (!window.__qdBipListenerAdded) {
      window.__qdBipListenerAdded = true;
      window.__qdDeferredPrompt = window.__qdDeferredPrompt || null;

      window.addEventListener('beforeinstallprompt', (e) => {
        try {
          e.preventDefault();
        } catch {
          /* ignore */
        }
        window.__qdDeferredPrompt = e;
        try {
          window.dispatchEvent(new Event('qd:beforeinstallprompt'));
        } catch {
          /* ignore */
        }
      });

      window.addEventListener('appinstalled', () => {
        window.__qdDeferredPrompt = null;
        try {
          window.dispatchEvent(new Event('qd:appinstalled'));
        } catch {
          /* ignore */
        }
      });
    }
  } catch {
    // ignore
  }
}

const rootEl = document.getElementById('root');

if (!rootEl) {
  // eslint-disable-next-line no-console
  console.error('Root element #root not found in index.html');
} else {
  // Start React render immediately
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <AuthProvider>
        <HelmetProvider>
          <SoundProvider>
            <App />
          </SoundProvider>
        </HelmetProvider>
      </AuthProvider>
    </React.StrictMode>,
  );
  
  // Static loader will be removed by App.jsx when fully loaded
  // This ensures single smooth transition instead of double loading
}

// Defer vitals collection until after initial paint.
if (typeof window !== 'undefined') {
  const schedule = (cb, timeoutMs = 1500) => {
    try {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(cb, { timeout: timeoutMs });
        return;
      }
    } catch {
      /* ignore */
    }
    window.setTimeout(cb, Math.max(0, timeoutMs));
  };

  // Web-vitals is optional and should never compete with first paint.
  schedule(() => {
    import('@/lib/webVitals')
      .then((mod) => mod.initWebVitals?.())
      .catch(() => {
        /* ignore */
      });
  }, 1800);

  // Warm framer-motion only after a real user interaction (keeps Lighthouse/PSI quiet).
  const warmOnce = () => {
    schedule(() => {
      import('@/lib/motion-lite')
        .then((mod) => mod.warmMotion?.())
        .catch(() => {
          /* ignore */
        });
    }, 2500);
  };

  // Run at most once.
  const opts = { once: true, passive: true };
  window.addEventListener('pointerdown', warmOnce, opts);
  window.addEventListener('touchstart', warmOnce, opts);
  window.addEventListener('keydown', warmOnce, { once: true });
}
