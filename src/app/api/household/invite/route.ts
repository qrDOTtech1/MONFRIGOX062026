import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const membership = await prisma.householdMember.findUnique({
    where: { userId: user.id },
  });
  if (!membership) return NextResponse.json({ error: 'Pas dans un foyer' }, { status: 400 });
  if (membership.role !== 'ADMIN') return NextResponse.json({ error: 'Seul l\'admin peut inviter' }, { status: 403 });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // valide 7 jours

  const invite = await prisma.householdInvite.create({
    data: {
      householdId: membership.householdId,
      expiresAt,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return NextResponse.json({ token: invite.token, url: `${baseUrl}/household/join/${invite.token}` });
}
