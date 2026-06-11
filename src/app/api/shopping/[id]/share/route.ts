import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { randomBytes } from 'crypto';

// POST /api/shopping/[id]/share — generate a share token
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;

  const list = await prisma.shoppingList.findFirst({
    where: { id, userId: user.id },
  });
  if (!list) return NextResponse.json({ error: 'Liste introuvable' }, { status: 404 });

  const token = list.shareToken || randomBytes(12).toString('hex');

  if (!list.shareToken) {
    await prisma.shoppingList.update({
      where: { id },
      data: { shareToken: token },
    });
  }

  return NextResponse.json({ token, url: `/shared/list/${token}` });
}
