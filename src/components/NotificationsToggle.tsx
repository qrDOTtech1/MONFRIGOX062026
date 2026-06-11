'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2, Check, Send } from 'lucide-react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function NotificationsToggle() {
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [prefExpiry, setPrefExpiry] = useState(true);
  const [prefMeals, setPrefMeals] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSupported(false);
      return;
    }
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => setSubscribed(!!sub))
      .catch(() => {});
    fetch('/api/profile').then(r => r.ok ? r.json() : null).then(d => {
      if (d) { setPrefExpiry(d.notifyExpiry !== false); setPrefMeals(d.notifyMeals !== false); }
    });
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setBusy(false); return; }
      const reg = await navigator.serviceWorker.ready;
      const keyRes = await fetch('/api/push/key');
      const { publicKey } = await keyRes.json();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      });
      await fetch('/api/push/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub }),
      });
      setSubscribed(true);
    } catch (e) {
      console.error(e);
      alert("Impossible d'activer les notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setTestSent(false);
    await fetch('/api/push/test', { method: 'POST' });
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  }

  async function savePref(next: { expiry?: boolean; meals?: boolean }) {
    const expiry = next.expiry ?? prefExpiry;
    const meals = next.meals ?? prefMeals;
    setPrefExpiry(expiry); setPrefMeals(meals);
    await fetch('/api/profile', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifyExpiry: expiry, notifyMeals: meals }),
    });
  }

  if (!supported) {
    return (
      <div className="card p-4 mb-5">
        <h2 className="font-semibold text-sm mb-1 flex items-center gap-2"><Bell className="w-4 h-4 text-amber-500" /> Notifications</h2>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Non disponibles sur cet appareil. Sur iPhone, ajoute d&apos;abord l&apos;app à l&apos;écran d&apos;accueil.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-4 mb-5">
      <h2 className="font-semibold text-sm mb-1 flex items-center gap-2">
        <Bell className="w-4 h-4 text-amber-500" /> Notifications
      </h2>
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        Sois prévenu pour le gaspillage et tes repas — même app fermée.
      </p>

      {subscribed ? (
        <div className="space-y-2.5">
          {/* Préférences */}
          <label className="flex items-center justify-between text-sm">
            <span>🥕 Aliments qui périment</span>
            <input type="checkbox" checked={prefExpiry} onChange={e => savePref({ expiry: e.target.checked })} className="w-4 h-4 accent-[var(--accent)]" />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span>🍽️ Rappel repas du jour</span>
            <input type="checkbox" checked={prefMeals} onChange={e => savePref({ meals: e.target.checked })} className="w-4 h-4 accent-[var(--accent)]" />
          </label>
          <div className="flex gap-2 pt-1">
            <button onClick={sendTest} className="btn-secondary flex-1 flex items-center justify-center gap-1.5 text-sm !py-2">
              {testSent ? <><Check className="w-4 h-4 text-emerald-500" /> Envoyé</> : <><Send className="w-4 h-4" /> Tester</>}
            </button>
            <button onClick={disable} disabled={busy} className="btn-secondary flex-1 flex items-center justify-center gap-1.5 text-sm !py-2 disabled:opacity-40">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellOff className="w-4 h-4" />} Désactiver
            </button>
          </div>
        </div>
      ) : (
        <button onClick={enable} disabled={busy} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />} Activer les notifications
        </button>
      )}
    </div>
  );
}
