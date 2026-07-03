import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return null;
  const record = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
  if (record?.role !== 'ADMIN') return null;
  return user;
}

// GET /api/admin/moderation?filter=all|public|reported&page=1
export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const filter = req.nextUrl.searchParams.get('filter') ?? 'all';
  const page   = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1'));
  const limit  = 20;
  const offset = (page - 1) * limit;

  const where =
    filter === 'public'  ? { isPublic: true }  :
    filter === 'hidden'  ? { isPublic: false }  :
    {};

  const [notes, total] = await Promise.all([
    prisma.recipeNote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
      include: {
        user:   { select: { id: true, name: true, email: true } },
        recipe: { select: { id: true, name: true } },
      },
    }),
    prisma.recipeNote.count({ where }),
  ]);

  return NextResponse.json({ notes, total, page, pages: Math.ceil(total / limit) });
}

// PATCH /api/admin/moderation  { id, isPublic }
export async function PATCH(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const { id, isPublic } = await req.json();
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

  await prisma.recipeNote.update({ where: { id }, data: { isPublic } });
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/moderation  { id }
export async function DELETE(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

  await prisma.recipeNote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
