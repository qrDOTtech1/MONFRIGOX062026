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
        <div className="w-10 h-10 border-2 border-fresh-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const diffLabels: Record<string, string> = { FACILE: 'Facile', MOYEN: 'Moyen', DIFFICILE: 'Difficile' };

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ChefHat className="w-6 h-6 text-fresh-500" />
          <h1 className="text-2xl font-bold">Recettes ({recipes.length})</h1>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary !py-2 !px-4 text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addRecipe} className="glass-card p-5 mb-6 space-y-3 fade-in">
          <input type="text" placeholder="Nom de la recette" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" required />
          <input type="text" placeholder="Description courte" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field" required />
          <textarea placeholder="Instructions (une étape par ligne)" value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} className="input-field min-h-[100px]" required />
          <div className="grid grid-cols-2 gap-3">
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

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-600/50">
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Recette</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Difficulté</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Temps</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Ingrédients</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Favoris</th>
                <th className="text-right text-xs text-gray-500 font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recipes.map(r => (
                <tr key={r.id} className="border-b border-dark-600/20 hover:bg-dark-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-gray-500">{r.cuisine}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{diffLabels[r.difficulty]}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-sm text-gray-400">
                      <Clock className="w-3 h-3" /> {r.prepTime}min
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{r._count.ingredients}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{r._count.favorites}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteRecipe(r.id)} className="p-2 hover:bg-red-500/20 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-400" />
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
