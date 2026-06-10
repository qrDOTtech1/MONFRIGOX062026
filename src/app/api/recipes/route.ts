import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const favOnly = req.nextUrl.searchParams.get('favorites') === 'true';

  const userFridge = await prisma.fridgeItem.findMany({
    where: { userId: user.id },
    select: { ingredientId: true },
  });
  const fridgeIds = new Set(userFridge.map(f => f.ingredientId));

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
    };
  });

  result.sort((a, b) => b.matchPercent - a.matchPercent);

  // Utilisateurs FREE : accès à la moitié des recettes (triées par matchPercent)
  const userRecord = await prisma.user.findUnique({ where: { id: user.id }, select: { plan: true, planExpiresAt: true } });
  const effectivePlan = (userRecord?.planExpiresAt && userRecord.planExpiresAt < new Date()) ? 'FREE' : (userRecord?.plan || 'FREE');
  if (effectivePlan === 'FREE' && !favOnly) {
    const half = Math.ceil(result.length / 2);
    return NextResponse.json(result.slice(0, half));
  }

  return NextResponse.json(result);
}
