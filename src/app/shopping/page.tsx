'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import AppShell from '@/components/AppShell';
import InfoBubble from '@/components/InfoBubble';
import {
  CalendarDays, ShoppingCart, ChevronLeft, ChevronRight, ChevronDown,
  Plus, X, Search, Check, Refrigerator, Share2,
  Loader2, UtensilsCrossed, Sparkles, TrendingUp, AlertCircle,
  Copy, Flame, Beef, Clock, ChefHat,
} from 'lucide-react';

/* ── Types ── */
interface MealPlanEntry {
  id: string;
  date: string;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER';
  recipe: {
    id: string; name: string; prepTime: number; imageUrl: string;
    calories?: number | null; protein?: number | null; servings?: number;
    ingredients: Array<{ ingredient: { emoji: string; name: string } }>;
  };
}
interface Recipe {
  id: string; name: string; prepTime: number; cuisine: string;
  imageUrl: string; difficulty: string;
  calories?: number | null; protein?: number | null;
  matchPercent?: number;
  ingredients: Array<{ ingredient: { emoji: string; name: string } }>;
}
interface ShoppingEntry {
  ingredientId: string; name: string; emoji: string;
  qty: number; unit: string; recipes: string[];
  inFridge: boolean; fridgeQty?: number; fridgeUnit?: string;
  cost?: number;
}
interface ShoppingData {
  categories: Record<string, ShoppingEntry[]>;
  totalItems: number; inFridgeCount: number; missingCount: number; planCount: number;
  totalCost?: number; missingCost?: number;
}

/* ── Constants ── */
const MEALS = [
  { type: 'BREAKFAST' as const, label: 'Matin', emoji: '🌅' },
  { type: 'LUNCH'    as const, label: 'Déjeuner', emoji: '☀️' },
  { type: 'DINNER'   as const, label: 'Dîner',    emoji: '🌙' },
];
const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTHS_FR = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
const CAT_EMOJI: Record<string, string> = {
  'Légumes':'🥕','Fruits':'🍎','Viandes':'🥩','Poissons':'🐟',
  'Produits laitiers':'🧀','Féculents':'🌾','Condiments':'🧂',
  'Aromates':'🌿','Épices':'🌶️','Boissons':'🥤','Autre':'📦',
};

/* ── Helpers ── */
function getWeekDays(offset: number): Date[] {
  const now = new Date();
  const dow = now.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff + offset * 7);
  mon.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i); return d;
  });
}
function dateKey(d: Date) { return d.toISOString().split('T')[0]; }
function isToday(d: Date) {
  const n = new Date();
  return d.getDate()===n.getDate() && d.getMonth()===n.getMonth() && d.getFullYear()===n.getFullYear();
}
function isPast(d: Date) { return d < new Date(new Date().setHours(0,0,0,0)); }

