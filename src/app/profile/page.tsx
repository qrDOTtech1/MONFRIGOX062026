'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { useTheme } from '@/components/ThemeProvider';
import { UserCircle, LogOut, Shield, Heart, ShoppingCart, Refrigerator, Sun, Moon, Save, Check, AlertTriangle, Baby, Users, History, Sparkles, ChefHat, Zap, Crown, Star, Plus } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

interface Stats {
  fridgeCount: number;
  favCount: number;
  listCount: number;
}

interface CookLogEntry {
  id: string;
  cookedAt: string;
  servings: number;
  recipe: { id: string; name: string; imageUrl: string; cuisine: string; prepTime: number; ingredients: Array<{ingredient:{emoji:string}}> };
}

const ALLERGENS = [
  { key: 'gluten', label: 'Gluten', emoji: '🌾' },
  { key: 'lactose', label: 'Lactose', emoji: '🥛' },
  { key: 'arachides', label: 'Arachides', emoji: '🥜' },
  { key: 'fruits-a-coque', label: 'Fruits à coque', emoji: '🌰' },
  { key: 'oeufs', label: 'Oeufs', emoji: '🥚' },
  { key: 'poisson', label: 'Poisson', emoji: '🐟' },
  { key: 'crustaces', label: 'Crustacés', emoji: '🦐' },
  { key: 'soja', label: 'Soja', emoji: '🫘' },
  { key: 'celeri', label: 'Céleri', emoji: '🥬' },
  { key: 'moutarde', label: 'Moutarde', emoji: '🟡' },
  { key: 'sesame', label: 'Sésame', emoji: '⚪' },
  { key: 'sulfites', label: 'Sulfites', emoji: '🍷' },
  { key: 'lupin', label: 'Lupin', emoji: '🌱' },
  { key: 'mollusques', label: 'Mollusques', emoji: '🐚' },
];

const DIET_MODES = [
  { key: '', label: 'Aucun régime', emoji: '🍽️' },
  { key: 'vegetarien', label: 'Végétarien', emoji: '🥗' },
  { key: 'vegan', label: 'Vegan', emoji: '🌱' },
  { key: 'halal', label: 'Halal', emoji: '☪️' },
  { key: 'casher', label: 'Casher', emoji: '✡️' },
  { key: 'sans-porc', label: 'Sans porc', emoji: '🚫🐷' },
  { key: 'sans-sucre', label: 'Sans sucre', emoji: '🚫🍬' },
  { key: 'keto', label: 'Keto / Low carb', emoji: '🥑' },
];

const KID_MODES = [
  { key: '', label: 'Adulte', desc: 'Recettes pour adultes' },
  { key: 'enfant', label: 'Enfant', desc: 'Portions et recettes adaptées' },
  { key: 'bebe', label: 'Bébé', desc: 'Purées, textures adaptées à l\'âge' },
];

