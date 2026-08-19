'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, UserPlus, LogIn } from 'lucide-react';
import { useGuest } from '@/lib/GuestContext';
import { trackEvent } from '@/lib/analytics';
import { guestFridgeCount } from '@/lib/guestFridge';

// Messages rotatifs pour éviter la fatigue du même texte
const MESSAGES = [
  'Crée ton compte pour sauvegarder tes scans !',
  'Connecte-toi pour retrouver ton frigo sur tous tes appareils.',
  'Enregistre tes recettes favorites en créant un compte gratuit.',
  'Ton planning repas t\'attend — inscris-toi, c\'est gratuit !',
];

export default function GuestBanner() {
  const { isGuest, loading } = useGuest();
  const [dismissed, setDismissed] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);
  const [inFridge, setInFridge] = useState(0);

  // Dès que l'invité a des aliments, le message générique laisse place à une
  // promesse concrète : c'est SON frigo qu'il risque de perdre.
  useEffect(() => {
    const sync = () => setInFridge(guestFridgeCount());
    sync();
    window.addEventListener('guest-fridge-change', sync);
    return () => window.removeEventListener('guest-fridge-change', sync);
  }, []);

  // Rotation toutes les 6 secondes
  useEffect(() => {
    if (!isGuest || dismissed) return;
    const t = setInterval(() => setMsgIdx(i => (i + 1) % MESSAGES.length), 6000);
    return () => clearInterval(t);
  }, [isGuest, dismissed]);

  // Track prompt shown
  useEffect(() => {
    if (isGuest && !loading && !dismissed) {
      trackEvent('auth_prompt_shown');
    }
  }, [isGuest, loading, dismissed]);

  if (loading || !isGuest || dismissed) return null;

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--accent) 12%, var(--bg))',
        borderBottom: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
        color: 'var(--text)',
        zIndex: 50,
        position: 'relative',
      }}
    >
      <span className="flex-1 text-[13px] leading-tight" style={{ color: 'var(--text-secondary)' }}>
        {inFridge > 0
          ? `Tu as ${inFridge} ingrédient${inFridge > 1 ? 's' : ''} dans ton frigo — crée ton compte pour les garder.`
          : MESSAGES[msgIdx]}
      </span>

      <Link
        href="/register"
        onClick={() => trackEvent('register_click', { source: 'guest_banner' })}
        className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all hover:scale-[1.03] active:scale-95"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
      >
        <UserPlus className="w-3 h-3" />
        Créer un compte
      </Link>

      <Link
        href="/login"
        onClick={() => trackEvent('login_click', { source: 'guest_banner' })}
        className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all hover:opacity-80"
        style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
      >
        <LogIn className="w-3 h-3" />
        Se connecter
      </Link>

      <button
        onClick={() => { setDismissed(true); trackEvent('guest_banner_dismiss'); }}
        className="p-1 rounded-full transition-opacity hover:opacity-60 shrink-0"
        style={{ color: 'var(--text-muted)' }}
        aria-label="Fermer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
