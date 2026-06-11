// MonFrigo Service Worker — badge for expiring ingredients

const BADGE_INTERVAL = 60 * 60 * 1000; // 1 hour

async function updateBadge() {
  try {
    const resp = await fetch('/api/fridge/expiring-count');
    if (!resp.ok) return;
    const { count } = await resp.json();
    if (navigator.setAppBadge) {
      if (count > 0) {
        navigator.setAppBadge(count);
      } else {
        navigator.clearAppBadge();
      }
    }
  } catch {
    // silently fail — user may be offline
  }
}

// On install, take control immediately
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
  updateBadge();
});

// Periodic badge update via periodic-sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-expiry-badge') {
    event.waitUntil(updateBadge());
  }
});

// Fallback: update badge on any fetch to the app (debounced via message)
self.addEventListener('message', (event) => {
  if (event.data === 'update-badge') {
    updateBadge();
  }
});
