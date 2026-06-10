import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUsageSummary } from '@/lib/ai-rate-limit';
import { prisma } from '@/lib/db';

// GET /api/billing/status → plan actuel + usage IA + liens paiement
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const userId = user.id;

  const [usage, links] = await Promise.all([
    getUsageSummary(user.id),
    prisma.appConfig.findMany({
      where: { key: { in: [
        'stripe_link_premium_monthly', 'stripe_link_premium_annual',
        'stripe_link_vip_monthly',     'stripe_link_vip_annual',
        'stripe_link_quota_50',        'stripe_link_quota_200',
        'stripe_link_quota_500',
        'quota_50_price',              'quota_200_price',   'quota_500_price',
        'price_premium_monthly',       'price_premium_annual',
        'price_vip_monthly',           'price_vip_annual',
      ]}},
    }),
  ]);

  const cfg: Record<string, string> = {};
  links.forEach(l => { cfg[l.key] = l.value; });

  // Ajoute userId en client_reference_id aux liens Stripe
  function withUserId(url: string) {
    if (!url) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}client_reference_id=${userId}`;
  }

  return NextResponse.json({
    ...usage,
    links: {
      premiumMonthly: withUserId(cfg['stripe_link_premium_monthly'] || ''),
      premiumAnnual:  withUserId(cfg['stripe_link_premium_annual']  || ''),
      vipMonthly:     withUserId(cfg['stripe_link_vip_monthly']     || ''),
      vipAnnual:      withUserId(cfg['stripe_link_vip_annual']      || ''),
      quota50:        withUserId(cfg['stripe_link_quota_50']        || ''),
      quota200:       withUserId(cfg['stripe_link_quota_200']       || ''),
      quota500:       withUserId(cfg['stripe_link_quota_500']       || ''),
    },
    prices: {
      premiumMonthly: cfg['price_premium_monthly'] || '3,99€',
      premiumAnnual:  cfg['price_premium_annual']  || '34,99€',
      vipMonthly:     cfg['price_vip_monthly']     || '6,99€',
      vipAnnual:      cfg['price_vip_annual']      || '59,99€',
      quota50:        cfg['quota_50_price']         || '0,99€',
      quota200:       cfg['quota_200_price']        || '2,99€',
      quota500:       cfg['quota_500_price']        || '5,99€',
    },
  });
}
