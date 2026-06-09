import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const [totalUsers, totalRecipes, totalFridgeItems, totalShoppingLists] = await Promise.all([
    prisma.user.count(),
    prisma.recipe.count(),
    prisma.fridgeItem.count(),
    prisma.shoppingList.count(),
  ]);

  const recentUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return NextResponse.json({ totalUsers, totalRecipes, totalFridgeItems, totalShoppingLists, recentUsers });
}
