'use client';

import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import MascotLoader from '@/components/MascotLoader';
import Mascot from '@/components/Mascot';
import RecipeCard from '@/components/RecipeCard';
import {
  Refrigerator, Plus, X, AlertTriangle, ChefHat,
  Wand2, Loader2, Minus, SlidersHorizontal, Calendar, Check, Barcode, Home, ShieldAlert, Camera, ShoppingCart, Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n';
import { cachedFetch, invalidate } from '@/lib/dataCache';
import { getShelfInfo } from '@/lib/shelf-life';
import ScanDLC from '@/components/ScanDLC';

interface FridgeItem {
  id: string;
  userId: string;
  quantity: number;
  unit: string;
  expiresAt: string | null;
  ingredient: { id: string; name: string; emoji: string; category: string };
  user?: { id: string; name: string };
}

interface Recipe {
  id: string;
  name: string;
  difficulty: string;
  prepTime: number;
  cuisine: string;
  imageUrl: string;
  matchPercent: number;
  matchCount: string;
  ingredients: Array<{ ingredient: { emoji: string } }>;
  isFavorite: boolean;
  isLocked?: boolean;
}

function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

interface HouseholdInfo { id: string; name: string; role: string; members: { id: string; name: string }[] }

export default function FridgePage() {
  const router = useRouter();
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [household, setHousehold] = useState<HouseholdInfo | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [rappelCount, setRappelCount] = useState(0);
  const [scanItem, setScanItem] = useState<FridgeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [searchIngredient, setSearchIngredient] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; emoji: string }>>([]);
  const [count, setCount] = useState(5);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [creatingIngredient, setCreatingIngredient] = useState(false);

  const [editExpiryId, setEditExpiryId] = useState<string | null>(null);
  const [editExpiryValue, setEditExpiryValue] = useState('');
  const [savingExpiry, setSavingExpiry] = useState(false);

  const { t } = useT();

  function expiryLabel(date: string | null) {
    if (!date) return null;
    const days = daysUntil(date);
    if (days < 0) return { text: t('fridge.expired'), color: 'text-red-500' };
    if (days === 0) return { text: t('fridge.expiry.today'), color: 'text-red-500' };
    if (days === 1) return { text: t('fridge.expiry.tomorrow'), color: 'text-amber-500' };
    if (days <= 3) return { text: `J-${days}`, color: 'text-amber-500' };
    return { text: `J-${days}`, color: 'text-emerald-600 dark:text-emerald-400' };
  }

  const loadData = useCallback(async () => {
    try {
      const [fridgeRes, householdRes, meRes, rappelRes] = await Promise.all([
        fetch('/api/fridge'),
        fetch('/api/household'),
        fetch('/api/auth/me'),
        fetch('/api/rappel-conso'),
      ]);
      // Session expirée / non connecté → connexion (évite un frigo "vide" trompeur)
      if (fridgeRes.status === 401) { router.replace('/login'); return; }
      if (fridgeRes.ok) setFridgeItems(await fridgeRes.json());
      // Recettes via cache partagé (le cache est invalidé quand le frigo change)
      cachedFetch<any[]>('/api/recipes?limit=300').then(setAllRecipes).catch(() => {});
      if (householdRes.ok) setHousehold(await householdRes.json());
      if (meRes.ok) { const me = await meRes.json(); setCurrentUserId(me.id); }
      if (rappelRes.ok) { const rappels = await rappelRes.json(); setRappelCount(Array.isArray(rappels) ? rappels.length : 0); }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (searchIngredient.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/ingredients/search?q=${encodeURIComponent(searchIngredient)}`);
      if (res.ok) setSuggestions(await res.json());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchIngredient]);

  function notifyBadgeUpdate() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(r => r.active?.postMessage('update-badge'));
    }
  }

  async function addToFridge(ingredientId: string) {
    await fetch('/api/fridge', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredientId }),
    });
    setSearchIngredient(''); setSuggestions([]); setShowAdd(false);
    invalidate('/api/recipes');   // le frigo a changé → recettes à recalculer
    loadData();
    notifyBadgeUpdate();
  }

  async function createAndAdd() {
    const name = searchIngredient.trim();
    if (!name) return;
    setCreatingIngredient(true);
    try {
      const res = await fetch('/api/ingredients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const ing = await res.json();
        await addToFridge(ing.id);
      }
    } finally {
      setCreatingIngredient(false);
    }
  }

  async function removeFromFridge(id: string) {
    await fetch(`/api/fridge/${id}`, { method: 'DELETE' });
    invalidate('/api/recipes');   // le frigo a changé → recettes à recalculer
    loadData();
    notifyBadgeUpdate();
  }

  async function saveExpiry(id: string) {
    setSavingExpiry(true);
    await fetch(`/api/fridge/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresAt: editExpiryValue || null }),
    });
    setSavingExpiry(false);
    setEditExpiryId(null);
    invalidate('/api/recipes');   // le frigo a changé → recettes à recalculer
    loadData();
    notifyBadgeUpdate();
  }

  function openExpiryEdit(item: FridgeItem) {
    setEditExpiryId(item.id);
    setEditExpiryValue(item.expiresAt ? item.expiresAt.split('T')[0] : '');
  }

  const expiringSoon = fridgeItems.filter(item => {
    if (!item.expiresAt) return false;
    return daysUntil(item.expiresAt) <= 3;
  });

  const suggestedRecipes = allRecipes.filter(r => r.matchPercent > 0).slice(0, count);

  const today = new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <AppShell>
        <MascotLoader fullPage variant="thinking" message={t('loading.waking')} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      {household ? (
        <Link href="/household"
          className="flex items-center gap-2 rounded-xl px-3 py-2 mb-4 transition-colors hover:opacity-80"
          style={{ backgroundColor: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.2)' }}>
          <Home className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 truncate">
              🏠 {household.name}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Frigo partagé · {household.members.length} membre{household.members.length > 1 ? 's' : ''}
            </p>
          </div>
          <span className="text-[10px] font-medium text-emerald-600">Gérer →</span>
        </Link>
      ) : (
        <Link href="/household"
          className="flex items-center gap-2 rounded-xl px-3 py-2 mb-4 transition-colors hover:opacity-80"
          style={{ backgroundColor: 'var(--bg-inset)', border: '1px dashed var(--border)' }}>
          <Home className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Partager le frigo avec la famille ou des colocs
            </p>
          </div>
          <span className="text-[10px] font-medium" style={{ color: 'var(--accent)' }}>Créer →</span>
        </Link>
      )}

      {rappelCount > 0 && (
        <Link href="/rappels"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 mb-4 transition-colors hover:opacity-80 fade-in"
          style={{ backgroundColor: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-red-700 dark:text-red-400">
              ⚠️ {rappelCount} rappel{rappelCount > 1 ? 's' : ''} produit{rappelCount > 1 ? 's' : ''}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Un produit de ton frigo est peut-être concerné
            </p>
          </div>
          <span className="text-[10px] font-medium text-red-600">Voir →</span>
        </Link>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Refrigerator className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          <div>
            <h2 className="font-semibold text-base">{t('fridge.title')}</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {fridgeItems.length !== 1
                ? t('fridge.ingredientCountPlural').replace('{n}', String(fridgeItems.length))
                : t('fridge.ingredientCount').replace('{n}', String(fridgeItems.length))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/shopping')}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}
            title="Liste de courses">
            <ShoppingCart className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          </button>
          <button onClick={() => router.push('/photo-scan')}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(59,130,246,0.15))', border: '1px solid rgba(168,85,247,0.2)' }}
            title="Photo → Frigo">
            <Camera className="w-4 h-4 text-purple-500" />
          </button>
          <button onClick={() => setShowAdd(!showAdd)}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="card p-3.5 mb-4 fade-in">
          <Link href="/scan?mode=barcode"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-2.5 transition-all"
            style={{ backgroundColor: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'rgba(59,130,246,0.12)' }}>
              <Barcode className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{t('fridge.scanBarcode')}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{t('fridge.scanBarcode.sub')}</p>
            </div>
          </Link>

          <div className="relative flex items-center gap-0 mb-1.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <span className="absolute inset-x-0 -bottom-px flex justify-center">
              <span className="px-2 text-[10px]" style={{ backgroundColor: 'var(--bg-card, var(--bg-raised))', color: 'var(--text-muted)' }}>{t('fridge.orSearchByName')}</span>
            </span>
          </div>
          <div className="h-3" />

          <input
            type="text"
            placeholder={t('fridge.searchIngredient')}
            value={searchIngredient}
            onChange={e => setSearchIngredient(e.target.value)}
            onKeyDown={e => e.stopPropagation()}
            className="input-field mb-2"
            autoFocus
          />
          {suggestions.length > 0 ? (
            <div className="space-y-0.5 max-h-40 overflow-y-auto">
              {suggestions.map(s => (
                <button key={s.id} onClick={() => addToFridge(s.id)}
                  className="w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors hover:bg-[var(--bg-inset)]">
                  <span>{s.emoji}</span> {s.name}
                </button>
              ))}
            </div>
          ) : searchIngredient.trim().length >= 2 && (
            <button onClick={createAndAdd} disabled={creatingIngredient}
              className="w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--bg-inset)', border: '1px dashed var(--border)' }}>
              {creatingIngredient
                ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color: 'var(--text-muted)' }} />
                : <Plus className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />}
              <span style={{ color: 'var(--text-secondary)' }}>
                {t('fridge.addCustom').replace('{name}', searchIngredient.trim())}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Chips ingredients */}
      {fridgeItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {fridgeItems.map(item => {
            const expiry = expiryLabel(item.expiresAt);
            const isEditing = editExpiryId === item.id;

            return (
              <div key={item.id}>
                {isEditing ? (
                  <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 fade-in"
                    style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                    <span className="text-xs">{item.ingredient.emoji}</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {item.ingredient.name}
                    </span>
                    <input
                      type="date"
                      min={today}
                      value={editExpiryValue}
                      onChange={e => setEditExpiryValue(e.target.value)}
                      className="text-xs rounded px-1.5 py-0.5 ml-1"
                      style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
                      autoFocus
                    />
                    <button onClick={() => saveExpiry(item.id)} disabled={savingExpiry}
                      className="w-6 h-6 flex items-center justify-center rounded text-emerald-500 transition-colors hover:bg-emerald-500/10">
                      {savingExpiry ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => setEditExpiryId(null)}
                      className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-[var(--bg-inset)]">
                      <X className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 rounded-md pl-2.5 pr-1 py-1 group"
                    style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
                    <span className="text-xs">{item.ingredient.emoji}</span>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.ingredient.name}</span>

                    {household && item.user && item.userId !== currentUserId && (
                      <span className="text-[9px] font-medium px-1 rounded"
                        style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: 'rgb(99,102,241)' }}>
                        {item.user.name.split(' ')[0]}
                      </span>
                    )}

                    {expiry && (
                      <span className={`text-[9px] font-semibold ${expiry.color}`}>{expiry.text}</span>
                    )}

                    {item.userId === currentUserId || !household ? (
                      <>
                        <button
                          onClick={() => setScanItem(item)}
                          title="Scanner la DLC"
                          className="w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Camera className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                        </button>
                        <button
                          onClick={() => openExpiryEdit(item)}
                          title={t('fridge.expiry.setDate')}
                          className="w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Calendar className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                        </button>
                        <button onClick={() => removeFromFridge(item.id)}
                          className="w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                        </button>
                      </>
                    ) : (
                      <div className="w-1" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {expiringSoon.length > 0 && (() => {
        const freezable = expiringSoon.filter(i => getShelfInfo(i.ingredient.name)?.freezable);
        return (
          <div className="rounded-lg p-3 mb-4 fade-in"
            style={{ backgroundColor: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.15)' }}>
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">{t('fridge.expiry.soon')}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {expiringSoon.map(i => i.ingredient.name).join(', ')}
                </p>
              </div>
            </div>
            {freezable.length > 0 && (
              <div className="mt-2 pt-2 flex items-start gap-2" style={{ borderTop: '1px solid rgba(234,179,8,0.15)' }}>
                <span className="text-sm shrink-0">❄️</span>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Congèle-les avant qu&apos;il soit trop tard : <strong>{freezable.map(i => i.ingredient.name).join(', ')}</strong> se conserve(nt) très bien au congélateur.
                </p>
              </div>
            )}
            <button onClick={() => router.push(`/dashboard?anti-gaspi=${encodeURIComponent(expiringSoon.map(i => i.ingredient.name).join(','))}`)}
              className="w-full flex items-center justify-center gap-2 mt-3 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.01]"
              style={{ backgroundColor: 'rgba(234,179,8,0.12)', color: 'rgb(180,130,0)' }}>
              <Sparkles className="w-3.5 h-3.5" />
              Recettes anti-gaspi avec ces ingrédients
            </button>
          </div>
        );
      })()}

      {fridgeItems.length === 0 ? (
        <div className="text-center py-10">
          <div className="flex justify-center mb-2">
            <Mascot variant="sad" size="lg" animate="float" message={t('fridge.empty.mascot')} />
          </div>
          <p className="text-sm font-medium mb-1">{t('fridge.empty.label')}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('fridge.empty.hint')}</p>
        </div>
      ) : (
        <>
          <div className="card p-4 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <SlidersHorizontal className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <span className="text-sm font-medium">{t('fridge.howMany')}</span>
            </div>
            <div className="flex items-center justify-center gap-4 mb-4">
              <button onClick={() => setCount(c => Math.max(3, c - 1))}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-3xl font-semibold w-12 text-center">{count}</span>
              <button onClick={() => setCount(c => Math.min(10, c + 1))}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-center gap-2 mb-4">
              {[3, 5, 7, 10].map(n => (
                <button key={n} onClick={() => setCount(n)}
                  className="px-3 py-1 rounded-md text-xs font-medium transition-all"
                  style={count === n
                    ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
                    : { backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                  {n}
                </button>
              ))}
            </div>
            <button
              onClick={async () => {
                setAiLoading(true); setAiError('');
                try {
                  await loadData();
                } catch { setAiError(t('fridge.networkError')); }
                finally { setAiLoading(false); }
              }}
              disabled={aiLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              {aiLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('fridge.aiGenerating')}</>
                : <><Wand2 className="w-4 h-4" /> {t('fridge.aiGenerate')}</>}
            </button>
            {aiError && <p className="text-xs text-red-500 mt-2 text-center">{aiError}</p>}
            <p className="text-[11px] text-center mt-2.5" style={{ color: 'var(--text-muted)' }}>
              {t('fridge.createWithAI')} <Link href="/home" className="underline" style={{ color: 'var(--accent)' }}>{t('fridge.createWithAI.cta')}</Link>
            </p>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <ChefHat className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            <h2 className="font-semibold text-sm">
              {suggestedRecipes.length > 0
                ? (suggestedRecipes.length > 1
                    ? t('fridge.topRecipesPlural').replace('{n}', String(suggestedRecipes.length))
                    : t('fridge.topRecipes').replace('{n}', String(suggestedRecipes.length)))
                : t('fridge.noRecipes')}
            </h2>
          </div>

          {suggestedRecipes.length === 0 ? (
            <div className="text-center py-10">
              <ChefHat className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
              <p className="text-xs mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>
                {t('fridge.noRecipes.hint')}
              </p>
              <Link href="/home"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
                <Wand2 className="w-4 h-4" /> {t('fridge.createWithAI.cta')}
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {suggestedRecipes.map(r => (
                <RecipeCard key={r.id} id={r.id} name={r.name} difficulty={r.difficulty}
                  prepTime={r.prepTime} cuisine={r.cuisine} imageUrl={r.imageUrl}
                  matchPercent={r.matchPercent} matchCount={r.matchCount}
                  emoji={r.ingredients?.[0]?.ingredient?.emoji}
                  isLocked={r.isLocked} />
              ))}
            </div>
          )}
        </>
      )}
      {scanItem && (
        <ScanDLC
          itemId={scanItem.id}
          itemName={scanItem.ingredient.name}
          itemEmoji={scanItem.ingredient.emoji}
          onSaved={() => { setScanItem(null); invalidate('/api/recipes'); loadData(); notifyBadgeUpdate(); }}
          onClose={() => setScanItem(null)}
        />
      )}
    </AppShell>
  );
}
