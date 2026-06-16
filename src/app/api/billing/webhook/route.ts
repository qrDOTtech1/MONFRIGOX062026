import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';

/**
 * Vérifie la signature Stripe (HMAC-SHA256) sans dépendre du package stripe.
 * Header : stripe-signature: t=timestamp,v1=signature
 * Signature = HMAC_SHA256(secret, `${t}.${rawBody}`)
 */
function verifyStripeSignature(rawBody: string, sigHeader: string | null, secret: string): boolean {
  if (!sigHeader) return false;
  const parts: Record<string, string> = {};
  for (const kv of sigHeader.split(',')) {
    const [k, v] = kv.split('=');
    if (k && v) parts[k.trim()] = v.trim();
  }
  const t = parts['t'];
  const v1 = parts['v1'];
  if (!t || !v1) return false;

  const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  // Tolérance 5 min contre le rejeu
  const ageSec = Math.abs(Date.now() / 1000 - Number(t));
  return Number.isFinite(ageSec) && ageSec < 300;
}

/**
 * POST /api/billing/webhook
 *
 * Stripe envoie les événements ici.
 * Configuration dans Stripe Dashboard → Webhooks → Ajouter endpoint :
 *   URL : https://votre-domaine.railway.app/api/billing/webhook
 *   Événements : checkout.session.completed, customer.subscription.deleted
 *
 * Metadata attendue sur les Stripe Payment Links :
 *   plan     : PREMIUM | VIP          (pour abonnements)
 *   duration : MONTHLY | ANNUAL       (pour abonnements)
 *   quota    : 50 | 200 | 500         (pour packs quota)
 *
 * client_reference_id : userId (ajouté automatiquement via l'URL dans le profil)
 *   ex: https://buy.stripe.com/xxx?client_reference_id=USER_ID
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    || (await prisma.appConfig.findUnique({ where: { key: 'stripe_webhook_secret' } }))?.value
    || '';

  // Lire le corps BRUT (indispensable pour vérifier la signature)
  const rawBody = await req.text();

  // Si un secret webhook est configuré → on EXIGE une signature valide
  if (webhookSecret) {
    const sig = req.headers.get('stripe-signature');
    if (!verifyStripeSignature(rawBody, sig, webhookSecret)) {
      return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
    }
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const type = event.type as string;
  const obj  = event.data && ((event.data as Record<string, unknown>).object as Record<string, unknown>) || null;

  // ─── checkout.session.completed ───
  if (type === 'checkout.session.completed' && obj) {
    const userId = (obj as Record<string, unknown>)['client_reference_id'] as string | null;
    if (!userId) return NextResponse.json({ ok: true });

    const metadata = ((obj as Record<string, unknown>)['metadata'] || {}) as Record<string, string>;
    const plan     = metadata.plan  as string | undefined;
    const quotaStr = metadata.quota as string | undefined;

    // Vérifier que l'user existe
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ ok: true });

    if (quotaStr) {
      // Pack quota → incrémenter extraQuota
      const amount = parseInt(quotaStr) || 0;
      if (amount > 0) {
        await prisma.user.update({
          where: { id: userId },
          data:  { extraQuota: { increment: amount } },
        });
        console.log(`[Billing] +${amount} quota pour user ${userId}`);
      }
    } else if (plan === 'PREMIUM' || plan === 'VIP') {
      // Abonnement → activer le plan
      const duration = metadata.duration as string | undefined;
      const months   = duration === 'ANNUAL' ? 12 : 1;
      const expires  = new Date();
      expires.setMonth(expires.getMonth() + months);

      const stripeCustomerId = (obj as Record<string, unknown>)['customer'] as string | undefined;

      await prisma.user.update({
        where: { id: userId },
        data: {
          plan:            plan,
          planExpiresAt:   expires,
          stripeCustomerId: stripeCustomerId || undefined,
        },
      });
      console.log(`[Billing] Plan ${plan} (${months}mo) activé pour user ${userId}`);
    }
  }

  // ─── customer.subscription.deleted ───
  if (type === 'customer.subscription.deleted' && obj) {
    const customerId = (obj as Record<string, unknown>)['customer'] as string;
    if (customerId) {
      await prisma.user.updateMany({
        where: { stripeCustomerId: customerId },
        data:  { plan: 'FREE', planExpiresAt: null },
      });
      console.log(`[Billing] Plan annulé pour customer ${customerId}`);
    }
  }

  return NextResponse.json({ ok: true });
}
