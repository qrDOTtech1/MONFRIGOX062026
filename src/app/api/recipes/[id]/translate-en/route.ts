import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { translateRecipeToEnglish, translateToEnglish } from '@/lib/ollama';

/**
 * POST /api/recipes/[id]/translate-en
 * Traduit une recette (+ ses ingrédients) en anglais à la demande, à la première
 * visite d'un utilisateur en langue EN, et sauvegarde le résultat (nameEn/descriptionEn/
 * instructionsEn + Ingredient.nameEn) pour que les visites suivantes soient instantanées.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: { ingredients: { include: { ingredient: true } } },
  });
  if (!recipe) return NextResponse.json({ error: 'Recette introuvable' }, { status: 404 });

  // Déjà traduite — renvoie direct, pas de nouvel appel IA
  if (recipe.nameEn) {
    return NextResponse.json({
      nameEn: recipe.nameEn,
      descriptionEn: recipe.descriptionEn,
      instructionsEn: recipe.instructionsEn,
      ingredients: recipe.ingredients.map(ri => ({ id: ri.ingredient.id, nameEn: ri.ingredient.nameEn })),
    });
  }

  try {
    const en = await translateRecipeToEnglish({
      name: recipe.name,
      description: recipe.description,
      instructions: recipe.instructions,
    });

    await prisma.recipe.update({
      where: { id: recipe.id },
      data: { nameEn: en.nameEn, descriptionEn: en.descriptionEn, instructionsEn: en.instructionsEn },
    });

    const translatedIngredients: Array<{ id: string; nameEn: string }> = [];
    for (const ri of recipe.ingredients) {
      if (ri.ingredient.nameEn) {
        translatedIngredients.push({ id: ri.ingredient.id, nameEn: ri.ingredient.nameEn });
        continue;
      }
      const nameEn = await translateToEnglish(ri.ingredient.name, 'ingredient').catch(() => '');
      if (nameEn) {
        await prisma.ingredient.update({ where: { id: ri.ingredient.id }, data: { nameEn } }).catch(() => {});
      }
      translatedIngredients.push({ id: ri.ingredient.id, nameEn: nameEn || '' });
    }

    return NextResponse.json({
      nameEn: en.nameEn,
      descriptionEn: en.descriptionEn,
      instructionsEn: en.instructionsEn,
      ingredients: translatedIngredients,
    });
  } catch (err) {
    console.error('[translate-en] Erreur:', err);
    return NextResponse.json({ error: 'Traduction indisponible' }, { status: 500 });
  }
}
