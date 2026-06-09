import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const items = await prisma.fridgeItem.findMany({
    where: { userId: user.id },
    include: { ingredient: true },
    orderBy: { addedAt: 'desc' },
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { ingredientId, quantity, unit, expiresAt } = await req.json();

  const item = await prisma.fridgeItem.upsert({
    where: { userId_ingredientId: { userId: user.id, ingredientId } },
    update: { quantity: quantity || 1, unit: unit || 'unité' },
    create: {
      userId: user.id,
      ingredientId,
      quantity: quantity || 1,
      unit: unit || 'unité',
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
    include: { ingredient: true },
  });

  return NextResponse.json(item);
}
