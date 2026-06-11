'use client';

import AppShell from '@/components/AppShell';
import CommunityFeed from '@/components/CommunityFeed';
import InfoBubble from '@/components/InfoBubble';
import { MessageSquare } from 'lucide-react';

export default function CommunityPage() {
  return (
    <AppShell>
      <div className="flex items-center gap-2.5 mb-5">
        <MessageSquare className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        <h1 className="text-lg font-semibold">Communauté</h1>
        <InfoBubble
          label="La Communauté"
          text="Retrouve les photos et astuces partagées par les autres membres. Tu peux aussi y accéder depuis l'onglet « Communauté » dans Explorer."
        />
      </div>
      <CommunityFeed />
    </AppShell>
  );
}
