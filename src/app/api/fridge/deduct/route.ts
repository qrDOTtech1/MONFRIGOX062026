import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// POST /api/fridge/deduct
// body: { recipeId: string, servings: number, baseServings: number }
// Déduit les ingrédients utilisés du frigo (proportionnel aux portions)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { recipeId, servings, baseServings } = await req.json();
  const ratio = servings && baseServings ? servings / baseServings : 1;

  const recipeIngredients = await prisma.recipeIngredient.findMany({
    where: { recipeId },
    include: { ingredient: true },
  });

  const deducted: string[] = [];
  const notFound: string[] = [];

  for (const ri of recipeIngredients) {
    const fridgeItem = await prisma.fridgeItem.findUnique({
      where: { userId_ingredientId: { userId: user.id, ingredientId: ri.ingredientId } },
    });

    if (!fridgeItem) { notFound.push(ri.ingredient.name); continue; }

    const usedQty = ri.quantity * ratio;
    const remaining = fridgeItem.quantity - usedQty;

    if (remaining <= 0.05) {
      // Stock épuisé → supprimer l'item
      await prisma.fridgeItem.delete({ where: { id: fridgeItem.id } });
    } else {
      await prisma.fridgeItem.update({
        where: { id: fridgeItem.id },
        data: { quantity: Math.round(remaining * 100) / 100 },
      });
    }
    deducted.push(ri.ingredient.name);
  }

  return NextResponse.json({ ok: true, deducted, notFound });
}
