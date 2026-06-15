'use client';

import Mascot, { MascotVariant } from '@/components/Mascot';

const MESSAGES = [
  'On prépare tout ça…',
  'Ton frigo se réveille…',
  'Chargement des recettes…',
  'On cherche les ingrédients…',
  'Presque prêt !',
];

interface Props {
  message?: string;
  variant?: MascotVariant;
  fullPage?: boolean;
}

export default function MascotLoader({ message, variant = 'thinking', fullPage = false }: Props) {
  const msg = message ?? MESSAGES[Math.floor(Date.now() / 1000) % MESSAGES.length];

  return (
    <div
      className="flex flex-col items-center justify-center gap-3"
      style={{ minHeight: fullPage ? '100dvh' : '55vh' }}
    >
      <Mascot variant={variant} size="lg" animate="float" />
      <p className="text-sm font-medium animate-pulse" style={{ color: 'var(--text-muted)' }}>
        {msg}
      </p>
    </div>
  );
}
