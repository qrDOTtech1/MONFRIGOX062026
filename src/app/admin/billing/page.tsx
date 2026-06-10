'use client';

import { useState, useEffect } from 'react';
import {
  CreditCard, Save, Check, Loader2, Users, Shield,
  Search, Crown, Star, Zap, RefreshCw, AlertTriangle,
} from 'lucide-react';

interface BillingData {
  config: Record<string, string>;
  planStats: Array<{ plan: string; _count: { id: number } }>;
}

interface UserResult {
  id: string; name: string; email: string;
  plan: string; planExpiresAt: string | null; extraQuota: number; role: string;
}

const PLAN_COLORS: Record<string, string> = {
  FREE:    'text-gray-400',
  PREMIUM: 'text-amber-500',
  VIP:     'text-purple-500',
  ADMIN:   'text-blue-500',
};
const PLAN_BG: Record<string, string> = {
  FREE:    'var(--bg-inset)',
  PREMIUM: 'rgba(245,158,11,0.1)',
  VIP:     'rgba(168,85,247,0.1)',
};

const FIELDS = [
  {
    section: '🔐 Stripe Webhook',
    hint: 'Stripe Dashboard → Développeurs → Webhooks → Signing Secret (whsec_…)',
    fields: [
      { key: 'stripe_webhook_secret', label: 'Webhook Signing Secret', placeholder: 'whsec_…' },
    ],
  },
  {
    section: '💳 Price IDs Stripe — Premium',
    hint: 'Stripe Dashboard → Produits → ton produit Premium → copie l\'ID du tarif (price_…). Ajoute metadata sur le produit : plan=PREMIUM, duration=MONTHLY ou ANNUAL.',
    fields: [
      { key: 'stripe_price_id_premium_monthly', label: 'Price ID mensuel', placeholder: 'price_…' },
      { key: 'stripe_price_id_premium_annual',  label: 'Price ID annuel',  placeholder: 'price_…' },
      { key: 'price_premium_monthly',           label: 'Prix affiché /mois', placeholder: '3,99€' },
      { key: 'price_premium_annual',            label: 'Prix affiché /an',   placeholder: '34,99€' },
    ],
  },
  {
    section: '👑 Price IDs Stripe — VIP',
    hint: 'Même principe. Metadata sur le produit : plan=VIP, duration=MONTHLY ou ANNUAL.',
    fields: [
      { key: 'stripe_price_id_vip_monthly', label: 'Price ID mensuel', placeholder: 'price_…' },
      { key: 'stripe_price_id_vip_annual',  label: 'Price ID annuel',  placeholder: 'price_…' },
      { key: 'price_vip_monthly',           label: 'Prix affiché /mois', placeholder: '6,99€' },
      { key: 'price_vip_annual',            label: 'Prix affiché /an',   placeholder: '59,99€' },
    ],
  },
  {
    section: '🚀 Price IDs — Packs Quota IA',
    hint: 'Produit de type "paiement unique". Metadata : quota=50 (ou 200, 500).',
    fields: [
      { key: 'stripe_price_id_quota_50',  label: 'Price ID Pack 50',  placeholder: 'price_…' },
      { key: 'quota_50_price',            label: 'Prix affiché',       placeholder: '0,99€'  },
      { key: 'stripe_price_id_quota_200', label: 'Price ID Pack 200', placeholder: 'price_…' },
      { key: 'quota_200_price',           label: 'Prix affiché',       placeholder: '2,99€'  },
      { key: 'stripe_price_id_quota_500', label: 'Price ID Pack 500', placeholder: 'price_…' },
      { key: 'quota_500_price',           label: 'Prix affiché',       placeholder: '5,99€'  },
    ],
  },
  {
    section: '⚙️ Limites IA',
    hint: 'Requêtes IA par semaine. FREE = 3 à vie (géré dans le code). VIP = illimité.',
    fields: [
      { key: 'limit_premium_weekly', label: 'PREMIUM — req/semaine', placeholder: '10' },
    ],
  },
];

