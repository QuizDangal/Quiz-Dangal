import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import App from '@/App';
import '@/index.css';
import { HelmetProvider } from 'react-helmet-async';
import { logger } from '@/lib/logger';
import { SoundProvider } from './contexts/SoundContext';
import { validateEnvironment } from '@/lib/envValidation';

// Validate environment variables before app initialization
try {
  validateEnvironment();
} catch (error) {
  logger.error('Environment validation failed:', error.message);
  // In production, show user-friendly error instead of crashing
  if (import.meta.env.PROD) {
    // Use safe DOM API instead of innerHTML to prevent XSS
    const errorContainer = document.createElement('div');
    errorContainer.style.cssText = 'padding: 2rem; font-family: system-ui; max-width: 600px; margin: 2rem auto;';
    const heading = document.createElement('h1');
    heading.style.color = '#dc2626';
    heading.textContent = 'Configuration Error';
    const message = document.createElement('p');
    message.textContent = 'The application is not properly configured. Please contact support.';
    errorContainer.appendChild(heading);
    errorContainer.appendChild(message);
    document.body.appendChild(errorContainer);
  }
  throw error;
}

// Capture the install prompt event globally.
// `beforeinstallprompt` can fire once before React/lazy components mount.
if (typeof window !== 'undefined') {
  try {
    if (!window.__qdBipListenerAdded) {
      window.__qdBipListenerAdded = true;
      window.__qdDeferredPrompt = window.__qdDeferredPrompt || null;

      window.addEventListener('beforeinstallprompt', (e) => {
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
  logger.error('Root element #root not found in index.html');
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
  // Also prefetch common routes (Leaderboards, Wallet) on first interaction.
  const warmOnce = () => {
    schedule(() => {
      import('@/lib/motion-lite')
        .then((mod) => mod.warmMotion?.())
        .catch(() => {
          /* ignore */
        });
      // Prefetch common routes
      import('@/pages/Leaderboards').catch(() => {});
      import('@/pages/Wallet').catch(() => {});
    }, 2500);
  };

  // Run at most once.
  const opts = { once: true, passive: true };
  window.addEventListener('pointerdown', warmOnce, opts);
  window.addEventListener('touchstart', warmOnce, opts);
  window.addEventListener('keydown', warmOnce, { once: true });
}
