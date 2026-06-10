'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import RecipeCard from '@/components/RecipeCard';
import { Search, ChefHat, SlidersHorizontal } from 'lucide-react';

interface Recipe {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  prepTime: number;
  cuisine: string;
  imageUrl: string;
  matchPercent: number;
  matchCount: string;
  ingredients: Array<{ ingredient: { emoji: string } }>;
  isFavorite: boolean;
  isLocked?: boolean;
  allergenWarnings?: string[];
  dietConflict?: boolean;
  dietLabel?: string;
  usesExpiring?: number;
  isRevisite?: boolean;
  isCommunity?: boolean;
  author?: string | null;
}

const DIFFICULTIES = ['Tous', 'Facile', 'Moyen', 'Difficile'];
const TIMES = ['Tous', '< 15 min', '< 30 min', '< 45 min'];
const CUISINES = ['Toutes', 'FR', 'IT', 'JP', 'MX', 'IN', 'MA', 'TH', 'VN', 'CN', 'US', 'ES', 'GR'];
const DIETARY = ['Tous', 'Anti-gaspi', 'Compatible régime', 'Revisités', 'Communauté'];

export default function ExplorerPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('Tous');
  const [time, setTime] = useState('Tous');
  const [cuisine, setCuisine] = useState('Toutes');
  const [dietary, setDietary] = useState('Tous');
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/recipes');
    if (res.ok) setRecipes(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = recipes.filter(r => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) &&
        !r.description?.toLowerCase().includes(search.toLowerCase()) &&
        !r.cuisine.toLowerCase().includes(search.toLowerCase())) return false;
    if (difficulty === 'Facile' && r.difficulty !== 'FACILE') return false;
    if (difficulty === 'Moyen' && r.difficulty !== 'MOYEN') return false;
    if (difficulty === 'Difficile' && r.difficulty !== 'DIFFICILE') return false;
    if (time === '< 15 min' && r.prepTime > 15) return false;
    if (time === '< 30 min' && r.prepTime > 30) return false;
    if (time === '< 45 min' && r.prepTime > 45) return false;
    if (cuisine !== 'Toutes' && r.cuisine !== cuisine) return false;
    if (dietary === 'Anti-gaspi' && (r.usesExpiring ?? 0) === 0) return false;
    if (dietary === 'Compatible régime' && (r.dietConflict || (r.allergenWarnings?.length ?? 0) > 0)) return false;
    if (dietary === 'Revisités' && !r.isRevisite) return false;
    if (dietary === 'Communauté' && !r.isCommunity) return false;
    return true;
  });

  const activeFilters = [difficulty !== 'Tous', time !== 'Tous', cuisine !== 'Toutes', dietary !== 'Tous'].filter(Boolean).length;

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
      <div className="flex items-center gap-2.5 mb-4">
        <ChefHat className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        <h1 className="font-semibold text-base">Explorer</h1>
        <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
          {filtered.length} recette{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Barre de recherche */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Rechercher une recette…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field !pl-9"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="relative px-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
          style={showFilters || activeFilters > 0
            ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
            : { backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {activeFilters > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center bg-red-500 text-white">
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {/* Filtres dépliables */}
      {showFilters && (
        <div className="card p-3.5 mb-3 space-y-3 fade-in">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Régime &amp; anti-gaspi</p>
            <div className="flex gap-1.5 flex-wrap">
              {DIETARY.map(d => (
                <button key={d} onClick={() => setDietary(d)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                  style={dietary === d
                    ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
                    : { backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Difficulté</p>
            <div className="flex gap-1.5 flex-wrap">
              {DIFFICULTIES.map(d => (
                <button key={d} onClick={() => setDifficulty(d)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                  style={difficulty === d
                    ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
                    : { backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Temps</p>
            <div className="flex gap-1.5 flex-wrap">
              {TIMES.map(t => (
                <button key={t} onClick={() => setTime(t)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                  style={time === t
                    ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
                    : { backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Cuisine</p>
            <div className="flex gap-1.5 flex-wrap">
              {CUISINES.map(c => (
                <button key={c} onClick={() => setCuisine(c)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                  style={cuisine === c
                    ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
                    : { backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          {activeFilters > 0 && (
            <button onClick={() => { setDifficulty('Tous'); setTime('Tous'); setCuisine('Toutes'); setDietary('Tous'); }}
              className="text-xs text-red-500 hover:text-red-400 transition-colors">
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {/* Résultats */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <ChefHat className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
          <p className="text-sm font-medium mb-1">Aucun résultat</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Essaie un autre terme ou modifie les filtres</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {filtered.map(r => (
              <RecipeCard
                key={r.id}
                id={r.id}
                name={r.name}
                difficulty={r.difficulty}
                prepTime={r.prepTime}
                cuisine={r.cuisine}
                imageUrl={r.imageUrl}
                matchPercent={r.matchPercent}
                matchCount={r.matchCount}
                emoji={r.ingredients?.[0]?.ingredient?.emoji}
                isFavorite={r.isFavorite}
                isLocked={r.isLocked}
                allergenWarnings={r.allergenWarnings}
                dietConflict={r.dietConflict}
                dietLabel={r.dietLabel}
                usesExpiring={r.usesExpiring}
                isRevisite={r.isRevisite}
                isCommunity={r.isCommunity}
              />
            ))}
          </div>
          {filtered.some(r => r.isLocked) && (
            <Link href="/profile"
              className="block mt-3 p-4 rounded-xl text-center text-sm font-medium transition-all"
              style={{ backgroundColor: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)', color: 'var(--text-secondary)' }}>
              🔓 Débloquer toutes les recettes avec <span className="font-semibold text-amber-600 dark:text-amber-400">Premium</span>
            </Link>
          )}
        </>
      )}
    </AppShell>
  );
}