export default function ProfilePage() {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats>({ fridgeCount: 0, favCount: 0, listCount: 0 });
  const [activeTab, setActiveTab] = useState<'prefs'|'history'>('prefs');
  const [cookLogs, setCookLogs] = useState<CookLogEntry[]>([]);
  const [cookCounts, setCookCounts] = useState<Record<string,number>>({});
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Billing
  interface BillingStatus {
    plan: string; extraQuota: number; isUnlimited: boolean;
    aiCallsToday: number; aiCallsMonth: number;
    limitDaily: number; limitMonthly: number;
    planExpiresAt: string | null;
    links: Record<string, string>;
    prices: Record<string, string>;
  }
  const [billing, setBilling] = useState<BillingStatus | null>(null);

  // Préférences
  const [allergens, setAllergens] = useState<string[]>([]);
  const [dietMode, setDietMode] = useState('');
  const [kidMode, setKidMode] = useState('');
  const [kidAgeMonths, setKidAgeMonths] = useState<number | null>(null);
  const [defaultServings, setDefaultServings] = useState(4);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => d && setUser(d.user));
    fetch('/api/profile/stats').then(r => r.ok ? r.json() : null).then(d => d && setStats(d));
    fetch('/api/billing/status').then(r => r.ok ? r.json() : null).then(d => d && setBilling(d));
    fetch('/api/profile').then(r => r.ok ? r.json() : null).then(d => {
      if (d) {
        try { setAllergens(d.allergens ? JSON.parse(d.allergens) : []); } catch { setAllergens([]); }
        setDietMode(d.dietMode || '');
        setKidMode(d.kidMode || '');
        setKidAgeMonths(d.kidAgeMonths);
        setDefaultServings(d.defaultServings || 4);
      }
    });
  }, []);

  async function loadHistory() {
    if (historyLoaded) return;
    const res = await fetch('/api/cook-log?limit=30');
    if (res.ok) {
      const d = await res.json();
      setCookLogs(d.logs || []);
      const map: Record<string,number> = {};
      (d.counts || []).forEach((c: {recipeId:string; _count:{id:number}}) => { map[c.recipeId] = c._count.id; });
      setCookCounts(map);
    }
    setHistoryLoaded(true);
  }

  function toggleAllergen(key: string) {
    setAllergens(prev => prev.includes(key) ? prev.filter(a => a !== key) : [...prev, key]);
  }

  async function savePreferences() {
    setSaving(true);
    await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allergens: JSON.stringify(allergens),
        dietMode,
        kidMode,
        kidAgeMonths: kidMode === 'bebe' || kidMode === 'enfant' ? kidAgeMonths : null,
        defaultServings,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  async function deleteAccount() {
    if (!confirm('Supprimer ton compte? Cette action est irréversible.')) return;
    const res = await fetch('/api/profile', { method: 'DELETE' });
    if (res.ok) { await logout(); }
  }

  return (
    <AppShell>
      <div className="flex items-center gap-2.5 mb-6">
        <UserCircle className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        <h1 className="text-lg font-semibold">Mon profil</h1>
      </div>

      {user && (
        <>
          {/* Info utilisateur */}
          <div className="card p-5 text-center mb-5">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--bg-inset)' }}>
              <span className="text-2xl font-semibold" style={{ color: 'var(--text-secondary)' }}>{user.name.charAt(0).toUpperCase()}</span>
            </div>
            <h2 className="text-base font-semibold">{user.name}</h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
            {user.role === 'ADMIN' && (
              <span className="inline-flex items-center gap-1 mt-2 badge" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>
                <Shield className="w-3 h-3" /> Admin
              </span>
            )}
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Membre depuis {new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="card p-3.5 text-center">
              <Refrigerator className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--text-muted)' }} />
              <p className="text-base font-semibold">{stats.fridgeCount}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Ingrédients</p>
            </div>
            <div className="card p-3.5 text-center">
              <Heart className="w-4 h-4 mx-auto mb-1 text-red-400" />
              <p className="text-base font-semibold">{stats.favCount}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Favoris</p>
            </div>
            <div className="card p-3.5 text-center">
              <ShoppingCart className="w-4 h-4 mx-auto mb-1 text-amber-400" />
              <p className="text-base font-semibold">{stats.listCount}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Listes</p>
            </div>
          </div>

          {/* ── Plan & Usage ── */}
          {billing && (
            <div className="card p-4 mb-5">
              {/* Header plan */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {billing.plan === 'VIP'     && <Crown className="w-4 h-4 text-purple-500" />}
                  {billing.plan === 'PREMIUM' && <Star  className="w-4 h-4 text-amber-500" />}
                  {billing.plan === 'FREE'    && <Zap   className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
                  <span className="font-semibold text-sm">
                    Plan {billing.plan === 'FREE' ? 'Gratuit' : billing.plan === 'VIP' ? 'VIP 👑' : '⭐ Premium'}
                  </span>
                </div>
                {billing.planExpiresAt && (
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    expire {new Date(billing.planExpiresAt).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>

              {/* Usage bars */}
              {!billing.isUnlimited && (
                <div className="space-y-2 mb-4">
                  {[
                    { label: `Aujourd'hui`, used: billing.aiCallsToday, max: billing.limitDaily },
                    { label: 'Ce mois',     used: billing.aiCallsMonth, max: billing.limitMonthly },
                  ].map(row => {
                    const pct = Math.min(100, Math.round(row.used / row.max * 100));
                    const danger = pct >= 80;
                    return (
                      <div key={row.label}>
                        <div className="flex justify-between text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>
                          <span>Requêtes IA — {row.label}</span>
                          <span className={danger ? 'text-amber-500 font-semibold' : ''}>{row.used}/{row.max}</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-inset)' }}>
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: danger ? '#f59e0b' : 'var(--accent)' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {billing.isUnlimited && (
                <p className="text-xs mb-4 text-purple-500 font-medium">✨ Requêtes IA illimitées</p>
              )}

              {/* Extra quota */}
              {billing.extraQuota > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3"
                  style={{ backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <Zap className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">
                    <strong>{billing.extraQuota}</strong> requête{billing.extraQuota > 1 ? 's' : ''} bonus disponible{billing.extraQuota > 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {/* CTA upgrade */}
              {billing.plan === 'FREE' && (
                <div className="space-y-2">
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Passer à un plan payant :</p>
                  <div className="grid grid-cols-2 gap-2">
                    {billing.links.premiumMonthly && (
                      <a href={billing.links.premiumMonthly} target="_blank" rel="noreferrer"
                        className="flex flex-col items-center py-3 px-2 rounded-xl text-center transition-all hover:scale-[1.02]"
                        style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1.5px solid rgba(245,158,11,0.3)' }}>
                        <Star className="w-4 h-4 text-amber-500 mb-1" />
                        <span className="text-xs font-semibold">Premium</span>
                        <span className="text-[10px] text-amber-500">{billing.prices.premiumMonthly}/mois</span>
                      </a>
                    )}
                    {billing.links.premiumAnnual && (
                      <a href={billing.links.premiumAnnual} target="_blank" rel="noreferrer"
                        className="flex flex-col items-center py-3 px-2 rounded-xl text-center transition-all hover:scale-[1.02]"
                        style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1.5px solid rgba(245,158,11,0.3)' }}>
                        <Star className="w-4 h-4 text-amber-500 mb-1" />
                        <span className="text-xs font-semibold">Premium annuel</span>
                        <span className="text-[10px] text-amber-500">{billing.prices.premiumAnnual}/an</span>
                      </a>
                    )}
                    {billing.links.vipMonthly && (
                      <a href={billing.links.vipMonthly} target="_blank" rel="noreferrer"
                        className="flex flex-col items-center py-3 px-2 rounded-xl text-center transition-all hover:scale-[1.02]"
                        style={{ backgroundColor: 'rgba(168,85,247,0.08)', border: '1.5px solid rgba(168,85,247,0.3)' }}>
                        <Crown className="w-4 h-4 text-purple-500 mb-1" />
                        <span className="text-xs font-semibold">VIP Famille</span>
                        <span className="text-[10px] text-purple-500">{billing.prices.vipMonthly}/mois</span>
                      </a>
                    )}
                    {billing.links.vipAnnual && (
                      <a href={billing.links.vipAnnual} target="_blank" rel="noreferrer"
                        className="flex flex-col items-center py-3 px-2 rounded-xl text-center transition-all hover:scale-[1.02]"
                        style={{ backgroundColor: 'rgba(168,85,247,0.08)', border: '1.5px solid rgba(168,85,247,0.3)' }}>
                        <Crown className="w-4 h-4 text-purple-500 mb-1" />
                        <span className="text-xs font-semibold">VIP annuel</span>
                        <span className="text-[10px] text-purple-500">{billing.prices.vipAnnual}/an</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Acheter quota bonus */}
              {(billing.links.quota50 || billing.links.quota200 || billing.links.quota500) && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <p className="text-[10px] font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                    <Plus className="w-3 h-3 inline mr-0.5" />
                    Acheter des requêtes supplémentaires :
                  </p>
                  <div className="flex gap-2">
                    {[
                      { k: 'quota50',  label: '50',  price: billing.prices.quota50 },
                      { k: 'quota200', label: '200', price: billing.prices.quota200 },
                      { k: 'quota500', label: '500', price: billing.prices.quota500 },
                    ].filter(p => billing.links[p.k]).map(pack => (
                      <a key={pack.k} href={billing.links[pack.k]} target="_blank" rel="noreferrer"
                        className="flex-1 py-2 rounded-lg text-center transition-all hover:scale-[1.02]"
                        style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
                        <p className="text-xs font-semibold">{pack.label} req.</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{pack.price}</p>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab switcher */}
          <div className="flex rounded-xl p-0.5 mb-5" style={{ backgroundColor: 'var(--bg-inset)' }}>
            {[
              { id: 'prefs' as const, label: 'Préférences', icon: Sparkles },
              { id: 'history' as const, label: 'Historique', icon: History },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => { setActiveTab(id); if (id === 'history') loadHistory(); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all"
                style={activeTab === id
                  ? { backgroundColor: 'var(--bg-raised)', color: 'var(--text)', boxShadow: '0 1px 3px rgba(0,0,0,.12)' }
                  : { color: 'var(--text-muted)' }}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          {/* ─── HISTORIQUE TAB ─── */}
          {activeTab === 'history' && (
            <div className="mb-5">
              {/* Onboarding redo button */}
              <button onClick={() => router.push('/onboarding')}
                className="w-full flex items-center gap-3 p-4 rounded-xl mb-5 transition-colors hover:bg-[var(--bg-inset)] text-left"
                style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--bg-inset)' }}>
                  <ChefHat className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Refaire l&apos;onboarding</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Mettre à jour tes goûts, allergies, régime</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-lg" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)' }}>→</span>
              </button>

              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <History className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                Mes cuisines récentes
              </h3>
              {cookLogs.length === 0 ? (
                <div className="text-center py-10">
                  <ChefHat className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucune recette cuisinée pour l&apos;instant</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Termine le mode cuisine pour que ça apparaisse ici</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cookLogs.map(log => (
                    <button key={log.id} onClick={() => router.push(`/recipes/${log.recipe.id}`)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors hover:bg-[var(--bg-inset)]"
                      style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border-subtle)' }}>
                      <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 overflow-hidden text-xl"
                        style={{ backgroundColor: 'var(--bg-inset)' }}>
                        {log.recipe.imageUrl
                          ? <img src={log.recipe.imageUrl} alt="" className="w-full h-full object-cover" />
                          : log.recipe.ingredients?.[0]?.ingredient?.emoji || '🍽️'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{log.recipe.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {new Date(log.cookedAt).toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' })}
                          {cookCounts[log.recipe.id] > 1 && <span className="ml-2 text-emerald-500 font-medium">×{cookCounts[log.recipe.id]}</span>}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── PRÉFÉRENCES TAB ─── */}
          {activeTab === 'prefs' && <>

          {/* === PRÉFÉRENCES ALIMENTAIRES === */}
          <div className="card p-5 mb-5">
            <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Mes allergènes
            </h2>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              Les recettes contenant ces allergènes seront signalées
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ALLERGENS.map(a => (
                <button
                  key={a.key}
                  onClick={() => toggleAllergen(a.key)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                    allergens.includes(a.key) ? 'ring-1 ring-red-400' : ''
                  }`}
                  style={{
                    backgroundColor: allergens.includes(a.key) ? 'rgba(239,68,68,0.1)' : 'var(--bg-inset)',
                    color: allergens.includes(a.key) ? 'var(--text)' : 'var(--text-secondary)',
                    border: `1px solid ${allergens.includes(a.key) ? 'rgba(239,68,68,0.3)' : 'var(--border-subtle)'}`,
                  }}
                >
                  <span>{a.emoji}</span> {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-5 mb-5">
            <h2 className="font-semibold text-sm mb-3">Régime alimentaire</h2>
            <div className="grid grid-cols-2 gap-1.5">
              {DIET_MODES.map(d => (
                <button
                  key={d.key}
                  onClick={() => setDietMode(d.key)}
                  className="px-3 py-2.5 rounded-lg text-left text-xs font-medium transition-all flex items-center gap-2"
                  style={{
                    backgroundColor: dietMode === d.key ? 'var(--accent)' : 'var(--bg-inset)',
                    color: dietMode === d.key ? 'var(--accent-text)' : 'var(--text-secondary)',
                    border: `1px solid ${dietMode === d.key ? 'var(--accent)' : 'var(--border-subtle)'}`,
                  }}
                >
                  <span>{d.emoji}</span> {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-5 mb-5">
            <h2 className="font-semibold text-sm mb-1 flex items-center gap-2">
              <Baby className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              Mode famille
            </h2>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              Adapte les recettes et portions pour les enfants et bébés
            </p>
            <div className="space-y-1.5 mb-3">
              {KID_MODES.map(k => (
                <button
                  key={k.key}
                  onClick={() => setKidMode(k.key)}
                  className="w-full px-3.5 py-3 rounded-lg text-left text-sm transition-all flex items-center justify-between"
                  style={{
                    backgroundColor: kidMode === k.key ? 'var(--accent)' : 'var(--bg-inset)',
                    color: kidMode === k.key ? 'var(--accent-text)' : 'var(--text)',
                    border: `1px solid ${kidMode === k.key ? 'var(--accent)' : 'var(--border-subtle)'}`,
                  }}
                >
                  <div>
                    <p className="font-medium">{k.label}</p>
                    <p className="text-[10px] mt-0.5" style={{ opacity: 0.7 }}>{k.desc}</p>
                  </div>
                  {kidMode === k.key && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>

            {(kidMode === 'bebe' || kidMode === 'enfant') && (
              <div className="fade-in">
                <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Âge de l&apos;enfant (en mois)
                </label>
                <input
                  type="number"
                  min={0}
                  max={216}
                  value={kidAgeMonths ?? ''}
                  onChange={e => setKidAgeMonths(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Ex: 8 mois"
                  className="input-field"
                />
                {kidMode === 'bebe' && kidAgeMonths !== null && (
                  <div className="mt-2 rounded-lg p-2.5 text-xs" style={{ backgroundColor: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', color: 'var(--text-secondary)' }}>
                    {kidAgeMonths < 4 && "⚠️ Avant 4 mois, seul le lait est recommandé. Consultez votre pédiatre."}
                    {kidAgeMonths >= 4 && kidAgeMonths < 6 && "🍼 Début de diversification possible : purées lisses de légumes et fruits."}
                    {kidAgeMonths >= 6 && kidAgeMonths < 9 && "🥕 Purées, compotes, céréales infantiles. Introduction protéines en petite quantité."}
                    {kidAgeMonths >= 9 && kidAgeMonths < 12 && "🍝 Textures écrasées, petits morceaux fondants. Variété de protéines."}
                    {kidAgeMonths >= 12 && kidAgeMonths < 36 && "🍽️ Repas mixés ou en petits morceaux. L'enfant mange presque comme un adulte."}
                    {kidAgeMonths >= 36 && "👧 Portions enfant des recettes classiques."}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card p-5 mb-5">
            <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              Nombre de personnes par défaut
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDefaultServings(Math.max(1, defaultServings - 1))}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold"
                style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}
              >−</button>
              <span className="text-2xl font-semibold w-12 text-center">{defaultServings}</span>
              <button
                onClick={() => setDefaultServings(Math.min(20, defaultServings + 1))}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold"
                style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}
              >+</button>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>personne{defaultServings > 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Sauvegarder préférences */}
          <button onClick={savePreferences} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 mb-5 disabled:opacity-40">
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Préférences sauvegardées' : saving ? 'Sauvegarde...' : 'Sauvegarder mes préférences'}
          </button>

          {/* Actions */}
          <div className="space-y-2">
            <button onClick={toggle} className="btn-secondary w-full flex items-center justify-center gap-2">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            </button>

            {user.role === 'ADMIN' && (
              <button onClick={() => router.push('/admin')} className="btn-secondary w-full flex items-center justify-center gap-2">
                <Shield className="w-4 h-4" /> Portail Admin
              </button>
            )}

            <button onClick={logout} className="btn-secondary w-full flex items-center justify-center gap-2">
              <LogOut className="w-4 h-4" /> Se déconnecter
            </button>

            <button onClick={deleteAccount} className="w-full py-3 text-sm text-red-500 hover:text-red-400 transition-colors">
              Supprimer mon compte
            </button>
          </div>

          </> /* end prefs tab */}
        </>
      )}
    </AppShell>
  );
}
