'use client';

import BottomNav from './BottomNav';
import RecipeChat from './RecipeChat';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

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
      <div className="page-container fade-in">{children}</div>
      <RecipeChat allRecipes={recipes} />
      <BottomNav />
    </>
  );
}
