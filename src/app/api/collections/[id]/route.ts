import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET /api/collections/[id] → carnet + ses recettes
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;

  try {
    const collection = await prisma.collection.findUnique({
      where: { id },
      include: {
        recipes: {
          orderBy: { addedAt: 'desc' },
          include: {
            recipe: {
              include: { ingredients: { include: { ingredient: { select: { emoji: true } } }, take: 1 } },
            },
          },
        },
      },
    });
    if (!collection || collection.userId !== user.id) {
      return NextResponse.json({ error: 'Carnet introuvable' }, { status: 404 });
    }

    return NextResponse.json({
      id: collection.id,
      name: collection.name,
      emoji: collection.emoji,
      recipes: collection.recipes.map(cr => ({
        id: cr.recipe.id,
        name: cr.recipe.name,
        difficulty: cr.recipe.difficulty,
        prepTime: cr.recipe.prepTime,
        cuisine: cr.recipe.cuisine,
        imageUrl: cr.recipe.imageUrl,
        emoji: cr.recipe.ingredients?.[0]?.ingredient?.emoji,
      })),
    });
  } catch (err: any) {
    console.error('Collection GET error:', err);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}

// DELETE /api/collections/[id] → supprime le carnet
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { id } = await params;

  try {
    const col = await prisma.collection.findUnique({ where: { id }, select: { userId: true } });
    if (!col || col.userId !== user.id) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    await prisma.collection.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Collection DELETE error:', err);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
