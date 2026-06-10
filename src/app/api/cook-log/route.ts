import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// POST /api/cook-log  { recipeId, servings? }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { recipeId, servings } = await req.json();

  const log = await prisma.cookLog.create({
    data: { userId: user.id, recipeId, servings: servings ?? 4 },
  });

  return NextResponse.json(log);
}

// GET /api/cook-log?limit=20
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const limit = parseInt(new URL(req.url).searchParams.get('limit') ?? '20');

  const logs = await prisma.cookLog.findMany({
    where: { userId: user.id },
    include: {
      recipe: { select: { id: true, name: true, imageUrl: true, cuisine: true, prepTime: true, ingredients: { include: { ingredient: { select: { emoji: true } } }, take: 1 } } },
    },
    orderBy: { cookedAt: 'desc' },
    take: limit,
  });

  // Aggregate: count per recipe
  const counts = await prisma.cookLog.groupBy({
    by: ['recipeId'],
    where: { userId: user.id },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  return NextResponse.json({ logs, counts });
}
