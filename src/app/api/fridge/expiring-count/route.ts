import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ count: 0 });

  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  const count = await prisma.fridgeItem.count({
    where: {
      userId: user.id,
      expiresAt: { not: null, lte: threeDaysFromNow },
    },
  });

  return NextResponse.json({ count });
}
