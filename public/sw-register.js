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
    var isAutomation = isLikelyAutomation();
    var shouldRegister = canSW && (!isLocal || forceDevSW) && !isAutomation;
    
    // If automation detected (Lighthouse/PSI), unregister any existing SW to prevent interference
    if (canSW && isAutomation) {
      try {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
          registrations.forEach(function(reg) { reg.unregister(); });
        });
      } catch (e) {
        // ignore
      }
      return;
    }
    
    if (!shouldRegister) return;

    window.addEventListener('load', function () {
      var swUrl = '/sw.js';

      var register = function () {
        navigator.serviceWorker.register(swUrl, {
          scope: '/',
          updateViaCache: 'none',
        })
          .then(function (registration) {
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
            // SW registration fail is non-critical; app still works
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
