'use client';

import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import RecipeCard from '@/components/RecipeCard';
import { Refrigerator, Plus, X, AlertTriangle, ChefHat, Wand2, Loader2 } from 'lucide-react';

interface FridgeItem {
  id: string;
  quantity: number;
  unit: string;
  expiresAt: string | null;
  ingredient: { id: string; name: string; emoji: string; category: string };
}

interface Recipe {
  id: string;
  name: string;
  difficulty: string;
  prepTime: number;
  cuisine: string;
  matchPercent: number;
  matchCount: string;
  ingredients: Array<{ ingredient: { emoji: string } }>;
}

export default function DashboardPage() {
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [searchIngredient, setSearchIngredient] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; emoji: string }>>([]);
  const [filter, setFilter] = useState('Tous');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const filters = ['Tous', 'Facile', 'Street Food', '< 20 min'];

  const loadData = useCallback(async () => {
    try {
      const [fridgeRes, recipesRes] = await Promise.all([
        fetch('/api/fridge'),
        fetch('/api/recipes'),
      ]);
      if (fridgeRes.ok) setFridgeItems(await fridgeRes.json());
      if (recipesRes.ok) setRecipes(await recipesRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (searchIngredient.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/ingredients/search?q=${encodeURIComponent(searchIngredient)}`);
      if (res.ok) setSuggestions(await res.json());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchIngredient]);

  async function addToFridge(ingredientId: string) {
    await fetch('/api/fridge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredientId }),
    });
    setSearchIngredient('');
    setSuggestions([]);
    setShowAdd(false);
    loadData();
  }

  async function removeFromFridge(id: string) {
    await fetch(`/api/fridge/${id}`, { method: 'DELETE' });
    loadData();
  }

  const expiringSoon = fridgeItems.filter(item => {
    if (!item.expiresAt) return false;
    const days = (new Date(item.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days <= 3 && days > 0;
  });

  const filteredRecipes = recipes.filter(r => {
    if (filter === 'Facile') return r.difficulty === 'FACILE';
    if (filter === '< 20 min') return r.prepTime <= 20;
    if (filter === 'Street Food') return r.cuisine === 'Street Food' || r.prepTime <= 15;
    return true;
  });

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Refrigerator className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          <div>
            <h2 className="font-semibold text-base">Mon Frigo</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{fridgeItems.length} ingrédient{fridgeItems.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {showAdd && (
        <div className="card p-3.5 mb-4 fade-in">
          <input
            type="text"
            placeholder="Chercher un ingrédient..."
            value={searchIngredient}
            onChange={e => setSearchIngredient(e.target.value)}
            className="input-field mb-2"
            autoFocus
          />
          {suggestions.length > 0 && (
            <div className="space-y-0.5 max-h-40 overflow-y-auto">
              {suggestions.map(s => (
                <button
                  key={s.id}
                  onClick={() => addToFridge(s.id)}
                  className="w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors hover:bg-[var(--bg-inset)]"
                >
                  <span>{s.emoji}</span> {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {fridgeItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {fridgeItems.map(item => (
            <div key={item.id} className="flex items-center gap-1.5 rounded-md pl-2.5 pr-1 py-1 text-sm group" style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
              <span className="text-xs">{item.ingredient.emoji}</span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.ingredient.name}</span>
              <button onClick={() => removeFromFridge(item.id)} className="w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {expiringSoon.length > 0 && (
        <div className="rounded-lg p-3 mb-5 flex items-start gap-2.5 fade-in" style={{ backgroundColor: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.15)' }}>
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Expire bientôt</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {expiringSoon.map(i => i.ingredient.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      {fridgeItems.length > 0 && (
        <button
          onClick={async () => {
            setAiLoading(true);
            setAiError('');
            try {
              const res = await fetch('/api/ai/suggest', { method: 'POST' });
              const data = await res.json();
              if (!res.ok) setAiError(data.error);
              else loadData();
            } catch { setAiError('Erreur réseau'); }
            finally { setAiLoading(false); }
          }}
          disabled={aiLoading}
          className="w-full card p-3.5 mb-5 flex items-center gap-3 hover:shadow-sm transition-all disabled:opacity-50 text-left"
        >
          {aiLoading ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} /> : <Wand2 className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />}
          <div>
            <p className="font-medium text-sm">{aiLoading ? 'Génération en cours...' : 'Suggérer des recettes'}</p>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>L&apos;IA crée de nouvelles recettes avec tes ingrédients</p>
          </div>
        </button>
      )}
      {aiError && (
        <div className="rounded-lg px-3.5 py-2.5 text-sm mb-4 text-red-600 dark:text-red-400" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {aiError}
        </div>
      )}

      <div className="flex items-center gap-2 mb-2">
        <ChefHat className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
        <h2 className="font-semibold text-sm">
          {recipes.length} recette{recipes.length !== 1 ? 's' : ''} disponibles
        </h2>
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        {filteredRecipes.length === recipes.length
          ? 'Triées par compatibilité avec tes ingrédients'
          : `${filteredRecipes.length} après filtrage`}
      </p>

      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-none">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              filter === f ? 'text-[var(--accent-text)]' : ''
            }`}
            style={filter === f
              ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
              : { backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filteredRecipes.length === 0 ? (
          <div className="text-center py-12">
            <ChefHat className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Ajoute des ingrédients pour voir les recettes</p>
          </div>
        ) : (
          filteredRecipes.map(r => (
            <RecipeCard
              key={r.id}
              id={r.id}
              name={r.name}
              difficulty={r.difficulty}
              prepTime={r.prepTime}
              cuisine={r.cuisine}
              matchPercent={r.matchPercent}
              matchCount={r.matchCount}
              emoji={r.ingredients?.[0]?.ingredient?.emoji}
            />
          ))
        )}
      </div>
    </AppShell>
  );
}
