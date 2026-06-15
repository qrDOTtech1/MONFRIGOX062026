import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const FOUNDER_LIMIT = 100;

/**
 * GET  /api/admin/founders → état (nb de badges Pionnier attribués, places restantes)
 * POST /api/admin/founders → backfill : attribue le badge aux 100 premiers
 *   inscrits (par date) qui ne l'ont pas encore. Idempotent.
 * Admin uniquement.
 */
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return null;
  const rec = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
  return rec?.role === 'ADMIN' ? user : null;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  const count = await prisma.badge.count({ where: { code: 'founder' } });
  return NextResponse.json({ awarded: count, remaining: Math.max(0, FOUNDER_LIMIT - count), limit: FOUNDER_LIMIT });
}

export async function POST() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  try {
    const already = await prisma.badge.count({ where: { code: 'founder' } });
    const slots = FOUNDER_LIMIT - already;
    if (slots <= 0) {
      return NextResponse.json({ awarded: 0, total: already, message: 'Limite déjà atteinte (100/100)' });
    }

    // Les plus anciens inscrits sans badge Pionnier
    const candidates = await prisma.user.findMany({
      where: { badges: { none: { code: 'founder' } } },
      orderBy: { createdAt: 'asc' },
      take: slots,
      select: { id: true },
    });

    let awarded = 0;
    for (const u of candidates) {
      await prisma.badge.create({ data: { userId: u.id, code: 'founder' } }).then(() => { awarded++; }).catch(() => {});
    }

    return NextResponse.json({ awarded, total: already + awarded, remaining: Math.max(0, FOUNDER_LIMIT - already - awarded) });
  } catch (err: any) {
    console.error('Founders backfill error:', err);
    return NextResponse.json({ error: 'Erreur backfill' }, { status: 500 });
  }
}
