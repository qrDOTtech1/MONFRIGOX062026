import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getVapidKeys } from '@/lib/push';
import webpush from 'web-push';

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return null;
  const record = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
  if (record?.role !== 'ADMIN') return null;
  return user;
}

// POST /api/admin/broadcast  { title, body, url }
export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const { title, body, url } = await req.json();
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'title et body requis' }, { status: 400 });
  }

  const { publicKey, privateKey } = await getVapidKeys();
  webpush.setVapidDetails('mailto:contact@monfrigo.app', publicKey, privateKey);

  const subs = await prisma.pushSubscription.findMany();

  let sent = 0, failed = 0;
  const payload = JSON.stringify({ title, body, url: url || '/', tag: 'broadcast' });

  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
      sent++;
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
      failed++;
    }
  }));

  return NextResponse.json({ sent, failed, total: subs.length });
}
