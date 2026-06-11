import webpush from 'web-push';
import { prisma } from './db';

const SUBJECT = 'mailto:contact@monfrigo.app';

/**
 * Récupère (ou génère et stocke) les clés VAPID dans AppConfig.
 * Évite toute config manuelle d'env : la 1ʳᵉ utilisation crée les clés.
 */
export async function getVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  const rows = await prisma.appConfig.findMany({
    where: { key: { in: ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'] } },
  });
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  let publicKey = map['VAPID_PUBLIC_KEY'];
  let privateKey = map['VAPID_PRIVATE_KEY'];

  if (!publicKey || !privateKey) {
    const keys = webpush.generateVAPIDKeys();
    publicKey = keys.publicKey;
    privateKey = keys.privateKey;
    await prisma.appConfig.upsert({ where: { key: 'VAPID_PUBLIC_KEY' }, update: { value: publicKey }, create: { key: 'VAPID_PUBLIC_KEY', value: publicKey } });
    await prisma.appConfig.upsert({ where: { key: 'VAPID_PRIVATE_KEY' }, update: { value: privateKey }, create: { key: 'VAPID_PRIVATE_KEY', value: privateKey } });
  }

  return { publicKey, privateKey };
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/** Envoie une notification à tous les abonnements d'un utilisateur. */
export async function sendToUser(userId: string, payload: PushPayload): Promise<number> {
  const { publicKey, privateKey } = await getVapidKeys();
  webpush.setVapidDetails(SUBJECT, publicKey, privateKey);

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  let sent = 0;

  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      );
      sent++;
    } catch (err: any) {
      // Abonnement expiré / invalide → on le supprime
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
    }
  }));

  return sent;
}
