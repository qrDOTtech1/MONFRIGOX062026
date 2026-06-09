import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;
  const { itemId, checked } = await req.json();

  const list = await prisma.shoppingList.findFirst({
    where: { id, userId: user.id },
  });
  if (!list) return NextResponse.json({ error: 'Liste introuvable' }, { status: 404 });

  await prisma.shoppingItem.update({
    where: { id: itemId },
    data: { checked },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;

  await prisma.shoppingList.deleteMany({
    where: { id, userId: user.id },
  });

  return NextResponse.json({ ok: true });
}
