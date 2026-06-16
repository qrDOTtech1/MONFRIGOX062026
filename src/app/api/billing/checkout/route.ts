import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * POST /api/billing/checkout
 * Body: { priceId: 'price_xxx', successPath?: '/profile', cancelPath?: '/profile' }
 *
 * Crée une Stripe Checkout Session et retourne l'URL de redirection.
 * Nécessite STRIPE_SECRET_KEY dans les variables d'environnement Railway.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { priceId, successPath = '/profile?upgrade=success', cancelPath = '/profile', promoCode } = await req.json();
  if (!priceId) return NextResponse.json({ error: 'priceId requis' }, { status: 400 });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return NextResponse.json({ error: 'Stripe non configuré (STRIPE_SECRET_KEY manquant)' }, { status: 500 });

  // Résout un code promo client (ex: CM26-FRA) → ID de promotion code Stripe (promo_xxx)
  async function resolvePromotionCodeId(code: string): Promise<string | null> {
    try {
      const r = await fetch(
        `https://api.stripe.com/v1/promotion_codes?code=${encodeURIComponent(code)}&active=true&limit=1`,
        { headers: { Authorization: `Bearer ${stripeKey}` } },
      );
      const d = await r.json() as { data?: Array<{ id: string }> };
      return d.data?.[0]?.id || null;
    } catch {
      return null;
    }
  }

  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://monfrigo.app';

  // Reverse-map du priceId → plan/durée/quota, à partir des Price IDs en AppConfig.
  // Permet au webhook (checkout.session.completed) de créditer le bon plan.
  const priceConfig = await prisma.appConfig.findMany({
    where: { key: { startsWith: 'stripe_price_id_' } },
  });
  const keyForPrice = priceConfig.find(c => c.value === priceId)?.key || '';

  const META: Record<string, Record<string, string>> = {
    stripe_price_id_premium_monthly: { plan: 'PREMIUM', duration: 'MONTHLY' },
    stripe_price_id_premium_annual:  { plan: 'PREMIUM', duration: 'ANNUAL' },
    stripe_price_id_vip_monthly:     { plan: 'VIP',     duration: 'MONTHLY' },
    stripe_price_id_vip_annual:      { plan: 'VIP',     duration: 'ANNUAL' },
    stripe_price_id_quota_50:        { quota: '50' },
    stripe_price_id_quota_200:       { quota: '200' },
    stripe_price_id_quota_500:       { quota: '500' },
  };
  const meta = META[keyForPrice] || {};
  const isOneTime = 'quota' in meta;

  // Construire la session Stripe via l'API REST
  const params = new URLSearchParams();
  params.append('mode',                                isOneTime ? 'payment' : 'subscription');
  params.append('line_items[0][price]',                priceId);
  params.append('line_items[0][quantity]',             '1');
  params.append('client_reference_id',                 user.id);
  params.append('customer_email',                      user.email);
  params.append('success_url',                         `${origin}${successPath}`);
  params.append('cancel_url',                          `${origin}${cancelPath}`);

  // Code promo pré-appliqué (ex: équipe Coupe du Monde) → on passe l'ID Stripe.
  // Stripe interdit discounts + allow_promotion_codes ensemble : si le code est
  // valide on le pré-applique, sinon on laisse le client saisir un code.
  let promoApplied = false;
  if (typeof promoCode === 'string' && promoCode.trim()) {
    const promoId = await resolvePromotionCodeId(promoCode.trim());
    if (promoId) {
      params.append('discounts[0][promotion_code]', promoId);
      promoApplied = true;
    }
  }
  if (!promoApplied) params.append('allow_promotion_codes', 'true');

  // Metadata transmise au webhook via checkout.session.completed
  for (const [k, v] of Object.entries(meta)) {
    params.append(`metadata[${k}]`, v);
  }

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const session = await res.json() as { url?: string; error?: { message: string } };

  if (!res.ok || !session.url) {
    return NextResponse.json(
      { error: session.error?.message || 'Erreur Stripe' },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: session.url });
}
