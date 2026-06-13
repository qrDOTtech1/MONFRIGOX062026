import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const { code } = await req.json();
  if (!code?.trim()) return NextResponse.json({ error: 'Code manquant' }, { status: 400 });

  const promo = await prisma.promoCode.findUnique({ where: { code: code.trim().toUpperCase() } });

  if (!promo || !promo.isActive) {
    return NextResponse.json({ error: 'Code invalide ou désactivé' }, { status: 404 });
  }

  const now = new Date();

  if (promo.expiresAt && promo.expiresAt < now) {
    return NextResponse.json({ error: 'Ce code a expiré' }, { status: 410 });
  }

  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
    return NextResponse.json({ error: 'Ce code a atteint sa limite d\'utilisation' }, { status: 410 });
  }

  // Vérifier si déjà utilisé par cet utilisateur
  const alreadyUsed = await prisma.promoUse.findUnique({
    where: { promoId_userId: { promoId: promo.id, userId: user.id } },
  });
  if (alreadyUsed) {
    return NextResponse.json({ error: 'Tu as déjà utilisé ce code' }, { status: 409 });
  }

  // Vérifier les conditions sur le compte
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { createdAt: true, plan: true },
  });
  if (!dbUser) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

  const accountAgeDays = Math.floor((now.getTime() - dbUser.createdAt.getTime()) / 86_400_000);

  if (promo.firstSignupOnly && dbUser.plan !== 'FREE') {
    return NextResponse.json({ error: 'Ce code est réservé aux nouveaux abonnés (sans plan payant actif)' }, { status: 403 });
  }

  if (promo.minAccountAgeDays !== null && accountAgeDays < (promo.minAccountAgeDays ?? 0)) {
    return NextResponse.json({
      error: `Ce code est réservé aux comptes de plus de ${promo.minAccountAgeDays} jours (le tien a ${accountAgeDays} jour${accountAgeDays > 1 ? 's' : ''})`,
    }, { status: 403 });
  }

  if (promo.maxAccountAgeDays !== null && accountAgeDays > (promo.maxAccountAgeDays ?? Infinity)) {
    return NextResponse.json({
      error: `Ce code est réservé aux comptes récents (moins de ${promo.maxAccountAgeDays} jours)`,
    }, { status: 403 });
  }

  return NextResponse.json({
    valid: true,
    planGranted: promo.planGranted,
    durationMonths: promo.durationMonths,
    description: promo.description,
    message: `✅ Code valide ! Tu reçois ${promo.durationMonths} mois ${promo.planGranted} offert${promo.durationMonths > 1 ? 's' : ''}.`,
  });
}
