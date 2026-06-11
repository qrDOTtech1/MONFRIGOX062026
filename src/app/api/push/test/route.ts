import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sendToUser } from '@/lib/push';

// POST /api/push/test → notification de test à l'utilisateur courant
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const sent = await sendToUser(user.id, {
      title: 'Mon Frigo 🔔',
      body: 'Les notifications sont activées — tu seras prévenu pour le gaspi et tes repas !',
      url: '/dashboard',
      tag: 'test',
    });
    return NextResponse.json({ ok: true, sent });
  } catch (err: any) {
    console.error('Push test error:', err);
    return NextResponse.json({ error: 'Erreur envoi' }, { status: 500 });
  }
}
