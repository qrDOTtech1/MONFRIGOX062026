import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';
  if (q.length < 2) return NextResponse.json([]);

  const ingredients = await prisma.ingredient.findMany({
    where: { name: { contains: q, mode: 'insensitive' } },
    select: { id: true, name: true, emoji: true },
    take: 10,
  });

  return NextResponse.json(ingredients);
}
