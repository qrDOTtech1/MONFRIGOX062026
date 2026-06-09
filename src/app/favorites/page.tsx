'use client';

import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import RecipeCard from '@/components/RecipeCard';
import { Heart } from 'lucide-react';

interface FavRecipe {
  id: string;
  name: string;
  difficulty: string;
  prepTime: number;
  cuisine: string;
  ingredients: Array<{ ingredient: { emoji: string } }>;
}

export default function FavoritesPage() {
  const [recipes, setRecipes] = useState<FavRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch('/api/recipes?favorites=true');
    if (res.ok) setRecipes(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function unfav(id: string) {
    await fetch(`/api/recipes/${id}/favorite`, { method: 'POST' });
    load();
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-10 h-10 border-2 border-fresh-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-6">
        <Heart className="w-6 h-6 text-fresh-500" />
        <h1 className="text-xl font-bold">Mes favoris</h1>
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <p className="text-gray-500">Aucun favori pour l&apos;instant</p>
          <p className="text-gray-600 text-xs mt-1">Ajoute des recettes en favoris!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recipes.map(r => (
            <RecipeCard
              key={r.id}
              id={r.id}
              name={r.name}
              difficulty={r.difficulty}
              prepTime={r.prepTime}
              cuisine={r.cuisine}
              emoji={r.ingredients?.[0]?.ingredient?.emoji}
              isFavorite
              onToggleFavorite={() => unfav(r.id)}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
