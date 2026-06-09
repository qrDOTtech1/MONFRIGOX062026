import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const lists = await prisma.shoppingList.findMany({
    where: { userId: user.id },
    include: {
      items: { include: { ingredient: true }, orderBy: { ingredient: { name: 'asc' } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(lists);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { name, items } = await req.json();

  const list = await prisma.shoppingList.create({
    data: {
      userId: user.id,
      name: name || 'Ma liste',
      items: {
        create: items.map((item: { ingredientId: string; quantity: number; unit: string }) => ({
          ingredientId: item.ingredientId,
          quantity: item.quantity,
          unit: item.unit,
        })),
      },
    },
    include: { items: { include: { ingredient: true } } },
  });

  return NextResponse.json(list);
}
