'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ChefHat, Trash2, Plus, Clock, Pencil, X, Check,
  Sparkles, Loader2, Languages, Flame, AlertCircle,
} from 'lucide-react';

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
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  salt: number | null;
  _count: { ingredients: number; favorites: number };
}

const BLANK_FORM = {
  name: '', description: '', instructions: '',
  difficulty: 'FACILE', prepTime: 20, cuisine: 'FR', servings: 4,
};

export default function AdminRecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);

  // Editing
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Recipe>>({});

  // Enriching
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [enrichingAll, setEnrichingAll] = useState(false);
  const [enrichResults, setEnrichResults] = useState<Record<string, 'ok' | 'error'>>({});

  // Filter
  const [search, setSearch] = useState('');
  const [filterNoNutrition, setFilterNoNutrition] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/recipes');
    if (res.ok) setRecipes(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addRecipe(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/admin/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm(BLANK_FORM);
    setShowAdd(false);
    load();
  }

  async function deleteRecipe(id: string) {
    if (!confirm('Supprimer cette recette ?')) return;
    await fetch(`/api/admin/recipes/${id}`, { method: 'DELETE' });
    setRecipes(prev => prev.filter(r => r.id !== id));
  }

  function startEdit(recipe: Recipe) {
    setEditId(recipe.id);
    setEditForm({
      name: recipe.name,
      description: recipe.description,
      instructions: recipe.instructions,
      difficulty: recipe.difficulty,
      prepTime: recipe.prepTime,
      cuisine: recipe.cuisine,
      servings: recipe.servings,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
      fiber: recipe.fiber,
    });
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/admin/recipes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      setEditId(null);
      load();
    }
  }

  async function enrichOne(id: string) {
    setEnrichingIds(prev => new Set([...prev, id]));
    setEnrichResults(prev => { const n = { ...prev }; delete n[id]; return n; });
    try {
      const res = await fetch('/api/admin/recipes/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
      const data = await res.json();
      const result = data.results?.[0];
      setEnrichResults(prev => ({ ...prev, [id]: result?.ok ? 'ok' : 'error' }));
      if (result?.ok) load();
    } catch {
      setEnrichResults(prev => ({ ...prev, [id]: 'error' }));
    } finally {
      setEnrichingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  }

  async function enrichAll() {
    setEnrichingAll(true);
    const toEnrich = filtered.map(r => r.id);
    try {
      const res = await fetch('/api/admin/recipes/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: toEnrich }),
      });
      const data = await res.json();
      const newResults: Record<string, 'ok' | 'error'> = {};
      for (const r of (data.results || [])) {
        newResults[r.id] = r.ok ? 'ok' : 'error';
      }
      setEnrichResults(prev => ({ ...prev, ...newResults }));
      load();
    } catch {
      // silent
    } finally {
      setEnrichingAll(false);
    }
  }

  const filtered = recipes.filter(r => {
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.cuisine.toLowerCase().includes(search.toLowerCase());
    const matchNutrition = !filterNoNutrition || r.calories === null;
    return matchSearch && matchNutrition;
  });

  const noNutritionCount = recipes.filter(r => r.calories === null).length;
  const diffLabels: Record<string, string> = { FACILE: 'Facile', MOYEN: 'Moyen', DIFFICILE: 'Difficile' };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="fade-in space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ChefHat className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          <h1 className="text-xl font-semibold">Recettes ({recipes.length})</h1>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Ajouter
        </button>
      </div>

      {/* Bannière recettes sans nutrition */}
      {noNutritionCount > 0 && (
        <div className="rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              {noNutritionCount} recette{noNutritionCount > 1 ? 's' : ''} sans valeurs nutritionnelles
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Utilise &quot;Traduire &amp; enrichir&quot; pour laisser l&apos;IA traduire en français et calculer les calories, protéines, glucides et lipides.
            </p>
          </div>
          <button
            onClick={enrichAll}
            disabled={enrichingAll}
            className="btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1.5 shrink-0"
          >
            {enrichingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {enrichingAll ? 'En cours…' : 'Tout enrichir'}
          </button>
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Rechercher…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field flex-1 !py-2 text-sm"
        />
        <button
          onClick={() => setFilterNoNutrition(!filterNoNutrition)}
          className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${filterNoNutrition ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : ''}`}
          style={!filterNoNutrition ? { border: '1px solid var(--border)', color: 'var(--text-muted)' } : { border: '1px solid rgba(245,158,11,0.3)' }}
        >
          <Flame className="w-3.5 h-3.5" />
          Sans nutrition
        </button>
      </div>

      {/* Formulaire ajout */}
      {showAdd && (
        <form onSubmit={addRecipe} className="card p-4 space-y-3 fade-in">
          <p className="text-sm font-medium mb-1">Nouvelle recette</p>
          <input type="text" placeholder="Nom de la recette" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" required />
          <input type="text" placeholder="Description courte" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field" required />
          <textarea placeholder="Instructions (une étape par ligne)" value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} className="input-field min-h-[100px]" required />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })} className="input-field">
              <option value="FACILE">Facile</option>
              <option value="MOYEN">Moyen</option>
              <option value="DIFFICILE">Difficile</option>
            </select>
            <input type="number" placeholder="Temps (min)" value={form.prepTime} onChange={e => setForm({ ...form, prepTime: Number(e.target.value) })} className="input-field" />
            <input type="text" placeholder="Cuisine (FR, IT, JP…)" value={form.cuisine} onChange={e => setForm({ ...form, cuisine: e.target.value })} className="input-field" />
            <input type="number" placeholder="Portions" value={form.servings} onChange={e => setForm({ ...form, servings: Number(e.target.value) })} className="input-field" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary !py-2 text-sm">Créer</button>
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary !py-2 text-sm">Annuler</button>
          </div>
        </form>
      )}

      {/* Liste */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>Aucune recette trouvée</p>
        )}
        {filtered.map(r => (
          <div key={r.id} className="card overflow-hidden">
            {editId === r.id ? (
              /* ── Mode édition ── */
              <div className="p-4 space-y-3 fade-in">
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Édition — {r.name}</p>
                <input type="text" value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="Nom" className="input-field" />
                <input type="text" value={editForm.description || ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} placeholder="Description" className="input-field" />
                <textarea value={editForm.instructions || ''} onChange={e => setEditForm({ ...editForm, instructions: e.target.value })} placeholder="Instructions (une étape par ligne)" className="input-field min-h-[120px]" />
                <div className="grid grid-cols-2 gap-2">
                  <select value={editForm.difficulty || 'FACILE'} onChange={e => setEditForm({ ...editForm, difficulty: e.target.value })} className="input-field">
                    <option value="FACILE">Facile</option>
                    <option value="MOYEN">Moyen</option>
                    <option value="DIFFICILE">Difficile</option>
                  </select>
                  <input type="number" value={editForm.prepTime || ''} onChange={e => setEditForm({ ...editForm, prepTime: Number(e.target.value) })} placeholder="Temps (min)" className="input-field" />
                  <input type="text" value={editForm.cuisine || ''} onChange={e => setEditForm({ ...editForm, cuisine: e.target.value })} placeholder="Cuisine" className="input-field" />
                  <input type="number" value={editForm.servings || ''} onChange={e => setEditForm({ ...editForm, servings: Number(e.target.value) })} placeholder="Portions" className="input-field" />
                </div>

                {/* Nutrition manuelle */}
                <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Valeurs nutritionnelles (par portion)</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] block mb-1" style={{ color: 'var(--text-muted)' }}>Calories (kcal)</label>
                      <input type="number" value={editForm.calories ?? ''} onChange={e => setEditForm({ ...editForm, calories: e.target.value ? Number(e.target.value) : null })} placeholder="ex. 450" className="input-field !py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] block mb-1" style={{ color: 'var(--text-muted)' }}>Protéines (g)</label>
                      <input type="number" step="0.1" value={editForm.protein ?? ''} onChange={e => setEditForm({ ...editForm, protein: e.target.value ? Number(e.target.value) : null })} placeholder="ex. 25" className="input-field !py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] block mb-1" style={{ color: 'var(--text-muted)' }}>Glucides (g)</label>
                      <input type="number" step="0.1" value={editForm.carbs ?? ''} onChange={e => setEditForm({ ...editForm, carbs: e.target.value ? Number(e.target.value) : null })} placeholder="ex. 40" className="input-field !py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] block mb-1" style={{ color: 'var(--text-muted)' }}>Lipides (g)</label>
                      <input type="number" step="0.1" value={editForm.fat ?? ''} onChange={e => setEditForm({ ...editForm, fat: e.target.value ? Number(e.target.value) : null })} placeholder="ex. 18" className="input-field !py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] block mb-1" style={{ color: 'var(--text-muted)' }}>Fibres (g)</label>
                      <input type="number" step="0.1" value={editForm.fiber ?? ''} onChange={e => setEditForm({ ...editForm, fiber: e.target.value ? Number(e.target.value) : null })} placeholder="ex. 4" className="input-field !py-1.5 text-sm" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => saveEdit(r.id)} className="btn-primary !py-2 text-sm flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> Sauvegarder
                  </button>
                  <button onClick={() => setEditId(null)} className="btn-secondary !py-2 text-sm flex items-center gap-1.5">
                    <X className="w-3.5 h-3.5" /> Annuler
                  </button>
                </div>
              </div>
            ) : (
              /* ── Mode affichage ── */
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-medium truncate">{r.name}</p>
                      {r.calories !== null ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium text-emerald-600 dark:text-emerald-400" style={{ backgroundColor: 'rgba(16,185,129,0.1)' }}>
                          {r.calories} kcal
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#d97706' }}>
                          Sans nutrition
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.cuisine}</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>·</span>
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <Clock className="w-3 h-3" />{r.prepTime}min
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>·</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{diffLabels[r.difficulty]}</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>·</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{r._count.ingredients} ingr.</span>
                      {r._count.favorites > 0 && (
                        <>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>·</span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>♥ {r._count.favorites}</span>
                        </>
                      )}
                    </div>

                    {/* Nutrition preview */}
                    {r.calories !== null && (
                      <div className="flex gap-3 mt-2">
                        {r.protein !== null && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>🥩 {r.protein}g prot.</span>}
                        {r.carbs !== null && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>🌾 {r.carbs}g gluc.</span>}
                        {r.fat !== null && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>🫒 {r.fat}g lip.</span>}
                        {r.fiber !== null && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>🌿 {r.fiber}g fib.</span>}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {enrichResults[r.id] === 'ok' && <Check className="w-4 h-4 text-emerald-500" />}
                    {enrichResults[r.id] === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}

                    <button
                      onClick={() => enrichOne(r.id)}
                      disabled={enrichingIds.has(r.id) || enrichingAll}
                      title="Traduire en français + calculer la nutrition via IA"
                      className="p-2 rounded-md transition-colors hover:bg-[var(--bg-inset)] disabled:opacity-40"
                    >
                      {enrichingIds.has(r.id)
                        ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--text-muted)' }} />
                        : <Languages className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                      }
                    </button>
                    <button onClick={() => startEdit(r)} className="p-2 rounded-md transition-colors hover:bg-[var(--bg-inset)]">
                      <Pencil className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    </button>
                    <button onClick={() => deleteRecipe(r.id)} className="p-2 rounded-md transition-colors hover:bg-[var(--bg-inset)]">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
