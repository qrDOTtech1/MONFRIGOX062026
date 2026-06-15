'use client';

import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import MascotLoader from '@/components/MascotLoader';
import Mascot from '@/components/Mascot';
import RecipeCard from '@/components/RecipeCard';
import { Heart } from 'lucide-react';
import { useT } from '@/lib/i18n';

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
  const { t } = useT();

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
        <MascotLoader />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex items-center gap-2.5 mb-6">
        <Heart className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        <h1 className="text-lg font-semibold">{t('favorites.title')}</h1>
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-10">
          <div className="flex justify-center mb-2">
            <Mascot variant="love" size="md" animate="pulse" message={t('favorites.empty')} />
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('favorites.empty')}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t('favorites.empty.sub')}</p>
        </div>
      ) : (
        <div className="space-y-2">
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
