import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        allergens: true,
        dietMode: true,
        kidMode: true,
        kidAgeMonths: true,
        defaultServings: true,
      },
    });
    return NextResponse.json(profile);
  } catch {
    // Colonnes pas encore migrées — retourne les valeurs par défaut
    return NextResponse.json({
      allergens: '',
      dietMode: '',
      kidMode: '',
      kidAgeMonths: null,
      defaultServings: 4,
    });
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
        allergens: body.allergens ?? undefined,
        dietMode: body.dietMode ?? undefined,
        kidMode: body.kidMode ?? undefined,
        kidAgeMonths: body.kidAgeMonths ?? undefined,
        defaultServings: body.defaultServings ?? undefined,
      },
      select: {
        allergens: true,
        dietMode: true,
        kidMode: true,
        kidAgeMonths: true,
        defaultServings: true,
      },
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('Profile update error:', err);
    return NextResponse.json({ error: 'Erreur mise à jour profil. Lance la migration DB dans Admin > DB & Import.' }, { status: 500 });
  }
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  await prisma.user.delete({ where: { id: user.id } });

  const response = NextResponse.json({ ok: true });
  response.cookies.delete('token');
  return response;
}
