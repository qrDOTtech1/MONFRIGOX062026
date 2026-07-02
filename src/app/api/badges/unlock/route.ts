import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { CLIENT_UNLOCKABLE_CODES } from '@/lib/badges';

/**
 * POST /api/badges/unlock  { code }
 * Débloque un badge "top secret" trouvé côté client (feature cachée découverte),
 * pour les codes non mesurables en DB. Whitelist stricte pour éviter tout abus.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { code } = await req.json();
  if (!code || !CLIENT_UNLOCKABLE_CODES.includes(code)) {
    return NextResponse.json({ error: 'Code invalide' }, { status: 400 });
  }

  try {
    await prisma.badge.create({ data: { userId: user.id, code } });
    return NextResponse.json({ unlocked: true, alreadyOwned: false });
  } catch {
    // Contrainte unique (userId, code) violée → déjà débloqué
    return NextResponse.json({ unlocked: false, alreadyOwned: true });
  }
}
