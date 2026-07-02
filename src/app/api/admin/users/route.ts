import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, role: true, createdAt: true,
      plan: true, planExpiresAt: true, extraQuota: true,
      aiCallsMonth: true, aiCallsToday: true, aiCallsTodayDate: true,
      _count: { select: { fridgeItems: true, favorites: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(users);
}
