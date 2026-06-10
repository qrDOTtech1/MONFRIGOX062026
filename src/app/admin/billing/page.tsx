'use client';

import { useState, useEffect } from 'react';
import {
  CreditCard, Save, Check, Link, Zap, BarChart3,
  Users, Shield, AlertTriangle, Loader2, RefreshCw,
} from 'lucide-react';

interface BillingData {
  config: Record<string, string>;
  planStats: Array<{ plan: string; _count: { id: number } }>;
}

const PLAN_COLORS: Record<string, string> = {
  FREE:    'text-gray-500',
  PREMIUM: 'text-amber-500',
  VIP:     'text-purple-500',
};

const FIELDS = [
  {
    section: '🔐 Stripe Webhook',
    hint: 'Colle ici le Webhook Signing Secret (whsec_…) depuis Stripe → Webhooks → ton endpoint',
    fields: [
      { key: 'stripe_webhook_secret', label: 'Webhook Signing Secret', placeholder: 'whsec_…' },
    ],
  },
  {
    section: '⭐ Liens Paiement — Premium',
    hint: 'Crée tes liens dans Stripe → Payment Links. Ajoute metadata : plan=PREMIUM, duration=MONTHLY ou ANNUAL',
    fields: [
      { key: 'stripe_link_premium_monthly', label: 'Lien Premium Mensuel', placeholder: 'https://buy.stripe.com/…' },
      { key: 'stripe_link_premium_annual',  label: 'Lien Premium Annuel',  placeholder: 'https://buy.stripe.com/…' },
      { key: 'price_premium_monthly',       label: 'Prix affiché mensuel', placeholder: '3,99€' },
      { key: 'price_premium_annual',        label: 'Prix affiché annuel',  placeholder: '34,99€' },
    ],
  },
  {
    section: '👑 Liens Paiement — VIP',
    hint: 'Metadata sur le lien : plan=VIP, duration=MONTHLY ou ANNUAL',
    fields: [
      { key: 'stripe_link_vip_monthly',  label: 'Lien VIP Mensuel', placeholder: 'https://buy.stripe.com/…' },
      { key: 'stripe_link_vip_annual',   label: 'Lien VIP Annuel',  placeholder: 'https://buy.stripe.com/…' },
      { key: 'price_vip_monthly',        label: 'Prix affiché mensuel', placeholder: '6,99€' },
      { key: 'price_vip_annual',         label: 'Prix affiché annuel',  placeholder: '59,99€' },
    ],
  },
  {
    section: '🚀 Packs Quota IA',
    hint: 'Metadata sur le lien : quota=50 (ou 200, 500). Le client_reference_id est ajouté automatiquement.',
    fields: [
      { key: 'stripe_link_quota_50',  label: 'Lien Pack 50 requêtes',  placeholder: 'https://buy.stripe.com/…' },
      { key: 'quota_50_price',        label: 'Prix Pack 50',           placeholder: '0,99€' },
      { key: 'stripe_link_quota_200', label: 'Lien Pack 200 requêtes', placeholder: 'https://buy.stripe.com/…' },
      { key: 'quota_200_price',       label: 'Prix Pack 200',          placeholder: '2,99€' },
      { key: 'stripe_link_quota_500', label: 'Lien Pack 500 requêtes', placeholder: 'https://buy.stripe.com/…' },
      { key: 'quota_500_price',       label: 'Prix Pack 500',          placeholder: '5,99€' },
    ],
  },
  {
    section: '⚙️ Limites IA par plan',
    hint: 'Requêtes Ollama autorisées par jour et par mois. VIP = illimité (valeur ignorée).',
    fields: [
      { key: 'limit_free_daily',       label: 'FREE — limite/jour',     placeholder: '5' },
      { key: 'limit_free_monthly',     label: 'FREE — limite/mois',     placeholder: '30' },
      { key: 'limit_premium_daily',    label: 'PREMIUM — limite/jour',  placeholder: '100' },
      { key: 'limit_premium_monthly',  label: 'PREMIUM — limite/mois',  placeholder: '1000' },
    ],
  },
];

