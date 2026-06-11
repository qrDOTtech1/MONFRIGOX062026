import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET  /api/collections           → mes carnets (+ nb recettes)
 * GET  /api/collections?recipeId= → idem + hasRecipe par carnet (pour le picker)
 * POST /api/collections { name, emoji } → crée un carnet
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const recipeId = req.nextUrl.searchParams.get('recipeId') || undefined;

  try {
    const collections = await prisma.collection.findMany({
      where: { userId: user.id },
      include: { recipes: { select: { recipeId: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(collections.map(c => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji,
      count: c.recipes.length,
      hasRecipe: recipeId ? c.recipes.some(r => r.recipeId === recipeId) : undefined,
    })));
  } catch (err: any) {
    console.error('Collections GET error:', err);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { name, emoji } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 });

  try {
    const collection = await prisma.collection.create({
      data: { userId: user.id, name: name.trim().slice(0, 50), emoji: (emoji || '📁').slice(0, 4) },
    });
    return NextResponse.json({ id: collection.id, name: collection.name, emoji: collection.emoji, count: 0 });
  } catch (err: any) {
    console.error('Collection create error:', err);
    return NextResponse.json({ error: 'Erreur création' }, { status: 500 });
  }
}
