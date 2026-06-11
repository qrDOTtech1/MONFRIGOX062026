'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import RecipeCard from '@/components/RecipeCard';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';

interface Col {
  id: string; name: string; emoji: string;
  recipes: Array<{ id: string; name: string; difficulty: string; prepTime: number; cuisine: string; imageUrl?: string; emoji?: string }>;
}

export default function CollectionDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [col, setCol] = useState<Col | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch(`/api/collections/${id}`);
    setCol(res.ok ? await res.json() : null);
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function deleteCollection() {
    if (!confirm('Supprimer ce carnet ? Les recettes ne sont pas supprimées.')) return;
    await fetch(`/api/collections/${id}`, { method: 'DELETE' });
    router.push('/collections');
  }

  if (loading) {
    return <AppShell><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-muted)' }} /></div></AppShell>;
  }
  if (!col) {
    return <AppShell><p className="text-center py-20" style={{ color: 'var(--text-muted)' }}>Carnet introuvable</p></AppShell>;
  }

  return (
    <AppShell>
      <button onClick={() => router.push('/collections')} className="flex items-center gap-1.5 text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
        <ArrowLeft className="w-4 h-4" /> Mes carnets
      </button>

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{col.emoji}</span>
          <div>
            <h1 className="text-lg font-semibold">{col.name}</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{col.recipes.length} recette{col.recipes.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={deleteCollection} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[var(--bg-inset)]">
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>

      {col.recipes.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Carnet vide. Ajoute des recettes depuis leur page (bouton « Ajouter à un carnet »).</p>
        </div>
      ) : (
        <div className="space-y-2">
          {col.recipes.map(r => (
            <RecipeCard key={r.id} id={r.id} name={r.name} difficulty={r.difficulty}
              prepTime={r.prepTime} cuisine={r.cuisine} imageUrl={r.imageUrl} emoji={r.emoji} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
