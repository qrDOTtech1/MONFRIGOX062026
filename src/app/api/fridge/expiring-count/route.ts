import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ count: 0 });

  const membership = await prisma.householdMember.findUnique({
    where: { userId: user.id },
    include: { household: { include: { members: { select: { userId: true } } } } },
  });

  const userIds = membership
    ? membership.household.members.map(m => m.userId)
    : [user.id];

  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  const count = await prisma.fridgeItem.count({
    where: {
      userId: { in: userIds },
      expiresAt: { not: null, lte: threeDaysFromNow },
    },
  });

  return NextResponse.json({ count });
}
