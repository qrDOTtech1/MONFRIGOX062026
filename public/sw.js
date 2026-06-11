// MonFrigo Service Worker — badge des aliments qui périment + cache hors-ligne

const CACHE = 'monfrigo-v2';
const BADGE_INTERVAL = 60 * 60 * 1000; // 1 heure

// --- Badge (aliments qui périment) ---
async function updateBadge() {
  try {
    const resp = await fetch('/api/fridge/expiring-count');
    if (!resp.ok) return;
    const { count } = await resp.json();
    if (navigator.setAppBadge) {
      if (count > 0) navigator.setAppBadge(count);
      else navigator.clearAppBadge();
    }
  } catch {
    // hors-ligne — on ignore
  }
}

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Nettoie les anciens caches
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
    updateBadge();
  })());
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-expiry-badge') event.waitUntil(updateBadge());
});

self.addEventListener('message', (event) => {
  if (event.data === 'update-badge') updateBadge();
});

// --- Cache hors-ligne ---
// Assets statiques → cache-first ; pages & API GET → réseau d'abord avec repli cache.
function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/')
    || url.pathname.startsWith('/icons/')
    || /\.(?:js|css|woff2?|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname);
}

// API qu'on veut pouvoir relire hors-ligne (lecture seule)
function isCacheableApi(url) {
  return url.pathname === '/api/recipes'
    || /^\/api\/recipes\/[^/]+$/.test(url.pathname)
    || url.pathname === '/api/fridge'
    || url.pathname === '/api/profile';
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Assets statiques : cache-first (immuables, hashés par Next)
  if (isStaticAsset(url)) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
        return res;
      } catch {
        return cached || Response.error();
      }
    })());
    return;
  }

  // Navigations (pages) + API en lecture : réseau d'abord, repli cache
  const isNavigation = req.mode === 'navigate';
  if (isNavigation || isCacheableApi(url)) {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
        return res;
      } catch {
        const cached = await caches.match(req);
        if (cached) return cached;
        // Repli : dernière page connue pour une navigation
        if (isNavigation) {
          const fallback = await caches.match('/dashboard') || await caches.match('/');
          if (fallback) return fallback;
        }
        return Response.error();
      }
    })());
  }
});
