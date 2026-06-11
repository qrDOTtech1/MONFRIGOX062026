import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET /api/coach/supplements
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const supplements = await prisma.supplement.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(supplements);
}

// POST /api/coach/supplements — add supplement
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { name, dosage, timing, category } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 });

  const supplement = await prisma.supplement.create({
    data: {
      userId: user.id,
      name: name.trim(),
      dosage: dosage || '',
      timing: timing || 'morning',
      category: category || 'other',
    },
  });

  return NextResponse.json(supplement);
}

// DELETE /api/coach/supplements — delete supplement (by id in body)
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await req.json();
  await prisma.supplement.deleteMany({ where: { id, userId: user.id } });
  return NextResponse.json({ ok: true });
}