/* ════════════════════════════════════════════════════════════ */
export default function ShoppingPage() {
  const [tab, setTab] = useState<'plan'|'courses'>('plan');
  const [weekOffset, setWeekOffset] = useState(0);
  const [plans, setPlans] = useState<MealPlanEntry[]>([]);
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  // Picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState('');
  const [pickerMeal, setPickerMeal] = useState<'BREAKFAST'|'LUNCH'|'DINNER'>('LUNCH');
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerFilter, setPickerFilter] = useState<'all'|'fridge'|'quick'|'vege'>('all');
  const [savingSlot, setSavingSlot] = useState<string|null>(null);

  // Planning UI
  const [selectedDay, setSelectedDay] = useState<string>(() => dateKey(new Date()));
  const [expandedDays, setExpandedDays] = useState<Set<string>>(() => new Set([dateKey(new Date())]));
  const [copyingWeek, setCopyingWeek] = useState(false);
  const [copyResult, setCopyResult] = useState<string|null>(null);
  const dayScrollRef = useRef<HTMLDivElement>(null);
  // Meal detail modal
  const [viewingPlan, setViewingPlan] = useState<MealPlanEntry|null>(null);

  // Shopping list
  const [shopData, setShopData] = useState<ShoppingData|null>(null);
  const [shopLoading, setShopLoading] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [addingToFridge, setAddingToFridge] = useState(false);
  const [fridgeAdded, setFridgeAdded] = useState(false);

  // Auto planning
  const [autoPlanning, setAutoPlanning] = useState(false);
  const [autoPlanError, setAutoPlanError] = useState('');

  // Shopping collapsed categories
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  // Suggestions d'achat
  const [suggestions, setSuggestions] = useState<Array<{ ingredientId: string; name: string; emoji: string; count: number }>>([]);
  const [expiringSugg, setExpiringSugg] = useState<Array<{ ingredientId: string; name: string; emoji: string; expiresAt: string | null }>>([]);

  const weekDays = getWeekDays(weekOffset);
  const startDate = dateKey(weekDays[0]);
  const endDate   = dateKey(weekDays[6]);

  /* Load recipes once */
  useEffect(() => {
    fetch('/api/recipes')
      .then(r => r.ok ? r.json() : [])
      .then(setAllRecipes)
      .catch(() => {});
  }, []);

  /* Load meal plans when week changes */
  const loadPlans = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/meal-plan?start=${startDate}&end=${endDate}`);
    if (res.ok) setPlans(await res.json());
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  /* Load shopping list when courses tab opens */
  useEffect(() => {
    if (tab !== 'courses') return;
    setShopLoading(true);
    setChecked(new Set());
    setFridgeAdded(false);
    fetch('/api/shopping/from-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setShopData(d); })
      .catch(() => {})
      .finally(() => setShopLoading(false));
    fetch('/api/shopping/suggestions')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setSuggestions(d.suggestions || []); setExpiringSugg(d.expiring || []); } })
      .catch(() => {});
  }, [tab, startDate, endDate]);

  /* Plan week label */
  const weekLabel = (() => {
    const s = weekDays[0]; const e = weekDays[6];
    const sStr = `${s.getDate()} ${MONTHS_FR[s.getMonth()]}`;
    const eStr = `${e.getDate()} ${MONTHS_FR[e.getMonth()]} ${e.getFullYear()}`;
    return `${sStr} – ${eStr}`;
  })();

  /* Get plan entry for a given date+mealType */
  function getPlan(date: string, mealType: string) {
    return plans.find(p => dateKey(new Date(p.date)) === date && p.mealType === mealType) ?? null;
  }

  /* Add recipe to slot */
  async function addToSlot(recipeId: string) {
    setSavingSlot(`${pickerDate}-${pickerMeal}`);
    setPickerOpen(false);
    await fetch('/api/meal-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeId, date: pickerDate, mealType: pickerMeal }),
    });
    setSavingSlot(null);
    loadPlans();
  }

  /* Remove plan entry */
  async function removeSlot(id: string) {
    await fetch(`/api/meal-plan/${id}`, { method: 'DELETE' });
    loadPlans();
  }

  /* Add checked items to fridge */
  async function addCheckedToFridge() {
    if (checked.size === 0 || !shopData) return;
    setAddingToFridge(true);
    const allEntries = Object.values(shopData.categories).flat();
    const toAdd = allEntries.filter(e => checked.has(e.ingredientId) && !e.inFridge);
    for (const item of toAdd) {
      await fetch('/api/fridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredientId: item.ingredientId, quantity: item.qty, unit: item.unit }),
      });
    }
    setAddingToFridge(false);
    setFridgeAdded(true);
    setChecked(new Set());
    setTimeout(() => setFridgeAdded(false), 3000);
  }

  /* Auto-generate planning (VIP) */
  async function autoGeneratePlan() {
    setAutoPlanning(true);
    setAutoPlanError('');
    try {
      const res = await fetch('/api/meal-plan/auto', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.saved > 0 && data.weekStart) {
          // Calculate which weekOffset matches the generated week
          const genMonday = new Date(data.weekStart + 'T00:00:00');
          const now = new Date();
          const dow = now.getDay();
          const diff = dow === 0 ? -6 : 1 - dow;
          const thisMonday = new Date(now);
          thisMonday.setDate(now.getDate() + diff);
          thisMonday.setHours(0, 0, 0, 0);
          const weekDiff = Math.round((genMonday.getTime() - thisMonday.getTime()) / (7 * 86400000));
          setWeekOffset(weekDiff);
        } else if (data.saved > 0) {
          setWeekOffset(1);
        }
      } else {
        const err = await res.json();
        setAutoPlanError(err.error || 'Erreur');
      }
    } finally { setAutoPlanning(false); }
  }

  /* Copy current week plans to next week */
  async function copyWeekToNext() {
    if (!plans.length) return;
    setCopyingWeek(true); setCopyResult(null);
    try {
      let copied = 0;
      for (const plan of plans) {
        const d = new Date(plan.date);
        d.setDate(d.getDate() + 7);
        const nextDate = dateKey(d);
        // Skip if slot already filled
        const existing = plans.find(p => dateKey(new Date(p.date)) === nextDate && p.mealType === plan.mealType);
        if (!existing) {
          await fetch('/api/meal-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipeId: plan.recipe.id, date: nextDate, mealType: plan.mealType }),
          });
          copied++;
        }
      }
      setCopyResult(`✅ ${copied} repas copiés vers S+1`);
      setTimeout(() => setCopyResult(null), 4000);
    } catch { setCopyResult('❌ Erreur'); }
    finally { setCopyingWeek(false); }
  }

  /* Share shopping list as text */
  function shareList() {
    if (!shopData) return;
    const lines: string[] = [`🛒 Liste de courses – ${weekLabel}`, ''];
    for (const [cat, entries] of Object.entries(shopData.categories)) {
      lines.push(`${CAT_EMOJI[cat] || '📦'} ${cat}`);
      for (const e of entries) {
        const tick = checked.has(e.ingredientId) ? '✅' : '☐';
        lines.push(`  ${tick} ${e.emoji} ${e.name}  ${e.qty} ${e.unit}`);
      }
      lines.push('');
    }
    navigator.clipboard?.writeText(lines.join('\n'));
  }

  /* Filtered recipes for picker */
  const filteredRecipes = allRecipes.filter(r =>
    r.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    r.cuisine.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  /* Count planned meals this week */
  const plannedCount = plans.length;

  /* Daily nutrition totals */
  function getDayNutrition(dKey: string) {
    const dayPlans = plans.filter(p => dateKey(new Date(p.date)) === dKey);
    return dayPlans.reduce((acc, p) => ({
      kcal: acc.kcal + (p.recipe.calories || 0),
      protein: acc.protein + (p.recipe.protein || 0),
      count: acc.count + 1,
    }), { kcal: 0, protein: 0, count: 0 });
  }

  /* Filtered + sorted recipes for picker */
  const filteredPickerRecipes = allRecipes
    .filter(r => {
      const matchSearch = !pickerSearch ||
        r.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
        r.cuisine.toLowerCase().includes(pickerSearch.toLowerCase());
      if (!matchSearch) return false;
      if (pickerFilter === 'fridge') return (r.matchPercent ?? 0) >= 50;
      if (pickerFilter === 'quick') return r.prepTime <= 20;
      if (pickerFilter === 'vege') {
        const names = r.ingredients.map(i => i.ingredient.name.toLowerCase());
        return !names.some(n => ['bœuf','poulet','porc','agneau','saumon','thon','viande','steak'].some(m => n.includes(m)));
      }
      return true;
    })
    .sort((a, b) => (b.matchPercent ?? 0) - (a.matchPercent ?? 0));
  const allEntries = shopData ? Object.values(shopData.categories).flat() : [];
  const boughtCount = allEntries.filter(e => checked.has(e.ingredientId)).length;
  const totalShop = allEntries.length;
  const progress = totalShop > 0 ? Math.round((boughtCount / totalShop) * 100) : 0;

  /* ── RENDER ── */
  return (
    <AppShell>

      {/* Titre + aide */}
      <div className="flex items-center gap-2.5 mb-3">
        <CalendarDays className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        <h1 className="text-lg font-semibold">Repas &amp; Courses</h1>
        <InfoBubble
          align="left"
          label="Repas & Courses"
          text="« Planning » : choisis tes recettes pour chaque jour de la semaine. « Courses » : la liste des ingrédients à acheter est générée automatiquement à partir de ton planning."
        />
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl p-0.5 mb-5"
        style={{ backgroundColor: 'var(--bg-inset)' }}>
        {[
          { id: 'plan' as const, label: 'Planning', icon: CalendarDays },
          { id: 'courses' as const, label: `Courses${shopData?.missingCount ? ` · ${shopData.missingCount}` : ''}`, icon: ShoppingCart },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all"
            style={tab === id
              ? { backgroundColor: 'var(--bg-raised)', color: 'var(--text)', boxShadow: '0 1px 3px rgba(0,0,0,.12)' }
              : { color: 'var(--text-muted)' }}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ════════ PLANNING TAB ════════ */}
      {tab === 'plan' && (
        <>
          {/* ── Week navigation ── */}
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => setWeekOffset(o => o - 1)}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
              style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <ChevronLeft className="w-4 h-4" /> Préc.
            </button>
            <div className="flex-1 text-center">
              <p className="text-xs font-semibold">{weekLabel}</p>
              <p className="text-[10px]" style={{ color: weekOffset === 0 ? 'rgb(16,185,129)' : 'var(--text-muted)' }}>
                {weekOffset === 0 ? '● Semaine actuelle' : weekOffset < 0 ? `${Math.abs(weekOffset)} sem. passée${Math.abs(weekOffset) > 1 ? 's' : ''}` : `Dans ${weekOffset} sem.`}
              </p>
            </div>
            <button onClick={() => setWeekOffset(o => o + 1)}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
              style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              Suiv. <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* ── Quick actions ── */}
          <div className="flex gap-2 mb-4">
            <button onClick={autoGeneratePlan} disabled={autoPlanning}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all"
              style={{ backgroundColor: 'rgba(168,85,247,0.08)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)' }}>
              {autoPlanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {autoPlanning ? 'IA…' : 'Auto VIP'}
            </button>
            <button onClick={copyWeekToNext} disabled={copyingWeek || !plans.length}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-40"
              style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              {copyingWeek ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
              Copier S+1
            </button>
            {plannedCount > 0 && (
              <button onClick={() => setTab('courses')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
                <ShoppingCart className="w-3 h-3" /> Courses
              </button>
            )}
          </div>

          {(autoPlanError || copyResult) && (
            <p className="text-[11px] text-center mb-3" style={{ color: copyResult?.startsWith('✅') ? 'rgb(16,185,129)' : '#ef4444' }}>
              {autoPlanError || copyResult}
            </p>
          )}

          {/* ── All 7 days ── */}
          {loading ? (
            <div className="space-y-2">
              {[1,2,3,4].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-inset)' }} />)}
            </div>
          ) : (
            <div className="space-y-2 pb-6">
              {weekDays.map(day => {
                const dKey = dateKey(day);
                const today = isToday(day);
                const past = isPast(day) && !today;
                const expanded = expandedDays.has(dKey);
                const dayPlans = plans.filter(p => dateKey(new Date(p.date)) === dKey);
                const nutrition = getDayNutrition(dKey);
                const filledCount = dayPlans.length;

                return (
                  <div key={dKey} className="rounded-2xl overflow-hidden transition-all"
                    style={{
                      border: today ? '2px solid var(--accent)' : '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-card)',
                    }}>

                    {/* ── Day header (always visible, click to expand) ── */}
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 text-left"
                      style={{ backgroundColor: today ? 'rgba(var(--accent-rgb,16,185,129),0.06)' : undefined }}
                      onClick={() => setExpandedDays(prev => {
                        const next = new Set(prev);
                        if (next.has(dKey)) next.delete(dKey); else next.add(dKey);
                        return next;
                      })}
                    >
                      {/* Day circle */}
                      <div className="w-10 h-10 rounded-full flex flex-col items-center justify-center shrink-0 text-center"
                        style={today
                          ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
                          : past
                            ? { backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)' }
                            : { backgroundColor: 'var(--bg-inset)', color: 'var(--text)' }}>
                        <span className="text-[9px] font-semibold leading-none uppercase">{DAYS_FR[day.getDay()]}</span>
                        <span className="text-sm font-bold leading-none">{day.getDate()}</span>
                      </div>

                      {/* Day info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            {DAYS_FR[day.getDay()]} {day.getDate()} {MONTHS_FR[day.getMonth()]}
                          </span>
                          {today && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: 'rgb(16,185,129)' }}>Aujourd'hui</span>}
                        </div>
                        {/* Summary when collapsed */}
                        {!expanded && (
                          <div className="flex items-center gap-2 mt-0.5">
                            {filledCount > 0 ? (
                              <>
                                <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)', maxWidth: '160px' }}>
                                  {dayPlans.map(p => p.recipe.name).join(' · ')}
                                </p>
                                {nutrition.kcal > 0 && (
                                  <span className="text-[10px] shrink-0 flex items-center gap-0.5" style={{ color: 'var(--text-muted)' }}>
                                    <Flame className="w-2.5 h-2.5 text-orange-400" />{nutrition.kcal}
                                  </span>
                                )}
                              </>
                            ) : (
                              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Aucun repas</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Meal dots + chevron */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex flex-col gap-0.5">
                          {MEALS.map(m => (
                            <div key={m.type} className="w-1.5 h-1.5 rounded-full transition-colors"
                              style={{ backgroundColor: dayPlans.some(p => p.mealType === m.type) ? 'rgb(16,185,129)' : 'var(--border)' }} />
                          ))}
                        </div>
                        <ChevronDown className="w-4 h-4 transition-transform"
                          style={{ color: 'var(--text-muted)', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                      </div>
                    </button>

                    {/* ── Expanded: meal slots ── */}
                    {expanded && (
                      <>
                        <div className="divide-y" style={{ borderColor: 'var(--border-subtle)', borderTop: '1px solid var(--border-subtle)' }}>
                          {MEALS.map(meal => {
                            const plan = getPlan(dKey, meal.type);
                            const slotKey = `${dKey}-${meal.type}`;
                            const saving = savingSlot === slotKey;

                            return (
                              <div key={meal.type} className="flex items-center gap-3 px-4 py-3">
                                {/* Meal label */}
                                <div className="flex flex-col items-center w-10 shrink-0">
                                  <span className="text-base leading-none">{meal.emoji}</span>
                                  <span className="text-[9px] mt-0.5 font-medium" style={{ color: 'var(--text-muted)' }}>{meal.label}</span>
                                </div>

                                {saving ? (
                                  <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ backgroundColor: 'var(--bg-inset)' }}>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--text-muted)' }} />
                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Enregistrement…</span>
                                  </div>
                                ) : plan ? (
                                  /* ── Filled slot: tap to view/change ── */
                                  <button
                                    className="flex-1 flex items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-all active:scale-[0.98]"
                                    style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}
                                    onClick={() => setViewingPlan(plan)}
                                  >
                                    {plan.recipe.imageUrl ? (
                                      <img src={plan.recipe.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                    ) : (
                                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                                        style={{ backgroundColor: 'var(--bg-raised)' }}>
                                        {plan.recipe.ingredients[0]?.ingredient?.emoji || '🍽️'}
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold truncate">{plan.recipe.name}</p>
                                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                        <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                          <Clock className="w-2.5 h-2.5" /> {plan.recipe.prepTime}min
                                        </span>
                                        {plan.recipe.calories && (
                                          <span className="flex items-center gap-0.5 text-[10px] font-medium text-orange-400">
                                            <Flame className="w-2.5 h-2.5" /> {plan.recipe.calories} kcal
                                          </span>
                                        )}
                                        {plan.recipe.protein && (
                                          <span className="flex items-center gap-0.5 text-[10px] font-medium" style={{ color: '#818cf8' }}>
                                            <Beef className="w-2.5 h-2.5" /> {Math.round(plan.recipe.protein)}g
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                                  </button>
                                ) : (
                                  /* ── Empty slot ── */
                                  <button
                                    onClick={() => { setPickerDate(dKey); setPickerMeal(meal.type); setPickerSearch(''); setPickerFilter('all'); setPickerOpen(true); }}
                                    className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 transition-all group"
                                    style={{ border: '1.5px dashed var(--border)', color: 'var(--text-muted)' }}>
                                    <Plus className="w-3.5 h-3.5 group-hover:text-[var(--accent)] transition-colors" />
                                    <span className="text-xs group-hover:text-[var(--accent)] transition-colors">Ajouter</span>
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* ── Day nutrition footer ── */}
                        {nutrition.count > 0 && (
                          <div className="flex items-center gap-3 px-4 py-2.5"
                            style={{ borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-inset)' }}>
                            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Total</span>
                            {nutrition.kcal > 0 && (
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-orange-400">
                                <Flame className="w-3 h-3" /> {nutrition.kcal} kcal
                              </span>
                            )}
                            {nutrition.protein > 0 && (
                              <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#818cf8' }}>
                                <Beef className="w-3 h-3" /> {Math.round(nutrition.protein)} g prot.
                              </span>
                            )}
                            <span className="ml-auto text-[10px]" style={{ color: 'var(--text-muted)' }}>{nutrition.count}/3 repas</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ════════ MEAL DETAIL / CHANGE MODAL ════════ */}
      {viewingPlan && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setViewingPlan(null)} />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl flex flex-col slide-up"
            style={{ backgroundColor: 'var(--bg-card)', maxHeight: '80vh' }}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 rounded-full" style={{ backgroundColor: 'var(--border)' }} />
            </div>

            {/* Recipe image */}
            {viewingPlan.recipe.imageUrl && (
              <div className="mx-4 mt-2 rounded-2xl overflow-hidden h-40">
                <img src={viewingPlan.recipe.imageUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="px-4 pt-3 pb-2">
              {/* Meal badge */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{MEALS.find(m => m.type === viewingPlan.mealType)?.emoji}</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)' }}>
                  {MEALS.find(m => m.type === viewingPlan.mealType)?.label} · {
                    (() => { const d = new Date(viewingPlan.date + 'T12:00:00'); return `${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]}`; })()
                  }
                </span>
              </div>

              <h3 className="text-lg font-bold mb-1">{viewingPlan.recipe.name}</h3>

              {/* Macros row */}
              <div className="flex gap-3 mb-3 flex-wrap">
                <span className="flex items-center gap-1 text-sm">
                  <Clock className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                  <span className="font-medium">{viewingPlan.recipe.prepTime}min</span>
                </span>
                {viewingPlan.recipe.calories && (
                  <span className="flex items-center gap-1 text-sm font-semibold text-orange-400">
                    <Flame className="w-3.5 h-3.5" /> {viewingPlan.recipe.calories} kcal
                  </span>
                )}
                {viewingPlan.recipe.protein && (
                  <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#818cf8' }}>
                    <Beef className="w-3.5 h-3.5" /> {Math.round(viewingPlan.recipe.protein)} g prot.
                  </span>
                )}
                {viewingPlan.recipe.servings && (
                  <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                    <ChefHat className="w-3.5 h-3.5" /> {viewingPlan.recipe.servings} pers.
                  </span>
                )}
              </div>

              {/* Ingredients */}
              {viewingPlan.recipe.ingredients.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {viewingPlan.recipe.ingredients.slice(0, 8).map((ing, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full"
                      style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>
                      {ing.ingredient.emoji} {ing.ingredient.name}
                    </span>
                  ))}
                  {viewingPlan.recipe.ingredients.length > 8 && (
                    <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)' }}>
                      +{viewingPlan.recipe.ingredients.length - 8}
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pb-2">
                <button
                  onClick={() => {
                    const dKey = dateKey(new Date(viewingPlan.date + 'T12:00:00'));
                    setPickerDate(dKey);
                    setPickerMeal(viewingPlan.mealType);
                    setPickerSearch('');
                    setPickerFilter('all');
                    setViewingPlan(null);
                    setPickerOpen(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
                  <ChefHat className="w-4 h-4" /> Changer la recette
                </button>
                <button
                  onClick={() => { removeSlot(viewingPlan.id); setViewingPlan(null); }}
                  className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
                  style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <X className="w-4 h-4" /> Retirer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════ COURSES TAB ════════ */}
      {tab === 'courses' && (
        <>
          {shopLoading ? (
            <div className="space-y-4 pt-2">
              <div className="h-14 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-inset)' }} />
              {[1,2,3,4].map(i => <div key={i} className="h-10 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--bg-inset)' }} />)}
            </div>
          ) : !shopData || shopData.totalItems === 0 ? (
            /* Empty state */
            <div className="text-center py-16">
              <UtensilsCrossed className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
              <p className="font-medium text-sm mb-1">Aucun repas planifié</p>
              <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>Ajoute des recettes à ton planning pour générer une liste de courses</p>
              <button onClick={() => setTab('plan')}
                className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
                Aller au planning
              </button>
            </div>
          ) : (
            <>
              {/* Progress header */}
              <div className="card p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold">
                      {boughtCount === 0
                        ? `${shopData.totalItems} ingrédients`
                        : `${boughtCount}/${totalShop} cochés`}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {shopData.inFridgeCount > 0 && `${shopData.inFridgeCount} déjà dans le frigo · `}
                      {shopData.missingCount} à acheter
                      {typeof shopData.missingCost === 'number' && shopData.missingCost > 0 && (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400"> · ~{shopData.missingCost.toFixed(2)}€</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={shareList}
                      className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--bg-inset)]"
                      title="Copier la liste">
                      <Share2 className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    </button>
                    <button onClick={async () => {
                      const res = await fetch('/api/shopping', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          name: `Courses ${weekLabel}`,
                          items: Object.values(shopData?.categories ?? {}).flat().map(e => ({
                            ingredientId: e.ingredientId, quantity: e.qty, unit: e.unit,
                          })),
                        }),
                      });
                      if (res.ok) {
                        const list = await res.json();
                        const shareRes = await fetch(`/api/shopping/${list.id}/share`, { method: 'POST' });
                        if (shareRes.ok) {
                          const { url } = await shareRes.json();
                          const fullUrl = window.location.origin + url;
                          if (navigator.share) {
                            navigator.share({ title: `Courses ${weekLabel}`, url: fullUrl });
                          } else {
                            navigator.clipboard.writeText(fullUrl);
                            alert('Lien copié !');
                          }
                        }
                      }
                    }}
                      className="text-[10px] px-2.5 py-1.5 rounded-lg transition-colors"
                      style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
                      title="Lien QR partageable"
                    >
                      🔗 Lien
                    </button>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-inset)' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${progress}%`, backgroundColor: progress === 100 ? '#10b981' : 'var(--accent)' }} />
                </div>

                {/* Cost summary */}
                {typeof shopData.totalCost === 'number' && shopData.totalCost > 0 && (
                  <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Budget total estimé</span>
                    <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>~{shopData.totalCost.toFixed(2)}€</span>
                  </div>
                )}
              </div>

              {/* Fridge added banner */}
              {fridgeAdded && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-4 fade-in"
                  style={{ backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Ajouté au frigo !</span>
                </div>
              )}

              {/* Categories — collapsible by rayon */}
              <div className="space-y-2.5 pb-28">
                {Object.entries(shopData.categories).map(([cat, entries]) => {
                  const isCollapsed = collapsedCats.has(cat);
                  const catCost = entries.reduce((s, e) => s + (e.cost || 0), 0);
                  const catChecked = entries.filter(e => checked.has(e.ingredientId) || e.inFridge).length;

                  return (
                    <div key={cat} className="card overflow-hidden">
                      {/* Category header — clickable to collapse */}
                      <button
                        onClick={() => setCollapsedCats(prev => {
                          const next = new Set(prev);
                          if (next.has(cat)) next.delete(cat); else next.add(cat);
                          return next;
                        })}
                        className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left transition-colors hover:bg-[var(--bg-inset)]"
                        style={{ borderBottom: isCollapsed ? undefined : '1px solid var(--border-subtle)' }}
                      >
                        <span className="text-lg">{CAT_EMOJI[cat] || '📦'}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold">{cat}</h3>
                          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {entries.length} article{entries.length > 1 ? 's' : ''}
                            {catChecked > 0 && ` · ${catChecked} ok`}
                          </p>
                        </div>
                        {catCost > 0 && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: 'rgba(16,185,129,0.08)', color: 'rgb(16,185,129)' }}>
                            ~{catCost.toFixed(2)}€
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)' }}>
                          {entries.length}
                        </span>
                        <ChevronDown
                          className="w-4 h-4 shrink-0 transition-transform duration-200"
                          style={{ color: 'var(--text-muted)', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                        />
                      </button>

                      {/* Items — hidden when collapsed */}
                      {!isCollapsed && (
                        <div>
                          {entries.map((item, idx) => {
                            const isBought = checked.has(item.ingredientId);
                            const inFridge = item.inFridge;

                            return (
                              <button key={item.ingredientId}
                                onClick={() => {
                                  if (inFridge) return;
                                  setChecked(prev => {
                                    const next = new Set(prev);
                                    if (next.has(item.ingredientId)) next.delete(item.ingredientId);
                                    else next.add(item.ingredientId);
                                    return next;
                                  });
                                }}
                                className="w-full flex items-center gap-3 px-3.5 py-2.5 transition-colors text-left"
                                style={{
                                  borderTop: idx > 0 ? '1px solid var(--border-subtle)' : undefined,
                                  cursor: inFridge ? 'default' : 'pointer',
                                  backgroundColor: inFridge ? 'rgba(16,185,129,0.03)' : undefined,
                                }}>

                                {/* Checkbox */}
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                                  inFridge ? 'border-emerald-400' : isBought ? 'border-[var(--accent)]' : ''
                                }`}
                                  style={!inFridge && !isBought ? { borderColor: 'var(--border)' }
                                    : inFridge ? { backgroundColor: 'rgba(16,185,129,0.12)' }
                                    : { backgroundColor: 'var(--accent)' }}>
                                  {inFridge && <Refrigerator className="w-2.5 h-2.5 text-emerald-500" />}
                                  {!inFridge && isBought && <Check className="w-2.5 h-2.5 text-white" />}
                                </div>

                                {/* Emoji */}
                                <span className="text-base w-6 shrink-0">{item.emoji}</span>

                                {/* Name + recipes */}
                                <div className="flex-1 min-w-0">
                                  <span className={`text-sm ${(isBought || inFridge) ? 'line-through' : 'font-medium'}`}
                                    style={{ color: (isBought || inFridge) ? 'var(--text-muted)' : 'var(--text)' }}>
                                    {item.name}
                                  </span>
                                  {item.recipes.length > 0 && (
                                    <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                      {item.recipes.slice(0,2).join(', ')}{item.recipes.length > 2 ? ` +${item.recipes.length-2}` : ''}
                                    </p>
                                  )}
                                </div>

                                {/* Quantity + cost + fridge indicator */}
                                <div className="text-right shrink-0">
                                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                    {item.qty} {item.unit}
                                  </span>
                                  {typeof item.cost === 'number' && item.cost > 0 && !inFridge && (
                                    <p className="text-[10px]" style={{ color: 'rgb(16,185,129)' }}>~{item.cost.toFixed(2)}€</p>
                                  )}
                                  {inFridge && (
                                    <p className="text-[10px] text-emerald-500">frigo ✓</p>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Suggestions d'achat intelligentes */}
              {(suggestions.length > 0 || expiringSugg.length > 0) && (
                <div className="mt-6 space-y-4">
                  {suggestions.length > 0 && (
                    <div className="card p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-indigo-400" />
                        <h3 className="text-sm font-semibold">Suggestions d&apos;achat</h3>
                        <span className="text-[10px] ml-auto" style={{ color: 'var(--text-muted)' }}>basé sur tes habitudes</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.slice(0, 10).map(s => (
                          <span key={s.ingredientId}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium"
                            style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
                            {s.emoji} {s.name}
                            <span className="text-[9px] opacity-50">×{s.count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {expiringSugg.length > 0 && (
                    <div className="card p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        <h3 className="text-sm font-semibold">Bientôt périmés</h3>
                        <span className="text-[10px] ml-auto" style={{ color: 'var(--text-muted)' }}>à consommer vite</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {expiringSugg.map(e => (
                          <span key={e.ingredientId}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium"
                            style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
                            {e.emoji} {e.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom sticky CTA */}
              {checked.size > 0 && (
                <div className="fixed bottom-20 left-0 right-0 px-4 pb-safe fade-in" style={{ zIndex: 30 }}>
                  <button onClick={addCheckedToFridge} disabled={addingToFridge}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold shadow-xl transition-all active:scale-[0.98] disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white' }}>
                    {addingToFridge
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Ajout en cours…</>
                      : <><Refrigerator className="w-4 h-4" /> Ajouter {checked.size} article{checked.size>1?'s':''} au frigo</>}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ════════ RECIPE PICKER MODAL ════════ */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50" style={{ zIndex: 50 }}>
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPickerOpen(false)} />

          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl flex flex-col slide-up"
            style={{ backgroundColor: 'var(--bg-card)', maxHeight: '82vh' }}>

            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-9 h-1 rounded-full" style={{ backgroundColor: 'var(--border)' }} />
            </div>

            {/* Header */}
            <div className="px-4 pb-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-base">Choisir une recette</h3>
                <button onClick={() => setPickerOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-inset)]">
                  <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {MEALS.find(m => m.type === pickerMeal)?.emoji} {MEALS.find(m => m.type === pickerMeal)?.label} · {
                  (() => {
                    const d = new Date(pickerDate + 'T12:00:00');
                    return `${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]}`;
                  })()
                }
              </p>
            </div>

            {/* Search */}
            <div className="px-4 pb-2">
              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
                <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Rechercher une recette…"
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
                  autoFocus
                />
                {pickerSearch && (
                  <button onClick={() => setPickerSearch('')}>
                    <X className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                  </button>
                )}
              </div>
            </div>

            {/* Filter chips */}
            <div className="flex gap-2 px-4 pb-3 overflow-x-auto hide-scrollbar">
              {([
                { key: 'all', label: 'Tous' },
                { key: 'fridge', label: '🥬 Frigo' },
                { key: 'quick', label: '⚡ Rapide' },
                { key: 'vege', label: '🌿 Végé' },
              ] as const).map(f => (
                <button key={f.key} onClick={() => setPickerFilter(f.key)}
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={pickerFilter === f.key
                    ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
                    : { backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Recipe list */}
            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
              {filteredPickerRecipes.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucune recette trouvée</p>
                </div>
              ) : (
                filteredPickerRecipes.map(recipe => (
                  <button key={recipe.id} onClick={() => addToSlot(recipe.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:bg-[var(--bg-inset)] active:scale-[0.98]"
                    style={{ border: '1px solid var(--border-subtle)' }}>
                    {/* Image */}
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 overflow-hidden text-2xl"
                      style={{ backgroundColor: 'var(--bg-inset)' }}>
                      {recipe.imageUrl
                        ? <img src={recipe.imageUrl} alt="" className="w-full h-full object-cover" />
                        : recipe.ingredients?.[0]?.ingredient?.emoji || '🍽️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{recipe.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          <Clock className="w-3 h-3" /> {recipe.prepTime}min
                        </span>
                        {(recipe as any).calories && (
                          <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            <Flame className="w-3 h-3" /> {(recipe as any).calories} kcal
                          </span>
                        )}
                        {(recipe as any).matchPercent !== undefined && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: (recipe as any).matchPercent >= 80 ? 'rgba(16,185,129,0.15)' : (recipe as any).matchPercent >= 50 ? 'rgba(245,158,11,0.15)' : 'var(--bg-inset)',
                              color: (recipe as any).matchPercent >= 80 ? 'rgb(16,185,129)' : (recipe as any).matchPercent >= 50 ? 'rgb(245,158,11)' : 'var(--text-muted)',
                            }}>
                            {(recipe as any).matchPercent}% frigo
                          </span>
                        )}
                      </div>
                    </div>
                    <ChefHat className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
