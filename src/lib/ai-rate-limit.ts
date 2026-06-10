import { prisma } from './db';

export type Plan = 'FREE' | 'PREMIUM' | 'VIP';

export const FREE_TRIAL_TOTAL = 3;   // requêtes IA à vie pour FREE
export const DEFAULT_WEEKLY: Record<Plan, number> = {
  FREE:    0,      // géré via FREE_TRIAL_TOTAL, pas en hebdo
  PREMIUM: 10,
  VIP:     999999,
};

/** ISO week string : 2026-W23 */
function weekStr(): string {
  const d    = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function getPremiumWeeklyLimit(): Promise<number> {
  try {
    const cfg = await prisma.appConfig.findUnique({ where: { key: 'limit_premium_weekly' } });
    return parseInt(cfg?.value || '') || DEFAULT_WEEKLY.PREMIUM;
  } catch {
    return DEFAULT_WEEKLY.PREMIUM;
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
 * FREE  → compteur vie entière (aiCallsMonth, jamais remis à zéro). Max = FREE_TRIAL_TOTAL.
 * PREMIUM → compteur hebdomadaire (aiCallsToday / aiCallsTodayDate repurposé).
 * VIP   → illimité.
 */
export async function checkAndConsumeAI(userId: string): Promise<RateLimitResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true, plan: true, planExpiresAt: true, extraQuota: true,
      aiCallsToday: true, aiCallsTodayDate: true,
      aiCallsMonth: true,
    },
  });
  if (!user) return { allowed: false, remaining: 0, plan: 'FREE', reason: 'Utilisateur introuvable' };

  // ADMIN : aucune limite, accès total
  if (user.role === 'ADMIN') return { allowed: true, remaining: 999999, plan: 'ADMIN' };

  const plan = (user.planExpiresAt && user.planExpiresAt < new Date())
    ? 'FREE' : (user.plan as Plan) || 'FREE';

  // ── VIP : illimité ──────────────────────────────────────────────────────────
  if (plan === 'VIP') {
    return { allowed: true, remaining: 999999, plan };
  }

  // ── FREE : essai à vie (aiCallsMonth = total utilisé depuis toujours) ───────
  if (plan === 'FREE') {
    const used = user.aiCallsMonth ?? 0;
    if (used >= FREE_TRIAL_TOTAL) {
      // Tente extraQuota avant de bloquer
      if (user.extraQuota > 0) {
        await prisma.user.update({ where: { id: userId }, data: { extraQuota: user.extraQuota - 1 } });
        return { allowed: true, remaining: user.extraQuota - 1, plan };
      }
      return {
        allowed: false, remaining: 0, plan,
        reason: `Essai gratuit épuisé (${FREE_TRIAL_TOTAL} requêtes IA à vie). Passez en Premium pour 10 requêtes/semaine.`,
        upgrade: true,
      };
    }
    await prisma.user.update({ where: { id: userId }, data: { aiCallsMonth: used + 1 } });
    return { allowed: true, remaining: FREE_TRIAL_TOTAL - used - 1, plan };
  }

  // ── PREMIUM : hebdomadaire ───────────────────────────────────────────────────
  const weekly = await getPremiumWeeklyLimit();
  const week   = weekStr();
  const callsWeek = user.aiCallsTodayDate === week ? user.aiCallsToday : 0;

  if (callsWeek < weekly) {
    await prisma.user.update({
      where: { id: userId },
      data: { aiCallsToday: callsWeek + 1, aiCallsTodayDate: week },
    });
    return { allowed: true, remaining: weekly - callsWeek - 1, plan };
  }

  // Quota semaine dépassé → extraQuota
  if (user.extraQuota > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { extraQuota: user.extraQuota - 1, aiCallsToday: callsWeek + 1, aiCallsTodayDate: week },
    });
    return { allowed: true, remaining: user.extraQuota - 1, plan };
  }

  return {
    allowed: false, remaining: 0, plan,
    reason: `Limite hebdomadaire atteinte (${weekly} requêtes/semaine). Réinitialisation lundi.`,
    upgrade: false,
  };
}

export async function getUsageSummary(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true, planExpiresAt: true, extraQuota: true,
      aiCallsToday: true, aiCallsTodayDate: true,
      aiCallsMonth: true,
    },
  });
  if (!user) return null;

  const plan = (user.planExpiresAt && user.planExpiresAt < new Date())
    ? 'FREE' : (user.plan as Plan) || 'FREE';

  const week = weekStr();

  if (plan === 'FREE') {
    return {
      plan, planExpiresAt: user.planExpiresAt, extraQuota: user.extraQuota,
      aiCallsWeek: user.aiCallsMonth ?? 0,   // réutilisé = total vie
      limitWeekly: FREE_TRIAL_TOTAL,
      isUnlimited: false,
      isTrial: true,
    };
  }

  const weekly = await getPremiumWeeklyLimit();
  return {
    plan, planExpiresAt: user.planExpiresAt, extraQuota: user.extraQuota,
    aiCallsWeek:  user.aiCallsTodayDate === week ? user.aiCallsToday : 0,
    limitWeekly:  plan === 'VIP' ? 999999 : weekly,
    isUnlimited:  plan === 'VIP',
    isTrial:      false,
  };
}
