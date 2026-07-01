import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { userId: targetId } = await params;

  const adminMembership = await prisma.householdMember.findUnique({ where: { userId: user.id } });
  if (!adminMembership || adminMembership.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Seul l\'admin peut retirer des membres' }, { status: 403 });
  }
  if (targetId === user.id) {
    return NextResponse.json({ error: 'Utilisez "Quitter le foyer" pour vous retirer' }, { status: 400 });
  }

  const target = await prisma.householdMember.findUnique({ where: { userId: targetId } });
  if (!target || target.householdId !== adminMembership.householdId) {
    return NextResponse.json({ error: 'Membre introuvable dans ce foyer' }, { status: 404 });
  }

  await prisma.householdMember.delete({ where: { userId: targetId } });
  return NextResponse.json({ ok: true });
}
