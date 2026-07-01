import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(null, { status: 401 });

  const membership = await prisma.householdMember.findUnique({
    where: { userId: user.id },
    include: {
      household: {
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { joinedAt: 'asc' },
          },
        },
      },
    },
  });

  if (!membership) return NextResponse.json(null);

  return NextResponse.json({
    id: membership.household.id,
    name: membership.household.name,
    role: membership.role,
    members: membership.household.members.map(m => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const existing = await prisma.householdMember.findUnique({ where: { userId: user.id } });
  if (existing) return NextResponse.json({ error: 'Vous êtes déjà dans un foyer' }, { status: 400 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 });

  const household = await prisma.household.create({
    data: {
      name: name.trim(),
      members: { create: { userId: user.id, role: 'ADMIN' } },
    },
  });

  return NextResponse.json({ id: household.id, name: household.name, role: 'ADMIN' });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const membership = await prisma.householdMember.findUnique({
    where: { userId: user.id },
    include: { household: { include: { members: true } } },
  });
  if (!membership) return NextResponse.json({ error: 'Pas dans un foyer' }, { status: 400 });

  const { household } = membership;
  const otherMembers = household.members.filter(m => m.userId !== user.id);

  if (membership.role === 'ADMIN' && otherMembers.length > 0) {
    // Transférer l'admin au membre suivant
    await prisma.householdMember.update({
      where: { id: otherMembers[0].id },
      data: { role: 'ADMIN' },
    });
  }

  await prisma.householdMember.delete({ where: { userId: user.id } });

  // Si plus personne dans le foyer, on le supprime
  if (otherMembers.length === 0) {
    await prisma.household.delete({ where: { id: household.id } });
  }

  return NextResponse.json({ ok: true });
}
