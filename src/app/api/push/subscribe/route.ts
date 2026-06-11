import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// POST /api/push/subscribe { subscription }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { subscription } = await req.json();
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Abonnement invalide' }, { status: 400 });
  }

  try {
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { userId: user.id, p256dh, auth },
      create: { userId: user.id, endpoint, p256dh, auth },
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Subscribe error:', err);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}

// DELETE /api/push/subscribe { endpoint } → désabonnement
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { endpoint } = await req.json().catch(() => ({}));
  try {
    if (endpoint) await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
    else await prisma.pushSubscription.deleteMany({ where: { userId: user.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
