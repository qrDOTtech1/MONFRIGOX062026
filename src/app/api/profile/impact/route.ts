import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { estimateRecipeCost } from '@/lib/recipe-cost';

// Hypothèse : un repas équivalent acheté/livré coûte ~12 € par personne
const TAKEOUT_PER_SERVING = 12;
// Anti-gaspi : ~20 % des aliments achetés finissent jetés en moyenne (ADEME).
// Cuisiner ce qu'on a déjà = autant de sauvé. CO₂ moyen : 2,5 kg CO₂e / kg d'aliment.
const WASTE_RATE = 0.2;
const CO2_PER_KG = 2.5;

// Conversion approximative quantité+unité → grammes
function toGrams(qty: number, unit: string): number {
  const u = (unit || '').toLowerCase().trim();
  if (['g', 'gr', 'gramme', 'grammes'].includes(u)) return qty;
  if (u === 'kg') return qty * 1000;
  if (['ml', 'millilitre'].includes(u)) return qty;
  if (['l', 'litre'].includes(u)) return qty * 1000;
  if (u.includes('cuillère à soupe') || u === 'cs') return qty * 15;
  if (u.includes('cuillère à café') || u === 'cc') return qty * 5;
  if (u.includes('pincée')) return qty * 0.5;
  if (u.includes('gousse')) return qty * 5;
  if (u.includes('tranche')) return qty * 30;
  return qty * 100; // pièce / unité / fallback
}

/**
 * GET /api/profile/impact
 * Tableau de bord « Mon impact » : repas cuisinés, valeur cuisinée,
 * économies estimées vs plats à emporter, anti-gaspi, nutrition.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const logs = await prisma.cookLog.findMany({
      where: { userId: user.id },
      include: {
        recipe: {
          select: {
            cuisine: true,
            calories: true,
            servings: true,
            ingredients: {
              select: { quantity: true, unit: true, ingredient: { select: { name: true, emoji: true } } },
            },
          },
        },
      },
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let mealsCooked = 0;       // nombre de portions cuisinées (somme servings)
    let sessionsCooked = 0;    // nombre de fois où l'on a cuisiné
    let sessionsThisMonth = 0;
    let moneyCooked = 0;       // valeur des ingrédients cuisinés (€)
    let savedVsTakeout = 0;    // économies estimées vs emporter (€)
    let totalCalories = 0;
    let caloriesCount = 0;
    let gramsCooked = 0;       // grammes d'ingrédients cuisinés (total)
    let gramsCookedMonth = 0;  // ce mois-ci
    const cuisineCount: Record<string, number> = {};

    for (const log of logs) {
      const r = log.recipe;
      if (!r) continue;
      sessionsCooked++;
      if (log.cookedAt >= monthStart) sessionsThisMonth++;

      const servings = log.servings || r.servings || 1;
      mealsCooked += servings;

      const est = estimateRecipeCost(
        r.ingredients.map(i => ({ name: i.ingredient.name, emoji: i.ingredient.emoji, quantity: i.quantity, unit: i.unit })),
        r.servings || 1,
      );
      const costForSession = est.perServing * servings;
      moneyCooked += costForSession;
      savedVsTakeout += Math.max(0, (TAKEOUT_PER_SERVING - est.perServing) * servings);

      if (r.calories) { totalCalories += r.calories * servings; caloriesCount += servings; }
      if (r.cuisine) cuisineCount[r.cuisine] = (cuisineCount[r.cuisine] || 0) + 1;

      // Grammes d'ingrédients utilisés (proportionnel aux portions cuisinées)
      const recipeGrams = r.ingredients.reduce((sum, i) => sum + toGrams(i.quantity, i.unit), 0);
      const sessionGrams = recipeGrams * (servings / (r.servings || 1));
      gramsCooked += sessionGrams;
      if (log.cookedAt >= monthStart) gramsCookedMonth += sessionGrams;
    }

    // Anti-gaspi : aliments du frigo avec une date de péremption suivie
    const trackedExpiry = await prisma.fridgeItem.count({
      where: { userId: user.id, expiresAt: { not: null } },
    });

    const topCuisine = Object.entries(cuisineCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const avgCaloriesPerServing = caloriesCount > 0 ? Math.round(totalCalories / caloriesCount) : 0;

    return NextResponse.json({
      sessionsCooked,
      sessionsThisMonth,
      mealsCooked,
      moneyCooked: Math.round(moneyCooked),
      savedVsTakeout: Math.round(savedVsTakeout),
      avgCaloriesPerServing,
      topCuisine,
      trackedExpiry,
      // Bilan anti-gaspi
      kgCooked: +(gramsCooked / 1000).toFixed(1),
      kgCookedMonth: +(gramsCookedMonth / 1000).toFixed(1),
      kgSaved: +((gramsCooked / 1000) * WASTE_RATE).toFixed(1),
      kgSavedMonth: +((gramsCookedMonth / 1000) * WASTE_RATE).toFixed(1),
      co2Saved: +((gramsCooked / 1000) * WASTE_RATE * CO2_PER_KG).toFixed(1),
      co2SavedMonth: +((gramsCookedMonth / 1000) * WASTE_RATE * CO2_PER_KG).toFixed(1),
    });
  } catch (err: any) {
    console.error('Impact error:', err);
    return NextResponse.json({
      sessionsCooked: 0, sessionsThisMonth: 0, mealsCooked: 0,
      moneyCooked: 0, savedVsTakeout: 0, avgCaloriesPerServing: 0,
      topCuisine: null, trackedExpiry: 0,
      kgCooked: 0, kgCookedMonth: 0, kgSaved: 0, kgSavedMonth: 0, co2Saved: 0, co2SavedMonth: 0,
    });
  }
}
