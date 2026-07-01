import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json([], { status: 401 });

  // Si l'utilisateur est dans un foyer, agréger le frigo de tous les membres
  const membership = await prisma.householdMember.findUnique({
    where: { userId: user.id },
    include: { household: { include: { members: { select: { userId: true } } } } },
  });

  const userIds = membership
    ? membership.household.members.map(m => m.userId)
    : [user.id];

  const items = await prisma.fridgeItem.findMany({
    where: { userId: { in: userIds } },
    include: {
      ingredient: true,
      user: { select: { id: true, name: true } },
    },
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
