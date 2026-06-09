'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { ArrowLeft, Clock, Users, Heart, ShoppingCart, Check, X, ChefHat } from 'lucide-react';

interface Recipe {
  id: string;
  name: string;
  description: string;
  instructions: string;
  difficulty: string;
  prepTime: number;
  cuisine: string;
  servings: number;
  ingredients: Array<{
    quantity: number;
    unit: string;
    ingredient: { id: string; name: string; emoji: string };
    inFridge: boolean;
  }>;
  isFavorite: boolean;
}

export default function RecipeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setRecipe(data); setLoading(false); });
  }, [id]);

  async function toggleFav() {
    if (!recipe) return;
    await fetch(`/api/recipes/${id}/favorite`, { method: 'POST' });
    setRecipe({ ...recipe, isFavorite: !recipe.isFavorite });
  }

  async function generateList() {
    if (!recipe) return;
    const missing = recipe.ingredients.filter(i => !i.inFridge).map(i => ({
      ingredientId: i.ingredient.id,
      quantity: i.quantity,
      unit: i.unit,
    }));
    await fetch('/api/shopping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Pour: ${recipe.name}`, items: missing }),
    });
    router.push('/shopping');
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

  if (!recipe) {
    return (
      <AppShell>
        <p className="text-center text-gray-500 py-20">Recette introuvable</p>
      </AppShell>
    );
  }

  const available = recipe.ingredients.filter(i => i.inFridge).length;
  const total = recipe.ingredients.length;
  const pct = total > 0 ? Math.round((available / total) * 100) : 0;

  const diffColors: Record<string, string> = { FACILE: 'badge-easy', MOYEN: 'badge-medium', DIFFICILE: 'badge-hard' };
  const diffLabels: Record<string, string> = { FACILE: 'Facile', MOYEN: 'Moyen', DIFFICILE: 'Difficile' };

  return (
    <AppShell>
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-cream mb-4 transition-colors">
        <ArrowLeft className="w-5 h-5" /> Retour
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{recipe.name}</h1>
        <p className="text-gray-400 text-sm mb-4">{recipe.description}</p>

        <div className="flex flex-wrap gap-3 mb-4">
          <span className={diffColors[recipe.difficulty]}>{diffLabels[recipe.difficulty]}</span>
          <span className="badge bg-dark-600 text-gray-300"><Clock className="w-3 h-3 mr-1" />{recipe.prepTime} min</span>
          <span className="badge bg-dark-600 text-gray-300"><Users className="w-3 h-3 mr-1" />{recipe.servings} pers.</span>
          <span className="badge bg-dark-600 text-gray-300">{recipe.cuisine}</span>
        </div>

        <button
          onClick={() => router.push(`/recipes/${recipe.id}/cook`)}
          className="btn-primary w-full flex items-center justify-center gap-2 mb-3 !py-4 text-lg"
        >
          <ChefHat className="w-5 h-5" /> Cuisiner cette recette
        </button>

        <div className="flex gap-3">
          <button onClick={toggleFav} className={`btn-secondary flex items-center gap-2 flex-1 justify-center ${recipe.isFavorite ? '!border-red-500/50' : ''}`}>
            <Heart className={`w-4 h-4 ${recipe.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
            {recipe.isFavorite ? 'Favori' : 'Ajouter'}
          </button>
          {pct < 100 && (
            <button onClick={generateList} className="btn-primary flex items-center gap-2 flex-1 justify-center">
              <ShoppingCart className="w-4 h-4" /> Liste de courses
            </button>
          )}
        </div>
      </div>

      {/* Ingredients */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Ingrédients</h2>
          <span className={`text-sm font-bold ${pct >= 80 ? 'text-fresh-400' : pct >= 50 ? 'text-yellow-400' : 'text-orange-400'}`}>
            {available}/{total} disponibles
          </span>
        </div>
        <div className="space-y-2">
          {recipe.ingredients.map((ing, i) => (
            <div key={i} className="flex items-center gap-3 py-1">
              {ing.inFridge ? (
                <Check className="w-4 h-4 text-fresh-500 shrink-0" />
              ) : (
                <X className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span className="text-sm">{ing.ingredient.emoji}</span>
              <span className={`text-sm flex-1 ${ing.inFridge ? 'text-cream' : 'text-gray-500'}`}>
                {ing.ingredient.name}
              </span>
              <span className="text-xs text-gray-500">{ing.quantity} {ing.unit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="glass-card p-4">
        <h2 className="font-semibold mb-3">Préparation</h2>
        <div className="space-y-4">
          {recipe.instructions.split('\n').filter(Boolean).map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-7 h-7 bg-fresh-500/20 rounded-lg flex items-center justify-center shrink-0 text-fresh-400 text-xs font-bold">
                {i + 1}
              </div>
              <p className="text-sm text-gray-300 leading-relaxed pt-1">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
