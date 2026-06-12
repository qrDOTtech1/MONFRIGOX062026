'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import RecipeCard from '@/components/RecipeCard';
import CommunityFeed from '@/components/CommunityFeed';
import InfoBubble from '@/components/InfoBubble';
import { Search, ChefHat, SlidersHorizontal, Refrigerator, Sparkles, Globe, Users, ChevronDown, X, Dice5, Crown, MessageSquare, Loader2 } from 'lucide-react';

// Nombre de recettes affichées au départ puis par paquet (chargement progressif)
const PAGE_SIZE = 12;

interface Recipe {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  prepTime: number;
  cuisine: string;
  imageUrl: string;
  matchPercent: number;
  matchCount: string;
  ingredients: Array<{ ingredient: { emoji: string; name: string } }>;
  isFavorite: boolean;
  isLocked?: boolean;
  allergenWarnings?: string[];
  dietConflict?: boolean;
  dietLabel?: string;
  usesExpiring?: number;
  isRevisite?: boolean;
  isCommunity?: boolean;
  author?: string | null;
  kidFriendly?: boolean;
  babyFriendly?: boolean;
  costTotal?: number;
  costPerServing?: number;
  costConfidence?: 'high' | 'medium' | 'low';
}

const DIFFICULTIES = ['Tous', 'Facile', 'Moyen', 'Difficile'];
const TIMES        = ['Tous', '< 15 min', '< 30 min', '< 45 min'];
const CUISINES     = ['Toutes', 'FR', 'IT', 'JP', 'MX', 'IN', 'MA', 'TH', 'VN', 'CN', 'US', 'ES', 'GR'];
const DIETARY      = ['Tous', 'Anti-gaspi', 'Compatible régime', 'Revisités', 'Communauté'];
const BUDGETS: { key: string; label: string; max: number | null }[] = [
  { key: 'Tous',   label: 'Tous',     max: null },
  { key: '5',      label: '< 5 €',    max: 5 },
  { key: '10',     label: '< 10 €',   max: 10 },
  { key: '15',     label: '< 15 €',   max: 15 },
  { key: 'custom', label: 'Personnalisé', max: null },
];

// Filtres invité avancés
const GUEST_DIETS = [
  { key: 'vegetarien', label: 'Végétarien',  emoji: '🥗' },
  { key: 'vegan',      label: 'Vegan',       emoji: '🌱' },
  { key: 'halal',      label: 'Halal',       emoji: '☪️' },
  { key: 'casher',     label: 'Casher',      emoji: '✡️' },
  { key: 'sans-porc',  label: 'Sans porc',   emoji: '🐷' },
  { key: 'keto',       label: 'Keto',        emoji: '🥑' },
  { key: 'sans-sucre', label: 'Sans sucre',  emoji: '🍬' },
];

const GUEST_ALLERGENS = [
  { key: 'gluten',         label: 'Gluten',          emoji: '🌾' },
  { key: 'lactose',        label: 'Lactose',          emoji: '🥛' },
  { key: 'oeufs',          label: 'Œufs',             emoji: '🥚' },
  { key: 'arachides',      label: 'Arachides',        emoji: '🥜' },
  { key: 'fruits-a-coque', label: 'Fruits à coque',   emoji: '🌰' },
  { key: 'soja',           label: 'Soja',             emoji: '🫘' },
  { key: 'poisson',        label: 'Poisson',          emoji: '🐟' },
  { key: 'crustaces',      label: 'Crustacés',        emoji: '🦐' },
  { key: 'gluten',         label: 'Gluten',           emoji: '🌾' },
  { key: 'sesame',         label: 'Sésame',           emoji: '⚪' },
  { key: 'sulfites',       label: 'Sulfites',         emoji: '🍷' },
];

