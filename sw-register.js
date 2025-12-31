// Register service worker (prod by default). For local testing, enable via ?sw=1 once or localStorage flag.
(function () {
  'use strict';

  // Helper: Check if running in local development environment
  function isLocalEnvironment() {
    try {
      const h = globalThis.location.hostname;
      return /(^localhost$)|(^127\.0\.0\.1$)|(^0\.0\.0\.0$)|(^192\.168\.)|(^10\.)|(^172\.(1[6-9]|2\d|3[0-1])\.)|(\.local$)/.test(h);
    } catch {
      return false;
    }
  }

  // Helper: Check if SW dev mode is forced via URL param or localStorage
  function checkForceDevSW() {
    try {
      const u = new URL(globalThis.location.href);
      if (u.searchParams.get('sw') === '1') {
        localStorage.setItem('qd_sw_dev', '1');
      }
      return localStorage.getItem('qd_sw_dev') === '1';
    } catch {
      return false;
    }
  }

  // Helper: Detect automation/bot user agents
  function isLikelyAutomation() {
    try {
      const ua = (navigator.userAgent || navigator.vendor || '').toLowerCase();
      if (/googlebot|bingbot|duckduckbot|baiduspider|yandex|lighthouse|pagespeed|headless|crawler|spider|bot|wrsparams/.test(ua)) {
        return true;
      }
      if (navigator.webdriver === true) return true;
      if (document.prerendering === true) return true;
    } catch {
      // Detection failed, assume not automation
    }
    return false;
  }

  // Helper: Unregister all service workers
  function unregisterAllSW() {
    try {
      navigator.serviceWorker.getRegistrations().then(function (registrations) {
        registrations.forEach(function (reg) {
          reg.unregister();
        });
      });
    } catch {
      // Unregister failed, non-critical
    }
  }

  // Helper: Clear all caches
  function clearAllCaches() {
    try {
      if ('caches' in globalThis && globalThis.caches && typeof globalThis.caches.keys === 'function') {
        globalThis.caches.keys().then(function (keys) {
          keys.forEach(function (k) {
            globalThis.caches.delete(k);
          });
        });
      }
    } catch {
      // Cache clearing failed, non-critical
    }
  }

  // Helper: Handle SW update found
  function handleUpdateFound(registration) {
    const newWorker = registration.installing;
    if (!newWorker) return;
    
    newWorker.addEventListener('statechange', function () {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        try {
          newWorker.postMessage({ type: 'SKIP_WAITING' });
        } catch {
          // postMessage failed, non-critical
        }
        
        // Reload once per session to show updated UI
        try {
          if (!sessionStorage.getItem('qd_sw_reloaded')) {
            sessionStorage.setItem('qd_sw_reloaded', '1');
            setTimeout(function () {
              globalThis.location.reload();
            }, 900);
          }
        } catch {
          // sessionStorage access failed, non-critical
        }
      }
    });
  }

  // Helper: Register the service worker
  function registerSW() {
    navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    })
      .then(function (registration) {
        registration.addEventListener('updatefound', function () {
          handleUpdateFound(registration);
        });
      })
      .catch(function () {
        // SW registration fail is non-critical; app still works
      });
  }

  // Main execution
  try {
    const isLocal = isLocalEnvironment();
    const forceDevSW = checkForceDevSW();
    const isAutomation = isLikelyAutomation();
    const canSW = 'serviceWorker' in navigator && globalThis.isSecureContext;
    const shouldRegister = canSW && (!isLocal || forceDevSW) && !isAutomation;

    // On local/dev, clean up any existing SW
    if (canSW && isLocal && !forceDevSW && !isAutomation) {
      unregisterAllSW();
      clearAllCaches();
      return;
    }
    
    // On automation, unregister SW to prevent interference
    if (canSW && isAutomation) {
      unregisterAllSW();
      return;
    }
    
    if (!shouldRegister) return;

    // Register SW after page load
    globalThis.addEventListener('load', function () {
      if ('requestIdleCallback' in globalThis) {
        globalThis.requestIdleCallback(registerSW, { timeout: 2500 });
      } else {
        setTimeout(registerSW, 1200);
      }
    });
  } catch {
    // Service worker registration script failed, non-critical
  }
})();
