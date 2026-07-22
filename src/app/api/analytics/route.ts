import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// POST — enregistre un événement (public, pas d'auth requise)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      event: string; page?: string; sessionId?: string; meta?: Record<string, unknown>;
    };
    if (!body.event || typeof body.event !== 'string') {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const user = await getCurrentUser().catch(() => null);

    // Utilise $executeRaw pour éviter les erreurs de type Prisma si le modèle n'est pas encore généré
    await prisma.$executeRaw`
      INSERT INTO "AnalyticsEvent" (id, event, page, "userId", "sessionId", meta, "createdAt")
      VALUES (
        gen_random_uuid()::text,
        ${body.event.slice(0, 64)},
        ${body.page?.slice(0, 255) ?? null},
        ${user?.id ?? null},
        ${body.sessionId?.slice(0, 64) ?? null},
        ${body.meta ? JSON.stringify(body.meta) : null}::jsonb,
        NOW()
      )
    `;

    return NextResponse.json({ ok: true });
  } catch {
    // Silencieux : ne pas bloquer l'app si la table n'existe pas encore
    return NextResponse.json({ ok: true });
  }
}

// GET — résumé admin uniquement
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const record = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
  if (record?.role !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  try {
    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const d14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      total7Rows, total30Rows, byEventRows,
      uniqueSessions7Rows, guestSessions7Rows, dailyRows,
    ] = await Promise.all([
      prisma.$queryRaw<Array<{ cnt: bigint }>>`SELECT COUNT(*) as cnt FROM "AnalyticsEvent" WHERE "createdAt" >= ${d7}`,
      prisma.$queryRaw<Array<{ cnt: bigint }>>`SELECT COUNT(*) as cnt FROM "AnalyticsEvent" WHERE "createdAt" >= ${d30}`,
      prisma.$queryRaw<Array<{ event: string; cnt: bigint }>>`
        SELECT event, COUNT(*) as cnt FROM "AnalyticsEvent"
        WHERE "createdAt" >= ${d7}
        GROUP BY event ORDER BY cnt DESC
      `,
      prisma.$queryRaw<Array<{ sessionId: string }>>`
        SELECT DISTINCT "sessionId" FROM "AnalyticsEvent"
        WHERE "createdAt" >= ${d7} AND "sessionId" IS NOT NULL
      `,
      prisma.$queryRaw<Array<{ sessionId: string }>>`
        SELECT DISTINCT "sessionId" FROM "AnalyticsEvent"
        WHERE "createdAt" >= ${d7} AND "userId" IS NULL AND "sessionId" IS NOT NULL
      `,
      prisma.$queryRaw<Array<{ day: string; cnt: bigint }>>`
        SELECT DATE("createdAt")::text as day, COUNT(*) as cnt
        FROM "AnalyticsEvent"
        WHERE "createdAt" >= ${d14}
        GROUP BY DATE("createdAt") ORDER BY day ASC
      `,
    ]);

    const byEvent = (byEventRows as Array<{ event: string; cnt: bigint }>).map(
      (e: { event: string; cnt: bigint }) => ({ event: e.event, count: Number(e.cnt) })
    );

    const promptShown = byEvent.find((e: { event: string }) => e.event === 'auth_prompt_shown')?.count ?? 0;
    const registerClicks = byEvent.find((e: { event: string }) => e.event === 'register_click')?.count ?? 0;
    const loginClicks = byEvent.find((e: { event: string }) => e.event === 'login_click')?.count ?? 0;
    const conversionRate = promptShown > 0 ? Math.round(((registerClicks + loginClicks) / promptShown) * 100) : 0;

    return NextResponse.json({
      summary: {
        total7: Number((total7Rows as Array<{ cnt: bigint }>)[0]?.cnt ?? 0),
        total30: Number((total30Rows as Array<{ cnt: bigint }>)[0]?.cnt ?? 0),
        uniqueSessions7: (uniqueSessions7Rows as Array<{ sessionId: string }>).length,
        guestSessions7: (guestSessions7Rows as Array<{ sessionId: string }>).length,
        conversionRate,
        promptShown,
        registerClicks,
        loginClicks,
      },
      byEvent,
      daily: (dailyRows as Array<{ day: string; cnt: bigint }>).map(
        (r: { day: string; cnt: bigint }) => ({ day: r.day, count: Number(r.cnt) })
      ),
    });
  } catch {
    // Table pas encore créée en prod
    return NextResponse.json({
      summary: { total7: 0, total30: 0, uniqueSessions7: 0, guestSessions7: 0, conversionRate: 0, promptShown: 0, registerClicks: 0, loginClicks: 0 },
      byEvent: [],
      daily: [],
    });
  }
}
