import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { analyzeRecipeDietary } from '@/lib/dietary';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const favOnly = req.nextUrl.searchParams.get('favorites') === 'true';
  const search = req.nextUrl.searchParams.get('q')?.trim().toLowerCase() || '';

  // Préférences alimentaires de l'utilisateur (tolérant si colonnes pas migrées)
  let userAllergens: string[] = [];
  let dietMode = '';
  try {
    const prefs = await prisma.user.findUnique({
      where: { id: user.id },
      select: { allergens: true, dietMode: true },
    });
    if (prefs?.allergens) {
      try { userAllergens = JSON.parse(prefs.allergens); } catch { userAllergens = []; }
    }
    dietMode = prefs?.dietMode || '';
  } catch { /* colonnes pas encore migrées */ }

  const userFridge = await prisma.fridgeItem.findMany({
    where: { userId: user.id },
    select: { ingredientId: true, expiresAt: true },
  });
  const fridgeIds = new Set(userFridge.map(f => f.ingredientId));
  // Ingrédients qui périment dans <= 4 jours (anti-gaspi)
  const now = Date.now();
  const expiringIds = new Set(
    userFridge
      .filter(f => f.expiresAt && (new Date(f.expiresAt).getTime() - now) / 86400000 <= 4 && new Date(f.expiresAt).getTime() > now)
      .map(f => f.ingredientId),
  );

  const where = favOnly
    ? { favorites: { some: { userId: user.id } } }
    : {};

  const recipes = await prisma.recipe.findMany({
    where,
    include: {
      ingredients: { include: { ingredient: true } },
      favorites: { where: { userId: user.id } },
    },
    orderBy: { name: 'asc' },
  });

  const result = recipes.map(r => {
    const total = r.ingredients.length;
    const available = r.ingredients.filter(i => fridgeIds.has(i.ingredientId)).length;
    const matchPercent = total > 0 ? Math.round((available / total) * 100) : 0;
    const ingredientNames = r.ingredients.map(i => i.ingredient.name);

    // Analyse allergènes / régime
    const dietary = analyzeRecipeDietary(ingredientNames, userAllergens, dietMode, r.carbs);

    // Combien d'ingrédients périssables cette recette utilise-t-elle ?
    const usesExpiring = r.ingredients.filter(i => expiringIds.has(i.ingredientId)).length;

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
      // Diététique
      allergenWarnings: dietary.allergenWarnings,
      dietConflict: dietary.dietConflict,
      dietLabel: dietary.dietLabel,
      // Anti-gaspi
      usesExpiring,
      nutriScore: r.nutriScore,
      kidFriendly: r.kidFriendly,
      babyFriendly: r.babyFriendly,
      isRevisite: r.isRevisite,
    };
  });

  // Recherche texte (nom + cuisine)
  let filtered = result;
  if (search) {
    filtered = result.filter(r =>
      r.name.toLowerCase().includes(search) ||
      r.cuisine.toLowerCase().includes(search) ||
      r.description.toLowerCase().includes(search),
    );
  }

  // Tri : recettes anti-gaspi d'abord, puis compatibilité, puis sans conflit régime
  filtered.sort((a, b) => {
    if (b.usesExpiring !== a.usesExpiring) return b.usesExpiring - a.usesExpiring;
    if (a.dietConflict !== b.dietConflict) return a.dietConflict ? 1 : -1;
    return b.matchPercent - a.matchPercent;
  });

  // FREE : première moitié accessible, seconde moitié visible mais verrouillée (flou + cadenas)
  const userRecord = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true, plan: true, planExpiresAt: true } });
  const effectivePlan = (userRecord?.planExpiresAt && userRecord.planExpiresAt < new Date()) ? 'FREE' : (userRecord?.plan || 'FREE');

  // ADMIN : accès total, aucun verrou
  if (userRecord?.role === 'ADMIN') return NextResponse.json(filtered.map(r => ({ ...r, isLocked: false })));

  if (effectivePlan === 'FREE' && !favOnly) {
    const half = Math.ceil(filtered.length / 2);
    const withLock = filtered.map((r, i) => ({ ...r, isLocked: i >= half }));
    return NextResponse.json(withLock);
  }

  return NextResponse.json(filtered.map(r => ({ ...r, isLocked: false })));
}
