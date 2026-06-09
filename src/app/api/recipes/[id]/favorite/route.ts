import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.favorite.findUnique({
    where: { userId_recipeId: { userId: user.id, recipeId: id } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ isFavorite: false });
  }

  await prisma.favorite.create({
    data: { userId: user.id, recipeId: id },
  });

  return NextResponse.json({ isFavorite: true });
}