// Clé allergène → mots-clés dans les ingrédients (correspondance côté client)
const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  gluten:         ['blé', 'farine', 'orge', 'seigle', 'pain', 'pâte', 'gluten', 'semoule', 'couscous'],
  lactose:        ['lait', 'beurre', 'crème', 'fromage', 'yaourt', 'parmesan', 'mozzarella', 'ricotta'],
  oeufs:          ['oeuf', 'egg', 'mayonnaise'],
  arachides:      ['cacahuète', 'arachide', 'peanut'],
  'fruits-a-coque': ['noix', 'noisette', 'amande', 'cajou', 'pistache', 'pécan', 'macadamia'],
  soja:           ['soja', 'tofu', 'tempeh', 'edamame', 'miso'],
  poisson:        ['saumon', 'thon', 'cabillaud', 'lieu', 'sardine', 'anchois', 'poisson'],
  crustaces:      ['crevette', 'homard', 'crabe', 'langoustine', 'crustacé'],
  sesame:         ['sésame', 'tahini'],
  sulfites:       ['vin', 'vinaigre', 'raisin sec'],
};

const DIET_KEYWORDS: Record<string, { exclude: string[] }> = {
  vegetarien:  { exclude: ['viande', 'poulet', 'boeuf', 'porc', 'agneau', 'veau', 'dinde', 'jambon', 'lardons', 'bacon', 'saucisse'] },
  vegan:       { exclude: ['viande', 'poulet', 'boeuf', 'porc', 'agneau', 'veau', 'dinde', 'jambon', 'lardons', 'bacon', 'saucisse', 'lait', 'beurre', 'fromage', 'crème', 'oeuf', 'miel', 'yaourt'] },
  halal:       { exclude: ['porc', 'jambon', 'lardons', 'bacon', 'saucisse', 'alcool', 'vin', 'bière'] },
  casher:      { exclude: ['porc', 'jambon', 'lardons', 'bacon', 'crevette', 'homard', 'crabe'] },
  'sans-porc': { exclude: ['porc', 'jambon', 'lardons', 'bacon', 'saucisse', 'chorizo', 'pancetta'] },
  keto:        { exclude: ['pain', 'pâte', 'riz', 'pomme de terre', 'farine', 'sucre', 'sirop'] },
  'sans-sucre':{ exclude: ['sucre', 'sirop', 'miel', 'confiture', 'chocolat'] },
};

function SectionLabel({ icon, label, count, color }: { icon: React.ReactNode; label: string; count: number; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-5 first:mt-0">
      <span>{icon}</span>
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: color ?? 'var(--text-muted)' }}>
        {label}
      </span>
      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium ml-auto"
        style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)' }}>
        {count}
      </span>
    </div>
  );
}

