import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;

  const userFridge = await prisma.fridgeItem.findMany({
    where: { userId: user.id },
    select: { ingredientId: true },
  });
  const fridgeIds = new Set(userFridge.map(f => f.ingredientId));

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      ingredients: { include: { ingredient: true } },
      favorites: { where: { userId: user.id } },
    },
  });

  if (!recipe) return NextResponse.json(null, { status: 404 });

  return NextResponse.json({
    ...recipe,
    isFavorite: recipe.favorites.length > 0,
    ingredients: recipe.ingredients.map(i => ({
      ...i,
      inFridge: fridgeIds.has(i.ingredientId),
    })),
    favorites: undefined,
  });
}
