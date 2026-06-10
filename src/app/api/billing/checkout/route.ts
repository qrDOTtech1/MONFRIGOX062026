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

  const { priceId, successPath = '/profile?upgrade=success', cancelPath = '/profile' } = await req.json();
  if (!priceId) return NextResponse.json({ error: 'priceId requis' }, { status: 400 });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return NextResponse.json({ error: 'Stripe non configuré (STRIPE_SECRET_KEY manquant)' }, { status: 500 });

  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://monfrigo.app';

  // Déterminer si c'est un pack quota (pas d'abonnement récurrent)
  const quotaConfig = await prisma.appConfig.findMany({
    where: { key: { in: ['stripe_price_id_quota_50', 'stripe_price_id_quota_200', 'stripe_price_id_quota_500'] } },
  });
  const quotaPriceIds = new Set(quotaConfig.map(c => c.value));
  const isOneTime = quotaPriceIds.has(priceId);

  // Lire metadata du price depuis AppConfig pour connaître plan/quota/duration
  const metaConfig = await prisma.appConfig.findMany({
    where: { key: { startsWith: 'stripe_meta_' } },
  });
  const metaMap: Record<string, Record<string, string>> = {};
  metaConfig.forEach(c => {
    // key format: stripe_meta_price_xxx_plan / stripe_meta_price_xxx_quota / etc.
    // On stocke la meta directement dans AppConfig sous la clé du priceId
  });
  void metaMap;

  // Construire la session Stripe via l'API REST
  const params = new URLSearchParams();
  params.append('mode',                                isOneTime ? 'payment' : 'subscription');
  params.append('line_items[0][price]',                priceId);
  params.append('line_items[0][quantity]',             '1');
  params.append('client_reference_id',                 user.id);
  params.append('customer_email',                      user.email);
  params.append('success_url',                         `${origin}${successPath}`);
  params.append('cancel_url',                          `${origin}${cancelPath}`);
  params.append('allow_promotion_codes',               'true');
  // Metadata transmise au webhook via checkout.session.completed
  // (à compléter côté Stripe Dashboard sur le Price ou le Product)

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
