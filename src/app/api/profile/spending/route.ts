import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { estimateRecipeCost } from '@/lib/recipe-cost';

/**
 * GET /api/profile/spending
 * Historique des dépenses courses — estimées depuis les cook logs.
 * Retourne un résumé mensuel sur les 6 derniers mois.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const logs = await prisma.cookLog.findMany({
    where: { userId: user.id, cookedAt: { gte: sixMonthsAgo } },
    include: {
      recipe: {
        select: {
          servings: true,
          ingredients: {
            select: { quantity: true, unit: true, ingredient: { select: { name: true, emoji: true } } },
          },
        },
      },
    },
    orderBy: { cookedAt: 'desc' },
  });

  const monthly: Record<string, { month: string; total: number; sessions: number }> = {};
  const recentItems: Array<{ date: string; recipeName: string; cost: number; servings: number }> = [];

  for (const log of logs) {
    if (!log.recipe) continue;
    const servings = log.servings || log.recipe.servings || 1;
    const est = estimateRecipeCost(
      log.recipe.ingredients.map(i => ({ name: i.ingredient.name, emoji: i.ingredient.emoji, quantity: i.quantity, unit: i.unit })),
      log.recipe.servings || 1,
    );
    const cost = est.perServing * servings;

    const key = `${log.cookedAt.getFullYear()}-${String(log.cookedAt.getMonth() + 1).padStart(2, '0')}`;
    if (!monthly[key]) {
      const label = log.cookedAt.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      monthly[key] = { month: label, total: 0, sessions: 0 };
    }
    monthly[key].total += cost;
    monthly[key].sessions++;

    if (recentItems.length < 20) {
      recentItems.push({
        date: log.cookedAt.toISOString(),
        recipeName: (log as any).recipe?.name || 'Recette',
        cost: Math.round(cost * 100) / 100,
        servings,
      });
    }
  }

  const monthlyHistory = Object.entries(monthly)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([, v]) => ({ ...v, total: Math.round(v.total) }));

  const totalSpent = monthlyHistory.reduce((s, m) => s + m.total, 0);

  return NextResponse.json({ monthlyHistory, recentItems, totalSpent });
}
