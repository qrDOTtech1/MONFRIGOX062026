import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { estimateRecipeCost } from '@/lib/recipe-cost';

// GET /api/recipes/[id]/cost
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    select: {
      servings: true,
      ingredients: {
        select: {
          quantity: true,
          unit: true,
          ingredient: { select: { name: true, emoji: true } },
        },
      },
    },
  });

  if (!recipe) return NextResponse.json({ error: 'Recette introuvable' }, { status: 404 });

  const ingredients = recipe.ingredients.map(i => ({
    name: i.ingredient.name,
    emoji: i.ingredient.emoji,
    quantity: i.quantity,
    unit: i.unit,
  }));

  const estimate = estimateRecipeCost(ingredients, recipe.servings);

  return NextResponse.json(estimate);
}
