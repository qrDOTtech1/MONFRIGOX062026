import { prisma } from './db';

export type Plan = 'FREE' | 'PREMIUM' | 'VIP';

/** Limites hebdomadaires par défaut — overridables via AppConfig */
export const DEFAULT_LIMITS: Record<Plan, { weekly: number }> = {
  FREE:    { weekly: 1      },
  PREMIUM: { weekly: 10     },
  VIP:     { weekly: 999999 },
};

/** ISO week string : 2026-W23 */
function weekStr(): string {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function getLimits(): Promise<Record<Plan, { weekly: number }>> {
  try {
    const configs = await prisma.appConfig.findMany({
      where: { key: { in: ['limit_free_weekly', 'limit_premium_weekly'] } },
    });
    const m: Record<string, number> = {};
    configs.forEach(c => { m[c.key] = parseInt(c.value) || 0; });
    return {
      FREE:    { weekly: m['limit_free_weekly']    || 1  },
      PREMIUM: { weekly: m['limit_premium_weekly'] || 10 },
      VIP:     { weekly: 999999 },
    };
  } catch {
    return DEFAULT_LIMITS;
  }
}

export interface RateLimitResult {
  allowed:   boolean;
  remaining: number;
  plan:      string;
  reason?:   string;
  upgrade?:  boolean;
}

/**
 * Vérifie et consomme 1 crédit IA pour l'utilisateur.
 * Réinitialisation hebdomadaire. Priorité : plan quota → extraQuota.
 * Réutilise les champs aiCallsToday/aiCallsTodayDate (désormais = week/weekDate).
 */
export async function checkAndConsumeAI(userId: string): Promise<RateLimitResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true, planExpiresAt: true, extraQuota: true,
      aiCallsToday: true, aiCallsTodayDate: true,  // repurposé : appels semaine
    },
  });
  if (!user) return { allowed: false, remaining: 0, plan: 'FREE', reason: 'Utilisateur introuvable' };

  const plan = (user.planExpiresAt && user.planExpiresAt < new Date())
    ? 'FREE'
    : (user.plan as Plan) || 'FREE';

  const limits = await getLimits();
  const { weekly } = limits[plan] ?? DEFAULT_LIMITS.FREE;

  const week = weekStr();
  const callsWeek = user.aiCallsTodayDate === week ? user.aiCallsToday : 0;

  if (callsWeek < weekly) {
    await prisma.user.update({
      where: { id: userId },
      data: { aiCallsToday: callsWeek + 1, aiCallsTodayDate: week },
    });
    return { allowed: true, remaining: weekly - callsWeek - 1, plan };
  }

  // Quota plan dépassé → extraQuota
  if (user.extraQuota > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { extraQuota: user.extraQuota - 1, aiCallsToday: callsWeek + 1, aiCallsTodayDate: week },
    });
    return { allowed: true, remaining: user.extraQuota - 1, plan };
  }

  const reason = plan === 'FREE'
    ? `Limite hebdomadaire atteinte (${weekly} requête/semaine en gratuit). Passez en Premium pour 10 requêtes/semaine.`
    : `Limite hebdomadaire atteinte (${weekly} requêtes/semaine). Réinitialisation lundi.`;

  return { allowed: false, remaining: 0, plan, reason, upgrade: plan !== 'VIP' };
}

export async function getUsageSummary(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true, planExpiresAt: true, extraQuota: true,
      aiCallsToday: true, aiCallsTodayDate: true,
    },
  });
  if (!user) return null;

  const plan = (user.planExpiresAt && user.planExpiresAt < new Date())
    ? 'FREE' : (user.plan as Plan) || 'FREE';

  const limits = await getLimits();
  const { weekly } = limits[plan] ?? DEFAULT_LIMITS.FREE;
  const week = weekStr();

  return {
    plan,
    planExpiresAt: user.planExpiresAt,
    extraQuota:    user.extraQuota,
    aiCallsWeek:   user.aiCallsTodayDate === week ? user.aiCallsToday : 0,
    limitWeekly:   weekly,
    isUnlimited:   plan === 'VIP',
  };
}
