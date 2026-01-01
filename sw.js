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
        // Swallow precache errors silently; PWA will still work with network
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

// ============================================================
// Background Sync for offline answer queue
// ============================================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-answers') {
    event.waitUntil(syncAnswerQueue());
  }
});

async function syncAnswerQueue() {
  try {
    // Get pending answers from IndexedDB
    const db = await openAnswerDB();
    const tx = db.transaction('pending-answers', 'readonly');
    const store = tx.objectStore('pending-answers');
    const pending = await promisifyRequest(store.getAll());
    
    if (!pending || pending.length === 0) return;
    
    // Try to sync each answer
    for (const item of pending) {
      try {
        const response = await fetch('/api/sync-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
        
        if (response.ok) {
          // Remove from pending queue
          const deleteTx = db.transaction('pending-answers', 'readwrite');
          const deleteStore = deleteTx.objectStore('pending-answers');
          deleteStore.delete(item.id);
        }
      } catch (e) {
        // Will retry on next sync
      }
    }
  } catch (e) {
    // IndexedDB or sync failed - will retry
  }
}

function openAnswerDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('qd-offline', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-answers')) {
        db.createObjectStore('pending-answers', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Push Notification Event Listener
self.addEventListener('push', function(event) {
  // Sanitize push data to prevent XSS and injection attacks
  function sanitizePushData(data) {
    if (!data || typeof data !== 'object') return null;
    const safe = {};
    // Only allow specific string fields
    ['title', 'body', 'type', 'quizId'].forEach(key => {
      if (data[key] && typeof data[key] === 'string') {
        safe[key] = String(data[key]).slice(0, 500); // limit length
      }
    });
    // Stricter URL validation: only allow relative paths or same-origin URLs
    if (data.url && typeof data.url === 'string') {
      const urlStr = String(data.url).slice(0, 500);
      // Only allow relative paths starting with / or same-origin absolute URLs
      if (urlStr.startsWith('/') && !urlStr.startsWith('//')) {
        // Relative path - allowed
        safe.url = urlStr;
      } else {
        try {
          const parsed = new URL(urlStr, self.location.origin);
          // Only allow same-origin URLs
          if (parsed.origin === self.location.origin) {
            safe.url = parsed.pathname + parsed.search + parsed.hash;
          }
        } catch {
          // Invalid URL - skip
        }
      }
    }
    return safe;
  }

  // Avoid logging raw payloads in production; parse best-effort
  let raw = null;
  try { raw = event?.data || null; } catch { raw = null; }

  let pushData;
  try {
    const parsed = raw ? raw.json() : null;
    pushData = sanitizePushData(parsed);
  } catch (e) {
    pushData = null;
  }
  if (!pushData) {
    pushData = {
      title: 'Quiz Dangal',
      body: raw ? (()=>{ try { return String(raw.text()).slice(0, 500); } catch { return 'You have a new message.'; } })() : 'You have a new message.',
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
