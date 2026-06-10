import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// POST /api/notes/[id]/like — toggle like
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id: noteId } = await params;

  const existing = await prisma.recipeNoteLike.findUnique({
    where: { userId_noteId: { userId: user.id, noteId } },
  });

  if (existing) {
    // Unlike
    await prisma.$transaction([
      prisma.recipeNoteLike.delete({ where: { id: existing.id } }),
      prisma.recipeNote.update({ where: { id: noteId }, data: { likeCount: { decrement: 1 } } }),
    ]);
    return NextResponse.json({ liked: false });
  } else {
    // Like
    await prisma.$transaction([
      prisma.recipeNoteLike.create({ data: { userId: user.id, noteId } }),
      prisma.recipeNote.update({ where: { id: noteId }, data: { likeCount: { increment: 1 } } }),
    ]);
    return NextResponse.json({ liked: true });
  }
}
