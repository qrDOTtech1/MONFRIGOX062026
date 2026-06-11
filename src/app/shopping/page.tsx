'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import AppShell from '@/components/AppShell';
import {
  CalendarDays, ShoppingCart, ChevronLeft, ChevronRight, ChevronDown,
  Plus, X, Search, Check, Refrigerator, Share2,
  Loader2, UtensilsCrossed, Sparkles,
} from 'lucide-react';

/* ── Types ── */
interface MealPlanEntry {
  id: string;
  date: string;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER';
  recipe: {
    id: string; name: string; prepTime: number; imageUrl: string;
    ingredients: Array<{ ingredient: { emoji: string } }>;
  };
}
interface Recipe {
  id: string; name: string; prepTime: number; cuisine: string;
  imageUrl: string; difficulty: string;
  ingredients: Array<{ ingredient: { emoji: string } }>;
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
  const [savingSlot, setSavingSlot] = useState<string|null>(null);

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
  const allEntries = shopData ? Object.values(shopData.categories).flat() : [];
  const boughtCount = allEntries.filter(e => checked.has(e.ingredientId)).length;
  const totalShop = allEntries.length;
  const progress = totalShop > 0 ? Math.round((boughtCount / totalShop) * 100) : 0;

  /* ── RENDER ── */
  return (
    <AppShell>

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
          {/* Week navigation */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => setWeekOffset(o => o - 1)}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--bg-inset)]">
              <ChevronLeft className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold">{weekLabel}</p>
              {weekOffset === 0 && (
                <p className="text-[10px] mt-0.5 text-emerald-500">Semaine actuelle</p>
              )}
            </div>
            <button onClick={() => setWeekOffset(o => o + 1)}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--bg-inset)]">
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>

          {/* Auto-plan button (VIP) */}
          <button
            onClick={autoGeneratePlan}
            disabled={autoPlanning}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl mb-3 text-xs font-medium transition-all"
            style={{ backgroundColor: 'rgba(168,85,247,0.08)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)' }}
          >
            {autoPlanning
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Génération IA en cours…</>
              : <><Sparkles className="w-3.5 h-3.5" /> Planning auto (VIP) — remplir la semaine prochaine</>}
          </button>
          {autoPlanError && (
            <p className="text-[11px] text-center mb-3" style={{ color: '#ef4444' }}>{autoPlanError}</p>
          )}

          {/* Stats bar */}
          {plannedCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4 fade-in"
              style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
              <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-semibold">{plannedCount} repas</span> planifiés · génère ta liste dans &quot;Courses&quot;
              </p>
            </div>
          )}

          {/* Days */}
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-28 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-inset)' }} />)}
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {weekDays.map(day => {
                const dKey = dateKey(day);
                const today = isToday(day);
                const past = isPast(day) && !today;
                return (
                  <div key={dKey} className="card overflow-hidden"
                    style={today ? { borderColor: 'var(--accent)', borderWidth: 1.5 } : undefined}>

                    {/* Day header */}
                    <div className="flex items-center gap-2 px-3.5 py-2.5"
                      style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: today ? 'var(--bg-inset)' : undefined }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                        style={today
                          ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
                          : { color: 'var(--text)' }}>
                        {day.getDate()}
                      </div>
                      <div>
                        <span className="text-sm font-semibold">{DAYS_FR[day.getDay()]}</span>
                        <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
                          {MONTHS_FR[day.getMonth()]}
                        </span>
                      </div>
                      {today && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full ml-auto"
                          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
                          Aujourd&apos;hui
                        </span>
                      )}
                      {past && !today && <span className="text-[9px] ml-auto" style={{ color: 'var(--text-muted)' }}>Passé</span>}
                    </div>

                    {/* Meal slots */}
                    <div>
                      {MEALS.map(meal => {
                        const plan = getPlan(dKey, meal.type);
                        const slotKey = `${dKey}-${meal.type}`;
                        const saving = savingSlot === slotKey;

                        return (
                          <div key={meal.type} className="flex items-center gap-2.5 px-3.5 py-2.5 min-h-[48px]">
                            <span className="text-base w-5 shrink-0">{meal.emoji}</span>
                            <span className="text-xs w-14 shrink-0" style={{ color: 'var(--text-muted)' }}>{meal.label}</span>

                            {saving ? (
                              <div className="flex-1 flex items-center gap-1.5">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--text-muted)' }} />
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Enregistrement…</span>
                              </div>
                            ) : plan ? (
                              <div className="flex-1 flex items-center gap-2 min-w-0">
                                {/* Recipe chip */}
                                <div className="flex items-center gap-2 flex-1 min-w-0 rounded-lg px-2.5 py-1.5"
                                  style={{ backgroundColor: 'var(--bg-inset)' }}>
                                  <span className="text-sm">{plan.recipe.ingredients[0]?.ingredient?.emoji || '🍽️'}</span>
                                  <span className="text-xs font-medium truncate flex-1" style={{ color: 'var(--text)' }}>
                                    {plan.recipe.name}
                                  </span>
                                  <span className="text-[10px] shrink-0" style={{ color: 'var(--text-muted)' }}>{plan.recipe.prepTime}min</span>
                                </div>
                                <button onClick={() => removeSlot(plan.id)}
                                  className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors hover:bg-red-500/10">
                                  <X className="w-3 h-3 text-red-400" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setPickerDate(dKey);
                                  setPickerMeal(meal.type);
                                  setPickerSearch('');
                                  setPickerOpen(true);
                                }}
                                className="flex-1 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors group"
                                style={{ border: '1.5px dashed var(--border)', color: 'var(--text-muted)' }}
                              >
                                <Plus className="w-3.5 h-3.5 group-hover:text-[var(--accent)] transition-colors" />
                                <span className="text-xs group-hover:text-[var(--accent)] transition-colors">Ajouter</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Generate list CTA */}
          {plannedCount > 0 && (
            <div className="sticky bottom-24 pb-2">
              <button onClick={() => setTab('courses')}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold shadow-lg transition-all active:scale-[0.98]"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
                <ShoppingCart className="w-4 h-4" />
                Voir la liste de courses
                <span className="text-xs font-normal opacity-75">{plannedCount} repas planifiés</span>
              </button>
            </div>
          )}
        </>
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
            <div className="px-4 pb-3">
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

            {/* Recipe list */}
            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-1.5">
              {filteredRecipes.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucune recette trouvée</p>
                </div>
              ) : (
                filteredRecipes.map(recipe => (
                  <button key={recipe.id} onClick={() => addToSlot(recipe.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors hover:bg-[var(--bg-inset)] active:scale-[0.98]"
                    style={{ border: '1px solid var(--border-subtle)' }}>
                    {/* Emoji/Image */}
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 overflow-hidden text-xl"
                      style={{ backgroundColor: 'var(--bg-inset)' }}>
                      {recipe.imageUrl
                        ? <img src={recipe.imageUrl} alt="" className="w-full h-full object-cover" />
                        : recipe.ingredients?.[0]?.ingredient?.emoji || '🍽️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{recipe.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {recipe.prepTime}min · {recipe.cuisine}
                      </p>
                    </div>
                    <Plus className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
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
