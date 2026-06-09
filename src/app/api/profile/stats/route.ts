import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const [fridgeCount, favCount, listCount] = await Promise.all([
    prisma.fridgeItem.count({ where: { userId: user.id } }),
    prisma.favorite.count({ where: { userId: user.id } }),
    prisma.shoppingList.count({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({ fridgeCount, favCount, listCount });
}
