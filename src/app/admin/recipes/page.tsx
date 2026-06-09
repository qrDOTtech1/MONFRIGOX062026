'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChefHat, Trash2, Plus, Clock } from 'lucide-react';

interface Recipe {
  id: string;
  name: string;
  difficulty: string;
  prepTime: number;
  cuisine: string;
  _count: { ingredients: number; favorites: number };
}

export default function AdminRecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', instructions: '', difficulty: 'FACILE', prepTime: 20, cuisine: 'FR', servings: 4 });

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
    setForm({ name: '', description: '', instructions: '', difficulty: 'FACILE', prepTime: 20, cuisine: 'FR', servings: 4 });
    setShowAdd(false);
    load();
  }

  async function deleteRecipe(id: string) {
    if (!confirm('Supprimer cette recette?')) return;
    await fetch(`/api/admin/recipes/${id}`, { method: 'DELETE' });
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const diffLabels: Record<string, string> = { FACILE: 'Facile', MOYEN: 'Moyen', DIFFICILE: 'Difficile' };

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <ChefHat className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          <h1 className="text-xl font-semibold">Recettes ({recipes.length})</h1>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Ajouter
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addRecipe} className="card p-4 mb-5 space-y-3 fade-in">
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
            <input type="text" placeholder="Cuisine (FR, IT, JP...)" value={form.cuisine} onChange={e => setForm({ ...form, cuisine: e.target.value })} className="input-field" />
            <input type="number" placeholder="Portions" value={form.servings} onChange={e => setForm({ ...form, servings: Number(e.target.value) })} className="input-field" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary !py-2 text-sm">Créer</button>
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary !py-2 text-sm">Annuler</button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="text-left text-xs font-medium px-4 py-3" style={{ color: 'var(--text-muted)' }}>Recette</th>
                <th className="text-left text-xs font-medium px-4 py-3" style={{ color: 'var(--text-muted)' }}>Difficulté</th>
                <th className="text-left text-xs font-medium px-4 py-3" style={{ color: 'var(--text-muted)' }}>Temps</th>
                <th className="text-left text-xs font-medium px-4 py-3" style={{ color: 'var(--text-muted)' }}>Ingrédients</th>
                <th className="text-left text-xs font-medium px-4 py-3" style={{ color: 'var(--text-muted)' }}>Favoris</th>
                <th className="text-right text-xs font-medium px-4 py-3" style={{ color: 'var(--text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recipes.map(r => (
                <tr key={r.id} className="transition-colors hover:bg-[var(--bg-inset)]" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.cuisine}</p>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{diffLabels[r.difficulty]}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                      <Clock className="w-3 h-3" /> {r.prepTime}min
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{r._count.ingredients}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{r._count.favorites}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteRecipe(r.id)} className="p-2 rounded-md transition-colors hover:bg-[var(--bg-inset)]">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
