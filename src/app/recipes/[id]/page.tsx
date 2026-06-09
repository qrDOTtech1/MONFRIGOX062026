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

function parseSteps(raw: string): string[] {
  if (!raw) return [];
  const text = raw.trim();
  let parts = text.split(/\r?\n|\\n/).map(s => s.trim()).filter(Boolean);
  if (parts.length > 1) return clean(parts);
  parts = text.split(/(?=(?:\d+[\.\)]\s)|(?:étape\s*\d+\s*[:.\-]?\s))/i).map(s => s.trim()).filter(Boolean);
  if (parts.length > 1) return clean(parts);
  parts = text.split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖÙ-Ý])/).map(s => s.trim()).filter(Boolean);
  return parts.length > 1 ? clean(parts) : [text];
}
function clean(steps: string[]): string[] {
  return steps.map(s => s.replace(/^\s*(?:étape\s*\d+\s*[:.\-]?\s*|\d+[\.\)]\s*|[-•*]\s*)/i, '').trim()).filter(Boolean);
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
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }} />
        </div>
      </AppShell>
    );
  }

  if (!recipe) {
    return (
      <AppShell>
        <p className="text-center py-20" style={{ color: 'var(--text-muted)' }}>Recette introuvable</p>
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
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm mb-4 transition-colors" style={{ color: 'var(--text-muted)' }}>
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      <div className="mb-5">
        <h1 className="text-xl font-semibold mb-1.5">{recipe.name}</h1>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{recipe.description}</p>

        <div className="flex flex-wrap gap-2 mb-4">
          <span className={diffColors[recipe.difficulty]}>{diffLabels[recipe.difficulty]}</span>
          <span className="badge" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}><Clock className="w-3 h-3 mr-1" />{recipe.prepTime} min</span>
          <span className="badge" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}><Users className="w-3 h-3 mr-1" />{recipe.servings} pers.</span>
          <span className="badge" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>{recipe.cuisine}</span>
        </div>

        <button
          onClick={() => router.push(`/recipes/${recipe.id}/cook`)}
          className="btn-primary w-full flex items-center justify-center gap-2 mb-3 !py-3 text-base"
        >
          <ChefHat className="w-5 h-5" /> Cuisiner cette recette
        </button>

        <div className="flex gap-2">
          <button onClick={toggleFav} className={`btn-secondary flex items-center gap-2 flex-1 justify-center ${recipe.isFavorite ? '!border-red-400' : ''}`}>
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

      <div className="card p-4 mb-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-sm">Ingrédients</h2>
          <span className={`text-sm font-semibold ${pct >= 80 ? 'text-emerald-600 dark:text-emerald-400' : pct >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-orange-600 dark:text-orange-400'}`}>
            {available}/{total}
          </span>
        </div>
        <div className="space-y-1">
          {recipe.ingredients.map((ing, i) => (
            <div key={i} className="flex items-center gap-2.5 py-1.5">
              {ing.inFridge ? (
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <X className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span className="text-sm">{ing.ingredient.emoji}</span>
              <span className={`text-sm flex-1 ${ing.inFridge ? '' : ''}`} style={{ color: ing.inFridge ? 'var(--text)' : 'var(--text-muted)' }}>
                {ing.ingredient.name}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{ing.quantity} {ing.unit}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <h2 className="font-medium text-sm mb-3">Préparation</h2>
        <div className="space-y-3">
          {parseSteps(recipe.instructions).map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-xs font-semibold" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>
                {i + 1}
              </div>
              <p className="text-sm leading-relaxed pt-0.5" style={{ color: 'var(--text-secondary)' }}>{step}</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
