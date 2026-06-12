import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { runNotifications } from '@/lib/notifications-cron';

/**
 * POST /api/notifications/run?type=expiry|meals|all&secret=...
 * Déclenché par un cron externe (header/param secret) ou un admin connecté.
 * Le scheduler interne (instrumentation.ts) appelle aussi cette logique
 * automatiquement : expiry à 9h, meals à 17h30 (Europe/Paris).
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

  const type = (req.nextUrl.searchParams.get('type') || 'all') as 'expiry' | 'meals' | 'all';
  const result = await runNotifications(type);
  return NextResponse.json(result);
}
