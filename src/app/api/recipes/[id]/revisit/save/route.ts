import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * POST /api/recipes/[id]/revisit/save
 * Enregistre une revisite générée par l'IA comme nouvelle recette (isRevisite = true),
 * dérivée de la recette d'origine [id]. Retourne l'id de la nouvelle recette.
 *
 * Body: { title, description, ingredients: [{name, quantity, unit}], instructions, tips }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { title, description, ingredients, instructions, tips } = body;

  if (!title || !instructions) {
    return NextResponse.json({ error: 'Titre et instructions requis' }, { status: 400 });
  }

  try {
    // Recette d'origine : on hérite difficulté / temps / cuisine / portions / image
    const original = await prisma.recipe.findUnique({
      where: { id },
      select: { difficulty: true, prepTime: true, cuisine: true, servings: true, imageUrl: true, name: true },
    });
    if (!original) return NextResponse.json({ error: 'Recette d\'origine introuvable' }, { status: 404 });

    // Évite les doublons : si une revisite du même nom existe déjà, on la renvoie
    const existing = await prisma.recipe.findFirst({
      where: { name: title, isRevisite: true },
      select: { id: true },
    });
    if (existing) return NextResponse.json({ id: existing.id, alreadyExists: true });

    const fullInstructions = tips ? `${instructions}\n\n💡 Astuce : ${tips}` : instructions;

    const recipe = await prisma.recipe.create({
      data: {
        name: title,
        description: description || `Revisite de « ${original.name} »`,
        instructions: fullInstructions,
        difficulty: original.difficulty,
        prepTime: original.prepTime,
        cuisine: original.cuisine,
        servings: original.servings,
        imageUrl: original.imageUrl,
        isRevisite: true,
        revisitOf: id,
      },
    });

    // Ingrédients : crée ceux qui manquent
    if (Array.isArray(ingredients)) {
      for (const ing of ingredients) {
        const name = String(ing?.name || '').trim();
        if (!name) continue;

        let ingredient = await prisma.ingredient.findFirst({
          where: { name: { equals: name, mode: 'insensitive' } },
        });
        if (!ingredient) {
          ingredient = await prisma.ingredient.create({
            data: { name, category: 'Revisite', emoji: '✨' },
          });
        }

        // Quantité : "200" ou "2,5" → float
        const qtyMatch = String(ing?.quantity ?? '').replace(',', '.').match(/[\d.]+/);
        const quantity = qtyMatch ? parseFloat(qtyMatch[0]) : 1;

        await prisma.recipeIngredient.create({
          data: {
            recipeId: recipe.id,
            ingredientId: ingredient.id,
            quantity: isNaN(quantity) ? 1 : quantity,
            unit: String(ing?.unit || 'unité').trim() || 'unité',
          },
        }).catch(() => {}); // ignore doublon
      }
    }

    return NextResponse.json({ id: recipe.id });
  } catch (err: any) {
    console.error('Revisit save error:', err);
    return NextResponse.json({ error: err?.message || 'Erreur enregistrement' }, { status: 500 });
  }
}
