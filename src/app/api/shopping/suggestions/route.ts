import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET /api/shopping/suggestions
 * Analyse les recettes cuisinées pour suggérer des ingrédients à racheter :
 * - Fréquemment utilisés mais absents du frigo
 * - Proches de péremption (à consommer vite → racheter bientôt)
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  // Ingredients from recent cook logs
  const logs = await prisma.cookLog.findMany({
    where: { userId: user.id, cookedAt: { gte: thirtyDaysAgo } },
    include: {
      recipe: {
        select: {
          ingredients: {
            select: { ingredient: { select: { id: true, name: true, emoji: true, category: true } } },
          },
        },
      },
    },
  });

  // Count frequency
  const freq: Record<string, { name: string; emoji: string; category: string; count: number }> = {};
  for (const log of logs) {
    if (!log.recipe) continue;
    for (const ri of log.recipe.ingredients) {
      const ing = ri.ingredient;
      if (!freq[ing.id]) freq[ing.id] = { name: ing.name, emoji: ing.emoji, category: ing.category || 'Autre', count: 0 };
      freq[ing.id].count++;
    }
  }

  // Get current fridge items
  const fridgeItems = await prisma.fridgeItem.findMany({
    where: { userId: user.id },
    select: { ingredientId: true },
  });
  const inFridge = new Set(fridgeItems.map(f => f.ingredientId));

  // Suggestions: frequently cooked but not in fridge
  const suggestions = Object.entries(freq)
    .filter(([id]) => !inFridge.has(id))
    .map(([id, data]) => ({ ingredientId: id, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Items expiring soon (next 3 days) — suggest buying fresh replacement
  const soon = new Date(Date.now() + 3 * 86400000);
  const expiring = await prisma.fridgeItem.findMany({
    where: { userId: user.id, expiresAt: { lte: soon, gte: new Date() } },
    include: { ingredient: { select: { id: true, name: true, emoji: true, category: true } } },
    orderBy: { expiresAt: 'asc' },
    take: 10,
  });

  const expiringList = expiring.map(f => ({
    ingredientId: f.ingredient.id,
    name: f.ingredient.name,
    emoji: f.ingredient.emoji,
    category: f.ingredient.category || 'Autre',
    expiresAt: f.expiresAt?.toISOString() || null,
  }));

  return NextResponse.json({ suggestions, expiring: expiringList });
}
