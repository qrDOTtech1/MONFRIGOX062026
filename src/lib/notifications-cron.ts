import { prisma } from './db';
import { sendToUser } from './push';

/**
 * Logique d'envoi des notifications programmées.
 * Appelée par /api/notifications/run (cron externe/admin)
 * et par le scheduler interne (src/instrumentation.ts).
 */
export async function runNotifications(type: 'expiry' | 'meals' | 'all') {
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const in2days = new Date(now.getTime() + 2 * 86400000);

  // Utilisateurs ayant au moins un abonnement push
  const users = await prisma.user.findMany({
    where: { pushSubs: { some: {} } },
    select: { id: true, notifyExpiry: true, notifyMeals: true },
  });

  let expiryNotifs = 0;
  let mealNotifs = 0;

  for (const u of users) {
    // ── Aliments qui périment ──
    if ((type === 'expiry' || type === 'all') && u.notifyExpiry) {
      const items = await prisma.fridgeItem.findMany({
        where: { userId: u.id, expiresAt: { gte: now, lte: in2days } },
        include: { ingredient: { select: { name: true } } },
        orderBy: { expiresAt: 'asc' },
      });
      if (items.length > 0) {
        const names = items.slice(0, 3).map(i => i.ingredient.name).join(', ');
        const extra = items.length > 3 ? ` +${items.length - 3}` : '';
        const sent = await sendToUser(u.id, {
          title: `${items.length} aliment${items.length > 1 ? 's' : ''} à consommer 🥕`,
          body: `${names}${extra} périme${items.length > 1 ? 'nt' : ''} bientôt. Une recette anti-gaspi ?`,
          url: '/dashboard',
          tag: 'expiry',
        });
        if (sent > 0) expiryNotifs++;
      }
    }

    // ── Repas du jour non planifié ──
    if ((type === 'meals' || type === 'all') && u.notifyMeals) {
      const planned = await prisma.mealPlan.count({ where: { userId: u.id, date: todayUTC } });
      if (planned === 0) {
        const sent = await sendToUser(u.id, {
          title: 'Que manges-tu ce soir ? 🍽️',
          body: "Rien de prévu aujourd'hui. Découvre une idée avec ce que tu as dans ton frigo.",
          url: '/dashboard',
          tag: 'meals',
        });
        if (sent > 0) mealNotifs++;
      }
    }
  }

  return { users: users.length, expiryNotifs, mealNotifs };
}

/* ── Scheduler interne ──────────────────────────────────────────────────────
   Railway garde le serveur Next.js en vie en continu → un simple setInterval
   suffit, pas besoin de cron externe.
   - expiry : ~09h00 heure de Paris
   - meals  : ~17h30 heure de Paris
─────────────────────────────────────────────────────────────────────────── */
let schedulerStarted = false;
let lastExpiryDate = '';
let lastMealsDate = '';

function parisNow(): { hour: number; minute: number; dateKey: string } {
  const paris = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  return {
    hour: paris.getHours(),
    minute: paris.getMinutes(),
    dateKey: paris.toISOString().slice(0, 10),
  };
}

export function startNotificationScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  console.log('[notifications] Scheduler interne démarré (expiry 9h, meals 17h30, Europe/Paris)');

  setInterval(async () => {
    try {
      const { hour, dateKey } = parisNow();

      if (hour === 9 && lastExpiryDate !== dateKey) {
        lastExpiryDate = dateKey;
        const r = await runNotifications('expiry');
        console.log(`[notifications] expiry envoyées : ${r.expiryNotifs}/${r.users} users`);
      }

      if (hour === 17 && lastMealsDate !== dateKey) {
        lastMealsDate = dateKey;
        const r = await runNotifications('meals');
        console.log(`[notifications] meals envoyées : ${r.mealNotifs}/${r.users} users`);
      }
    } catch (err) {
      console.error('[notifications] Erreur scheduler :', err);
    }
  }, 10 * 60 * 1000); // check toutes les 10 min
}
