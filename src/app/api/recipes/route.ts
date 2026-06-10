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

  // Visibilité : recettes officielles (authorId null), publiques, ou les miennes
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
      // Communauté
      isCommunity: !!r.authorId,
      isMine: r.authorId === user.id,
      author: r.author?.name || null,
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

/**
 * POST /api/recipes — un utilisateur partage sa propre recette (communauté).
 * Body: { name, description, instructions, cuisine, difficulty, prepTime, servings,
 *         isPublic, ingredients: [{name, quantity, unit}] }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await req.json();
  const {
    name, description, instructions, cuisine,
    difficulty, prepTime, servings, isPublic, ingredients,
  } = body;

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
        isPublic: isPublic !== false, // public par défaut
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
