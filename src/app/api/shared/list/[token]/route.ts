import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/shared/list/[token] — public, no auth required
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const list = await prisma.shoppingList.findFirst({
    where: { shareToken: token },
    include: {
      items: {
        include: { ingredient: { select: { name: true, emoji: true } } },
        orderBy: { ingredient: { name: 'asc' } },
      },
    },
  });

  if (!list) return NextResponse.json(null, { status: 404 });

  return NextResponse.json({
    name: list.name,
    items: list.items.map(i => ({
      id: i.id,
      quantity: i.quantity,
      unit: i.unit,
      checked: i.checked,
      ingredient: i.ingredient,
    })),
  });
}
