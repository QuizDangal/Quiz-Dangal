// Register service worker (prod by default). For local testing, enable via ?sw=1 once or localStorage flag.
(function () {
  try {
    var h = window.location.hostname;
    var isLocal = /(^localhost$)|(^127\.0\.0\.1$)|(^0\.0\.0\.0$)|(^192\.168\.)|(^10\.)|(^172\.(1[6-9]|2[0-9]|3[0-1])\.)|(\.local$)/.test(
      h,
    );

    try {
      var u = new URL(window.location.href);
      if (u.searchParams.get('sw') === '1') {
        localStorage.setItem('qd_sw_dev', '1');
      }
    } catch (e) {
      // ignore
    }

    var forceDevSW = false;
    try {
      forceDevSW = localStorage.getItem('qd_sw_dev') === '1';
    } catch (e) {
      forceDevSW = false;
    }

    function isLikelyAutomation() {
      try {
        var ua = (navigator.userAgent || navigator.vendor || '').toLowerCase();
        if (
          /googlebot|bingbot|duckduckbot|baiduspider|yandex|lighthouse|pagespeed|headless|crawler|spider|bot|wrsparams/.test(
            ua,
          )
        )
          return true;
        if (navigator.webdriver === true) return true;
        if (document.prerendering === true) return true;
      } catch (e) {
        // ignore
      }
      return false;
    }

    var canSW = 'serviceWorker' in navigator && window.isSecureContext;
    var shouldRegister = canSW && (!isLocal || forceDevSW) && !isLikelyAutomation();
    if (!shouldRegister) return;

    function preflight(url) {
      return fetch(url, { cache: 'no-store' }).then(function (res) {
        if (!res.ok) throw new Error('sw.js fetch failed: ' + res.status);
        var ct = (res.headers.get('content-type') || '').toLowerCase();
        if (!/javascript|application\/javascript|text\/javascript/.test(ct)) {
          throw new Error('sw.js unexpected content-type: ' + ct);
        }
        return true;
      });
    }

    window.addEventListener('load', function () {
      var swUrl = '/sw.js';

      var register = function () {
        preflight(swUrl)
          .then(function () {
            return navigator.serviceWorker.register(swUrl, {
              scope: '/',
              updateViaCache: 'none',
            });
          })
          .then(function (registration) {
            console.log('SW registered:', registration);
            registration.addEventListener('updatefound', function () {
              var newWorker = registration.installing;
              if (!newWorker) return;
              newWorker.addEventListener('statechange', function () {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  try {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                  } catch (e) {
                    // ignore
                  }
                  // Never force a reload here. Auto-reloads can interrupt Lighthouse/PSI runs
                  // and can cause reload loops on some mobile browsers.
                }
              });
            });
          })
          .catch(function (err) {
            console.warn('SW disabled:', err && (err.message || err));
          });
      };

      // Let the page become interactive first.
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(register, { timeout: 2500 });
      } else {
        setTimeout(register, 1200);
      }
    });
  } catch (e) {
    // ignore
  }
})();
