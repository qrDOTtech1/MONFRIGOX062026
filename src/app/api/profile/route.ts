import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const SELECT = {
  allergens: true, dietMode: true, kidMode: true, kidAgeMonths: true,
  defaultServings: true, tasteProfile: true, equipment: true, onboardingDone: true,
  notifyExpiry: true, notifyMeals: true,
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const profile = await prisma.user.findUnique({ where: { id: user.id }, select: SELECT });
    return NextResponse.json(profile);
  } catch {
    return NextResponse.json({ allergens: '', dietMode: '', kidMode: '', kidAgeMonths: null, defaultServings: 4, tasteProfile: '', onboardingDone: false });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const body = await req.json();
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        allergens:      body.allergens      ?? undefined,
        dietMode:       body.dietMode       ?? undefined,
        kidMode:        body.kidMode        ?? undefined,
        kidAgeMonths:   body.kidAgeMonths   ?? undefined,
        defaultServings:body.defaultServings?? undefined,
        tasteProfile:   body.tasteProfile   ?? undefined,
        equipment:      body.equipment      ?? undefined,
        onboardingDone: body.onboardingDone ?? undefined,
        notifyExpiry:   body.notifyExpiry   ?? undefined,
        notifyMeals:    body.notifyMeals    ?? undefined,
      },
      select: SELECT,
    });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error('Profile update error:', err);
    return NextResponse.json({ error: 'Erreur mise à jour profil' }, { status: 500 });
  }
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  await prisma.user.delete({ where: { id: user.id } });
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('token');
  return res;
}
