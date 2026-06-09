import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const recipes = await prisma.recipe.findMany({
    select: {
      id: true, name: true, difficulty: true, prepTime: true, cuisine: true,
      _count: { select: { ingredients: true, favorites: true } },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(recipes);
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const data = await req.json();
  const recipe = await prisma.recipe.create({ data });
  return NextResponse.json(recipe);
}
