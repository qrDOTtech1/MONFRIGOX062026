import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * POST /api/collections/toggle { collectionId, recipeId }
 * Ajoute la recette au carnet si absente, la retire sinon.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { collectionId, recipeId } = await req.json();
  if (!collectionId || !recipeId) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });

  try {
    // Vérifie que le carnet appartient à l'utilisateur
    const col = await prisma.collection.findUnique({ where: { id: collectionId }, select: { userId: true } });
    if (!col || col.userId !== user.id) return NextResponse.json({ error: 'Carnet introuvable' }, { status: 404 });

    const existing = await prisma.collectionRecipe.findUnique({
      where: { collectionId_recipeId: { collectionId, recipeId } },
    });

    if (existing) {
      await prisma.collectionRecipe.delete({ where: { id: existing.id } });
      return NextResponse.json({ inCollection: false });
    } else {
      await prisma.collectionRecipe.create({ data: { collectionId, recipeId } });
      return NextResponse.json({ inCollection: true });
    }
  } catch (err: any) {
    console.error('Collection toggle error:', err);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
