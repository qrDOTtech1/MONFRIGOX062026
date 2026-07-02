'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import NotificationsToggle from '@/components/NotificationsToggle';
import { useTheme } from '@/components/ThemeProvider';
import InfoBubble from '@/components/InfoBubble';
import { useT, LANGUAGES } from '@/lib/i18n';
import { UserCircle, LogOut, Shield, Heart, ShoppingCart, Refrigerator, Sun, Moon, Save, Check, AlertTriangle, Baby, Users, History, Sparkles, ChefHat, Zap, Crown, Star, Plus, Loader2, CalendarDays, ChevronRight, PiggyBank, Leaf, Flame, Receipt, Tag, Home } from 'lucide-react';

// Bouton qui crée une Checkout Session Stripe et redirige
function CheckoutButton({ priceId, label, sub, color, Icon, compact = false }:
  { priceId: string; label: string; sub: string; color: string; Icon?: React.ElementType; compact?: boolean }) {
  const [loading, setLoading] = useState(false);
  async function go() {
    setLoading(true);
    // Code promo pré-sélectionné (ex: équipe Coupe du Monde) mémorisé sur la landing
    let promoCode: string | undefined;
    try { promoCode = localStorage.getItem('wc_promo') || undefined; } catch { /* ignore */ }
    const res = await fetch('/api/billing/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId, promoCode }),
    });
    const d = await res.json();
    if (d.url) window.location.href = d.url;
    else { alert(d.error || 'Stripe error'); setLoading(false); }
  }
  const amber  = color === 'amber';
  const purple = color === 'purple';
  if (compact) return (
    <button onClick={go} disabled={loading}
      className="flex-1 py-2 rounded-lg text-center transition-all hover:scale-[1.02] disabled:opacity-50"
      style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : <>
        <p className="text-xs font-semibold">{label}</p>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{sub}</p>
      </>}
    </button>
  );
  return (
    <button onClick={go} disabled={loading}
      className="flex flex-col items-center py-3 px-2 rounded-xl text-center transition-all hover:scale-[1.02] disabled:opacity-60"
      style={{
        backgroundColor: amber ? 'rgba(245,158,11,0.08)' : purple ? 'rgba(168,85,247,0.08)' : 'var(--bg-inset)',
        border: `1.5px solid ${amber ? 'rgba(245,158,11,0.3)' : purple ? 'rgba(168,85,247,0.3)' : 'var(--border)'}`,
      }}>
      {loading
        ? <Loader2 className="w-4 h-4 animate-spin mb-1" style={{ color: amber ? 'rgb(245,158,11)' : 'rgb(168,85,247)' }} />
        : Icon && <Icon className={`w-4 h-4 mb-1 ${amber ? 'text-amber-500' : 'text-purple-500'}`} />}
      <span className="text-xs font-semibold">{label}</span>
      <span className={`text-[10px] ${amber ? 'text-amber-500' : 'text-purple-500'}`}>{sub}</span>
    </button>
  );
}

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
  const { t, lang, setLang, isLoading } = useT();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats>({ fridgeCount: 0, favCount: 0, listCount: 0 });
  const [impact, setImpact] = useState<{ sessionsCooked: number; sessionsThisMonth: number; mealsCooked: number; moneyCooked: number; savedVsTakeout: number; avgCaloriesPerServing: number; topCuisine: string | null; trackedExpiry: number; kgCooked: number; kgCookedMonth: number; kgSaved: number; kgSavedMonth: number; co2Saved: number; co2SavedMonth: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'prefs'|'history'|'badges'>('prefs');
  const [cookLogs, setCookLogs] = useState<CookLogEntry[]>([]);
  const [cookCounts, setCookCounts] = useState<Record<string,number>>({});
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [badges, setBadges] = useState<Array<{ code: string; emoji: string; label: string; desc: string; unlocked: boolean; unlockedAt: string | null; topSecret?: boolean }>>([]);
  const [badgesLoaded, setBadgesLoaded] = useState(false);
  const badgeClickCountRef = useRef(0);
  const badgeClickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [spending, setSpending] = useState<{ monthlyHistory: Array<{ month: string; total: number; sessions: number }>; totalSpent: number } | null>(null);
  const [spendingLoaded, setSpendingLoaded] = useState(false);

  // Billing
  interface BillingStatus {
    plan: string; extraQuota: number; isUnlimited: boolean;
    aiCallsWeek: number;
    limitWeekly: number;
    planExpiresAt: string | null;
    priceIds: Record<string, string>;
    prices: Record<string, string>;
  }
  const [billing, setBilling] = useState<BillingStatus | null>(null);

  // Code promo
  const [promoCode, setPromoCode] = useState('');
  const [promoState, setPromoState] = useState<'idle'|'validating'|'valid'|'applying'|'done'|'error'>('idle');
  const [promoMsg, setPromoMsg] = useState('');
  const [promoPreview, setPromoPreview] = useState<{ planGranted: string; durationMonths: number } | null>(null);

  async function validatePromo() {
    if (!promoCode.trim()) return;
    setPromoState('validating');
    setPromoMsg('');
    const res = await fetch('/api/promo/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: promoCode }) });
    const data = await res.json();
    if (!res.ok) { setPromoState('error'); setPromoMsg(data.error || 'Code invalide'); return; }
    setPromoState('valid');
    setPromoMsg(data.message);
    setPromoPreview({ planGranted: data.planGranted, durationMonths: data.durationMonths });
  }

  async function applyPromo() {
    setPromoState('applying');
    const res = await fetch('/api/promo/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: promoCode }) });
    const data = await res.json();
    if (!res.ok) { setPromoState('error'); setPromoMsg(data.error || 'Error'); return; }
    setPromoState('done');
    setPromoMsg(data.message);
    // Rafraîchir billing
    fetch('/api/billing/status').then(r => r.ok ? r.json() : null).then(d => d && setBilling(d));
  }

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
    fetch('/api/profile/impact').then(r => r.ok ? r.json() : null).then(d => d && setImpact(d));
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
    if (!spendingLoaded) {
      fetch('/api/profile/spending').then(r => r.ok ? r.json() : null).then(d => { if (d) setSpending(d); }).catch(() => {});
      setSpendingLoaded(true);
    }
  }

  async function loadBadges() {
    if (badgesLoaded) return;
    const res = await fetch('/api/badges');
    if (res.ok) setBadges(await res.json());
    setBadgesLoaded(true);
  }

  // 7 clics sur le compteur de badges débloquent un easter egg — jamais indiqué dans l'UI
  function handleBadgeHeaderClick() {
    badgeClickCountRef.current += 1;
    if (badgeClickTimeoutRef.current) clearTimeout(badgeClickTimeoutRef.current);
    badgeClickTimeoutRef.current = setTimeout(() => { badgeClickCountRef.current = 0; }, 2000);

    if (badgeClickCountRef.current >= 7) {
      badgeClickCountRef.current = 0;
      fetch('/api/badges/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'secret_finder' }),
      }).then(r => r.ok ? r.json() : null).then(data => {
        if (data?.unlocked) {
          fetch('/api/badges').then(r => r.ok ? r.json() : null).then(fresh => { if (fresh) setBadges(fresh); });
        }
      }).catch(() => {});
    }
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
    if (!confirm(t('profile.delete.confirm'))) return;
    const res = await fetch('/api/profile', { method: 'DELETE' });
    if (res.ok) { await logout(); }
  }

  return (
    <AppShell>
      <div className="flex items-center gap-2.5 mb-6">
        <UserCircle className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        <h1 className="text-lg font-semibold">{t('profile.title')}</h1>
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
              {t('profile.memberSince', { date: new Date(user.createdAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'long', year: 'numeric' }) })}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="card p-3.5 text-center">
              <Refrigerator className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--text-muted)' }} />
              <p className="text-base font-semibold">{stats.fridgeCount}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{t('profile.stats.ingredients')}</p>
            </div>
            <div className="card p-3.5 text-center">
              <Heart className="w-4 h-4 mx-auto mb-1 text-red-400" />
              <p className="text-base font-semibold">{stats.favCount}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{t('profile.stats.favorites')}</p>
            </div>
            <div className="card p-3.5 text-center">
              <ShoppingCart className="w-4 h-4 mx-auto mb-1 text-amber-400" />
              <p className="text-base font-semibold">{stats.listCount}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{t('profile.stats.lists')}</p>
            </div>
          </div>

          {/* ── Mon impact ── */}
          {impact && impact.sessionsCooked > 0 && (
            <div className="card p-4 mb-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <h2 className="font-semibold text-sm">{t('profile.impact')}</h2>
                <span className="text-[10px] ml-auto" style={{ color: 'var(--text-muted)' }}>
                  {t('profile.impact.thisMonth', { n: impact.sessionsThisMonth })}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="rounded-lg p-3 flex items-center gap-2.5" style={{ backgroundColor: 'rgba(16,185,129,0.08)' }}>
                  <PiggyBank className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-lg font-bold leading-none">{impact.savedVsTakeout} €</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('profile.impact.savedVsDelivery')}</p>
                  </div>
                </div>
                <div className="rounded-lg p-3 flex items-center gap-2.5" style={{ backgroundColor: 'rgba(99,102,241,0.08)' }}>
                  <ChefHat className="w-5 h-5 text-indigo-400 shrink-0" />
                  <div>
                    <p className="text-lg font-bold leading-none">{impact.sessionsCooked}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('profile.impact.mealsCooked')}</p>
                  </div>
                </div>
                <div className="rounded-lg p-3 flex items-center gap-2.5" style={{ backgroundColor: 'rgba(234,179,8,0.08)' }}>
                  <Leaf className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-lg font-bold leading-none">{impact.trackedExpiry}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('profile.impact.antiWasteTracked')}</p>
                  </div>
                </div>
                <div className="rounded-lg p-3 flex items-center gap-2.5" style={{ backgroundColor: 'rgba(239,68,68,0.06)' }}>
                  <Flame className="w-5 h-5 text-orange-500 shrink-0" />
                  <div>
                    <p className="text-lg font-bold leading-none">{impact.avgCaloriesPerServing || '—'}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('profile.impact.avgKcal')}</p>
                  </div>
                </div>
              </div>

              {/* Bilan anti-gaspi du mois */}
              {(impact.kgSavedMonth ?? 0) > 0 && (
                <div className="rounded-xl p-3 mb-2"
                  style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(34,197,94,0.05))', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                    <Leaf className="w-3.5 h-3.5 text-emerald-500" /> {t('profile.impact.antiWasteMonth', { month: new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'long' }) })}
                  </p>
                  <div className="flex justify-around text-center">
                    <div>
                      <p className="text-base font-bold text-emerald-500">{impact.kgSavedMonth} kg</p>
                      <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{t('profile.impact.foodSaved')}</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-emerald-500">{impact.co2SavedMonth} kg</p>
                      <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{t('profile.impact.co2Avoided')}</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-emerald-500">{impact.kgCookedMonth} kg</p>
                      <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{t('profile.impact.cookedMonth')}</p>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
                {t('profile.impact.estimate')}{impact.topCuisine ? ` · ${t('profile.impact.favCuisine', { cuisine: impact.topCuisine })}` : ''}.
              </p>
            </div>
          )}

          {/* ── Notifications ── */}
          <NotificationsToggle />

          {/* ── Repas & Courses ── */}
          <button onClick={() => router.push('/shopping')}
            className="w-full card p-4 mb-3 flex items-center gap-3 text-left hover:scale-[1.01] transition-all">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
              <CalendarDays className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                {t('profile.meals')}
                <InfoBubble
                  align="left"
                  label={t('profile.meals')}
                  text={t('profile.meals.info')}
                />
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{t('profile.meals.desc')}</p>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </button>

          {/* ── Mes carnets ── */}
          <button onClick={() => router.push('/collections')}
            className="w-full card p-4 mb-3 flex items-center gap-3 text-left hover:scale-[1.01] transition-all">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'var(--bg-inset)' }}>
              <Star className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{t('profile.collections')}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{t('profile.collections.desc')}</p>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </button>

          {/* ── Mon Foyer ── */}
          <button onClick={() => router.push('/household')}
            className="w-full card p-4 mb-3 flex items-center gap-3 text-left hover:scale-[1.01] transition-all"
            style={{ border: '1px solid rgba(22,163,74,0.2)', backgroundColor: 'rgba(22,163,74,0.04)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'rgba(22,163,74,0.12)' }}>
              <Home className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Mon Foyer</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Partager le frigo avec famille ou colocs</p>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </button>

          {/* ── Coach IA ── */}
          <button onClick={() => router.push('/coach')}
            className="w-full card p-4 mb-5 flex items-center gap-3 text-left hover:scale-[1.01] transition-all"
            style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.06), rgba(59,130,246,0.06))' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, rgb(168,85,247), rgb(59,130,246))' }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{t('profile.coach')}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{t('profile.coach.desc')}</p>
            </div>
            <Crown className="w-4 h-4 text-purple-400" />
          </button>

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
                    {t('profile.plan')} {billing.plan === 'FREE' ? t('profile.plan.free') : billing.plan === 'VIP' ? t('profile.plan.vip') : t('profile.plan.premium')}
                  </span>
                </div>
                {billing.planExpiresAt && (
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {t('profile.plan.expires', { date: new Date(billing.planExpiresAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US') })}
                  </span>
                )}
              </div>

              {/* Usage bars */}
              {!billing.isUnlimited && (
                <div className="space-y-2 mb-4">
                  {[
                    { label: 'week', used: billing.aiCallsWeek, max: billing.limitWeekly },
                  ].map(row => {
                    const pct = Math.min(100, Math.round(row.used / row.max * 100));
                    const danger = pct >= 80;
                    return (
                      <div key={row.label}>
                        <div className="flex justify-between text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>
                          <span>{t('profile.plan.aiWeek')}</span>
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
                <p className="text-xs mb-4 text-purple-500 font-medium">{t('profile.plan.unlimited')}</p>
              )}

              {/* Extra quota */}
              {billing.extraQuota > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3"
                  style={{ backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <Zap className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">
                    {billing.extraQuota > 1 ? t('profile.plan.bonusAvailablePlural', { n: billing.extraQuota }) : t('profile.plan.bonusAvailable', { n: billing.extraQuota })}
                  </span>
                </div>
              )}

              {/* CTA upgrade */}
              {billing.plan === 'FREE' && (
                <div className="space-y-2">
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>{t('profile.plan.upgrade')}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { k: 'premiumMonthly', label: 'Premium',        sub: billing.prices.premiumMonthly + '/mois', color: 'amber', Icon: Star },
                      { k: 'premiumAnnual',  label: 'Premium annuel', sub: billing.prices.premiumAnnual  + '/an',   color: 'amber', Icon: Star },
                      { k: 'vipMonthly',     label: 'VIP',            sub: billing.prices.vipMonthly     + '/mois', color: 'purple', Icon: Crown },
                      { k: 'vipAnnual',      label: 'VIP annuel',     sub: billing.prices.vipAnnual      + '/an',   color: 'purple', Icon: Crown },
                    ].map(p => (
                      billing.priceIds[p.k]
                        ? <CheckoutButton key={p.k} priceId={billing.priceIds[p.k]}
                            label={p.label} sub={p.sub} color={p.color} Icon={p.Icon} />
                        : <button key={p.k} onClick={() => alert(t('profile.paymentSoon'))}
                            className="flex flex-col items-center py-3 px-2 rounded-xl text-center transition-all hover:scale-[1.02]"
                            style={{
                              backgroundColor: p.color === 'amber' ? 'rgba(245,158,11,0.08)' : 'rgba(168,85,247,0.08)',
                              border: `1.5px solid ${p.color === 'amber' ? 'rgba(245,158,11,0.3)' : 'rgba(168,85,247,0.3)'}`,
                            }}>
                            {p.Icon && <p.Icon className={`w-4 h-4 mb-1 ${p.color === 'amber' ? 'text-amber-500' : 'text-purple-500'}`} />}
                            <span className="text-xs font-semibold">{p.label}</span>
                            <span className={`text-[10px] ${p.color === 'amber' ? 'text-amber-500' : 'text-purple-500'}`}>{p.sub}</span>
                          </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Acheter quota bonus */}
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <p className="text-[10px] font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                  <Plus className="w-3 h-3 inline mr-0.5" />
                  {t('profile.plan.buyExtra')}
                </p>
                <div className="flex gap-2">
                  {[
                    { k: 'quota50',  label: '50 req.',  price: billing.prices.quota50  },
                    { k: 'quota200', label: '200 req.', price: billing.prices.quota200 },
                    { k: 'quota500', label: '500 req.', price: billing.prices.quota500 },
                  ].map(pack => (
                    billing.priceIds[pack.k]
                      ? <CheckoutButton key={pack.k} priceId={billing.priceIds[pack.k]}
                          label={pack.label} sub={pack.price} color="gray" compact />
                      : <button key={pack.k} onClick={() => alert(t('profile.paymentSoon'))}
                          className="flex-1 py-2 rounded-lg text-center transition-all hover:scale-[1.02]"
                          style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
                          <p className="text-xs font-semibold">{pack.label}</p>
                          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{pack.price}</p>
                        </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Code promo ── */}
          <div className="card p-4 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <h2 className="text-sm font-semibold">{t('profile.promo')}</h2>
            </div>

            {promoState === 'done' ? (
              <div className="flex items-start gap-2.5 px-3 py-3 rounded-xl"
                style={{ backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed" style={{ color: 'rgb(16,185,129)' }}>{promoMsg}</p>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-2">
                  <input
                    value={promoCode}
                    onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoState('idle'); setPromoMsg(''); setPromoPreview(null); }}
                    onKeyDown={e => e.key === 'Enter' && promoState === 'idle' && validatePromo()}
                    placeholder={t('profile.promo.placeholder')}
                    className="flex-1 text-sm px-3 py-2 rounded-xl outline-none font-mono"
                    style={{ backgroundColor: 'var(--bg-inset)', border: `1px solid ${promoState === 'error' ? 'rgba(239,68,68,0.5)' : promoState === 'valid' ? 'rgba(16,185,129,0.5)' : 'var(--border)'}`, color: 'var(--text)' }}
                    disabled={promoState === 'validating' || promoState === 'applying'}
                  />
                  {(promoState === 'valid' || promoState === 'applying') ? (
                    <button onClick={applyPromo} disabled={promoState === 'applying'}
                      className="px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all active:scale-95"
                      style={{ backgroundColor: 'rgb(16,185,129)', color: '#fff' }}>
                      {promoState === 'applying' ? <Loader2 className="w-4 h-4 animate-spin" /> : t('profile.promo.activate')}
                    </button>
                  ) : (
                    <button onClick={validatePromo} disabled={!promoCode.trim() || promoState === 'validating'}
                      className="px-3 py-2 rounded-xl text-sm font-medium disabled:opacity-40 transition-all active:scale-95"
                      style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
                      {promoState === 'validating' ? <Loader2 className="w-4 h-4 animate-spin" /> : t('profile.promo.check')}
                    </button>
                  )}
                </div>

                {promoMsg && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-lg"
                    style={{
                      backgroundColor: promoState === 'valid' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                      border: `1px solid ${promoState === 'valid' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                    }}>
                    {promoState === 'valid'
                      ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      : <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />}
                    <p className="text-xs leading-relaxed"
                      style={{ color: promoState === 'valid' ? 'rgb(16,185,129)' : 'rgb(239,68,68)' }}>
                      {promoMsg}
                    </p>
                  </div>
                )}

                {promoState === 'valid' && promoPreview && (
                  <p className="text-[10px] mt-1.5 px-1" style={{ color: 'var(--text-muted)' }}>
                    {t('profile.promo.activateDesc', { n: promoPreview.durationMonths, plan: promoPreview.planGranted })}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Tab switcher */}
          <div className="flex rounded-xl p-0.5 mb-5" style={{ backgroundColor: 'var(--bg-inset)' }}>
            {[
              { id: 'prefs' as const, label: t('profile.tabs.prefs'), icon: Sparkles },
              { id: 'history' as const, label: t('profile.tabs.history'), icon: History },
              { id: 'badges' as const, label: t('profile.tabs.badges'), icon: Star },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => { setActiveTab(id); if (id === 'history') loadHistory(); if (id === 'badges') loadBadges(); }}
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
                  <p className="text-sm font-semibold">{t('profile.history.redo')}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('profile.history.redo.desc')}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-lg" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)' }}>→</span>
              </button>

              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <History className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                {t('profile.history.recent')}
              </h3>
              {cookLogs.length === 0 ? (
                <div className="text-center py-10">
                  <ChefHat className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('profile.history.empty')}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t('profile.history.empty.sub')}</p>
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
                          {new Date(log.cookedAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day:'numeric', month:'short', year:'numeric' })}
                          {cookCounts[log.recipe.id] > 1 && <span className="ml-2 text-emerald-500 font-medium">×{cookCounts[log.recipe.id]}</span>}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Historique des dépenses */}
              {spending && spending.monthlyHistory.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Receipt className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    {t('profile.history.spending')}
                  </h3>
                  <div className="card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('profile.history.spending.period')}</span>
                      <span className="text-sm font-bold">{spending.totalSpent} €</span>
                    </div>
                    <div className="space-y-2">
                      {spending.monthlyHistory.map(m => {
                        const maxTotal = Math.max(...spending.monthlyHistory.map(x => x.total), 1);
                        return (
                          <div key={m.month} className="flex items-center gap-3">
                            <span className="text-xs w-20 shrink-0 capitalize" style={{ color: 'var(--text-muted)' }}>{m.month}</span>
                            <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-inset)' }}>
                              <div className="h-full rounded-full transition-all" style={{ width: `${(m.total / maxTotal) * 100}%`, background: 'linear-gradient(90deg, #10b981, #059669)' }} />
                            </div>
                            <span className="text-xs font-medium w-12 text-right">{m.total} €</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-center mt-3" style={{ color: 'var(--text-muted)' }}>
                      {t('profile.history.spending.estimate')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── BADGES TAB ─── */}
          {activeTab === 'badges' && (
            <div className="mb-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 select-none" onClick={handleBadgeHeaderClick}>
                <Star className="w-4 h-4" style={{ color: '#f59e0b' }} />
                {t('profile.badges.title')}
              </h3>
              <p className="text-xs mb-4 select-none" onClick={handleBadgeHeaderClick} style={{ color: 'var(--text-muted)' }}>
                {t('profile.badges.unlocked', { n: badges.filter(b => b.unlocked).length, total: badges.length })}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {badges.map(b => (
                  <div key={b.code}
                    className="relative flex flex-col items-center p-3 rounded-xl text-center transition-all"
                    style={{
                      backgroundColor: b.unlocked ? 'rgba(245,158,11,0.06)' : 'var(--bg-inset)',
                      border: b.unlocked ? '1px solid rgba(245,158,11,0.2)' : '1px solid var(--border-subtle)',
                      opacity: b.unlocked ? 1 : 0.45,
                    }}>
                    {b.topSecret && (
                      <span className="absolute -top-1.5 -right-1.5 text-[7px] font-bold px-1 py-0.5 rounded"
                        style={{ backgroundColor: b.unlocked ? '#8b5cf6' : 'var(--text-muted)', color: 'white', letterSpacing: '0.03em' }}>
                        TOP SECRET
                      </span>
                    )}
                    <span className="text-2xl mb-1">{b.emoji}</span>
                    <p className="text-[10px] font-semibold leading-tight">{b.label}</p>
                    <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{b.desc}</p>
                    {b.unlocked && b.unlockedAt && (
                      <p className="text-[8px] mt-1 text-amber-500">
                        {new Date(b.unlockedAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── PRÉFÉRENCES TAB ─── */}
          {activeTab === 'prefs' && <>

          {/* === PRÉFÉRENCES ALIMENTAIRES === */}
          <div className="card p-5 mb-5">
            <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              {t('profile.allergens')}
              <InfoBubble
                align="left"
                label={t('profile.allergens')}
                text={t('profile.allergens.desc')}
              />
            </h2>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              {t('profile.allergens.desc')}
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
            <h2 className="font-semibold text-sm mb-3">{t('profile.diet')}</h2>
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
              {t('profile.family')}
            </h2>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              {t('profile.family.desc')}
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
                  {t('profile.family.ageLabel')}
                </label>
                <input
                  type="number"
                  min={0}
                  max={216}
                  value={kidAgeMonths ?? ''}
                  onChange={e => setKidAgeMonths(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder={t('profile.family.agePlaceholder')}
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
              {t('profile.servings')}
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
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{defaultServings > 1 ? t('profile.servings.units') : t('profile.servings.unit')}</span>
            </div>
          </div>

          {/* Sauvegarder préférences */}
          <button onClick={savePreferences} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 mb-5 disabled:opacity-40">
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? t('profile.saved') : saving ? t('profile.saving') : t('profile.save')}
          </button>

          {/* Actions */}
          <div className="space-y-2">
            <button onClick={toggle} className="btn-secondary w-full flex items-center justify-center gap-2">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === 'dark' ? t('profile.theme.dark') : t('profile.theme.light')}
            </button>

            {/* Language selector */}
            <div className="card p-4">
              <p className="text-sm font-semibold mb-3">{t('profile.language')}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {LANGUAGES.map(l => (
                  <button key={l.code} onClick={() => setLang(l.code)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all text-left"
                    style={lang === l.code
                      ? { backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)', border: '1.5px solid var(--accent)' }
                      : { backgroundColor: 'var(--bg-inset)', border: '1.5px solid transparent' }}>
                    <span>{l.flag}</span>
                    <span className="font-medium truncate">{l.label}</span>
                  </button>
                ))}
              </div>
              {isLoading && <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>{t('onboarding.lang.loading')}</p>}
            </div>

            {user.role === 'ADMIN' && (
              <button onClick={() => router.push('/admin')} className="btn-secondary w-full flex items-center justify-center gap-2">
                <Shield className="w-4 h-4" /> {t('profile.admin')}
              </button>
            )}

            <button onClick={logout} className="btn-secondary w-full flex items-center justify-center gap-2">
              <LogOut className="w-4 h-4" /> {t('profile.logout')}
            </button>

            <button onClick={deleteAccount} className="w-full py-3 text-sm text-red-500 hover:text-red-400 transition-colors">
              {t('profile.delete')}
            </button>
          </div>

          </> /* end prefs tab */}
        </>
      )}
    </AppShell>
  );
}
