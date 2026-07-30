'use client';

import Link from 'next/link';
import FoodBackground from '@/components/FoodBackground';
import TrialWidget from '@/components/TrialWidget';

// Destination directe pour les pubs : uniquement le widget d'essai, sans le
// reste de la landing. Le même widget est aussi utilisé en héros de "/".
export default function EssaiPage() {
  return (
    <div style={{ minHeight: '100vh', padding: '32px 16px 64px', position: 'relative' }}>
      <FoodBackground />
      <div style={{ maxWidth: 640, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <TrialWidget />
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 24 }}>
          Déjà un compte ? <Link href="/login" style={{ color: 'var(--brand, #2563EB)' }}>Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
