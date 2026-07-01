import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invite = await prisma.householdInvite.findUnique({
    where: { token },
    include: { household: { select: { id: true, name: true, members: { select: { userId: true } } } } },
  });

  if (!invite) return NextResponse.json({ error: 'Invitation invalide' }, { status: 404 });
  if (invite.accepted) return NextResponse.json({ error: 'Invitation déjà utilisée' }, { status: 400 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Invitation expirée' }, { status: 400 });

  return NextResponse.json({
    householdName: invite.household.name,
    memberCount: invite.household.members.length,
    expiresAt: invite.expiresAt,
  });
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Connexion requise' }, { status: 401 });

  const { token } = await params;

  const invite = await prisma.householdInvite.findUnique({
    where: { token },
    include: { household: true },
  });

  if (!invite) return NextResponse.json({ error: 'Invitation invalide' }, { status: 404 });
  if (invite.accepted) return NextResponse.json({ error: 'Invitation déjà utilisée' }, { status: 400 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Invitation expirée' }, { status: 400 });

  const alreadyMember = await prisma.householdMember.findUnique({ where: { userId: user.id } });
  if (alreadyMember) return NextResponse.json({ error: 'Vous êtes déjà dans un foyer' }, { status: 400 });

  await prisma.$transaction([
    prisma.householdMember.create({
      data: { householdId: invite.householdId, userId: user.id, role: 'MEMBER' },
    }),
    prisma.householdInvite.update({
      where: { token },
      data: { accepted: true },
    }),
  ]);

  return NextResponse.json({ ok: true, householdName: invite.household.name });
}
