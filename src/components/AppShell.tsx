'use client';

import BottomNav from './BottomNav';
import RecipeChat from './RecipeChat';
import LogoAnim from './LogoAnim';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { trackPageVisit } from '@/lib/useRecentPages';

interface RecipeMini {
  id: string;
  name: string;
  difficulty: string;
  prepTime: number;
  cuisine: string;
  imageUrl: string;
  ingredients?: Array<{ ingredient: { emoji: string } }>;
}

// Pages qui ne déclenchent PAS la redirection onboarding
const ONBOARDING_SKIP = ['/onboarding', '/login', '/register', '/'];

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

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [recipes, setRecipes] = useState<RecipeMini[]>([]);

  // Charge les recettes une fois pour le chatbot global
  useEffect(() => {
    fetch('/api/recipes')
      .then(r => r.ok ? r.json() : [])
      .then(setRecipes)
      .catch(() => {});
  }, []);

  // Track page visit for dynamic shortcuts
  useEffect(() => { trackPageVisit(pathname); }, [pathname]);

  // Vérifie si l'onboarding a été fait
  useEffect(() => {
    if (ONBOARDING_SKIP.some(p => pathname.startsWith(p))) return;
    fetch('/api/profile')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.onboardingDone === false) {
          router.replace('/onboarding');
        }
      })
      .catch(() => {});
  }, [pathname, router]);

  return (
    <>
      {/* Halo émeraude ambiant en fond de toute l'app */}
      <div className="app-ambient" aria-hidden />
      {/* Feedback tactile global (ondulation au clic/tap) */}
      <AppRipple />

      {/* Top bar avec logo */}
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center px-4 h-12"
        style={{
          backgroundColor: 'var(--bg)',
          borderBottom: '1px solid var(--border-subtle)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}>
        <LogoAnim size={32} withName nameSize="text-sm" />
      </header>

      {/* Contenu décalé sous le top bar (au-dessus du halo, apparition douce) */}
      <div className="page-container fade-in app-enter relative z-[1]" style={{ paddingTop: '3rem' }}>{children}</div>
      {pathname !== '/home' && <RecipeChat allRecipes={recipes} />}
      <BottomNav />
    </>
  );
}
