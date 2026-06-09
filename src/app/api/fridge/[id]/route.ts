import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;

  await prisma.fridgeItem.deleteMany({
    where: { id, userId: user.id },
  });

  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;
  const { quantity, unit, expiresAt } = await req.json();

  const item = await prisma.fridgeItem.updateMany({
    where: { id, userId: user.id },
    data: {
      ...(quantity !== undefined && { quantity }),
      ...(unit !== undefined && { unit }),
      ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
    },
  });

  return NextResponse.json(item);
}
