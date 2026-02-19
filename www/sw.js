/**
 * AI for Grandmas — Service Worker
 *
 * Cache strategy:
 * - App shell: cache-first (HTML, CSS, JS, fonts)
 * - Card data: network-first with cache fallback
 * - CDN assets: cache-first
 */

const CACHE_NAME = 'afg-v5';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './art.js',
  './card-image.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css',
  'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js'
];

// Install — cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([...APP_SHELL, ...CDN_ASSETS]);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch — smart strategy per request type
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Card data — network-first (always try fresh cards)
  if (url.pathname.includes('/data/') && url.pathname.endsWith('.json')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Google Fonts — cache-first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // CDN assets — cache-first
  if (url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // App shell — cache-first
  event.respondWith(cacheFirst(event.request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

// Message handler — show notifications from page context
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(event.data.title, {
      body: event.data.body,
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      tag: event.data.tag || 'afg-daily',
      renotify: false
    });
  }
});

// Notification click — open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('ai-for-grandmas') && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('./');
    })
  );
});

// Periodic background sync — check for new cards
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-new-cards') {
    event.waitUntil(
      fetch('./data/latest.json', { cache: 'no-cache' })
        .then((res) => res.json())
        .then((data) => {
          if (data.cards && data.cards.length > 0) {
            const card = data.cards[0];
            return self.registration.showNotification('Fresh cards from Grandma 🧓', {
              body: card.emoji + ' ' + card.title,
              icon: './icons/icon-192.png',
              badge: './icons/icon-192.png',
              tag: 'afg-daily-' + new Date().toISOString().slice(0, 10),
              renotify: false
            });
          }
        })
        .catch(() => {/* offline, skip */})
    );
  }
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('{"cards":[]}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
