'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').then(async (reg) => {
      // Request periodic sync for badge updates (Chrome 80+)
      if ('periodicSync' in reg) {
        try {
          await (reg as any).periodicSync.register('update-expiry-badge', {
            minInterval: 60 * 60 * 1000, // 1 hour
          });
        } catch {
          // permission denied or not supported — fallback below
        }
      }

      // Immediate badge update
      reg.active?.postMessage('update-badge');
      navigator.serviceWorker.ready.then((r) => {
        r.active?.postMessage('update-badge');
      });
    });

    // Update badge on visibility change (when user returns to app)
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker.ready.then((r) => {
          r.active?.postMessage('update-badge');
        });
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  return null;
}
