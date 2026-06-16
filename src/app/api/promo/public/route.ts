import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const now = new Date();
  const promos = await prisma.promoCode.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      ],
    },
    select: {
      code: true,
      description: true,
      planGranted: true,
      durationMonths: true,
      expiresAt: true,
      firstSignupOnly: true,
      maxUses: true,
      usedCount: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const available = promos.filter(p => p.maxUses === null || p.usedCount < p.maxUses);

  return NextResponse.json(available);
}
