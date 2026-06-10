import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

// GET /api/recipes/:id/notes → my note + public community notes
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id: recipeId } = await params;

  const [myNote, communityNotes] = await Promise.all([
    prisma.recipeNote.findUnique({
      where: { userId_recipeId: { userId: user.id, recipeId } },
    }),
    prisma.recipeNote.findMany({
      where: { recipeId, isPublic: true, userId: { not: user.id } },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    }),
  ]);

  return NextResponse.json({ myNote, communityNotes });
}

// POST /api/recipes/:id/notes → create or update my note
// body: { content, photoUrl?, isPublic }
export async function POST(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id: recipeId } = await params;
  const { content, photoUrl, isPublic } = await req.json();

  const note = await prisma.recipeNote.upsert({
    where: { userId_recipeId: { userId: user.id, recipeId } },
    create: { userId: user.id, recipeId, content, photoUrl: photoUrl ?? '', isPublic: isPublic ?? false },
    update: { content, photoUrl: photoUrl ?? undefined, isPublic: isPublic ?? undefined, updatedAt: new Date() },
  });

  return NextResponse.json({ note });
}

// DELETE /api/recipes/:id/notes → delete my note
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id: recipeId } = await params;

  await prisma.recipeNote.deleteMany({
    where: { userId: user.id, recipeId },
  });

  return NextResponse.json({ ok: true });
}
