'use client';

import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import RecipeCard from '@/components/RecipeCard';
import {
  Refrigerator, Plus, X, AlertTriangle, ChefHat,
  Wand2, Loader2, Minus, SlidersHorizontal, Calendar, Check,
} from 'lucide-react';

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
  imageUrl: string;
  matchPercent: number;
  matchCount: string;
  ingredients: Array<{ ingredient: { emoji: string } }>;
  isFavorite: boolean;
}

function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function expiryLabel(date: string | null) {
  if (!date) return null;
  const days = daysUntil(date);
  if (days < 0) return { text: 'Expiré', color: 'text-red-500' };
  if (days === 0) return { text: "Auj.", color: 'text-red-500' };
  if (days === 1) return { text: 'Demain', color: 'text-amber-500' };
  if (days <= 3) return { text: `J-${days}`, color: 'text-amber-500' };
  return { text: `J-${days}`, color: 'text-emerald-600 dark:text-emerald-400' };
}

export default function FridgePage() {
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [searchIngredient, setSearchIngredient] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; emoji: string }>>([]);
  const [count, setCount] = useState(5);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Péremption : id de l'item en cours d'édition
  const [editExpiryId, setEditExpiryId] = useState<string | null>(null);
  const [editExpiryValue, setEditExpiryValue] = useState('');
  const [savingExpiry, setSavingExpiry] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [fridgeRes, recipesRes] = await Promise.all([
        fetch('/api/fridge'),
        fetch('/api/recipes'),
      ]);
      if (fridgeRes.ok) setFridgeItems(await fridgeRes.json());
      if (recipesRes.ok) setAllRecipes(await recipesRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (searchIngredient.length < 2) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/ingredients/search?q=${encodeURIComponent(searchIngredient)}`);
      if (res.ok) setSuggestions(await res.json());
    }, 300);
    return () => clearTimeout(t);
  }, [searchIngredient]);

  async function addToFridge(ingredientId: string) {
    await fetch('/api/fridge', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredientId }),
    });
    setSearchIngredient(''); setSuggestions([]); setShowAdd(false);
    loadData();
  }

  async function removeFromFridge(id: string) {
    await fetch(`/api/fridge/${id}`, { method: 'DELETE' });
    loadData();
  }

  async function saveExpiry(id: string) {
    setSavingExpiry(true);
    await fetch(`/api/fridge/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresAt: editExpiryValue || null }),
    });
    setSavingExpiry(false);
    setEditExpiryId(null);
    loadData();
  }

  function openExpiryEdit(item: FridgeItem) {
    setEditExpiryId(item.id);
    // Pré-remplir avec la date existante au format YYYY-MM-DD
    setEditExpiryValue(item.expiresAt ? item.expiresAt.split('T')[0] : '');
  }

  const expiringSoon = fridgeItems.filter(item => {
    if (!item.expiresAt) return false;
    return daysUntil(item.expiresAt) <= 3;
  });

  const suggestedRecipes = allRecipes.filter(r => r.matchPercent > 0).slice(0, count);

  // Date min = aujourd'hui
  const today = new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }} />
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
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {fridgeItems.length} ingrédient{fridgeItems.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {showAdd && (
        <div className="card p-3.5 mb-4 fade-in">
          <input type="text" placeholder="Chercher un ingrédient…" value={searchIngredient}
            onChange={e => setSearchIngredient(e.target.value)} className="input-field mb-2" autoFocus />
          {suggestions.length > 0 && (
            <div className="space-y-0.5 max-h-40 overflow-y-auto">
              {suggestions.map(s => (
                <button key={s.id} onClick={() => addToFridge(s.id)}
                  className="w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors hover:bg-[var(--bg-inset)]">
                  <span>{s.emoji}</span> {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chips ingrédients */}
      {fridgeItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {fridgeItems.map(item => {
            const expiry = expiryLabel(item.expiresAt);
            const isEditing = editExpiryId === item.id;

            return (
              <div key={item.id}>
                {isEditing ? (
                  /* Mini formulaire date de péremption */
                  <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 fade-in"
                    style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                    <span className="text-xs">{item.ingredient.emoji}</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {item.ingredient.name}
                    </span>
                    <input
                      type="date"
                      min={today}
                      value={editExpiryValue}
                      onChange={e => setEditExpiryValue(e.target.value)}
                      className="text-xs rounded px-1.5 py-0.5 ml-1"
                      style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
                      autoFocus
                    />
                    <button onClick={() => saveExpiry(item.id)} disabled={savingExpiry}
                      className="w-6 h-6 flex items-center justify-center rounded text-emerald-500 transition-colors hover:bg-emerald-500/10">
                      {savingExpiry ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => setEditExpiryId(null)}
                      className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-[var(--bg-inset)]">
                      <X className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 rounded-md pl-2.5 pr-1 py-1 group"
                    style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
                    <span className="text-xs">{item.ingredient.emoji}</span>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.ingredient.name}</span>

                    {/* Badge péremption */}
                    {expiry && (
                      <span className={`text-[9px] font-semibold ${expiry.color}`}>{expiry.text}</span>
                    )}

                    {/* Bouton calendrier (visible au hover) */}
                    <button
                      onClick={() => openExpiryEdit(item)}
                      title="Définir date de péremption"
                      className="w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Calendar className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                    </button>

                    <button onClick={() => removeFromFridge(item.id)}
                      className="w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {expiringSoon.length > 0 && (
        <div className="rounded-lg p-3 mb-4 flex items-start gap-2.5 fade-in"
          style={{ backgroundColor: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.15)' }}>
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Expire bientôt</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {expiringSoon.map(i => i.ingredient.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      {fridgeItems.length === 0 ? (
        <div className="text-center py-16">
          <Refrigerator className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
          <p className="text-sm font-medium mb-1">Frigo vide</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Ajoute des ingrédients pour voir les recettes adaptées</p>
        </div>
      ) : (
        <>
          <div className="card p-4 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <SlidersHorizontal className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <span className="text-sm font-medium">Combien de suggestions ?</span>
            </div>
            <div className="flex items-center justify-center gap-4 mb-4">
              <button onClick={() => setCount(c => Math.max(3, c - 1))}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-3xl font-semibold w-12 text-center">{count}</span>
              <button onClick={() => setCount(c => Math.min(10, c + 1))}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-center gap-2 mb-4">
              {[3, 5, 7, 10].map(n => (
                <button key={n} onClick={() => setCount(n)}
                  className="px-3 py-1 rounded-md text-xs font-medium transition-all"
                  style={count === n
                    ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
                    : { backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                  {n}
                </button>
              ))}
            </div>
            <button
              onClick={async () => {
                setAiLoading(true); setAiError('');
                try {
                  const res = await fetch('/api/ai/suggest', { method: 'POST' });
                  const data = await res.json();
                  if (!res.ok) setAiError(data.error);
                  else loadData();
                } catch { setAiError('Erreur réseau'); }
                finally { setAiLoading(false); }
              }}
              disabled={aiLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              {aiLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Génération IA en cours…</>
                : <><Wand2 className="w-4 h-4" /> Générer de nouvelles recettes avec l&apos;IA</>}
            </button>
            {aiError && <p className="text-xs text-red-500 mt-2 text-center">{aiError}</p>}
          </div>

          <div className="flex items-center gap-2 mb-3">
            <ChefHat className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            <h2 className="font-semibold text-sm">
              {suggestedRecipes.length > 0
                ? `Top ${suggestedRecipes.length} recette${suggestedRecipes.length > 1 ? 's' : ''} avec ton frigo`
                : 'Aucune recette disponible'}
            </h2>
          </div>

          {suggestedRecipes.length === 0 ? (
            <div className="text-center py-10">
              <ChefHat className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Utilise &quot;Générer&quot; pour que l&apos;IA crée de nouvelles recettes.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {suggestedRecipes.map(r => (
                <RecipeCard key={r.id} id={r.id} name={r.name} difficulty={r.difficulty}
                  prepTime={r.prepTime} cuisine={r.cuisine} imageUrl={r.imageUrl}
                  matchPercent={r.matchPercent} matchCount={r.matchCount}
                  emoji={r.ingredients?.[0]?.ingredient?.emoji} />
              ))}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
