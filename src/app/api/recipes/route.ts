import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { analyzeRecipeDietary } from '@/lib/dietary';
import { estimateRecipeCost } from '@/lib/recipe-cost';
import { countSeasonalIngredients } from '@/lib/seasonal';

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

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const favOnly = req.nextUrl.searchParams.get('favorites') === 'true';
  const search = req.nextUrl.searchParams.get('q')?.trim().toLowerCase() || '';

  let userAllergens: string[] = [];
  let dietMode = '';
  let tasteProfile: { cuisines?: string[]; skillLevel?: string; timePref?: string; goals?: string[] } = {};
  try {
    const prefs = await prisma.user.findUnique({
      where: { id: user.id },
      select: { allergens: true, dietMode: true, tasteProfile: true },
    });
    if (prefs?.allergens) {
      try { userAllergens = JSON.parse(prefs.allergens); } catch { userAllergens = []; }
    }
    dietMode = prefs?.dietMode || '';
    if (prefs?.tasteProfile) {
      try { tasteProfile = JSON.parse(prefs.tasteProfile); } catch { /* ignore */ }
    }
  } catch { /* colonnes pas encore migrées */ }

  const prefCuisines = tasteProfile.cuisines ?? [];
  const prefSkill    = tasteProfile.skillLevel ?? '';
  const prefTime     = tasteProfile.timePref   ?? '';
  const prefGoals    = tasteProfile.goals      ?? [];
  const allowedDiff  = prefSkill ? (SKILL_TO_DIFFICULTY[prefSkill] ?? null) : null;
  const maxPrepTime  = prefTime  ? (TIME_TO_MAX[prefTime] ?? 9999) : 9999;
  const prefCodes    = prefCuisines.flatMap((c: string) => (CUISINE_MAP[c] ?? []).map((x: string) => x.toUpperCase()));

  const userFridge = await prisma.fridgeItem.findMany({
    where: { userId: user.id },
    select: { ingredientId: true, expiresAt: true },
  });
  const fridgeIds = new Set(userFridge.map(f => f.ingredientId));
  const now = Date.now();
  const expiringIds = new Set(
    userFridge
      .filter(f => f.expiresAt && (new Date(f.expiresAt).getTime() - now) / 86400000 <= 4 && new Date(f.expiresAt).getTime() > now)
      .map(f => f.ingredientId),
  );

  const visibility = {
    OR: [
      { authorId: null },
      { isPublic: true },
      { authorId: user.id },
    ],
  };
  const where = favOnly
    ? { AND: [{ favorites: { some: { userId: user.id } } }, visibility] }
    : visibility;

  const recipes = await prisma.recipe.findMany({
    where,
    include: {
      ingredients: { include: { ingredient: true } },
      favorites: { where: { userId: user.id } },
      author: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  });

  const result = recipes.map(r => {
    const total     = r.ingredients.length;
    const available = r.ingredients.filter(i => fridgeIds.has(i.ingredientId)).length;
    const matchPercent = total > 0 ? Math.round((available / total) * 100) : 0;
    const ingredientNames = r.ingredients.map(i => i.ingredient.name);
    const dietary = analyzeRecipeDietary(ingredientNames, userAllergens, dietMode, r.carbs);
    const usesExpiring = r.ingredients.filter(i => expiringIds.has(i.ingredientId)).length;
    const seasonalCount = countSeasonalIngredients(ingredientNames);

    // Coût estimé (table de prix, synchrone)
    const cost = estimateRecipeCost(
      r.ingredients.map(i => ({ name: i.ingredient.name, emoji: i.ingredient.emoji, quantity: i.quantity, unit: i.unit })),
      r.servings,
    );

    // Taste-profile bonus
    let prefScore = 0;
    if (prefCodes.length > 0 && prefCodes.includes(r.cuisine?.toUpperCase() ?? '')) prefScore += 30;
    if (allowedDiff) {
      prefScore += allowedDiff.includes(r.difficulty) ? 20 : -10;
    }
    if (r.prepTime <= maxPrepTime) prefScore += 20; else prefScore -= 15;
    if ((prefGoals.includes('sante') || prefGoals.includes('poids')) && r.calories && r.calories < 400) prefScore += 15;
    if (prefGoals.includes('rapide') && r.prepTime <= 20) prefScore += 15;
    if (prefGoals.includes('budget') && r.difficulty === 'FACILE') prefScore += 10;

    const seasonalBonus = seasonalCount >= 3 ? 25 : seasonalCount >= 1 ? 10 : 0;
    const score = usesExpiring * 50
      + matchPercent * 3
      + Math.max(-30, Math.min(60, prefScore))
      + seasonalBonus
      + (dietary.dietConflict ? -50 : 0);

    return {
      id: r.id,
      name: r.name,
      description: r.description,
      difficulty: r.difficulty,
      prepTime: r.prepTime,
      cuisine: r.cuisine,
      imageUrl: r.imageUrl || '',
      matchPercent,
      matchCount: `${available}/${total} ingrédients`,
      isFavorite: r.favorites.length > 0,
      ingredients: r.ingredients,
      allergenWarnings: dietary.allergenWarnings,
      dietConflict: dietary.dietConflict,
      dietLabel: dietary.dietLabel,
      usesExpiring,
      nutriScore: r.nutriScore,
      kidFriendly: r.kidFriendly,
      babyFriendly: r.babyFriendly,
      isRevisite: r.isRevisite,
      isCommunity: !!r.authorId,
      isMine: r.authorId === user.id,
      author: r.author?.name || null,
      avgRating: r.avgRating || 0,
      ratingCount: r.ratingCount || 0,
      costTotal: cost.total,
      costPerServing: cost.perServing,
      costConfidence: cost.confidence,
      seasonalCount,
      _score: score,
    };
  });

  let filtered = result;
  if (search) {
    filtered = result.filter(r =>
      r.name.toLowerCase().includes(search) ||
      r.cuisine.toLowerCase().includes(search) ||
      r.description.toLowerCase().includes(search),
    );
  }

  filtered.sort((a, b) => b._score - a._score);

  const userRecord = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true, plan: true, planExpiresAt: true } });
  const effectivePlan = (userRecord?.planExpiresAt && userRecord.planExpiresAt < new Date()) ? 'FREE' : (userRecord?.plan || 'FREE');

  if (userRecord?.role === 'ADMIN') {
    return NextResponse.json(filtered.map(r => ({ ...r, isLocked: false, _score: undefined })));
  }

  if (effectivePlan === 'FREE' && !favOnly) {
    const half = Math.ceil(filtered.length / 2);
    return NextResponse.json(filtered.map((r, i) => ({ ...r, isLocked: i >= half, _score: undefined })));
  }

  return NextResponse.json(filtered.map(r => ({ ...r, isLocked: false, _score: undefined })));
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