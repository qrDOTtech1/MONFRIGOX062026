'use client';

import BottomNav from './BottomNav';
import RecipeChat from './RecipeChat';
import LogoAnim from './LogoAnim';
import GuestBanner from './GuestBanner';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageVisit } from '@/lib/useRecentPages';
import { cachedFetch, peekCache } from '@/lib/dataCache';
import { GuestProvider, useGuest } from '@/lib/GuestContext';
import { trackEvent } from '@/lib/analytics';

interface RecipeMini {
  id: string;
  name: string;
  difficulty: string;
  prepTime: number;
  cuisine: string;
  imageUrl: string;
  ingredients?: Array<{ ingredient: { emoji: string } }>;
}

// Feedback tactile : une ondulation émeraude à chaque clic/tap dans l'app
function AppRipple() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const onPointer = (e: PointerEvent) => {
      const r = document.createElement('span');
      r.className = 'app-ripple';
      r.style.left = `${e.clientX}px`;
      r.style.top = `${e.clientY}px`;
      document.body.appendChild(r);
      setTimeout(() => r.remove(), 640);
    };
    window.addEventListener('pointerdown', onPointer, { passive: true });
    return () => window.removeEventListener('pointerdown', onPointer);
  }, []);
  return null;
}

// Inner shell (inside GuestProvider)
function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isGuest } = useGuest();
  const [recipes, setRecipes] = useState<RecipeMini[]>([]);

  // Charge les recettes pour le chatbot global — via cache partagé
  useEffect(() => {
    const cached = peekCache<RecipeMini[]>('/api/recipes?limit=300');
    if (cached) setRecipes(cached);
    cachedFetch<RecipeMini[]>('/api/recipes?limit=300').then(setRecipes).catch(() => {});
  }, []);

  // Track page visit for dynamic shortcuts (only logged users)
  useEffect(() => {
    if (!isGuest) trackPageVisit(pathname);
  }, [pathname, isGuest]);

  // Track page_view pour analytics
  useEffect(() => {
    trackEvent('page_view', { path: pathname, guest: isGuest });
  }, [pathname, isGuest]);

  // Onboarding check (uniquement pour les utilisateurs connectés)
  useEffect(() => {
    if (isGuest) return;
    const skip = ['/onboarding', '/login', '/register', '/'];
    if (skip.some(p => pathname.startsWith(p))) return;
    fetch('/api/profile')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.onboardingDone === false) {
          window.location.href = '/onboarding';
        }
      })
      .catch(() => {});
  }, [pathname, isGuest]);

  return (
    <>
      {/* Halo émeraude ambiant en fond de toute l'app */}
      <div className="app-ambient" aria-hidden />
      <AppRipple />

      {/* Top bar avec logo */}
      <header className="fixed top-0 left-0 right-0 z-40"
        style={{
          backgroundColor: 'var(--bg)',
          borderBottom: '1px solid var(--border-subtle)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}>
        <div className="flex items-center px-4"
          style={{
            height: 'calc(3rem + env(safe-area-inset-top))',
            paddingTop: 'env(safe-area-inset-top)',
          }}>
          <LogoAnim size={32} withName nameSize="text-sm" />
        </div>
      </header>

      {/* Contenu décalé sous le top bar + bannière éventuelle */}
      <div
        className="page-container fade-in app-enter relative z-[1]"
        style={{ paddingTop: 'calc(3rem + env(safe-area-inset-top))' }}
      >
        {/* Dans le flux, pas dans l'en-tête fixe : sinon elle recouvre le haut
            du contenu (bulle de la mascotte, titres de section). */}
        <GuestBanner />
        {children}
      </div>
      {pathname !== '/home' && <RecipeChat allRecipes={recipes} />}
      <BottomNav />
    </>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <GuestProvider>
      <AppShellInner>{children}</AppShellInner>
    </GuestProvider>
  );
}
