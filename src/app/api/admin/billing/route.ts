import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const BILLING_KEYS = [
  'stripe_webhook_secret',
  // Price IDs Stripe (depuis Stripe Dashboard → Products → Price ID)
  'stripe_price_id_premium_monthly', 'stripe_price_id_premium_annual',
  'stripe_price_id_vip_monthly',     'stripe_price_id_vip_annual',
  'stripe_price_id_quota_50',        'stripe_price_id_quota_200', 'stripe_price_id_quota_500',
  // Prix affichés (cosmétique)
  'price_premium_monthly', 'price_premium_annual',
  'price_vip_monthly',     'price_vip_annual',
  'quota_50_price',  'quota_200_price',  'quota_500_price',
  // Limites IA
  'limit_premium_weekly',
];

// GET — config + stats + recherche user
export async function GET(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const emailQuery = req.nextUrl.searchParams.get('email');

  // Recherche user par email (pour gestion manuelle)
  if (emailQuery) {
    const users = await prisma.user.findMany({
      where: { email: { contains: emailQuery, mode: 'insensitive' } },
      select: { id: true, name: true, email: true, plan: true, planExpiresAt: true, extraQuota: true, role: true },
      take: 10,
    });
    return NextResponse.json({ users });
  }

  const [rows, planStats] = await Promise.all([
    prisma.appConfig.findMany({ where: { key: { in: BILLING_KEYS } } }),
    prisma.user.groupBy({ by: ['plan'], _count: { id: true } }),
  ]);

  const cfg: Record<string, string> = {};
  rows.forEach(r => {
    cfg[r.key] = r.key === 'stripe_webhook_secret'
      ? (r.value ? '••••••••' + r.value.slice(-4) : '')
      : r.value;
  });

  return NextResponse.json({ config: cfg, planStats });
}

// PUT — sauvegarde config
export async function PUT(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json() as Record<string, string>;
  const updates = Object.entries(body)
    .filter(([k, v]) => BILLING_KEYS.includes(k) && v !== undefined)
    .map(([key, value]) =>
      prisma.appConfig.upsert({ where: { key }, create: { key, value }, update: { value } })
    );
  await Promise.all(updates);
  return NextResponse.json({ ok: true });
}

// PATCH — changer le plan d'un utilisateur (par ID ou email)
export async function PATCH(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId, email, plan, planMonths, extraQuota, noExpiry } = await req.json();

  // Résolution par email si userId non fourni
  let targetId = userId;
  if (!targetId && email) {
    const u = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    if (!u) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    targetId = u.id;
  }
  if (!targetId) return NextResponse.json({ error: 'userId ou email requis' }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (plan) data.plan = plan;

  if (noExpiry || plan === 'VIP') {
    // Pas d'expiration = accès permanent
    data.planExpiresAt = null;
  } else if (planMonths) {
    const exp = new Date();
    exp.setMonth(exp.getMonth() + parseInt(planMonths) || 1);
    data.planExpiresAt = exp;
  }

  if (typeof extraQuota === 'number') data.extraQuota = extraQuota;

  const updated = await prisma.user.update({
    where: { id: targetId },
    select: { id: true, name: true, email: true, plan: true, planExpiresAt: true, extraQuota: true },
    data,
  });

  return NextResponse.json({ ok: true, user: updated });
}
