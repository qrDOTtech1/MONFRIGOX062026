import { prisma } from './db';
import { sendToUser } from './push';
import { getShelfInfo } from './shelf-life';
import { generateExpiryRecipe } from './ollama';

/**
 * Logique d'envoi des notifications programmées.
 * Appelée par /api/notifications/run (cron externe/admin)
 * et par le scheduler interne (src/instrumentation.ts).
 */
export async function runNotifications(type: 'expiry' | 'meals' | 'all') {
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const tomorrowUTC = new Date(todayUTC.getTime() + 86400000);
  const in2days = new Date(now.getTime() + 2 * 86400000);

  // Utilisateurs ayant au moins un abonnement push
  const users = await prisma.user.findMany({
    where: { pushSubs: { some: {} } },
    select: { id: true, notifyExpiry: true, notifyMeals: true, plan: true, planExpiresAt: true },
  });

  let expiryNotifs = 0;
  let mealNotifs = 0;
  let defrostNotifs = 0;

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
        const canFreeze = items.some(i => getShelfInfo(i.ingredient.name)?.freezable);
        const freezeHint = canFreeze ? ' ❄️ Tu peux en congeler certains.' : '';

        const isVip = u.plan === 'VIP' && (!u.planExpiresAt || u.planExpiresAt >= now);
        let notifTitle = `${items.length} aliment${items.length > 1 ? 's' : ''} à consommer 🥕`;
        let notifBody = `${names}${extra} périme${items.length > 1 ? 'nt' : ''} bientôt. Une recette anti-gaspi ?${freezeHint}`;
        let notifUrl = '/dashboard';

        // ── VIP uniquement : l'IA génère une vraie recette anti-gaspi prête à cuisiner ──
        // (réservé au VIP pour limiter la consommation de tokens — Free/Premium gardent la notif générique)
        if (isVip) {
          try {
            const recipe = await generateExpiryRecipe(items.map(i => i.ingredient.name));
            if (recipe) {
              const created = await prisma.recipe.create({
                data: {
                  name: recipe.name,
                  description: recipe.description,
                  instructions: recipe.instructions,
                  difficulty: recipe.difficulty,
                  prepTime: recipe.prepTime,
                  cuisine: recipe.cuisine,
                  servings: recipe.servings,
                  authorId: u.id,
                  isPublic: false,
                },
              });
              for (const ing of recipe.ingredients) {
                if (!ing.name?.trim()) continue;
                let ingredient = await prisma.ingredient.findFirst({ where: { name: { equals: ing.name.trim(), mode: 'insensitive' } } });
                if (!ingredient) {
                  ingredient = await prisma.ingredient.create({ data: { name: ing.name.trim().toLowerCase(), category: 'Épicerie', emoji: '🛒' } }).catch(() => null);
                }
                if (ingredient) {
                  await prisma.recipeIngredient.create({
                    data: { recipeId: created.id, ingredientId: ingredient.id, quantity: ing.quantity || 1, unit: ing.unit || 'unité' },
                  }).catch(() => {});
                }
              }
              notifTitle = 'Ta recette anti-gaspi du jour 👨‍🍳';
              notifBody = `${recipe.name} — pensée pour utiliser ${names}${extra} avant qu'ils périment.`;
              notifUrl = `/recipes/${created.id}`;
            }
          } catch (e) {
            console.error('[notifications] Erreur génération recette anti-gaspi VIP:', e);
            // Fallback silencieux vers la notif générique définie plus haut
          }
        }

        const sent = await sendToUser(u.id, { title: notifTitle, body: notifBody, url: notifUrl, tag: 'expiry' });
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

    // ── Rappel de décongélation (recette planifiée demain) ──
    if ((type === 'meals' || type === 'all') && u.notifyMeals) {
      const plans = await prisma.mealPlan.findMany({
        where: { userId: u.id, date: tomorrowUTC },
        include: {
          recipe: {
            select: {
              name: true,
              ingredients: { select: { ingredient: { select: { name: true } } } },
            },
          },
        },
      });

      const toDefrost = new Set<string>();
      for (const p of plans) {
        for (const ri of p.recipe.ingredients) {
          const info = getShelfInfo(ri.ingredient.name);
          // protéines / aliments qu'on garde habituellement au congélateur
          if (info?.freezable && (info.freezerDays ?? 0) >= 60) toDefrost.add(ri.ingredient.name);
        }
      }

      if (toDefrost.size > 0) {
        const names = [...toDefrost].slice(0, 3).join(', ');
        const extra = toDefrost.size > 3 ? ` +${toDefrost.size - 3}` : '';
        const sent = await sendToUser(u.id, {
          title: 'À sortir du congélateur ❄️',
          body: `Pense à décongeler ${names}${extra} pour tes repas de demain.`,
          url: '/shopping',
          tag: 'defrost',
        });
        if (sent > 0) defrostNotifs++;
      }
    }
  }

  return { users: users.length, expiryNotifs, mealNotifs, defrostNotifs };
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
let lastRecipeImportAt = 0;

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
      // Auto-import recettes à 3h du matin
      if (hour === 3 && lastImportDate !== dateKey) {
        lastImportDate = dateKey;
        try { await autoImportRecipes(); } catch (e) { console.error('[import] Erreur:', e); }
      }

      // Enrichissement continu du catalogue — lot a chaque tick (10 min), en boucle indéfiniment.
      // ~150 recettes/heure → couvre le catalogue complet en ~12 jours.
      if (Date.now() - lastRecipeImportAt >= 10 * 60 * 1000) {
        lastRecipeImportAt = Date.now();
        try {
          const { importNextBatch } = await import('./marmiton-importer');
          const r = await importNextBatch(25);
          console.log(`[catalogue] +${r.imported} recettes (curseur ${r.cursor}/${r.total})`);
        } catch (e) {
          console.error('[catalogue] Erreur:', e);
        }
      }
    } catch (err) {
      console.error('[notifications] Erreur scheduler :', err);
    }
  }, 10 * 60 * 1000); // check toutes les 10 min
}

let lastImportDate = '';

async function autoImportRecipes() {
  const { importRecipesFromMealDB } = await import('./recipe-importer');
  const cuisines = ['Portuguese', 'French', 'Italian', 'Japanese', 'Chinese', 'Indian', 'Mexican',
    'Thai', 'Vietnamese', 'Moroccan', 'Spanish', 'Greek', 'Turkish', 'British', 'American',
    'Malaysian', 'Filipino', 'Croatian', 'Egyptian', 'Kenyan', 'Polish', 'Russian', 'Tunisian',
    'Irish', 'Canadian', 'Jamaican', 'Dutch'];
  const pick = cuisines[Math.floor(Math.random() * cuisines.length)];
  const result = await importRecipesFromMealDB({ count: 10, cuisine: pick, translateWithAI: true });
  console.log(`[import] Auto-import ${pick}: ${result.imported} importées, ${result.skipped} skip`);
}
