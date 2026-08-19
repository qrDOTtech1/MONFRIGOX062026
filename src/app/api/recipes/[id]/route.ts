import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { analyzeRecipeDietary } from '@/lib/dietary';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  // Mode invité : la fiche recette est consultable sans compte (le dashboard
  // est public, cliquer une carte ne doit pas mener à une erreur).
  const isGuest = !user;

  const { id } = await params;

  try {
    const userFridge = isGuest ? [] : await prisma.fridgeItem.findMany({
      where: { userId: user!.id },
      select: { ingredientId: true },
    });
    const fridgeIds = new Set(userFridge.map(f => f.ingredientId));

    // Préférences utilisateur (tolérant si colonnes pas migrées)
    let userAllergens: string[] = [];
    let dietMode = '';
    if (!isGuest) try {
      const prefs = await prisma.user.findUnique({
        where: { id: user!.id },
        select: { allergens: true, dietMode: true },
      });
      if (prefs?.allergens) {
        try { userAllergens = JSON.parse(prefs.allergens); } catch { userAllergens = []; }
      }
      dietMode = prefs?.dietMode || '';
    } catch { /* colonnes pas migrées */ }

    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredients: { include: { ingredient: true } },
        favorites: isGuest ? false : { where: { userId: user!.id } },
        author: { select: { name: true } },
      },
    });

    if (!recipe) return NextResponse.json({ error: 'Recette introuvable' }, { status: 404 });

    // Une recette communautaire privée reste invisible aux invités
    if (isGuest && recipe.authorId && !recipe.isPublic) {
      return NextResponse.json({ error: 'Recette introuvable' }, { status: 404 });
    }

    const dietary = analyzeRecipeDietary(
      recipe.ingredients.map(i => i.ingredient.name),
      userAllergens,
      dietMode,
      recipe.carbs,
    );

    return NextResponse.json({
      ...recipe,
      isFavorite: Array.isArray(recipe.favorites) ? recipe.favorites.length > 0 : false,
      ingredients: recipe.ingredients.map(i => ({
        ...i,
        inFridge: fridgeIds.has(i.ingredientId),
      })),
      allergenWarnings: dietary.allergenWarnings,
      dietConflict: dietary.dietConflict,
      dietLabel: dietary.dietLabel,
      dietConflictIngredients: dietary.dietConflictIngredients,
      isCommunity: !!recipe.authorId,
      authorName: recipe.author?.name || null,
      favorites: undefined,
    });
  } catch (err: any) {
    console.error('Recipe fetch error:', err);
    return NextResponse.json({ error: 'Erreur chargement recette' }, { status: 500 });
  }
}
