'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Carrot, ArrowLeft, Loader2, Check, X, Sparkles,
  ArrowRight, Merge, Pencil, AlertTriangle,
} from 'lucide-react';

interface BadIngredient {
  id: string;
  name: string;
  issue: string;
  suggestion: string | null;
  mergesInto: string | null;
  recipeCount: number;
  fridgeCount: number;
  shoppingCount: number;
}

export default function IngredientsCleanupPage() {
  const [items, setItems] = useState<BadIngredient[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recettesTouchees, setRecettesTouchees] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/admin/ingredients/audit');
      if (!res.ok) { setError('Accès refusé ou erreur serveur.'); setLoading(false); return; }
      const data = await res.json();
      setItems(data.ingredients);
      setRecettesTouchees(data.recettesTouchees);
      setEdits(Object.fromEntries(data.ingredients.map((i: BadIngredient) => [i.id, i.suggestion || i.name])));
    } catch { setError('Impossible de charger les ingrédients.'); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  async function apply(item: BadIngredient): Promise<boolean> {
    const target = (edits[item.id] || '').trim();
    if (!target || target === item.name) { flash('Choisis un nom différent avant d’appliquer.'); return false; }
    setBusy(b => ({ ...b, [item.id]: true }));
    try {
      const res = await fetch('/api/admin/ingredients/merge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: item.id, targetName: target }),
      });
      const data = await res.json();
      if (!res.ok) { flash(`❌ ${data.error || 'Erreur'}`); return false; }
      setItems(prev => prev.filter(i => i.id !== item.id));
      flash(data.action === 'merged'
        ? `✅ « ${item.name} » fusionné dans « ${data.into} »`
        : `✅ « ${item.name} » renommé en « ${target} »`);
      return true;
    } catch { flash('❌ Erreur réseau'); return false; }
    finally { setBusy(b => ({ ...b, [item.id]: false })); }
  }

  async function aiSuggest(item: BadIngredient) {
    setBusy(b => ({ ...b, [item.id]: true }));
    try {
      const res = await fetch('/api/admin/ingredients/suggest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: item.name }),
      });
      const data = await res.json();
      if (res.ok && data.suggestion) {
        setEdits(e => ({ ...e, [item.id]: data.suggestion }));
        flash(data.source === 'ia' ? `✨ Proposition IA : « ${data.suggestion} »` : `💡 Proposition : « ${data.suggestion} »`);
      } else {
        flash('❌ Impossible d’obtenir une suggestion');
      }
    } catch { flash('❌ Erreur réseau pendant la suggestion'); }
    finally { setBusy(b => ({ ...b, [item.id]: false })); }
  }

  async function applyAllSuggestions() {
    const withSuggestion = items.filter(i => i.suggestion);
    if (withSuggestion.length === 0) return;
    if (!window.confirm(`Appliquer les ${withSuggestion.length} suggestions du dictionnaire ? Action irréversible.`)) return;
    setBulkRunning(true);
    for (const item of withSuggestion) {
      // On relit la suggestion actuelle depuis edits.
      await apply(item);
    }
    setBulkRunning(false);
  }

  const suggestionCount = items.filter(i => i.suggestion).length;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <Link href="/admin/recipes/audit" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
        <ArrowLeft size={16} /> Retour à l’audit
      </Link>

      <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: '"Baloo 2", sans-serif', fontSize: 26, marginBottom: 6 }}>
        <Carrot size={26} style={{ color: 'var(--brand, #2563EB)' }} /> Nettoyage des ingrédients
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
        Un ingrédient est <b>partagé</b> par toutes les recettes : corriger « salt » → « Sel » une fois répare toutes les recettes concernées.
        La <b>fusion</b> (nom déjà existant) rebranche recettes, frigos et listes de courses. <b>Irréversible.</b>
      </p>

      {loading && <div style={{ display: 'flex', gap: 10, color: 'var(--text-muted)' }}><Loader2 size={18} className="animate-spin" /> Chargement…</div>}
      {error && <div style={{ color: 'var(--danger, #ef4444)' }}>{error}</div>}

      {!loading && !error && (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 16px' }}>
              <b style={{ fontSize: 20, color: 'var(--brand, #2563EB)' }}>{items.length}</b>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}> ingrédients à corriger</span>
            </div>
            <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 16px' }}>
              <b style={{ fontSize: 20 }}>{recettesTouchees}</b>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}> liens de recettes concernés</span>
            </div>
            {suggestionCount > 0 && (
              <button onClick={applyAllSuggestions} disabled={bulkRunning}
                className="btn-primary !py-2 !px-4 text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                {bulkRunning ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                Appliquer les {suggestionCount} suggestions sûres
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map(item => {
              const target = edits[item.id] ?? item.name;
              const willMerge = item.mergesInto && target.toLowerCase() === item.mergesInto.toLowerCase();
              return (
                <div key={item.id} style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 14, padding: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, wordBreak: 'break-word' }}>{item.name}</span>
                      <span title={item.issue} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--warning, #f59e0b)' }}>
                        <AlertTriangle size={12} /> {item.issue}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {item.recipeCount} recette(s)
                      {item.fridgeCount > 0 && ` · ${item.fridgeCount} frigo(s)`}
                      {item.shoppingCount > 0 && ` · ${item.shoppingCount} liste(s)`}
                    </div>
                  </div>

                  <ArrowRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />

                  <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <input
                      value={target}
                      onChange={e => setEdits(prev => ({ ...prev, [item.id]: e.target.value }))}
                      style={{ padding: '7px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-inset)', color: 'var(--text)', fontSize: 14, width: '100%' }}
                    />
                    {willMerge && (
                      <span style={{ fontSize: 11, color: 'var(--brand, #2563EB)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Merge size={11} /> fusion dans un ingrédient existant
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => aiSuggest(item)} disabled={busy[item.id]} title="Suggérer avec l’IA"
                      style={iconBtn}>
                      {busy[item.id] ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                    </button>
                    <button onClick={() => apply(item)} disabled={busy[item.id]} title="Appliquer"
                      className="btn-primary !py-1.5 !px-3 text-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Check size={14} /> Appliquer
                    </button>
                    <button onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))} title="Ignorer"
                      style={iconBtn}>
                      <X size={15} />
                    </button>
                  </div>
                </div>
              );
            })}

            {items.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
                <Check size={32} style={{ color: 'var(--success, #22c55e)', marginBottom: 8 }} />
                <div>Plus aucun ingrédient à corriger 🎉</div>
                <Link href="/admin/recipes/audit" style={{ color: 'var(--brand, #2563EB)', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10 }}>
                  <Pencil size={14} /> Retour à l’audit des recettes
                </Link>
              </div>
            )}
          </div>
        </>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 18px', fontSize: 14, boxShadow: '0 8px 30px rgba(0,0,0,0.25)', zIndex: 50 }}>
          {toast}
        </div>
      )}
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 34, height: 34, borderRadius: 10, border: '1px solid var(--border)',
  background: 'var(--bg-inset)', color: 'var(--text-secondary)', cursor: 'pointer',
};
