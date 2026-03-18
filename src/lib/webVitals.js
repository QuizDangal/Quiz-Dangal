// Core Web Vitals measurement — always active in production.
// Sends real-user metrics to Google Analytics via gtag events.
import { logger } from '@/lib/logger';

/** Send a CWV metric to GA4 as a custom event via gtag. */
function sendToGA(metric) {
  if (typeof globalThis.gtag !== 'function') return;
  globalThis.gtag('event', metric.name, {
    event_category: 'Web Vitals',
    value: Math.round(metric.name === 'CLS' ? metric.delta * 1000 : metric.delta),
    event_label: metric.id,
    non_interaction: true,
  });
}

export async function initWebVitals() {
  try {
    const mod = await import('web-vitals');
    const report = (metric) => {
      if (import.meta.env.VITE_ENABLE_VITALS) {
        logger.info('[Vitals]', metric.name, Math.round(metric.value));
      }
      sendToGA(metric);
    };
    mod.onCLS(report);
    mod.onFID(report);
    mod.onLCP(report);
    mod.onINP && mod.onINP(report);
    mod.onTTFB(report);
  } catch {
    // swallow errors silently
  }
}
