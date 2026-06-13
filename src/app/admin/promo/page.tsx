'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight, Copy, Check, Tag, X, Edit2 } from 'lucide-react';

interface PromoCode {
  id: string;
  code: string;
  description: string;
  planGranted: string;
  durationMonths: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  firstSignupOnly: boolean;
  minAccountAgeDays: number | null;
  maxAccountAgeDays: number | null;
  createdAt: string;
  _count?: { uses: number };
}

const EMPTY_FORM = {
  code: '', description: '', planGranted: 'VIP', durationMonths: '1',
  maxUses: '', expiresAt: '', firstSignupOnly: false,
  minAccountAgeDays: '', maxAccountAgeDays: '',
};

export default function AdminPromoPage() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/promo');
    if (res.ok) setCodes(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const part = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setForm(f => ({ ...f, code: `${part(4)}-${part(4)}` }));
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  function openEdit(c: PromoCode) {
    setEditId(c.id);
    setForm({
      code: c.code,
      description: c.description,
      planGranted: c.planGranted,
      durationMonths: String(c.durationMonths),
      maxUses: c.maxUses !== null ? String(c.maxUses) : '',
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
      firstSignupOnly: c.firstSignupOnly,
      minAccountAgeDays: c.minAccountAgeDays !== null ? String(c.minAccountAgeDays) : '',
      maxAccountAgeDays: c.maxAccountAgeDays !== null ? String(c.maxAccountAgeDays) : '',
    });
    setShowForm(true);
    setError('');
  }

  function resetForm() {
    setForm({ ...EMPTY_FORM });
    setEditId(null);
    setShowForm(false);
    setError('');
  }

  async function save() {
    setError('');
    if (!form.code.trim() || !form.durationMonths) {
      setError('Code et durée requis'); return;
    }
    setSaving(true);
    const payload = {
      code: form.code.trim().toUpperCase(),
      description: form.description,
      planGranted: form.planGranted,
      durationMonths: Number(form.durationMonths),
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      expiresAt: form.expiresAt || null,
      firstSignupOnly: form.firstSignupOnly,
      minAccountAgeDays: form.minAccountAgeDays ? Number(form.minAccountAgeDays) : null,
      maxAccountAgeDays: form.maxAccountAgeDays ? Number(form.maxAccountAgeDays) : null,
    };

    const url = editId ? `/api/admin/promo/${editId}` : '/api/admin/promo';
    const method = editId ? 'PATCH' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Erreur'); setSaving(false); return; }
    setSaving(false);
    resetForm();
    load();
  }

  async function toggleActive(c: PromoCode) {
    await fetch(`/api/admin/promo/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    setCodes(prev => prev.map(p => p.id === c.id ? { ...p, isActive: !p.isActive } : p));
  }

  async function deleteCode(c: PromoCode) {
    if (!confirm(`Supprimer le code "${c.code}" ?`)) return;
    await fetch(`/api/admin/promo/${c.id}`, { method: 'DELETE' });
    setCodes(prev => prev.filter(p => p.id !== c.id));
  }

  const planColor = (plan: string) =>
    plan === 'VIP' ? 'text-purple-500' : 'text-amber-500';

  const planBg = (plan: string) =>
    plan === 'VIP' ? 'rgba(168,85,247,0.12)' : 'rgba(245,158,11,0.12)';

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <Tag className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          <h1 className="text-xl font-semibold">Codes promo</h1>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)' }}>
            {codes.length} code{codes.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button onClick={() => { setEditId(null); setForm({ ...EMPTY_FORM }); setShowForm(true); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
          <Plus className="w-4 h-4" /> Créer un code
        </button>
      </div>

      {/* Formulaire création / édition */}
      {showForm && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold">{editId ? 'Modifier le code' : 'Nouveau code promo'}</h2>
            <button onClick={resetForm}><X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Code */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Code *</label>
              <div className="flex gap-2">
                <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="EX: SUMMER24"
                  className="flex-1 text-sm px-3 py-2 rounded-xl outline-none font-mono"
                  style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                <button onClick={generateCode}
                  className="px-3 py-2 rounded-xl text-xs font-medium"
                  style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  Générer
                </button>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Description (interne)</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Pub Instagram été 2025"
                className="w-full text-sm px-3 py-2 rounded-xl outline-none"
                style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </div>

            {/* Plan */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Plan accordé *</label>
              <select value={form.planGranted} onChange={e => setForm(f => ({ ...f, planGranted: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-xl outline-none"
                style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                <option value="PREMIUM">⭐ Premium</option>
                <option value="VIP">👑 VIP</option>
              </select>
            </div>

            {/* Durée */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Durée (mois) *</label>
              <input type="number" min="1" max="24" value={form.durationMonths}
                onChange={e => setForm(f => ({ ...f, durationMonths: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-xl outline-none"
                style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </div>

            {/* Max utilisations */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Utilisations max (vide = illimité)</label>
              <input type="number" min="1" value={form.maxUses}
                onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                placeholder="Ex: 100"
                className="w-full text-sm px-3 py-2 rounded-xl outline-none"
                style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </div>

            {/* Expiration */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Date d'expiration (vide = sans limite)</label>
              <input type="date" value={form.expiresAt}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-xl outline-none"
                style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </div>
          </div>

          {/* Conditions */}
          <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
            <p className="text-xs font-bold mb-3" style={{ color: 'var(--text-secondary)' }}>Conditions d'éligibilité</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div className={`relative w-9 h-5 rounded-full transition-colors ${form.firstSignupOnly ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`}
                  onClick={() => setForm(f => ({ ...f, firstSignupOnly: !f.firstSignupOnly }))}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.firstSignupOnly ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Première inscription seulement</span>
              </label>

              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Âge compte min (jours)</label>
                <input type="number" min="0" value={form.minAccountAgeDays}
                  onChange={e => setForm(f => ({ ...f, minAccountAgeDays: e.target.value }))}
                  placeholder="Ex: 30 (fidélité)"
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg outline-none"
                  style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              </div>

              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Âge compte max (jours)</label>
                <input type="number" min="0" value={form.maxAccountAgeDays}
                  onChange={e => setForm(f => ({ ...f, maxAccountAgeDays: e.target.value }))}
                  placeholder="Ex: 7 (nouvel inscrit)"
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg outline-none"
                  style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-3 text-xs text-red-500 px-1">{error}</p>
          )}

          <div className="flex gap-2 mt-4">
            <button onClick={save} disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all active:scale-95"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
              {saving ? 'Enregistrement…' : editId ? 'Mettre à jour' : 'Créer le code'}
            </button>
            <button onClick={resetForm} className="px-4 py-2 rounded-xl text-sm"
              style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste des codes */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }} />
        </div>
      ) : codes.length === 0 ? (
        <div className="card p-8 text-center">
          <Tag className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucun code promo créé</p>
        </div>
      ) : (
        <div className="space-y-2">
          {codes.map(c => (
            <div key={c.id} className="card p-4 flex items-start gap-4"
              style={{ opacity: c.isActive ? 1 : 0.5 }}>

              {/* Code + badges */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-base tracking-wider">{c.code}</span>
                  <button onClick={() => copyCode(c.code)}
                    className="p-0.5 rounded transition-colors hover:opacity-70"
                    style={{ color: 'var(--text-muted)' }}>
                    {copied === c.code ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  {/* Plan badge */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${planColor(c.planGranted)}`}
                    style={{ backgroundColor: planBg(c.planGranted) }}>
                    {c.planGranted === 'VIP' ? '👑 VIP' : '⭐ Premium'} {c.durationMonths}mo
                  </span>

                  {!c.isActive && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: 'rgb(239,68,68)' }}>
                      Désactivé
                    </span>
                  )}
                </div>

                {c.description && (
                  <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>{c.description}</p>
                )}

                {/* Méta */}
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  <span>
                    <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{c.usedCount}</span>
                    {c.maxUses !== null ? `/${c.maxUses}` : ''} utilisation{c.usedCount !== 1 ? 's' : ''}
                  </span>
                  {c.expiresAt && (
                    <span>Expire le {new Date(c.expiresAt).toLocaleDateString('fr-FR')}</span>
                  )}
                  {c.firstSignupOnly && <span>🆕 Première inscription seulement</span>}
                  {c.minAccountAgeDays !== null && <span>📅 Compte ≥ {c.minAccountAgeDays}j</span>}
                  {c.maxAccountAgeDays !== null && <span>🆕 Compte ≤ {c.maxAccountAgeDays}j</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => toggleActive(c)}
                  className="p-1.5 rounded-lg transition-colors hover:opacity-70"
                  style={{ color: c.isActive ? 'var(--accent)' : 'var(--text-muted)' }}
                  title={c.isActive ? 'Désactiver' : 'Activer'}>
                  {c.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button onClick={() => openEdit(c)}
                  className="p-1.5 rounded-lg transition-colors hover:opacity-70"
                  style={{ color: 'var(--text-muted)' }}>
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => deleteCode(c)}
                  className="p-1.5 rounded-lg transition-colors hover:opacity-70 text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
