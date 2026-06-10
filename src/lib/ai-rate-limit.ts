import { prisma } from './db';

export type Plan = 'FREE' | 'PREMIUM' | 'VIP';

/** Limites par défaut — overridables via AppConfig */
export const DEFAULT_LIMITS: Record<Plan, { daily: number; monthly: number }> = {
  FREE:    { daily: 5,      monthly: 30    },
  PREMIUM: { daily: 100,    monthly: 1000  },
  VIP:     { daily: 999999, monthly: 999999 },
};

function todayStr()  { return new Date().toISOString().slice(0, 10); }  // YYYY-MM-DD
function monthStr()  { return new Date().toISOString().slice(0, 7);  }  // YYYY-MM

/** Lit les limites depuis AppConfig si définies, sinon valeurs par défaut */
async function getLimits(): Promise<Record<Plan, { daily: number; monthly: number }>> {
  try {
    const configs = await prisma.appConfig.findMany({
      where: { key: { in: [
        'limit_free_daily','limit_free_monthly',
        'limit_premium_daily','limit_premium_monthly',
      ]}},
    });
    const m: Record<string, number> = {};
    configs.forEach(c => { m[c.key] = parseInt(c.value) || 0; });
    return {
      FREE:    { daily: m['limit_free_daily']    || 5,   monthly: m['limit_free_monthly']    || 30   },
      PREMIUM: { daily: m['limit_premium_daily'] || 100, monthly: m['limit_premium_monthly'] || 1000 },
      VIP:     { daily: 999999, monthly: 999999 },
    };
  } catch {
    return DEFAULT_LIMITS;
  }
}

export interface RateLimitResult {
  allowed:   boolean;
  remaining: number;   // min(daily_left, monthly_left)
  plan:      string;
  reason?:   string;   // message d'erreur si non autorisé
  upgrade?:  boolean;  // true → inciter l'upgrade de plan
}

/**
 * Vérifie et consomme 1 crédit IA pour l'utilisateur.
 * Priorité : quota du plan → extraQuota
 */
export async function checkAndConsumeAI(userId: string): Promise<RateLimitResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true, planExpiresAt: true, extraQuota: true,
      aiCallsToday: true, aiCallsTodayDate: true,
      aiCallsMonth: true, aiCallsMonthDate: true,
    },
  });
  if (!user) return { allowed: false, remaining: 0, plan: 'FREE', reason: 'Utilisateur introuvable' };

  // Plan expiré → downgrade FREE
  const plan = (user.planExpiresAt && user.planExpiresAt < new Date())
    ? 'FREE'
    : (user.plan as Plan) || 'FREE';

  const limits = await getLimits();
  const { daily, monthly } = limits[plan] ?? DEFAULT_LIMITS.FREE;

  const today  = todayStr();
  const month  = monthStr();

  // Réinitialisation des compteurs si nouveau jour / mois
  let callsToday  = user.aiCallsTodayDate === today  ? user.aiCallsToday  : 0;
  let callsMonth  = user.aiCallsMonthDate === month  ? user.aiCallsMonth  : 0;

  const withinDaily   = callsToday  < daily;
  const withinMonthly = callsMonth  < monthly;

  // Dans les limites → consommer et autoriser
  if (withinDaily && withinMonthly) {
    callsToday++;
    callsMonth++;
    await prisma.user.update({
      where: { id: userId },
      data: {
        aiCallsToday:     callsToday,
        aiCallsTodayDate: today,
        aiCallsMonth:     callsMonth,
        aiCallsMonthDate: month,
      },
    });
    return {
      allowed:   true,
      remaining: Math.min(daily - callsToday, monthly - callsMonth),
      plan,
    };
  }

  // Hors limites → essayer le quota bonus
  if (user.extraQuota > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        extraQuota:       user.extraQuota - 1,
        aiCallsToday:     callsToday  + 1,
        aiCallsTodayDate: today,
        aiCallsMonth:     callsMonth  + 1,
        aiCallsMonthDate: month,
      },
    });
    return {
      allowed:   true,
      remaining: user.extraQuota - 1,
      plan,
    };
  }

  // Bloqué
  const isDaily = !withinDaily;
  const reset   = isDaily ? 'demain' : 'le mois prochain';
  const reason  = isDaily
    ? `Limite journalière atteinte (${daily} requêtes/jour). Réinitialisation ${reset}.`
    : `Limite mensuelle atteinte (${monthly} requêtes/mois). Réinitialisation ${reset}.`;

  return { allowed: false, remaining: 0, plan, reason, upgrade: plan === 'FREE' };
}

/** Résumé d'usage pour le profil utilisateur */
export async function getUsageSummary(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true, planExpiresAt: true, extraQuota: true,
      aiCallsToday: true, aiCallsTodayDate: true,
      aiCallsMonth: true, aiCallsMonthDate: true,
    },
  });
  if (!user) return null;

  const plan = (user.planExpiresAt && user.planExpiresAt < new Date())
    ? 'FREE' : (user.plan as Plan) || 'FREE';

  const limits  = await getLimits();
  const { daily, monthly } = limits[plan] ?? DEFAULT_LIMITS.FREE;
  const today   = todayStr();
  const month   = monthStr();

  return {
    plan,
    planExpiresAt:  user.planExpiresAt,
    extraQuota:     user.extraQuota,
    aiCallsToday:   user.aiCallsTodayDate  === today  ? user.aiCallsToday  : 0,
    aiCallsMonth:   user.aiCallsMonthDate  === month  ? user.aiCallsMonth  : 0,
    limitDaily:     daily,
    limitMonthly:   monthly,
    isUnlimited:    plan === 'VIP',
  };
}
