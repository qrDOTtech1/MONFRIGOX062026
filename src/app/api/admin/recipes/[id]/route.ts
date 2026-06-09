import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  const { id } = await params;
  await prisma.recipe.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  const { id } = await params;
  const data = await req.json();

  // Only allow safe fields
  const allowed = ['name', 'description', 'instructions', 'difficulty', 'prepTime', 'cuisine', 'servings', 'calories', 'protein', 'carbs', 'fat', 'fiber', 'salt'];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in data && data[key] !== undefined && data[key] !== '') {
      update[key] = data[key];
    }
  }
  // Null out nutrition if explicitly set to null
  const nullableNutrition = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'salt'];
  for (const key of nullableNutrition) {
    if (data[key] === null) update[key] = null;
  }

  const recipe = await prisma.recipe.update({ where: { id }, data: update });
  return NextResponse.json(recipe);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: { _count: { select: { ingredients: true, favorites: true } } },
  });
  if (!recipe) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  return NextResponse.json(recipe);
}
