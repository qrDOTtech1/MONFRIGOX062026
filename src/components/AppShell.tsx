'use client';

import BottomNav from './BottomNav';
import RecipeChat from './RecipeChat';
import { useEffect, useState } from 'react';

interface RecipeMini {
  id: string;
  name: string;
  difficulty: string;
  prepTime: number;
  cuisine: string;
  imageUrl: string;
  ingredients?: Array<{ ingredient: { emoji: string } }>;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [recipes, setRecipes] = useState<RecipeMini[]>([]);

  // Charge les recettes une fois pour le chatbot global
  useEffect(() => {
    fetch('/api/recipes')
      .then(r => r.ok ? r.json() : [])
      .then(setRecipes)
      .catch(() => {});
  }, []);

  return (
    <>
      <div className="page-container fade-in">{children}</div>
      <RecipeChat allRecipes={recipes} />
      <BottomNav />
    </>
  );
}
