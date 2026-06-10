import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const BILLING_KEYS = [
  'stripe_webhook_secret',
  'stripe_link_premium_monthly', 'stripe_link_premium_annual',
  'stripe_link_vip_monthly',     'stripe_link_vip_annual',
  'stripe_link_quota_50',        'stripe_link_quota_200', 'stripe_link_quota_500',
  'quota_50_price',  'quota_200_price',  'quota_500_price',
  'price_premium_monthly', 'price_premium_annual',
  'price_vip_monthly',     'price_vip_annual',
  'limit_free_daily',   'limit_free_monthly',
  'limit_premium_daily','limit_premium_monthly',
];

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const rows = await prisma.appConfig.findMany({ where: { key: { in: BILLING_KEYS } } });
  const cfg: Record<string, string> = {};
  rows.forEach(r => { cfg[r.key] = r.key === 'stripe_webhook_secret' ? '••••••••' + r.value.slice(-4) : r.value; });

  // Stats par plan
  const planStats = await prisma.user.groupBy({
    by: ['plan'],
    _count: { id: true },
  });

  return NextResponse.json({ config: cfg, planStats });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json() as Record<string, string>;

  // Upsert chaque clé
  const updates = Object.entries(body)
    .filter(([k]) => BILLING_KEYS.includes(k))
    .map(([key, value]) =>
      prisma.appConfig.upsert({
        where:  { key },
        create: { key, value },
        update: { value },
      })
    );

  await Promise.all(updates);
  return NextResponse.json({ ok: true });
}

// PUT plan d'un utilisateur (admin change manuellement)
// PATCH /api/admin/billing { userId, plan, extraQuota? }
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId, plan, extraQuota, planMonths } = await req.json();
  if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (plan)       data.plan = plan;
  if (planMonths) {
    const exp = new Date();
    exp.setMonth(exp.getMonth() + planMonths);
    data.planExpiresAt = exp;
  }
  if (typeof extraQuota === 'number') data.extraQuota = extraQuota;

  await prisma.user.update({ where: { id: userId }, data });
  return NextResponse.json({ ok: true });
}
