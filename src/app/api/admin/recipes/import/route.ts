import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { importRecipesFromMealDB } from '@/lib/recipe-importer';

/**
 * POST /api/admin/recipes/import
 * Import batch de recettes depuis TheMealDB.
 * Body: { count?: number, cuisine?: string, translateWithAI?: boolean }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const u = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
  if (u?.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const result = await importRecipesFromMealDB({
    count: body.count,
    cuisine: body.cuisine,
    translateWithAI: body.translateWithAI,
  });

  return NextResponse.json(result);
}
