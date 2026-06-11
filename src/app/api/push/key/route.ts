import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getVapidKeys } from '@/lib/push';

// GET /api/push/key → clé publique VAPID (pour s'abonner côté client)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const { publicKey } = await getVapidKeys();
    return NextResponse.json({ publicKey });
  } catch (err: any) {
    console.error('VAPID key error:', err);
    return NextResponse.json({ error: 'Erreur clés' }, { status: 500 });
  }
}
