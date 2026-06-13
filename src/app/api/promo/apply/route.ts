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

  const alreadyUsed = await prisma.promoUse.findUnique({
    where: { promoId_userId: { promoId: promo.id, userId: user.id } },
  });
  if (alreadyUsed) {
    return NextResponse.json({ error: 'Tu as déjà utilisé ce code' }, { status: 409 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { createdAt: true, plan: true, planExpiresAt: true },
  });
  if (!dbUser) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

  const accountAgeDays = Math.floor((now.getTime() - dbUser.createdAt.getTime()) / 86_400_000);

  if (promo.firstSignupOnly && dbUser.plan !== 'FREE') {
    return NextResponse.json({ error: 'Ce code est réservé aux nouveaux abonnés' }, { status: 403 });
  }
  if (promo.minAccountAgeDays !== null && accountAgeDays < (promo.minAccountAgeDays ?? 0)) {
    return NextResponse.json({ error: `Compte trop récent pour ce code (min ${promo.minAccountAgeDays} jours)` }, { status: 403 });
  }
  if (promo.maxAccountAgeDays !== null && accountAgeDays > (promo.maxAccountAgeDays ?? Infinity)) {
    return NextResponse.json({ error: `Ce code est réservé aux comptes récents (max ${promo.maxAccountAgeDays} jours)` }, { status: 403 });
  }

  // Calculer la nouvelle date d'expiration du plan
  // Si plan actif en cours, on prolonge depuis cette date ; sinon on part de maintenant
  const baseDate = (dbUser.planExpiresAt && dbUser.planExpiresAt > now) ? dbUser.planExpiresAt : now;
  const newExpiry = new Date(baseDate);
  newExpiry.setMonth(newExpiry.getMonth() + promo.durationMonths);

  // Garder le plan le plus élevé si l'utilisateur est déjà VIP et reçoit PREMIUM
  const planRank: Record<string, number> = { FREE: 0, PREMIUM: 1, VIP: 2 };
  const newPlan = (planRank[promo.planGranted] ?? 0) > (planRank[dbUser.plan] ?? 0)
    ? promo.planGranted
    : dbUser.plan;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { plan: newPlan, planExpiresAt: newExpiry },
    }),
    prisma.promoUse.create({
      data: { promoId: promo.id, userId: user.id },
    }),
    prisma.promoCode.update({
      where: { id: promo.id },
      data: { usedCount: { increment: 1 } },
    }),
  ]);

  return NextResponse.json({
    success: true,
    plan: newPlan,
    planExpiresAt: newExpiry.toISOString(),
    message: `🎉 Code activé ! Profite de ton plan ${newPlan} jusqu'au ${newExpiry.toLocaleDateString('fr-FR')}.`,
  });
}
