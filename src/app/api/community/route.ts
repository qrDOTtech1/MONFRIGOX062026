import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET /api/community?sort=latest|top&page=1
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const sort   = req.nextUrl.searchParams.get('sort') ?? 'latest';
  const page   = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1'));
  const limit  = 20;
  const offset = (page - 1) * limit;

  const orderBy = sort === 'top'
    ? { likeCount: 'desc' as const }
    : { createdAt: 'desc' as const };

  const [notes, total] = await Promise.all([
    prisma.recipeNote.findMany({
      where: { isPublic: true, OR: [{ content: { not: '' } }, { photoUrl: { not: '' } }] },
      orderBy,
      skip: offset,
      take: limit,
      include: {
        user:   { select: { name: true, email: true } },
        recipe: { select: { id: true, name: true, imageUrl: true } },
        likes:  { where: { userId: user.id }, select: { id: true } },
      },
    }),
    prisma.recipeNote.count({
      where: { isPublic: true, OR: [{ content: { not: '' } }, { photoUrl: { not: '' } }] },
    }),
  ]);

  return NextResponse.json({
    notes: notes.map(n => ({
      id:        n.id,
      content:   n.content,
      photoUrl:  n.photoUrl,
      likeCount: n.likeCount,
      createdAt: n.createdAt,
      likedByMe: n.likes.length > 0,
      author:    n.user.name || n.user.email.split('@')[0],
      recipe:    n.recipe,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
