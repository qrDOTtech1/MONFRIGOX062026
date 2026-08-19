import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { analyzeRecipeDietary } from '@/lib/dietary';
import { estimateRecipeCost } from '@/lib/recipe-cost';
import { countSeasonalIngredients } from '@/lib/seasonal';
import { FREE_RECIPE_LIMIT } from '@/lib/plan';

const CUISINE_MAP: Record<string, string[]> = {
  'Française':       ['FR'],
  'Italienne':       ['IT'],
  'Asiatique':       ['JP', 'CN', 'TH', 'VN', 'KR'],
  'Mexicaine':       ['MX'],
  'Méditerranéenne': ['GR', 'ES', 'IT'],
  'Indienne':        ['IN'],
  'Américaine':      ['US'],
  'Japonaise':       ['JP'],
  'Marocaine':       ['MA'],
  'Libanaise':       ['LB'],
  'Portugaise':      ['PT'],
  'Turque':          ['TR'],
  'Coréenne':        ['KR'],
  'Brésilienne':     ['BR'],
  'Thaïlandaise':    ['TH'],
  'Vietnamienne':    ['VN'],
  'Chinoise':        ['CN'],
  'Espagnole':       ['ES'],
  'Grecque':         ['GR'],
  'Britannique':     ['GB'],
  'Allemande':       ['DE'],
  'Tunisienne':      ['TN'],
  'Éthiopienne':     ['ET'],
  'Péruvienne':      ['PE'],
  'Internationale':  ['INT'],
};

const SKILL_TO_DIFFICULTY: Record<string, string[]> = {
  debutant:      ['FACILE'],
  intermediaire: ['FACILE', 'MOYEN'],
  passione:      ['FACILE', 'MOYEN', 'DIFFICILE'],
  chef:          ['FACILE', 'MOYEN', 'DIFFICILE'],
};

const TIME_TO_MAX: Record<string, number> = {
  rapide: 15, court: 30, modere: 60, long: 9999,
};