export default function AdminBillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  // Changement de plan manuel
  const [patchUserId,   setPatchUserId]   = useState('');
  const [patchPlan,     setPatchPlan]     = useState('PREMIUM');
  const [patchMonths,   setPatchMonths]   = useState(1);
  const [patchQuota,    setPatchQuota]    = useState(0);
  const [patching,      setPatching]      = useState(false);
  const [patched,       setPatched]       = useState(false);

  useEffect(() => {
    fetch('/api/admin/billing')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setData(d);
          setForm(d.config || {});
        }
      });
  }, []);

  async function save() {
    setSaving(true);
    await fetch('/api/admin/billing', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function patchUser() {
    if (!patchUserId.trim()) return;
    setPatching(true);
    await fetch('/api/admin/billing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId:     patchUserId.trim(),
        plan:       patchPlan,
        planMonths: patchMonths,
        extraQuota: patchQuota || undefined,
      }),
    });
    setPatching(false);
    setPatched(true);
    setTimeout(() => setPatched(false), 2500);
  }

  if (!data) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-muted)' }} />
    </div>
  );

  const totalUsers = data.planStats.reduce((s, p) => s + p._count.id, 0);

  return (
    <div className="max-w-3xl fade-in">
      <div className="flex items-center gap-2.5 mb-6">
        <CreditCard className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        <h1 className="text-xl font-semibold">Facturation & IA</h1>
      </div>

      {/* Stats plans */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {['FREE','PREMIUM','VIP'].map(p => {
          const stat = data.planStats.find(s => s.plan === p);
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

      {/* Webhook URL info */}
      <div className="card p-4 mb-6" style={{ backgroundColor: 'rgba(59,130,246,0.04)', borderColor: 'rgba(59,130,246,0.2)' }}>
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">URL du webhook à configurer dans Stripe</p>
            <code className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text)' }}>
              {typeof window !== 'undefined' ? window.location.origin : 'https://ton-domaine.railway.app'}/api/billing/webhook
            </code>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Stripe → Développeurs → Webhooks → Ajouter un endpoint → Événements : <code>checkout.session.completed</code>, <code>customer.subscription.deleted</code>
            </p>
          </div>
        </div>
      </div>

      {/* Config form */}
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
        {saved ? <><Check className="w-4 h-4" /> Sauvegardé</> : saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Sauvegarde…</> : <><Save className="w-4 h-4" /> Sauvegarder la configuration</>}
      </button>

      {/* Changement de plan manuel */}
      <div className="card p-5">
        <h2 className="font-semibold text-sm mb-1 flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} /> Changer le plan d&apos;un utilisateur
        </h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Activation manuelle (tests, codes promo, SAV…)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>ID utilisateur</label>
            <input value={patchUserId} onChange={e => setPatchUserId(e.target.value)} placeholder="cuid…" className="input-field text-xs" />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Plan</label>
            <select value={patchPlan} onChange={e => setPatchPlan(e.target.value)} className="input-field text-xs">
              <option value="FREE">FREE</option>
              <option value="PREMIUM">PREMIUM</option>
              <option value="VIP">VIP</option>
            </select>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Durée (mois)</label>
            <input type="number" min={1} max={24} value={patchMonths} onChange={e => setPatchMonths(parseInt(e.target.value))} className="input-field text-xs" />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Quota bonus (requêtes)</label>
            <input type="number" min={0} value={patchQuota} onChange={e => setPatchQuota(parseInt(e.target.value))} className="input-field text-xs" />
          </div>
        </div>
        <button onClick={patchUser} disabled={patching || !patchUserId}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
          style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}>
          {patched ? <><Check className="w-4 h-4 text-emerald-500" /> Mis à jour</> : patching ? <><Loader2 className="w-4 h-4 animate-spin" /> Mise à jour…</> : <><Shield className="w-4 h-4" /> Appliquer</>}
        </button>
      </div>
    </div>
  );
}
