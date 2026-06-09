import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const recipes = await prisma.recipe.findMany({
    select: {
      id: true, name: true, description: true, instructions: true,
      difficulty: true, prepTime: true, cuisine: true, servings: true,
      calories: true, protein: true, carbs: true, fat: true, fiber: true, salt: true,
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
