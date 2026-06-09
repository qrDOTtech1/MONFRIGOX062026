'use client';

import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import RecipeCard from '@/components/RecipeCard';
import { Refrigerator, Plus, X, AlertTriangle, ChefHat, Sparkles, Wand2, Loader2 } from 'lucide-react';

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
          <div className="w-10 h-10 border-2 border-fresh-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Fridge Summary */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Refrigerator className="w-6 h-6 text-fresh-500" />
          <div>
            <h2 className="font-bold text-lg">Mon Frigo</h2>
            <p className="text-gray-500 text-xs">{fridgeItems.length} ingrédient{fridgeItems.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="w-10 h-10 bg-fresh-500 rounded-xl flex items-center justify-center text-dark-900 active:scale-90 transition-transform">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Add ingredient */}
      {showAdd && (
        <div className="glass-card p-4 mb-4 fade-in">
          <input
            type="text"
            placeholder="Chercher un ingrédient..."
            value={searchIngredient}
            onChange={e => setSearchIngredient(e.target.value)}
            className="input-field mb-2"
            autoFocus
          />
          {suggestions.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {suggestions.map(s => (
                <button
                  key={s.id}
                  onClick={() => addToFridge(s.id)}
                  className="w-full text-left px-3 py-2 hover:bg-dark-600 rounded-lg text-sm flex items-center gap-2 transition-colors"
                >
                  <span>{s.emoji}</span> {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fridge Items */}
      {fridgeItems.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {fridgeItems.map(item => (
            <div key={item.id} className="flex items-center gap-1 bg-dark-700 rounded-full pl-3 pr-1 py-1 text-sm group">
              <span>{item.ingredient.emoji}</span>
              <span className="text-cream/80">{item.ingredient.name}</span>
              <button onClick={() => removeFromFridge(item.id)} className="w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-3 h-3 text-gray-500 hover:text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Expiring Soon Alert */}
      {expiringSoon.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-6 flex items-start gap-3 fade-in">
          <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-400">Expire bientôt!</p>
            <p className="text-xs text-gray-400">
              {expiringSoon.map(i => i.ingredient.name).join(', ')} — utilise-les vite!
            </p>
          </div>
        </div>
      )}

      {/* AI Suggest */}
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
          className="w-full glass-card p-4 mb-6 flex items-center gap-3 hover:border-fresh-500/30 transition-all disabled:opacity-50"
        >
          {aiLoading ? <Loader2 className="w-6 h-6 text-fresh-500 animate-spin" /> : <Wand2 className="w-6 h-6 text-fresh-500" />}
          <div className="text-left">
            <p className="font-semibold text-sm">{aiLoading ? 'L\'IA cherche des recettes...' : 'Invente-moi des recettes!'}</p>
            <p className="text-[10px] text-gray-500">L&apos;IA génère de nouvelles recettes avec tes ingrédients</p>
          </div>
          <Sparkles className="w-4 h-4 text-fresh-400 ml-auto" />
        </button>
      )}
      {aiError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mb-4">
          {aiError}
        </div>
      )}

      {/* Recipes */}
      <div className="flex items-center gap-2 mb-3">
        <ChefHat className="w-5 h-5 text-fresh-500" />
        <h2 className="font-bold">
          {filteredRecipes.length} recette{filteredRecipes.length !== 1 ? 's' : ''} trouvée{filteredRecipes.length !== 1 ? 's' : ''}
        </h2>
        <Sparkles className="w-4 h-4 text-fresh-400" />
      </div>
      <p className="text-gray-500 text-xs mb-4">Avec tes ingrédients disponibles</p>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-none">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm transition-all ${
              filter === f ? 'bg-fresh-500 text-dark-900 font-semibold' : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Recipe List */}
      <div className="space-y-3">
        {filteredRecipes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Ajoute des ingrédients pour voir les recettes!</p>
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
