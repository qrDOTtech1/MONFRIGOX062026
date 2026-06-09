'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { ArrowLeft, Clock, Users, Heart, ShoppingCart, Check, X, ChefHat, Minus, Plus, Flame, Wheat, Droplets, Beef } from 'lucide-react';

interface Recipe {
  id: string;
  name: string;
  description: string;
  instructions: string;
  difficulty: string;
  prepTime: number;
  cuisine: string;
  servings: number;
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  fiber: number | null;
  salt: number | null;
  nutriScore: string;
  kidFriendly: boolean;
  babyFriendly: boolean;
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

const NUTRISCORE_COLORS: Record<string, string> = {
  A: 'bg-emerald-600', B: 'bg-lime-500', C: 'bg-yellow-500', D: 'bg-orange-500', E: 'bg-red-600',
};

export default function RecipeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [servings, setServings] = useState<number>(4);

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setRecipe(data);
        if (data) setServings(data.servings);
        setLoading(false);
      });
  }, [id]);

  const ratio = recipe ? servings / recipe.servings : 1;

  function adjustQuantity(qty: number): string {
    const adjusted = qty * ratio;
    if (adjusted === Math.round(adjusted)) return String(adjusted);
    return adjusted.toFixed(1).replace(/\.0$/, '');
  }

  async function toggleFav() {
    if (!recipe) return;
    await fetch(`/api/recipes/${id}/favorite`, { method: 'POST' });
    setRecipe({ ...recipe, isFavorite: !recipe.isFavorite });
  }

  async function generateList() {
    if (!recipe) return;
    const missing = recipe.ingredients.filter(i => !i.inFridge).map(i => ({
      ingredientId: i.ingredient.id,
      quantity: parseFloat(adjustQuantity(i.quantity)),
      unit: i.unit,
    }));
    await fetch('/api/shopping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Pour: ${recipe.name} (${servings} pers.)`, items: missing }),
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

  const hasNutrition = recipe.calories !== null;

  return (
    <AppShell>
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm mb-4 transition-colors" style={{ color: 'var(--text-muted)' }}>
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      <div className="mb-5">
        <h1 className="text-xl font-semibold mb-1.5">{recipe.name}</h1>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{recipe.description}</p>

        <div className="flex flex-wrap gap-2 mb-4">
          <span className={diffColors[recipe.difficulty]}>{diffLabels[recipe.difficulty]}</span>
          <span className="badge" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}><Clock className="w-3 h-3 mr-1" />{recipe.prepTime} min</span>
          <span className="badge" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>{recipe.cuisine}</span>
          {recipe.kidFriendly && <span className="badge" style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: 'rgb(59,130,246)' }}>👶 Enfants</span>}
          {recipe.babyFriendly && <span className="badge" style={{ backgroundColor: 'rgba(168,85,247,0.1)', color: 'rgb(168,85,247)' }}>🍼 Bébés</span>}
          {recipe.nutriScore && (
            <span className={`badge text-white font-bold ${NUTRISCORE_COLORS[recipe.nutriScore] || ''}`}>
              Nutri-Score {recipe.nutriScore}
            </span>
          )}
        </div>

        {/* Sélecteur de portions */}
        <div className="card p-3.5 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <span className="text-sm font-medium">Portions</span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setServings(Math.max(1, servings - 1))}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-lg font-semibold w-8 text-center">{servings}</span>
              <button
                onClick={() => setServings(Math.min(20, servings + 1))}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>pers.</span>
            </div>
          </div>
          {servings !== recipe.servings && (
            <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
              Quantités ajustées (base {recipe.servings} pers.)
            </p>
          )}
        </div>

        <button
          onClick={() => router.push(`/recipes/${recipe.id}/cook`)}
          className="btn-primary w-full flex items-center justify-center gap-2 mb-3 !py-3 text-base"
        >
          <ChefHat className="w-5 h-5" /> Cuisiner ({servings} pers.)
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

      {/* Nutrition / Macros */}
      <div className="card p-4 mb-3">
        <h2 className="font-medium text-sm mb-3">Valeurs nutritionnelles <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>(par portion)</span></h2>
        {hasNutrition ? (
          <>
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-inset)' }}>
                <Flame className="w-4 h-4 mx-auto mb-1 text-orange-500" />
                <p className="text-sm font-semibold">{recipe.calories ? Math.round(recipe.calories) : '-'}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>kcal</p>
              </div>
              <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-inset)' }}>
                <Beef className="w-4 h-4 mx-auto mb-1 text-red-500" />
                <p className="text-sm font-semibold">{recipe.protein ? recipe.protein.toFixed(1) : '-'}g</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Protéines</p>
              </div>
              <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-inset)' }}>
                <Wheat className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                <p className="text-sm font-semibold">{recipe.carbs ? recipe.carbs.toFixed(1) : '-'}g</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Glucides</p>
              </div>
              <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-inset)' }}>
                <Droplets className="w-4 h-4 mx-auto mb-1 text-yellow-500" />
                <p className="text-sm font-semibold">{recipe.fat ? recipe.fat.toFixed(1) : '-'}g</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Lipides</p>
              </div>
            </div>
            {(recipe.fiber !== null || recipe.salt !== null) && (
              <div className="flex gap-4 text-xs justify-center" style={{ color: 'var(--text-muted)' }}>
                {recipe.fiber !== null && <span>Fibres: {recipe.fiber.toFixed(1)}g</span>}
                {recipe.salt !== null && <span>Sel: {recipe.salt.toFixed(1)}g</span>}
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-center py-3" style={{ color: 'var(--text-muted)' }}>
            Données nutritionnelles non disponibles. L&apos;admin peut les calculer via Admin &rarr; DB &amp; Import.
          </p>
        )}
      </div>

      {/* Ingrédients avec grammages ajustés */}
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
              <span className="text-sm flex-1" style={{ color: ing.inFridge ? 'var(--text)' : 'var(--text-muted)' }}>
                {ing.ingredient.name}
              </span>
              <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {adjustQuantity(ing.quantity)} {ing.unit}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Préparation */}
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
