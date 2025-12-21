const CACHE_NAME = 'qd-cache-v11';
const PRECACHE_URLS = [
  './',
  './index.html',
  './site.webmanifest',
  './env-config.js',
  './url-migrate.js',
  './android-chrome-192x192.png',
  './android-chrome-512x512.png',
  './maskable-icon-192.png',
  './maskable-icon-512.png',
  './apple-touch-icon.png',
  './favicon-16x16.png',
  './favicon-32x32.png',
  './favicon.ico'
];

// Check if running in standalone PWA mode
function isStandalonePWA() {
  return self.clients.matchAll({ type: 'window' }).then(clients => {
    return clients.some(client => {
      // Check if any client is in standalone mode
      return client.url && !client.url.includes('?source=browser');
    });
  });
}

// Immediate activation for faster PWA startup
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('Precache partial failure:', err);
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames.map((name) => name !== CACHE_NAME && caches.delete(name))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Do NOT intercept non-GETs or cross-origin requests
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isNavigate = req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept')?.includes('text/html'));

  // For navigation requests - use stale-while-revalidate for instant load
  if (isNavigate) {
    event.respondWith(
      caches.match('./index.html').then((cached) => {
        // Return cached immediately, fetch in background
        const fetchPromise = fetch(req).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy)).catch(() => {});
          }
          return response;
        }).catch(() => cached);
        
        // Return cached version immediately if available, otherwise wait for network
        return cached || fetchPromise;
      })
    );
    return;
  }

  // For CSS/JS/Fonts - CACHE-FIRST with background update (stale-while-revalidate)
  // This makes PWA load INSTANTLY from cache
  const dest = req.destination;
  if (dest === 'style' || dest === 'script' || dest === 'font') {
    event.respondWith(
      caches.match(req).then((cached) => {
        // Always try to update cache in background
        const fetchPromise = fetch(req).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return response;
        }).catch(() => null);
        
        // Return cached IMMEDIATELY if available, otherwise wait for network
        if (cached) {
          // Update cache in background (don't wait)
          fetchPromise.catch(() => {});
          return cached;
        }
        return fetchPromise || caches.match(req);
      })
    );
    return;
  }

  // Default: cache-first for icons/images
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((resp) => {
      if (resp.ok) {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
      }
      return resp;
    }))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push Notification Event Listener
self.addEventListener('push', function(event) {
  // Avoid logging raw payloads in production; parse best-effort
  let raw = null;
  try { raw = event?.data || null; } catch { raw = null; }

  let pushData;
  try {
    pushData = raw ? raw.json() : null;
  } catch (e) {
    pushData = null;
  }
  if (!pushData) {
    pushData = {
      title: 'Quiz Dangal',
      body: raw ? (()=>{ try { return raw.text(); } catch { return 'You have a new message.'; } })() : 'You have a new message.',
    };
  }

  const title = pushData.title || 'New Notification';
  const type = pushData.type; // 'start_soon' | 'result' | custom
  const quizId = pushData.quizId;
  // Derive a sensible default URL if not provided
  let url = typeof pushData.url === 'string' ? pushData.url : undefined;
  if (!url && quizId && typeof quizId === 'string') {
    if (type === 'start_soon') url = `/quiz/${quizId}`;
    else if (type === 'result') url = `/results/${quizId}`;
  }

  // Per-quiz tag so we can replace/close start-soon when result arrives
  const baseTag = 'quiz-dangal';
  // Use distinct tags per type so start-soon and result can coexist
  const tag = quizId ? `${baseTag}-${quizId}-${type || 'general'}` : `${baseTag}-general`;

  // Keep important notifications visible until user interacts
  const requireInteraction = type === 'start_soon' || type === 'result';

  const options = {
    body: pushData.body || 'You have a new message.',
    // Use absolute paths to avoid scope/path issues across origins/scopes
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    tag,
    renotify: true,
    requireInteraction,
    actions: [
      { action: 'open', title: 'Open App' },
    ],
    data: { url, type, quizId },
  };

  // Show notification (no auto-closing other notices)
  const showPromise = (async () => {
    return self.registration.showNotification(title, options);
  })();

  event.waitUntil(showPromise);
});

// Focus app on notification click (and open if not already open)
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlFromData = event?.notification?.data?.url;

  // Sanitize target URL to same-origin relative path
  function toSafePath(u) {
    try {
      if (!u || typeof u !== 'string') return '/#/';
      const absolute = new URL(u, self.location.origin);
      if (absolute.origin !== self.location.origin) return '/#/';
      // Return path + search + hash to keep in-app routing
      return absolute.pathname + absolute.search + absolute.hash;
    } catch {
      return '/#/';
    }
  }

  const targetUrl = toSafePath(urlFromData);
  const action = event.action;
  event.waitUntil((async () => {
    // If an action was provided (like 'open'), we can branch logic here in future.
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      // If app is already open, focus it and optionally navigate
      try {
        if ('focus' in client) await client.focus();
        // Only navigate if a distinct URL is provided and different
        if (targetUrl && client.url && !client.url.endsWith(targetUrl)) {
          client.navigate(targetUrl).catch(()=>{});
        }
        return;
      } catch {}
    }
    // Otherwise open a new window
    try { await clients.openWindow(targetUrl); } catch {}
  })());
});
