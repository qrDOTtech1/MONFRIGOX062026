'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck, AlertTriangle, AlertCircle, Info, CheckCircle2,
  Loader2, ArrowLeft, Pencil, Carrot,
} from 'lucide-react';

type Severity = 'high' | 'medium' | 'low';
interface Flag { code: string; label: string; severity: Severity; detail?: string }
interface AuditedRecipe { id: string; name: string; source: string; score: number; flags: Flag[] }
interface Summary {
  total: number; parfaites: number; aCorriger: number;
  parSource: Record<string, number>;
  flagsFrequents: [string, number][];
}

const SEV_COLOR: Record<Severity, string> = {
  high: 'var(--danger, #ef4444)',
  medium: 'var(--warning, #f59e0b)',
  low: 'var(--text-muted)',
};
const SEV_ICON: Record<Severity, typeof AlertTriangle> = {
  high: AlertTriangle, medium: AlertCircle, low: Info,
};
const SOURCE_LABEL: Record<string, string> = {
  seed: 'Officielle (seed)', mealdb: 'Import MealDB', marmiton: 'Scrape Marmiton',
  ia: 'Revisite IA', communaute: 'Communauté', inconnu: 'Inconnue',
};

export default function RecipeAuditPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recipes, setRecipes] = useState<AuditedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hideSeed, setHideSeed] = useState(true);
  const [onlyProblems, setOnlyProblems] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/admin/recipes/audit');
      if (!res.ok) { setError('Accès refusé ou erreur serveur.'); setLoading(false); return; }
      const data = await res.json();
      setSummary(data.summary); setRecipes(data.recipes);
    } catch { setError('Impossible de charger l’audit.'); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => recipes.filter(r => {
    if (hideSeed && r.source === 'seed') return false;
    if (onlyProblems && r.flags.length === 0) return false;
    return true;
  }), [recipes, hideSeed, onlyProblems]);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <Link href="/admin/recipes" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
        <ArrowLeft size={16} /> Retour aux recettes
      </Link>

      <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: '"Baloo 2", sans-serif', fontSize: 26, marginBottom: 6 }}>
        <ClipboardCheck size={26} style={{ color: 'var(--brand, #2563EB)' }} /> Audit qualité des recettes
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
        Analyse en lecture seule : rien n’est modifié. Les recettes les plus défectueuses sont en haut.
      </p>

      <Link href="/admin/recipes/ingredients" className="btn-primary !py-2 !px-4 text-sm"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <Carrot size={16} /> Nettoyer les ingrédients (le plus rentable)
      </Link>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
          <Loader2 size={18} className="animate-spin" /> Analyse en cours…
        </div>
      )}
      {error && <div style={{ color: SEV_COLOR.high }}>{error}</div>}

      {summary && !loading && (
        <>
          {/* Résumé chiffré */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 20 }}>
            <StatCard label="Recettes" value={summary.total} />
            <StatCard label="Parfaites" value={summary.parfaites} color="var(--success, #22c55e)" icon={CheckCircle2} />
            <StatCard label="À corriger" value={summary.aCorriger} color={SEV_COLOR.high} icon={AlertTriangle} />
          </div>

          {/* Défauts les plus fréquents */}
          {summary.flagsFrequents.length > 0 && (
            <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text-secondary)' }}>Défauts les plus fréquents</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {summary.flagsFrequents.map(([label, count]) => (
                  <span key={label} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, background: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
                    {label} <b style={{ color: 'var(--brand, #2563EB)' }}>{count}</b>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Filtres */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16, fontSize: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={hideSeed} onChange={e => setHideSeed(e.target.checked)} />
              Masquer les recettes officielles (seed)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={onlyProblems} onChange={e => setOnlyProblems(e.target.checked)} />
              Seulement celles avec défauts
            </label>
            <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>{filtered.length} affichée(s)</span>
          </div>

          {/* Liste */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(r => (
              <div key={r.id} style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 16, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: r.flags.length ? 10 : 0 }}>
                  <ScoreBadge score={r.score} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{SOURCE_LABEL[r.source] || r.source}</div>
                  </div>
                  <Link href="/admin/recipes" title="Ouvrir la liste des recettes" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--brand, #2563EB)' }}>
                    <Pencil size={14} /> Éditer
                  </Link>
                </div>
                {r.flags.length > 0 && (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {r.flags.map((f, i) => {
                      const Icon = SEV_ICON[f.severity];
                      return (
                        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 13 }}>
                          <Icon size={15} style={{ color: SEV_COLOR[f.severity], flexShrink: 0, marginTop: 1 }} />
                          <span>
                            {f.label}
                            {f.detail && <span style={{ color: 'var(--text-muted)' }}> — {f.detail}</span>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
                <CheckCircle2 size={32} style={{ color: 'var(--success, #22c55e)', marginBottom: 8 }} />
                <div>Aucune recette à corriger dans ce filtre 🎉</div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color, icon: Icon }: { label: string; value: number; color?: string; icon?: typeof CheckCircle2 }) {
  return (
    <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 28, fontWeight: 700, color: color || 'var(--text)' }}>
        {Icon && <Icon size={22} style={{ color }} />} {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 85 ? 'var(--success, #22c55e)' : score >= 60 ? 'var(--warning, #f59e0b)' : 'var(--danger, #ef4444)';
  return (
    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--bg-inset)', border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color, flexShrink: 0 }}>
      {score}
    </div>
  );
}
