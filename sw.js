// Paean service worker — network-first for HTML/manifest, cache-first for assets
const VERSION = 'paean-v3';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.png'
];

// On install: pre-cache the app shell, take over immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// On activate: drop any old caches, claim all open pages
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - Navigation requests (HTML pages) and manifest: network-first → fresh content if online,
//   cache fallback if offline. This ensures updates appear without manual cache clearing.
// - Other GET requests (icons, JS, CSS): cache-first → fast load, transparent revalidation.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isHTML = req.mode === 'navigate' ||
                 req.headers.get('accept')?.includes('text/html') ||
                 url.pathname.endsWith('.html') ||
                 url.pathname.endsWith('.webmanifest');

  if (isHTML) {
    // Network-first
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Update cache with the fresh response
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
    );
  } else {
    // Cache-first
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) {
          // Refresh in background (stale-while-revalidate)
          fetch(req).then((res) => {
            if (res && res.status === 200 && res.type === 'basic') {
              const copy = res.clone();
              caches.open(VERSION).then((cache) => cache.put(req, copy));
            }
          }).catch(() => {});
          return cached;
        }
        return fetch(req).then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        });
      })
    );
  }
});

// Allow the page to trigger an immediate activation of a waiting worker
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
