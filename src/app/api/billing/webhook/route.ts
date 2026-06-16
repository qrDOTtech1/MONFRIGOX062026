import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/db';

// ─── Rate limiting (in-memory, per-IP, 20 req/min) ───
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// ─── Stripe signature verification ───
function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  toleranceSec = 300,
): boolean {
  // Parse "t=timestamp,v1=sig1,v1=sig2,..."
  const parts: Record<string, string[]> = {};
  for (const item of signatureHeader.split(',')) {
    const [key, ...rest] = item.split('=');
    const val = rest.join('=');
    if (key && val) {
      (parts[key] ??= []).push(val);
    }
  }

  const timestamp = parts['t']?.[0];
  const signatures = parts['v1'];
  if (!timestamp || !signatures?.length) return false;

  // Reject if timestamp is too old or in the future (replay protection)
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) return false;
  const age = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (age > toleranceSec) return false;

  // Compute expected signature
  const expectedSig = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
  const expectedBuf = Buffer.from(expectedSig, 'hex');

  // Check if any v1 signature matches (timing-safe)
  return signatures.some((sig) => {
    const sigBuf = Buffer.from(sig, 'hex');
    if (sigBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(sigBuf, expectedBuf);
  });
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
  // ─── Rate limiting ───
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // Read raw body BEFORE parsing JSON (needed for signature verification)
  const rawBody = await req.text();

  // ─── Signature verification ───
  const webhookSecret = await prisma.appConfig.findUnique({ where: { key: 'stripe_webhook_secret' } });

  if (webhookSecret?.value) {
    const sig = req.headers.get('stripe-signature');
    if (!sig) {
      return NextResponse.json({ error: 'Signature manquante' }, { status: 400 });
    }
    if (!verifyStripeSignature(rawBody, sig, webhookSecret.value)) {
      return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
    }
  } else {
    console.warn('[Billing] ATTENTION: stripe_webhook_secret non configuré dans AppConfig — les webhooks ne sont pas vérifiés!');
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
