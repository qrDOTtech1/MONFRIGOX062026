import { prisma } from './db';
import { getCurrentUser } from './auth';

export type EffectivePlan = 'FREE' | 'PREMIUM' | 'VIP' | 'ADMIN';

/** Plan effectif de l'utilisateur courant (expiration prise en compte, ADMIN = accès total). */
export async function getEffectivePlan(): Promise<{ plan: EffectivePlan; userId: string | null }> {
  const user = await getCurrentUser();
  if (!user) return { plan: 'FREE', userId: null };

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true, plan: true, planExpiresAt: true },
  });
  if (!record) return { plan: 'FREE', userId: user.id };
  if (record.role === 'ADMIN') return { plan: 'ADMIN', userId: user.id };

  const expired = record.planExpiresAt && record.planExpiresAt < new Date();
  const plan = (expired ? 'FREE' : (record.plan || 'FREE')) as EffectivePlan;
  return { plan, userId: user.id };
}

/** La voix premium (ElevenLabs) est réservée aux plans payants ; les FREE utilisent la voix native du navigateur. */
export function isPremiumVoiceAllowed(plan: EffectivePlan): boolean {
  return plan === 'PREMIUM' || plan === 'VIP' || plan === 'ADMIN';
}
