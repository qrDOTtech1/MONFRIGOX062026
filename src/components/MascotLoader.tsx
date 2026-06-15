'use client';

import Mascot, { MascotVariant } from '@/components/Mascot';
import { useT } from '@/lib/i18n';

interface Props {
  message?: string;
  variant?: MascotVariant;
  fullPage?: boolean;
}

export default function MascotLoader({ message, variant = 'thinking', fullPage = false }: Props) {
  const { t } = useT();

  const MESSAGES = [
    t('loading.preparing'),
    t('loading.waking'),
    t('loading.recipes'),
    t('loading.ingredients'),
    t('loading.almost'),
  ];

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