export default function ExplorerPage() {
  const router = useRouter();
  const [recipes, setRecipes]         = useState<Recipe[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [difficulty, setDifficulty]   = useState('Tous');
  const [time, setTime]               = useState('Tous');
  const [cuisine, setCuisine]         = useState('Toutes');
  const [dietary, setDietary]         = useState('Tous');
  const [surprising, setSurprising]   = useState(false);
  const [budget, setBudget]           = useState('Tous');
  const [customBudget, setCustomBudget] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sectionMode, setSectionMode] = useState(true);
  // Filtres invité
  const [guestDiet, setGuestDiet]           = useState('');
  const [guestAllergens, setGuestAllergens] = useState<string[]>([]);
  const [kidMode, setKidMode]               = useState<'' | 'kid' | 'baby'>('');
  const [userPlan, setUserPlan]             = useState<string>('');
  // Onglet Explorer : recettes ou communauté (communauté incorporée pour réduire la nav)
  const [view, setView]                     = useState<'recipes' | 'community'>('recipes');
  // Chargement progressif : on n'affiche pas toutes les recettes d'un coup
  const [visibleLimit, setVisibleLimit]     = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/recipes');
    if (res.ok) setRecipes(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch('/api/billing/status').then(r => r.ok ? r.json() : null).then(d => d && setUserPlan(d.plan || 'FREE'));
  }, []);

  // Vérification côté client si un ingrédient correspond à un allergène
  function recipeHasAllergen(r: Recipe, allergenKey: string): boolean {
    const keywords = ALLERGEN_KEYWORDS[allergenKey] ?? [];
    return r.ingredients.some(i =>
      keywords.some(kw => i.ingredient.name.toLowerCase().includes(kw))
    );
  }

  function recipeConflictsDiet(r: Recipe, dietKey: string): boolean {
    const { exclude } = DIET_KEYWORDS[dietKey] ?? { exclude: [] };
    return r.ingredients.some(i =>
      exclude.some(kw => i.ingredient.name.toLowerCase().includes(kw))
    );
  }

  // Plafond budgétaire actif (€ pour la recette entière)
  const budgetMax: number | null =
    budget === 'custom'
      ? (parseFloat(customBudget.replace(',', '.')) || null)
      : (BUDGETS.find(b => b.key === budget)?.max ?? null);

  const filtered = recipes.filter(r => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) &&
        !r.description?.toLowerCase().includes(search.toLowerCase()) &&
        !r.cuisine.toLowerCase().includes(search.toLowerCase())) return false;
    if (difficulty === 'Facile'    && r.difficulty !== 'FACILE')    return false;
    if (difficulty === 'Moyen'     && r.difficulty !== 'MOYEN')     return false;
    if (difficulty === 'Difficile' && r.difficulty !== 'DIFFICILE') return false;
    if (time === '< 15 min' && r.prepTime > 15) return false;
    if (time === '< 30 min' && r.prepTime > 30) return false;
    if (time === '< 45 min' && r.prepTime > 45) return false;
    if (cuisine !== 'Toutes' && r.cuisine !== cuisine) return false;
    if (dietary === 'Anti-gaspi'        && (r.usesExpiring ?? 0) === 0) return false;
    if (dietary === 'Compatible régime' && (r.dietConflict || (r.allergenWarnings?.length ?? 0) > 0)) return false;
    if (dietary === 'Revisités'         && !r.isRevisite) return false;
    if (dietary === 'Communauté'        && !r.isCommunity) return false;
    // Budget : on n'affiche que les recettes dont le coût est estimable et <= plafond
    if (budgetMax !== null) {
      if (!r.costTotal || r.costTotal <= 0) return false;
      if (r.costTotal > budgetMax) return false;
    }
    // Filtres invité
    if (guestDiet && recipeConflictsDiet(r, guestDiet)) return false;
    if (guestAllergens.some(a => recipeHasAllergen(r, a))) return false;
    if (kidMode === 'kid'  && !r.kidFriendly) return false;
    if (kidMode === 'baby' && !r.babyFriendly) return false;
    return true;
  });

  const budgetActive = budget !== 'Tous' && !(budget === 'custom' && budgetMax === null);
  const activeFilters = [difficulty !== 'Tous', time !== 'Tous', cuisine !== 'Toutes', dietary !== 'Tous', budgetActive].filter(Boolean).length;
  const guestFilters  = [!!guestDiet, guestAllergens.length > 0, kidMode !== ''].filter(Boolean).length;
  const isSearching   = !!search || activeFilters > 0 || guestFilters > 0;

  const ready   = filtered.filter(r => r.matchPercent >= 80);
  const partial = filtered.filter(r => r.matchPercent >= 40 && r.matchPercent < 80);
  const explore = filtered.filter(r => r.matchPercent < 40);

  // ── Chargement progressif ──────────────────────────────────────────
  // On ne rend qu'un sous-ensemble des recettes, puis on agrandit la
  // fenêtre au défilement. Évite d'afficher des centaines de cartes d'un
  // coup (ce qui rendait Explorer très lent à l'ouverture).
  const hasMore = visibleLimit < filtered.length;
  const readyShown      = ready.slice(0, visibleLimit);
  const remAfterReady   = Math.max(0, visibleLimit - readyShown.length);
  const partialShown    = partial.slice(0, remAfterReady);
  const remAfterPartial = Math.max(0, remAfterReady - partialShown.length);
  const exploreShown    = explore.slice(0, remAfterPartial);

  // Réinitialise la fenêtre quand la recherche, les filtres ou l'onglet changent
  useEffect(() => {
    setVisibleLimit(PAGE_SIZE);
  }, [search, difficulty, time, cuisine, dietary, budget, customBudget, guestDiet, guestAllergens, kidMode, sectionMode, view]);

  // Agrandit la fenêtre quand le bas de liste devient visible (scroll infini)
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) setVisibleLimit(v => v + PAGE_SIZE); },
      { rootMargin: '400px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, view, sectionMode, isSearching]);

  function resetGuest() {
    setGuestDiet('');
    setGuestAllergens([]);
    setKidMode('');
  }

  const CardList = ({ list }: { list: Recipe[] }) => (
    <div className="space-y-2">
      {list.map(r => (
        <RecipeCard
          key={r.id}
          id={r.id}
          name={r.name}
          difficulty={r.difficulty}
          prepTime={r.prepTime}
          cuisine={r.cuisine}
          imageUrl={r.imageUrl}
          matchPercent={r.matchPercent}
          matchCount={r.matchCount}
          emoji={r.ingredients?.[0]?.ingredient?.emoji}
          isFavorite={r.isFavorite}
          isLocked={r.isLocked}
          allergenWarnings={r.allergenWarnings}
          dietConflict={r.dietConflict}
          dietLabel={r.dietLabel}
          usesExpiring={r.usesExpiring}
          isRevisite={r.isRevisite}
          isCommunity={r.isCommunity}
          cost={r.costTotal}
        />
      ))}
    </div>
  );

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex items-center gap-2.5 mb-3">
        <ChefHat className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        <h1 className="font-semibold text-base">Explorer</h1>
        <InfoBubble
          align="left"
          label="Explorer"
          text="Tes recettes sont triées selon le contenu de ton frigo : celles que tu peux cuisiner maintenant apparaissent en premier. L'onglet « Communauté » regroupe les partages des autres membres."
        />
        {view === 'recipes' && (
        <div className="ml-auto flex items-center gap-2">
          <button
            disabled={surprising}
            onClick={async () => {
              setSurprising(true);
              try {
                const res = await fetch('/api/recipes/surprise');
                if (res.ok) {
                  const { id } = await res.json();
                  router.push(`/recipes/${id}`);
                }
              } finally { setSurprising(false); }
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all"
            style={{ backgroundColor: 'rgba(234,179,8,0.1)', color: '#ca8a04', border: '1px solid rgba(234,179,8,0.2)' }}
            title="Recette surprise"
          >
            <Dice5 className={`w-3.5 h-3.5 ${surprising ? 'animate-spin' : ''}`} />
            Surprise !
          </button>
          {!isSearching && (
            <button
              onClick={() => setSectionMode(m => !m)}
              className="text-xs px-2 py-1 rounded-lg transition-all"
              style={sectionMode
                ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
                : { backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              Sections
            </button>
          )}
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {filtered.length} recette{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
        )}
      </div>

      {/* Onglets Recettes / Communauté (communauté incorporée dans Explorer) */}
      <div className="flex gap-1 p-0.5 rounded-xl mb-4" style={{ backgroundColor: 'var(--bg-inset)' }}>
        <button
          onClick={() => setView('recipes')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all"
          style={view === 'recipes'
            ? { backgroundColor: 'var(--bg-raised)', color: 'var(--text)', boxShadow: '0 1px 3px rgba(0,0,0,.12)' }
            : { color: 'var(--text-muted)' }}>
          <ChefHat className="w-4 h-4" /> Recettes
        </button>
        <button
          onClick={() => setView('community')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all"
          style={view === 'community'
            ? { backgroundColor: 'var(--bg-raised)', color: 'var(--text)', boxShadow: '0 1px 3px rgba(0,0,0,.12)' }
            : { color: 'var(--text-muted)' }}>
          <MessageSquare className="w-4 h-4" /> Communauté
        </button>
      </div>

      {/* ════════ ONGLET COMMUNAUTÉ ════════ */}
      {view === 'community' && <CommunityFeed />}

      {/* ════════ ONGLET RECETTES ════════ */}
      {view === 'recipes' && (
      <>

      {/* Banner upgrade FREE */}
      {userPlan === 'FREE' && (
        <div onClick={() => router.push('/profile')}
          className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4 cursor-pointer transition-all hover:scale-[1.01] fade-in"
          style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(168,85,247,0.12))', border: '1.5px solid rgba(168,85,247,0.25)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, rgb(245,158,11), rgb(168,85,247))' }}>
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Passez Premium ou VIP</p>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Toutes les recettes + IA illimitée + planning auto
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-bold text-amber-500">3,99€<span className="font-normal text-[10px]">/mois</span></p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>ou VIP 6,99€</p>
          </div>
        </div>
      )}

      {/* ⚡ Vide-frigo express : 1 tap → la recette qui sauve ce qui expire */}
      {(() => {
        const expressCandidates = recipes.filter(r => (r.usesExpiring ?? 0) > 0 && !r.isLocked);
        if (expressCandidates.length === 0) return null;
        const best = [...expressCandidates].sort((a, b) =>
          (b.usesExpiring ?? 0) - (a.usesExpiring ?? 0) || b.matchPercent - a.matchPercent
        )[0];
        const totalExpiring = best.usesExpiring ?? 0;
        return (
          <button
            onClick={() => router.push(`/recipes/${best.id}`)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-3 text-left transition-all hover:scale-[1.01] fade-in"
            style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(234,179,8,0.10))', border: '1.5px solid rgba(16,185,129,0.3)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, rgb(16,185,129), rgb(234,179,8))' }}>
              <span className="text-lg">⚡</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Vide-frigo express</p>
              <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                « {best.name} » utilise {totalExpiring} ingrédient{totalExpiring > 1 ? 's' : ''} qui périme{totalExpiring > 1 ? 'nt' : ''} bientôt
              </p>
            </div>
            <span className="text-xs font-bold shrink-0" style={{ color: 'rgb(16,185,129)' }}>GO →</span>
          </button>
        );
      })()}

      {/* Filtre invité actif → banner */}
      {guestFilters > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3 fade-in"
          style={{ backgroundColor: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <Users className="w-3.5 h-3.5 shrink-0" style={{ color: '#818cf8' }} />
          <span className="text-xs flex-1" style={{ color: '#818cf8' }}>
            Mode invité actif
            {guestDiet && ` · ${GUEST_DIETS.find(d => d.key === guestDiet)?.emoji} ${GUEST_DIETS.find(d => d.key === guestDiet)?.label}`}
            {guestAllergens.length > 0 && ` · ${guestAllergens.length} allergène${guestAllergens.length > 1 ? 's' : ''} exclus`}
            {kidMode === 'kid' && ' · Enfants'}
            {kidMode === 'baby' && ' · Bébé'}
          </span>
          <button onClick={resetGuest} className="shrink-0">
            <X className="w-3.5 h-3.5" style={{ color: '#818cf8' }} />
          </button>
        </div>
      )}

      {/* Barre de recherche + filtres */}
      <div className="flex gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Rechercher une recette…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field !pl-9"
          />
        </div>
        <button
          onClick={() => { setShowFilters(!showFilters); if (showFilters) setShowAdvanced(false); }}
          className="relative px-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
          style={showFilters || activeFilters > 0
            ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
            : { backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
          <SlidersHorizontal className="w-4 h-4" />
          {(activeFilters + guestFilters) > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center bg-red-500 text-white">
              {activeFilters + guestFilters}
            </span>
          )}
        </button>
      </div>

      {/* Filtres standards */}
      {showFilters && (
        <div className="card p-3.5 mb-2 space-y-3 fade-in">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Régime &amp; anti-gaspi</p>
            <div className="flex gap-1.5 flex-wrap">
              {DIETARY.map(d => (
                <button key={d} onClick={() => setDietary(d)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                  style={dietary === d
                    ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
                    : { backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Difficulté</p>
            <div className="flex gap-1.5 flex-wrap">
              {DIFFICULTIES.map(d => (
                <button key={d} onClick={() => setDifficulty(d)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                  style={difficulty === d
                    ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
                    : { backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Temps</p>
            <div className="flex gap-1.5 flex-wrap">
              {TIMES.map(t => (
                <button key={t} onClick={() => setTime(t)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                  style={time === t
                    ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
                    : { backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Cuisine</p>
            <div className="flex gap-1.5 flex-wrap">
              {CUISINES.map(c => (
                <button key={c} onClick={() => setCuisine(c)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                  style={cuisine === c
                    ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
                    : { backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Budget <span className="normal-case">(coût total estimé)</span></p>
            <div className="flex gap-1.5 flex-wrap items-center">
              {BUDGETS.map(b => (
                <button key={b.key} onClick={() => setBudget(b.key)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                  style={budget === b.key
                    ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
                    : { backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                  {b.label}
                </button>
              ))}
              {budget === 'custom' && (
                <div className="flex items-center gap-1 fade-in">
                  <input
                    type="number" min={0} step="0.5" inputMode="decimal"
                    value={customBudget}
                    onChange={e => setCustomBudget(e.target.value)}
                    placeholder="Max"
                    className="input-field !py-1 !px-2 text-xs w-20"
                    autoFocus
                  />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>€ max</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            {activeFilters > 0 && (
              <button onClick={() => { setDifficulty('Tous'); setTime('Tous'); setCuisine('Toutes'); setDietary('Tous'); setBudget('Tous'); setCustomBudget(''); }}
                className="text-xs text-red-500">
                Réinitialiser
              </button>
            )}
            {/* Bouton Plus de filtres */}
            <button
              onClick={() => setShowAdvanced(a => !a)}
              className="ml-auto flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
              style={showAdvanced || guestFilters > 0
                ? { backgroundColor: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }
                : { backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              <Users className="w-3.5 h-3.5" />
              Filtres invité
              {guestFilters > 0 && <span className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center bg-indigo-500 text-white">{guestFilters}</span>}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* Panneau filtres invité */}
      {showFilters && showAdvanced && (
        <div className="rounded-2xl p-4 mb-3 space-y-4 fade-in"
          style={{ backgroundColor: 'rgba(99,102,241,0.05)', border: '1.5px solid rgba(99,102,241,0.2)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4" style={{ color: '#818cf8' }} />
            <p className="text-sm font-semibold" style={{ color: '#818cf8' }}>Filtres invité</p>
            <p className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>Je reçois quelqu&apos;un avec un régime particulier</p>
          </div>

          {/* Régime invité */}
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Régime de l&apos;invité</p>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setGuestDiet('')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={guestDiet === ''
                  ? { backgroundColor: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1.5px solid rgba(99,102,241,0.4)' }
                  : { backgroundColor: 'var(--bg-raised)', color: 'var(--text-muted)', border: '1.5px solid var(--border)' }}>
                Aucun
              </button>
              {GUEST_DIETS.map(d => (
                <button key={d.key}
                  onClick={() => setGuestDiet(guestDiet === d.key ? '' : d.key)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all"
                  style={guestDiet === d.key
                    ? { backgroundColor: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1.5px solid rgba(99,102,241,0.4)' }
                    : { backgroundColor: 'var(--bg-raised)', color: 'var(--text)', border: '1.5px solid var(--border)' }}>
                  {d.emoji} {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Allergènes invité */}
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Allergènes à exclure</p>
            <div className="flex gap-1.5 flex-wrap">
              {GUEST_ALLERGENS.filter((v, i, a) => a.findIndex(x => x.key === v.key) === i).map(a => {
                const on = guestAllergens.includes(a.key);
                return (
                  <button key={a.key}
                    onClick={() => setGuestAllergens(prev => on ? prev.filter(x => x !== a.key) : [...prev, a.key])}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all"
                    style={on
                      ? { backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1.5px solid rgba(239,68,68,0.4)' }
                      : { backgroundColor: 'var(--bg-raised)', color: 'var(--text)', border: '1.5px solid var(--border)' }}>
                    {a.emoji} {a.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode enfant */}
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Public</p>
            <div className="flex gap-1.5">
              {[
                { key: '',     label: 'Tous',   emoji: '👨‍👩‍👧' },
                { key: 'kid',  label: 'Enfants', emoji: '🧒' },
                { key: 'baby', label: 'Bébé',    emoji: '👶' },
              ].map(m => (
                <button key={m.key}
                  onClick={() => setKidMode(m.key as any)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                  style={kidMode === m.key
                    ? { backgroundColor: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1.5px solid rgba(99,102,241,0.4)' }
                    : { backgroundColor: 'var(--bg-raised)', color: 'var(--text)', border: '1.5px solid var(--border)' }}>
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
          </div>

          {guestFilters > 0 && (
            <button onClick={resetGuest} className="text-xs text-red-400 flex items-center gap-1">
              <X className="w-3 h-3" /> Réinitialiser filtres invité
            </button>
          )}
        </div>
      )}

      {/* Résultats */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <ChefHat className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
          <p className="text-sm font-medium mb-1">Aucune recette compatible</p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            {guestFilters > 0 ? 'Aucune recette ne correspond aux contraintes invité.' : 'Essaie un autre terme ou modifie les filtres.'}
          </p>
          {guestFilters > 0 && (
            <button onClick={resetGuest} className="text-xs font-semibold px-3 py-2 rounded-xl transition-all"
              style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              Retirer les filtres invité
            </button>
          )}
        </div>
      ) : sectionMode && !isSearching ? (
        <div className="fade-in">
          {ready.length === 0 && partial.length === 0 && (
            <div className="p-4 rounded-xl mb-4 text-center"
              style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)' }}>
              <p className="text-sm font-medium mb-1">Frigo vide ?</p>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                Ajoute des ingrédients pour voir quelles recettes tu peux cuisiner maintenant.
              </p>
              <Link href="/fridge"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
                <Refrigerator className="w-3.5 h-3.5" />
                Remplir mon frigo
              </Link>
            </div>
          )}
          {readyShown.length > 0 && (
            <>
              <SectionLabel icon={<Refrigerator className="w-4 h-4" style={{ color: '#22c55e' }} />} label="Prêt à cuisiner" count={ready.length} color="#22c55e" />
              <CardList list={readyShown} />
            </>
          )}
          {partialShown.length > 0 && (
            <>
              <SectionLabel icon={<Sparkles className="w-4 h-4" style={{ color: '#f59e0b' }} />} label="Presque complet" count={partial.length} color="#f59e0b" />
              <CardList list={partialShown} />
            </>
          )}
          {exploreShown.length > 0 && (
            <>
              <SectionLabel icon={<Globe className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />} label="À explorer" count={explore.length} />
              <CardList list={exploreShown} />
            </>
          )}
        </div>
      ) : (
        <CardList list={filtered.slice(0, visibleLimit)} />
      )}

      {/* Chargement progressif : sentinelle (scroll) + bouton de secours */}
      {hasMore && (
        <>
          <div ref={sentinelRef} aria-hidden className="h-1" />
          <button
            onClick={() => setVisibleLimit(v => v + PAGE_SIZE)}
            className="w-full mt-2 mb-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all"
            style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            <Loader2 className="w-4 h-4" />
            Voir plus de recettes ({filtered.length - visibleLimit} restantes)
          </button>
        </>
      )}

      {filtered.some(r => r.isLocked) && (
        <Link href="/profile"
          className="block mt-3 p-4 rounded-xl text-center text-sm font-medium transition-all"
          style={{ backgroundColor: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)', color: 'var(--text-secondary)' }}>
          🔓 Débloquer toutes les recettes avec <span className="font-semibold text-amber-600 dark:text-amber-400">Premium</span>
        </Link>
      )}

      </>
      )}
    </AppShell>
  );
}