// ── Solution 2 : cache serveur par utilisateur ──────────────────────────────
// On garde en mémoire, 60 s, la liste des recettes DÉJÀ notées et triées pour
// un utilisateur. Les pages suivantes ("charger plus") et les retours sur
// l'onglet réutilisent ce cache → instantané, sans re-scanner tout le catalogue.
// Le tri/score dépend du frigo et des préférences ; le TTL court borne l'écart.
type ScoredEntry = {
  r: any;                                        // recette brute (avec ingrédients)
  matchPercent: number; available: number; total: number;
  dietary: ReturnType<typeof analyzeRecipeDietary>;
  usesExpiring: number; seasonalCount: number; score: number;
};
const SCORE_TTL = 60_000;
const scoredCache = new Map<string, { list: ScoredEntry[]; ts: number }>();

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  // Mode invité : accès au catalogue (pool FREE, sans frigo ni favoris personnalisés)
  const isGuest = !user;

  const favOnly = req.nextUrl.searchParams.get('favorites') === 'true';
  if (favOnly && isGuest) return NextResponse.json([]);

  // Un invité n'a pas de frigo en base : il envoie le sien, gardé dans son
  // navigateur, pour obtenir les mêmes correspondances qu'un membre.
  const guestFridgeIds = isGuest
    ? (req.nextUrl.searchParams.get('fridge') || '')
        .split(',').map(s => s.trim()).filter(Boolean).slice(0, 60)
    : [];
  const search = req.nextUrl.searchParams.get('q')?.trim().toLowerCase() || '';
  const page = parseInt(req.nextUrl.searchParams.get('page') || '0');
  const limitParam = parseInt(req.nextUrl.searchParams.get('limit') || '0');

  let userAllergens: string[] = [];
  let dietMode = '';
  let tasteProfile: { cuisines?: string[]; skillLevel?: string; timePref?: string; goals?: string[] } = {};
  let userRole = 'USER';
  let effectivePlan = 'FREE';
  if (!isGuest) try {
    const prefs = await prisma.user.findUnique({
      where: { id: user!.id },
      select: { allergens: true, dietMode: true, tasteProfile: true, role: true, plan: true, planExpiresAt: true },
    });
    if (prefs?.allergens) {
      try { userAllergens = JSON.parse(prefs.allergens); } catch { userAllergens = []; }
    }
    dietMode = prefs?.dietMode || '';
    if (prefs?.tasteProfile) {
      try { tasteProfile = JSON.parse(prefs.tasteProfile); } catch { /* ignore */ }
    }
    userRole = prefs?.role || 'USER';
    effectivePlan = (prefs?.planExpiresAt && prefs.planExpiresAt < new Date()) ? 'FREE' : (prefs?.plan || 'FREE');
  } catch { /* colonnes pas encore migrées */ }

  // Catalogue complet réservé aux payants : les FREE accèdent aux FREE_RECIPE_LIMIT recettes
  // les plus anciennes (pool stable). Le reste du catalogue (qui grossit) est un levier de conversion.
  const isFreeUser = userRole !== 'ADMIN' && effectivePlan === 'FREE';
  const freePoolLimit = isFreeUser ? FREE_RECIPE_LIMIT : undefined;

  const prefCuisines = tasteProfile.cuisines ?? [];
  const prefSkill    = tasteProfile.skillLevel ?? '';
  const prefTime     = tasteProfile.timePref   ?? '';
  const prefGoals    = tasteProfile.goals      ?? [];
  const allowedDiff  = prefSkill ? (SKILL_TO_DIFFICULTY[prefSkill] ?? null) : null;
  const maxPrepTime  = prefTime  ? (TIME_TO_MAX[prefTime] ?? 9999) : 9999;
  const prefCodes    = prefCuisines.flatMap((c: string) => (CUISINE_MAP[c] ?? []).map((x: string) => x.toUpperCase()));

  // ── Solution 2 : liste notée + triée, en cache 60 s par utilisateur ──
  // Clé = user (ou 'guest' partagé) + favoris + pool (FREE/payant), car le jeu de recettes diffère.
  const cacheKey = `${isGuest ? `guest:${guestFridgeIds.join('.')}` : user!.id}:${favOnly ? 'fav' : 'all'}:${isFreeUser ? 'free' : 'paid'}`;
  const cachedEntry = scoredCache.get(cacheKey);
  let scored: ScoredEntry[];

  if (cachedEntry && Date.now() - cachedEntry.ts < SCORE_TTL) {
    scored = cachedEntry.list;                     // cache frais → on saute tout le gros calcul
  } else {
    // Mode invité : pas de frigo personnel → aucun matching, catalogue neutre
    const userFridge = isGuest ? [] : await prisma.fridgeItem.findMany({
      where: { userId: user!.id },
      select: { ingredientId: true, expiresAt: true },
    });
    const fridgeIds = new Set(
      isGuest ? guestFridgeIds : userFridge.map(f => f.ingredientId),
    );
    const now = Date.now();
    const expiringIds = new Set(
      userFridge
        .filter(f => f.expiresAt && (new Date(f.expiresAt).getTime() - now) / 86400000 <= 4 && new Date(f.expiresAt).getTime() > now)
        .map(f => f.ingredientId),
    );

    const visibility = isGuest
      ? { OR: [{ authorId: null }, { isPublic: true }] }
      : {
          OR: [
            { authorId: null },
            { isPublic: true },
            { authorId: user!.id },
          ],
        };
    const where = favOnly
      ? { AND: [{ favorites: { some: { userId: user!.id } } }, visibility] }
      : visibility;

    const recipes = await prisma.recipe.findMany({
      where,
      include: {
        ingredients: { include: { ingredient: true } },
        favorites: isGuest ? false : { where: { userId: user!.id } },
        author: { select: { name: true } },
      },
      // FREE : pool borné aux plus anciennes recettes (stable). Payants/admin : catalogue complet.
      orderBy: freePoolLimit ? { createdAt: 'asc' } : { name: 'asc' },
      ...(freePoolLimit ? { take: freePoolLimit } : {}),
    });

    // Solution 1 : ici on ne calcule QUE le score (léger). Le coût (lourd) est
    // calculé plus bas, uniquement pour les recettes réellement renvoyées.
    scored = recipes.map((r): ScoredEntry => {
      const total     = r.ingredients.length;
      const available = r.ingredients.filter((i: any) => fridgeIds.has(i.ingredientId)).length;
      const matchPercent = total > 0 ? Math.round((available / total) * 100) : 0;
      const ingredientNames = r.ingredients.map((i: any) => i.ingredient.name);
      const dietary = analyzeRecipeDietary(ingredientNames, userAllergens, dietMode, r.carbs);
      const usesExpiring = r.ingredients.filter((i: any) => expiringIds.has(i.ingredientId)).length;
      const seasonalCount = countSeasonalIngredients(ingredientNames);

      let prefScore = 0;
      if (prefCodes.length > 0 && prefCodes.includes(r.cuisine?.toUpperCase() ?? '')) prefScore += 30;
      if (allowedDiff) prefScore += allowedDiff.includes(r.difficulty) ? 20 : -10;
      if (r.prepTime <= maxPrepTime) prefScore += 20; else prefScore -= 15;
      if ((prefGoals.includes('sante') || prefGoals.includes('poids')) && r.calories && r.calories < 400) prefScore += 15;
      if (prefGoals.includes('rapide') && r.prepTime <= 20) prefScore += 15;
      if (prefGoals.includes('budget') && r.difficulty === 'FACILE') prefScore += 10;

      const seasonalBonus = seasonalCount >= 3 ? 25 : seasonalCount >= 1 ? 10 : 0;
      const score = usesExpiring * 50 + matchPercent * 3
        + Math.max(-30, Math.min(60, prefScore)) + seasonalBonus
        + (dietary.dietConflict ? -50 : 0);

      return { r, matchPercent, available, total, dietary, usesExpiring, seasonalCount, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // Nettoyage léger du cache (évite une croissance illimitée en mémoire)
    if (scoredCache.size > 100) {
      for (const [k, v] of scoredCache) if (Date.now() - v.ts > SCORE_TTL) scoredCache.delete(k);
    }
    scoredCache.set(cacheKey, { list: scored, ts: Date.now() });
  }

  // ── Recherche (sur la liste déjà triée) ──
  let filtered = scored;
  if (search) {
    filtered = scored.filter(s =>
      s.r.name.toLowerCase().includes(search) ||
      (s.r.cuisine || '').toLowerCase().includes(search) ||
      (s.r.description || '').toLowerCase().includes(search),
    );
  }

  // Verrouillage freemium : les FREE voient la moitié haute (triée par pertinence), le reste est
  // verrouillé. Le lock est calculé sur la position dans la liste triée complète.
  const isFreeLocked = isFreeUser && !favOnly;
  const lockThreshold = Math.ceil(filtered.length / 2);

  // Solution 1 : payload complet (avec coût) UNIQUEMENT pour les recettes renvoyées.
  const buildPayload = (s: ScoredEntry, globalIndex: number) => {
    const r = s.r;
    const cost = estimateRecipeCost(
      r.ingredients.map((i: any) => ({ name: i.ingredient.name, emoji: i.ingredient.emoji, quantity: i.quantity, unit: i.unit })),
      r.servings,
    );
    return {
      id: r.id, name: r.name, description: r.description, difficulty: r.difficulty,
      prepTime: r.prepTime, cuisine: r.cuisine, imageUrl: r.imageUrl || '',
      calories: r.calories ?? null,
      matchPercent: s.matchPercent,
      matchCount: `${s.available}/${s.total} ingrédients`,
      isFavorite: Array.isArray(r.favorites) ? r.favorites.length > 0 : false,
      // Payload allégé pour la LISTE : la carte n'a besoin que du nom (filtres
      // invité) et du 1er emoji (affichage). On retire quantité/unité/id/catégorie
      // → JSON beaucoup plus léger, chargement mobile nettement plus rapide.
      // (La fiche recette /api/recipes/[id] renvoie, elle, les données complètes.)
      ingredients: r.ingredients.map((i: any) => ({ ingredient: { name: i.ingredient.name, emoji: i.ingredient.emoji } })),
      allergenWarnings: s.dietary.allergenWarnings,
      dietConflict: s.dietary.dietConflict,
      dietLabel: s.dietary.dietLabel,
      usesExpiring: s.usesExpiring,
      nutriScore: r.nutriScore,
      kidFriendly: r.kidFriendly,
      babyFriendly: r.babyFriendly,
      isRevisite: r.isRevisite,
      isCommunity: !!r.authorId,
      isMine: !isGuest && r.authorId === user!.id,
      author: r.author?.name || null,
      avgRating: r.avgRating || 0,
      ratingCount: r.ratingCount || 0,
      costTotal: cost.total,
      costPerServing: cost.perServing,
      costConfidence: cost.confidence,
      seasonalCount: s.seasonalCount,
      isLocked: isFreeLocked && globalIndex >= lockThreshold,
    };
  };

  // Mode paginé (chargement progressif 100 par 100) : renvoie un objet { recipes, total, hasMore }.
  if (page >= 1) {
    const lim = Math.min(limitParam || 100, 200);
    const start = (page - 1) * lim;
    const slice = filtered.slice(start, start + lim);
    return NextResponse.json({
      recipes: slice.map((s, idx) => buildPayload(s, start + idx)),
      total: filtered.length,
      page,
      hasMore: start + lim < filtered.length,
    });
  }

  // Mode legacy (tableau) : borné pour ne jamais renvoyer tout le catalogue d'un coup.
  // Les favoris sont peu nombreux → pas de cap. Sinon top 250 par pertinence.
  const legacyLimit = favOnly ? filtered.length : (limitParam ? Math.min(limitParam, 500) : 250);
  return NextResponse.json(filtered.slice(0, legacyLimit).map((s, idx) => buildPayload(s, idx)));
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await req.json();
  const { name, description, instructions, cuisine, difficulty, prepTime, servings, isPublic, ingredients } = body;

  if (!name?.trim() || !instructions?.trim()) {
    return NextResponse.json({ error: 'Nom et préparation requis' }, { status: 400 });
  }

  const validDiff = ['FACILE', 'MOYEN', 'DIFFICILE'].includes(difficulty) ? difficulty : 'FACILE';

  try {
    const recipe = await prisma.recipe.create({
      data: {
        name: name.trim(),
        description: (description || '').trim() || `Recette partagée par ${user.name || 'un membre'}`,
        instructions: instructions.trim(),
        cuisine: (cuisine || 'Maison').trim(),
        difficulty: validDiff as any,
        prepTime: Number(prepTime) > 0 ? Number(prepTime) : 30,
        servings: Number(servings) > 0 ? Number(servings) : 4,
        authorId: user.id,
        isPublic: isPublic !== false,
      },
    });

    if (Array.isArray(ingredients)) {
      for (const ing of ingredients) {
        const ingName = String(ing?.name || '').trim();
        if (!ingName) continue;
        let ingredient = await prisma.ingredient.findFirst({
          where: { name: { equals: ingName, mode: 'insensitive' } },
        });
        if (!ingredient) {
          ingredient = await prisma.ingredient.create({
            data: { name: ingName, category: 'Communauté', emoji: '🍳' },
          });
        }
        const qtyMatch = String(ing?.quantity ?? '').replace(',', '.').match(/[\d.]+/);
        const quantity = qtyMatch ? parseFloat(qtyMatch[0]) : 1;
        await prisma.recipeIngredient.create({
          data: {
            recipeId: recipe.id,
            ingredientId: ingredient.id,
            quantity: isNaN(quantity) ? 1 : quantity,
            unit: String(ing?.unit || 'unité').trim() || 'unité',
          },
        }).catch(() => {});
      }
    }

    return NextResponse.json({ id: recipe.id });
  } catch (err: any) {
    console.error('Recipe create error:', err);
    return NextResponse.json({ error: err?.message || 'Erreur création recette' }, { status: 500 });
  }
}