export default function AdminBillingPage() {
  const [data,    setData]    = useState<BillingData | null>(null);
  const [form,    setForm]    = useState<Record<string, string>>({});
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  // Gestion utilisateurs
  const [searchEmail,  setSearchEmail]  = useState('');
  const [searchResult, setSearchResult] = useState<UserResult[]>([]);
  const [searching,    setSearching]    = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);

  // Patch plan
  const [patchPlan,    setPatchPlan]    = useState('PREMIUM');
  const [patchMonths,  setPatchMonths]  = useState('');
  const [patchNoExpiry,setPatchNoExpiry]= useState(false);
  const [patchQuota,   setPatchQuota]   = useState('');
  const [patching,     setPatching]     = useState(false);
  const [patched,      setPatched]      = useState<UserResult | null>(null);

  useEffect(() => {
    fetch('/api/admin/billing')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setData(d); setForm(d.config || {}); } });
  }, []);

  async function save() {
    setSaving(true);
    await fetch('/api/admin/billing', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  }

  async function searchUser() {
    if (!searchEmail.trim()) return;
    setSearching(true); setSearchResult([]); setSelectedUser(null); setPatched(null);
    const res = await fetch(`/api/admin/billing?email=${encodeURIComponent(searchEmail.trim())}`);
    if (res.ok) { const d = await res.json(); setSearchResult(d.users || []); }
    setSearching(false);
  }

  async function applyPatch() {
    if (!selectedUser) return;
    setPatching(true);
    const res = await fetch('/api/admin/billing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId:     selectedUser.id,
        plan:       patchPlan,
        planMonths: patchNoExpiry ? undefined : (parseInt(patchMonths) || 1),
        noExpiry:   patchNoExpiry,
        extraQuota: patchQuota ? parseInt(patchQuota) : undefined,
      }),
    });
    if (res.ok) {
      const d = await res.json();
      setPatched(d.user);
      setSelectedUser(d.user);
    }
    setPatching(false);
  }

  const totalUsers = data?.planStats.reduce((s, p) => s + p._count.id, 0) || 0;

  if (!data) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-muted)' }} />
    </div>
  );

  return (
    <div className="max-w-3xl fade-in">
      <div className="flex items-center gap-2.5 mb-6">
        <CreditCard className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        <h1 className="text-xl font-semibold">Facturation & Abonnements</h1>
      </div>

      {/* Stats plans */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {['FREE','PREMIUM','VIP'].map(p => {
          const stat  = data.planStats.find(s => s.plan === p);
          const count = stat?._count.id || 0;
          return (
            <div key={p} className="card p-4 text-center">
              <p className={`text-2xl font-bold ${PLAN_COLORS[p]}`}>{count}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {p} · {totalUsers > 0 ? Math.round(count/totalUsers*100) : 0}%
              </p>
            </div>
          );
        })}
      </div>

      {/* Webhook URL */}
      <div className="card p-4 mb-6" style={{ backgroundColor: 'rgba(59,130,246,0.04)', borderColor: 'rgba(59,130,246,0.2)' }}>
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">URL Webhook Stripe</p>
            <code className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text)' }}>
              {typeof window !== 'undefined' ? window.location.origin : 'https://monfrigo.app'}/api/billing/webhook
            </code>
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
              Événements requis : <code>checkout.session.completed</code> · <code>customer.subscription.deleted</code>
            </p>
          </div>
        </div>
      </div>

      {/* ── Gestion utilisateurs ── */}
      <div className="card p-5 mb-6">
        <h2 className="font-semibold text-sm mb-1 flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          Gérer un abonnement
        </h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Recherche par email — activation manuelle, comptes test, support…
        </p>

        {/* Recherche */}
        <div className="flex gap-2 mb-4">
          <input
            value={searchEmail}
            onChange={e => setSearchEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchUser()}
            placeholder="email@exemple.com"
            className="input-field flex-1 text-sm"
          />
          <button onClick={searchUser} disabled={searching}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Chercher
          </button>
        </div>

        {/* Résultats */}
        {searchResult.length > 0 && (
          <div className="space-y-1.5 mb-4">
            {searchResult.map(u => (
              <button key={u.id} onClick={() => { setSelectedUser(u); setPatchPlan(u.plan === 'ADMIN' ? 'VIP' : u.plan); setPatched(null); }}
                className="w-full text-left px-3 py-2.5 rounded-lg transition-all"
                style={{
                  backgroundColor: selectedUser?.id === u.id ? 'var(--bg-inset)' : 'transparent',
                  border: `1px solid ${selectedUser?.id === u.id ? 'var(--border)' : 'transparent'}`,
                }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{u.name || '—'} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>{u.email}</span></p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {u.id.slice(0, 12)}… · quota bonus : {u.extraQuota}
                    </p>
                  </div>
                  <span className={`text-xs font-bold ${PLAN_COLORS[u.plan] || ''}`}>{u.plan}</span>
                </div>
                {u.planExpiresAt && (
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Expire : {new Date(u.planExpiresAt).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Formulaire patch */}
        {selectedUser && (
          <div className="rounded-xl p-4 fade-in" style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
              Modifier : {selectedUser.name || selectedUser.email}
            </p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Plan</label>
                <select value={patchPlan} onChange={e => setPatchPlan(e.target.value)} className="input-field text-sm">
                  <option value="FREE">FREE</option>
                  <option value="PREMIUM">PREMIUM</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Durée (mois)</label>
                <input type="number" min={1} max={120} value={patchMonths}
                  onChange={e => setPatchMonths(e.target.value)}
                  disabled={patchNoExpiry}
                  placeholder="1" className="input-field text-sm disabled:opacity-40" />
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <button onClick={() => setPatchNoExpiry(p => !p)}
                  className={`w-5 h-5 rounded flex items-center justify-center transition-all shrink-0`}
                  style={{ backgroundColor: patchNoExpiry ? 'var(--accent)' : 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                  {patchNoExpiry && <Check className="w-3 h-3" style={{ color: 'var(--accent-text)' }} />}
                </button>
                <label className="text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}
                  onClick={() => setPatchNoExpiry(p => !p)}>
                  Sans expiration (compte test / accès permanent)
                </label>
              </div>
              <div className="col-span-2">
                <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Quota IA bonus (optionnel)</label>
                <input type="number" min={0} value={patchQuota}
                  onChange={e => setPatchQuota(e.target.value)}
                  placeholder="0" className="input-field text-sm" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={applyPatch} disabled={patching}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
                {patching
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Application…</>
                  : <><Shield className="w-4 h-4" /> Appliquer</>}
              </button>
              {patched && (
                <span className="flex items-center gap-1 text-xs text-emerald-500">
                  <Check className="w-3.5 h-3.5" />
                  {patched.name || patched.email} → <strong>{patched.plan}</strong>
                  {patched.planExpiresAt
                    ? ` jusqu'au ${new Date(patched.planExpiresAt).toLocaleDateString('fr-FR')}`
                    : ' (permanent)'}
                </span>
              )}
            </div>

            {/* Raccourcis */}
            <div className="flex gap-2 mt-3 flex-wrap">
              {[
                { label: '🧪 Test 7j Premium', plan: 'PREMIUM', months: '', noExpiry: false, quota: '' },
                { label: '⭐ Test VIP permanent', plan: 'VIP', months: '', noExpiry: true, quota: '' },
                { label: '↩️ Remettre FREE', plan: 'FREE', months: '1', noExpiry: true, quota: '0' },
              ].map(preset => (
                <button key={preset.label}
                  onClick={() => { setPatchPlan(preset.plan); setPatchMonths(preset.months); setPatchNoExpiry(preset.noExpiry); setPatchQuota(preset.quota); }}
                  className="text-[11px] px-2.5 py-1 rounded-lg transition-all"
                  style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Config Stripe ── */}
      {FIELDS.map(section => (
        <div key={section.section} className="card p-5 mb-4">
          <h2 className="font-semibold text-sm mb-1">{section.section}</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{section.hint}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {section.fields.map(f => (
              <div key={f.key}>
                <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>{f.label}</label>
                <input
                  type="text"
                  placeholder={f.placeholder}
                  value={form[f.key] || ''}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="input-field text-xs"
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <button onClick={save} disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold mb-8 transition-all disabled:opacity-50"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
        {saved
          ? <><Check className="w-4 h-4" /> Sauvegardé</>
          : saving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Sauvegarde…</>
            : <><Save className="w-4 h-4" /> Sauvegarder la configuration</>}
      </button>
    </div>
  );
}
