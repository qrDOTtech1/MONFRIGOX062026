import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { sendToUser } from '@/lib/push';

/**
 * POST /api/notifications/run?type=expiry|meals|all&secret=...
 * Déclenché par un cron (header/param secret) ou un admin connecté.
 * - expiry : alerte les aliments qui périment sous 2 jours
 * - meals  : rappelle de planifier le repas si aucun prévu aujourd'hui
 * À programmer : expiry le matin, meals en fin d'après-midi.
 */
export async function POST(req: NextRequest) {
  // Auth : secret cron OU session admin
  const secret = req.nextUrl.searchParams.get('secret') || req.headers.get('x-cron-secret') || '';
  const expected = process.env.CRON_SECRET
    || (await prisma.appConfig.findUnique({ where: { key: 'CRON_SECRET' } }))?.value
    || '';
  let authorized = !!expected && secret === expected;
  if (!authorized) {
    const user = await getCurrentUser();
    if (user) {
      const rec = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
      authorized = rec?.role === 'ADMIN';
    }
  }
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const type = req.nextUrl.searchParams.get('type') || 'all';

  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const in2days = new Date(now.getTime() + 2 * 86400000);

  // Utilisateurs ayant au moins un abonnement push
  const users = await prisma.user.findMany({
    where: { pushSubs: { some: {} } },
    select: { id: true, notifyExpiry: true, notifyMeals: true },
  });

  let expiryNotifs = 0;
  let mealNotifs = 0;

  for (const u of users) {
    // ── Aliments qui périment ──
    if ((type === 'expiry' || type === 'all') && u.notifyExpiry) {
      const items = await prisma.fridgeItem.findMany({
        where: { userId: u.id, expiresAt: { gte: now, lte: in2days } },
        include: { ingredient: { select: { name: true } } },
        orderBy: { expiresAt: 'asc' },
      });
      if (items.length > 0) {
        const names = items.slice(0, 3).map(i => i.ingredient.name).join(', ');
        const extra = items.length > 3 ? ` +${items.length - 3}` : '';
        const sent = await sendToUser(u.id, {
          title: `${items.length} aliment${items.length > 1 ? 's' : ''} à consommer 🥕`,
          body: `${names}${extra} périme${items.length > 1 ? 'nt' : ''} bientôt. Une recette anti-gaspi ?`,
          url: '/dashboard',
          tag: 'expiry',
        });
        if (sent > 0) expiryNotifs++;
      }
    }

    // ── Repas du jour non planifié ──
    if ((type === 'meals' || type === 'all') && u.notifyMeals) {
      const planned = await prisma.mealPlan.count({ where: { userId: u.id, date: todayUTC } });
      if (planned === 0) {
        const sent = await sendToUser(u.id, {
          title: 'Que manges-tu ce soir ? 🍽️',
          body: "Rien de prévu aujourd'hui. Découvre une idée avec ce que tu as dans ton frigo.",
          url: '/dashboard',
          tag: 'meals',
        });
        if (sent > 0) mealNotifs++;
      }
    }
  }

  return NextResponse.json({ users: users.length, expiryNotifs, mealNotifs });
}
