import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import App from '@/App';
import '@/index.css';
import { HelmetProvider } from 'react-helmet-async';
import { SoundProvider } from './contexts/SoundContext';

const rootEl = document.getElementById('root');

if (!rootEl) {
  // eslint-disable-next-line no-console
  console.error('Root element #root not found in index.html');
} else {
  // Start React render
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
  
  // Smoothly fade out static loader after React starts rendering
  // Using requestAnimationFrame ensures DOM is updated before we fade out
  requestAnimationFrame(() => {
    const staticLoader = document.getElementById('static-loader');
    if (staticLoader) {
      staticLoader.style.opacity = '0';
      setTimeout(() => {
        staticLoader.remove();
      }, 300); // Match the CSS transition duration
    }
  });
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
